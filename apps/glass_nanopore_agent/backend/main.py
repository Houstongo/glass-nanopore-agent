import os
import sys
import sqlite3
import json
import shutil
import time
import asyncio
import serial.tools.list_ports
from fastapi import FastAPI, HTTPException, Body, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
try:
    from zhipuai import ZhipuAI as ZhipuClient
except Exception:
    ZhipuClient = None
try:
    from openai import OpenAI as OpenAIClient
except Exception:
    OpenAIClient = None

# 将根目录添加到路径，以便导入 core 模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from core.rag_engine import NanoporeRAGEngine
    _rag_import_error = None
except Exception as e:
    NanoporeRAGEngine = None
    _rag_import_error = str(e)

CONFIG_PATH = "./data/api_config.json"
PDF_STORAGE_DIR = "./data/pdfs"
SEM_IMAGES_DIR = "./data/sem_images"
CVDATA_DIR = "D:/LabOSData/cvdata"
EXPERIMENT_DB_PATH = "D:/AntigravityProject/data/etching_experiments.sqlite"
DEFAULT_BASE_URLS = {
    "ZhipuAI": "https://open.bigmodel.cn/api/paas/v4/",
    "DeepSeek": "https://api.deepseek.com",
    "VolcEngine": "https://ark.cn-beijing.volces.com/api/v3",
    "Custom": "",
}


def normalize_provider(provider: Optional[str]) -> str:
    mapping = {
        "ZhipuAI": "ZhipuAI",
        "ZhipuAI (GLM-4)": "ZhipuAI",
        "DeepSeek": "DeepSeek",
        "VolcEngine": "VolcEngine",
        "火山方舟": "VolcEngine",
        "Custom": "Custom",
    }
    return mapping.get(provider or "ZhipuAI", provider or "ZhipuAI")


def load_local_config() -> Dict[str, Any]:
    data: Dict[str, Any] = {}
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as handle:
                data = json.load(handle)
        except Exception:
            data = {}

    provider = normalize_provider(data.get("llm_provider"))

    # 各 provider 的专用 key（可独立配置，也可共用 api_key）
    zhipu_key = data.get("zhipu_api_key", "")
    deepseek_key = data.get("deepseek_api_key", "")
    volc_key = data.get("volc_api_key", "") or data.get("api_key", "")

    # 根据当前 provider 自动选择对应 api_key
    provider_key_map = {
        "ZhipuAI": zhipu_key,
        "DeepSeek": deepseek_key,
        "VolcEngine": volc_key,
    }
    api_key = data.get("api_key") or provider_key_map.get(provider, "")

    # 默认模型名
    default_model_map = {
        "ZhipuAI": "glm-4-flash",
        "DeepSeek": "deepseek-chat",
        "VolcEngine": "",
    }
    selected_model = (
        data.get("selected_model") or data.get("llm_model")
        or default_model_map.get(provider, "")
    )

    config = {
        "llm_provider": provider,
        "selected_model": selected_model,
        "embed_model": data.get("embed_model", "local:BAAI/bge-large-zh-v1.5"),
        "base_url": data.get("base_url") or DEFAULT_BASE_URLS.get(provider, ""),
        "api_key": api_key,
        "zhipu_api_key": zhipu_key,
        "deepseek_api_key": deepseek_key,
        "volc_api_key": volc_key,
    }

    return config


def save_local_config(config: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as handle:
        json.dump(config, handle, ensure_ascii=False, indent=2)


def create_rag_engine(config: Dict[str, Any]) -> NanoporeRAGEngine:
    if NanoporeRAGEngine is None:
        raise RuntimeError(f"RAG 模块加载失败: {_rag_import_error}")
    return NanoporeRAGEngine(
        api_key=config.get("api_key", ""),
        model_name=config.get("selected_model", "glm-4-flash"),
        embed_model=config.get("embed_model", "embedding-3"),
        llm_provider=config.get("llm_provider", "ZhipuAI"),
        base_url=config.get("base_url"),
        embedding_key=config.get("zhipu_api_key") or config.get("api_key"),
    )


def _safe_error_text(exc: Exception) -> str:
    text = str(exc).strip()
    return text or exc.__class__.__name__


def _chat_response_is_valid(resp: Any) -> bool:
    choices = getattr(resp, "choices", None)
    if not choices:
        return False
    first = choices[0]
    message = getattr(first, "message", None)
    if message is None:
        return False
    return hasattr(message, "content")


def _embedding_response_is_valid(resp: Any) -> bool:
    data = getattr(resp, "data", None)
    if not data:
        return False
    first = data[0]
    vector = getattr(first, "embedding", None)
    return isinstance(vector, list) and len(vector) > 0


def validate_config_credentials(config: Dict[str, Any]) -> Dict[str, Any]:
    provider = normalize_provider(config.get("llm_provider"))
    model_name = config.get("selected_model", "glm-4-flash")
    embed_model = config.get("embed_model", "embedding-3")
    api_key = (config.get("api_key") or "").strip()
    base_url = config.get("base_url") or DEFAULT_BASE_URLS.get(provider, "")
    # 智谱 embedding 可独立配置 key；其余 provider 复用主 api_key
    embedding_key = (config.get("zhipu_api_key") or api_key or "").strip()

    result = {
        "llm": {"ok": False, "message": ""},
        "embedding": {"ok": False, "message": ""},
    }

    # ---------- LLM 验证 ----------
    if not api_key:
        result["llm"]["message"] = "缺少 LLM API Key"
    else:
        try:
            if provider == "ZhipuAI":
                if ZhipuClient is None:
                    raise RuntimeError("zhipuai SDK 未安装")
                client = ZhipuClient(api_key=api_key)
                chat_resp = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": "ping"}],
                    temperature=0,
                    max_tokens=8,
                )
            else:
                # VolcEngine / DeepSeek / Custom 均走 OpenAI 兼容接口
                if OpenAIClient is None:
                    raise RuntimeError("openai SDK 未安装")
                if not base_url:
                    raise RuntimeError("缺少 base_url")
                client = OpenAIClient(api_key=api_key, base_url=base_url)
                chat_resp = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": "ping"}],
                    temperature=0,
                    max_tokens=8,
                )
            if not _chat_response_is_valid(chat_resp):
                raise RuntimeError("LLM 返回结构无效（empty choices）")
            result["llm"]["ok"] = True
            result["llm"]["message"] = "LLM Key 验证通过"
        except Exception as exc:
            result["llm"]["message"] = f"LLM Key 验证失败: {_safe_error_text(exc)}"

    # ---------- Embedding 验证 ----------
    # embed_model="local:xxx" 时跳过 API 验证，本地模型无需 key
    if embed_model.startswith("local:"):
        result["embedding"]["ok"] = True
        result["embedding"]["message"] = f"本地 Embedding 模型：{embed_model[6:]}"
    elif not embedding_key:
        result["embedding"]["message"] = "缺少 Embedding API Key"
    else:
        try:
            if OpenAIClient is None:
                raise RuntimeError("openai SDK 未安装")
            embed_client = OpenAIClient(api_key=embedding_key, base_url=base_url)
            embed_resp = embed_client.embeddings.create(model=embed_model, input="ping")
            if not _embedding_response_is_valid(embed_resp):
                raise RuntimeError("Embedding 返回结构无效（empty vector）")
            result["embedding"]["ok"] = True
            result["embedding"]["message"] = "Embedding Key 验证通过"
        except Exception as exc:
            result["embedding"]["message"] = f"Embedding Key 验证失败: {_safe_error_text(exc)}"

    return result


def ensure_rag_engine() -> Optional[NanoporeRAGEngine]:
    global rag_engine
    if rag_engine is not None:
        return rag_engine

    config = load_local_config()
    if not config.get("api_key"):
        return None

    try:
        rag_engine = create_rag_engine(config)
    except Exception as exc:
        print(f"RAG init failed (non-blocking): {exc!r}")
        rag_engine = None
    return rag_engine


def build_agent_strategy(config: Dict[str, Any], model_name: Optional[str] = None):
    if not EtchingAgent:
        raise HTTPException(status_code=500, detail=f"Agent 模块加载失败: {_agent_import_error}")

    provider = normalize_provider(config.get("llm_provider"))
    resolved_model = model_name or config.get("selected_model") or "glm-4-flash"
    api_key = config.get("api_key", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="未找到可用的模型 API Key")

    if provider == "ZhipuAI":
        return ZhipuStrategy(api_key=api_key, model_name=resolved_model)

    return OpenAIStrategy(
        api_key=api_key,
        base_url=config.get("base_url", ""),
        model_name=resolved_model,
    )

# --- 容错式硬件驱动加载 ---

class DummyHardware:
    def __init__(self, name):
        self.name = name
        self.is_connected = False
        self.port = "None"
    def get_state(self): return {}
    def connect(self, *args, **kwargs): return False, f"{self.name} driver unavailable"
    def disconnect(self): pass
    def send_command(self, *args): return False, f"{self.name} driver unavailable"
    def trigger_auto_etch(self, *args): return False, f"{self.name} driver unavailable"

_bridge_instance = None
try:
    from core.hardware_bridge import get_bridge
except Exception as e:
    print(f"Warning: Hardware Bridge Driver failed to load: {e}")
    def get_bridge():
        global _bridge_instance
        if _bridge_instance is None: _bridge_instance = DummyHardware("Bridge")
        return _bridge_instance

_sg_instance = None
try:
    from core.signal_generator import get_signal_generator
except Exception as e:
    print(f"Warning: Signal Generator Driver failed to load: {e}")
    def get_signal_generator():
        global _sg_instance
        if _sg_instance is None: _sg_instance = DummyHardware("SignalGen")
        return _sg_instance

try:
    from core.agent_core import EtchingAgent, ZhipuStrategy, OpenAIStrategy, tools as AGENT_TOOLS
    _agent_import_error = None
except Exception as e:
    EtchingAgent = ZhipuStrategy = OpenAIStrategy = None
    AGENT_TOOLS = []
    _agent_import_error = str(e)

_multipart_import_error = None
try:
    import multipart
except Exception as e:
    _multipart_import_error = str(e)

# --- FastAPI 实例初始化 ---

app = FastAPI(title="LabOS v3.0 API", description="纳米通道自动化智能体系 - 现代后端")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.path.isdir(SEM_IMAGES_DIR):
    app.mount("/data/sem_images", StaticFiles(directory=SEM_IMAGES_DIR), name="sem-images")

if os.path.isdir("D:/LabOSData"):
    app.mount("/cvdata", StaticFiles(directory="D:/LabOSData"), name="cvdata")

# --- 全局状态 ---
rag_engine: Optional[NanoporeRAGEngine] = None

@app.on_event("startup")
async def startup_event():
    global rag_engine
    config = load_local_config()
    if config.get("api_key"):
        print("Found local config, trying RAG auto-init...")
        try:
            rag_engine = create_rag_engine(config)
        except Exception as e:
            rag_engine = None
            print(f"RAG auto-init failed (non-blocking): {e!r}")

# --- 数据模型 ---

class AgentChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []
    model: str = "glm-4-flash"

class ConfigInitRequest(BaseModel):
    api_key: Optional[str] = None
    llm_provider: str = "ZhipuAI"
    llm_model: Optional[str] = None
    selected_model: Optional[str] = None
    embed_model: str = "local:BAAI/bge-large-zh-v1.5"
    base_url: Optional[str] = None
    zhipu_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None
    volc_api_key: Optional[str] = None


class ConnectBridgeRequest(BaseModel):
    mode: str = "Serial"
    target: Optional[str] = None
    port: Optional[str] = None
    force_reconnect: bool = False

class EtchingCommandRequest(BaseModel):
    depth_um: int
    time_s: int
    counts: int = 1

class SignalParamRequest(BaseModel):
    vpp: Optional[float] = None
    freq: float
    high: Optional[float] = None
    low: Optional[float] = None

class SignalPolarityRequest(BaseModel):
    mode: str  # "positive" | "negative"
    magnitude: float = 2.5
    channel: int = 1

class SignalScpiScriptRequest(BaseModel):
    commands: List[str]
    settle_ms: int = 80

class RagQueryRequest(BaseModel):
    query: str
    model: Optional[str] = None
    target_lib: str = "core"  # "core" or "macro"
    top_k: int = 3
    temperature: float = 0.3
    top_p: float = 0.7


def build_hardware_snapshot() -> Dict[str, Any]:
    bridge = get_bridge()
    sg = get_signal_generator()

    try:
        bridge_state = bridge.get_state()
    except Exception as exc:
        bridge_state = {"bridge_internal_state": "FAULT", "error": str(exc)}

    try:
        sg_state = sg.get_state()
    except Exception as exc:
        sg_state = {"error": str(exc)}

    return {
        "bridge": {
            "is_connected": bool(getattr(bridge, "is_connected", False)),
            "port": getattr(bridge, "port", "None"),
            "mode": getattr(bridge, "mode", "Serial"),
            "state": bridge_state,
        },
        "sg": {
            "is_connected": bool(getattr(sg, "is_connected", False)),
            "state": sg_state,
        },
    }

@app.get("/api/config")
async def get_config():
    config = load_local_config()
    return {
        "api_key": config.get("api_key", ""),
        "zhipu_api_key": config.get("zhipu_api_key", ""),
        "deepseek_api_key": config.get("deepseek_api_key", ""),
        "volc_api_key": config.get("volc_api_key", ""),
        "llm_provider": config.get("llm_provider"),
        "selected_model": config.get("selected_model"),
        "llm_model": config.get("selected_model"),
        "embed_model": config.get("embed_model"),
        "base_url": config.get("base_url"),
        "is_initialized": rag_engine is not None,
    }

@app.post("/api/config/validate")
async def validate_config_only(req: ConfigInitRequest):
    """仅验证凭据，不保存配置、不重建 RAG 引擎。"""
    config = load_local_config()
    provider = normalize_provider(req.llm_provider)
    selected_model = req.selected_model or req.llm_model or config.get("selected_model") or "glm-4-flash"

    zhipu_key = req.zhipu_api_key if req.zhipu_api_key is not None else config.get("zhipu_api_key", "")
    deepseek_key = req.deepseek_api_key if req.deepseek_api_key is not None else config.get("deepseek_api_key", "")
    volc_key = req.volc_api_key if req.volc_api_key is not None else config.get("volc_api_key", "")

    if req.api_key:
        if provider == "ZhipuAI":
            zhipu_key = req.api_key
        elif provider == "DeepSeek":
            deepseek_key = req.api_key
        elif provider == "VolcEngine":
            volc_key = req.api_key

    active_key_map = {"ZhipuAI": zhipu_key, "DeepSeek": deepseek_key, "VolcEngine": volc_key}
    active_key = req.api_key or active_key_map.get(provider, "")
    if not active_key:
        raise HTTPException(status_code=400, detail="缺少可用的 API Key")

    test_config = dict(config)
    test_config.update({
        "api_key": active_key,
        "llm_provider": provider,
        "selected_model": selected_model,
        "base_url": req.base_url if req.base_url is not None else DEFAULT_BASE_URLS.get(provider, ""),
        "zhipu_api_key": zhipu_key,
        "deepseek_api_key": deepseek_key,
        "volc_api_key": volc_key,
    })

    validation = validate_config_credentials(test_config)
    return {
        "ok": validation["llm"]["ok"],
        "llm_provider": provider,
        "selected_model": selected_model,
        "validation": validation,
    }


@app.post("/api/config/init")
async def init_config(req: ConfigInitRequest):
    global rag_engine
    config = load_local_config()
    provider = normalize_provider(req.llm_provider)
    selected_model = req.selected_model or req.llm_model or config.get("selected_model") or "glm-4-flash"

    # 各 provider key：请求中有值则用请求值，否则保留已存储的值
    zhipu_key = req.zhipu_api_key if req.zhipu_api_key is not None else config.get("zhipu_api_key", "")
    deepseek_key = req.deepseek_api_key if req.deepseek_api_key is not None else config.get("deepseek_api_key", "")
    volc_key = req.volc_api_key if req.volc_api_key is not None else config.get("volc_api_key", "")

    # 兼容：api_key 字段直接写入对应 provider 的专用 key
    if req.api_key:
        if provider == "ZhipuAI":
            zhipu_key = req.api_key
        elif provider == "DeepSeek":
            deepseek_key = req.api_key
        elif provider == "VolcEngine":
            volc_key = req.api_key

    # 当前激活的 key
    active_key_map = {"ZhipuAI": zhipu_key, "DeepSeek": deepseek_key, "VolcEngine": volc_key}
    active_key = req.api_key or active_key_map.get(provider, "")
    if not active_key:
        raise HTTPException(status_code=400, detail="缺少可用的 API Key")

    new_config = dict(config)
    new_config.update(
        {
            "api_key": active_key,
            "llm_provider": provider,
            "selected_model": selected_model,
            "llm_model": selected_model,
            "embed_model": req.embed_model,
            "base_url": req.base_url if req.base_url is not None else DEFAULT_BASE_URLS.get(provider, ""),
            "zhipu_api_key": zhipu_key,
            "deepseek_api_key": deepseek_key,
            "volc_api_key": volc_key,
        }
    )

    validation = validate_config_credentials(new_config)
    if not validation["llm"]["ok"] or not validation["embedding"]["ok"]:
        raise HTTPException(
            status_code=400,
            detail={"message": "API 密钥验证失败", "validation": validation},
        )

    save_local_config(new_config)
    config = new_config

    try:
        rag_engine = create_rag_engine(config)
    except Exception as exc:
        rag_engine = None
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "status": "success",
        "llm_provider": config["llm_provider"],
        "llm_model": config["selected_model"],
        "validation": validation,
    }

@app.get("/api/etching/status")
async def get_etching_system_status():
    return build_hardware_snapshot()


@app.websocket("/ws/hardware/telemetry")
async def hardware_telemetry(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            try:
                snapshot = build_hardware_snapshot()
            except Exception as exc:
                snapshot = {
                    "bridge": {
                        "is_connected": False,
                        "port": "None",
                        "mode": "Serial",
                        "state": {"bridge_internal_state": "FAULT", "error": str(exc)},
                    },
                    "sg": {
                        "is_connected": False,
                        "state": {"error": str(exc)},
                    },
                }
            await websocket.send_json(snapshot)
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        return
    except Exception:
        return

@app.post("/api/etching/connect_bridge")
async def connect_bridge(req: ConnectBridgeRequest):
    bridge = get_bridge()
    mode = req.mode or "Serial"
    if mode == "Network": mode = "WebSocket"
    target = req.target or req.port
    force_reconnect = bool(req.force_reconnect)
    if not target: raise HTTPException(status_code=400, detail="缺少 target/port 参数")
    success = bridge.connect(mode=mode, port_or_ip=target)
    if success: return {"status": "success", "mode": mode}
    raise HTTPException(status_code=500, detail="硬件链路建立失败")

@app.post("/api/etching/disconnect_bridge")
async def disconnect_bridge():
    bridge = get_bridge()
    bridge.disconnect()
    return {"status": "success"}

@app.post("/api/etching/command")
async def send_manual_command(req: Dict[str, Any] = Body(...)):
    bridge = get_bridge()
    success, msg = bridge.send_command(req.get("flag", 7))
    if success: return {"status": "success"}
    raise HTTPException(status_code=500, detail=msg)

@app.post("/api/etching/auto_start")
async def start_auto_etching(req: EtchingCommandRequest):
    bridge = get_bridge()
    success, msg = bridge.trigger_auto_etch(req.depth_um, req.time_s, req.counts)
    if success: return {"status": "success"}
    raise HTTPException(status_code=500, detail=msg)

@app.post("/api/etching/chat")
async def assistant_chat(req: AgentChatRequest):
    try:
        config = load_local_config()
        strategy = build_agent_strategy(config, req.model)
        agent = EtchingAgent(strategy=strategy)
        result = agent.chat(req.message, req.history)
        return {
            "reply": result.get("reply", ""),
            "thought": result.get("thought", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/ports")
async def get_ports():
    ports = [p.device for p in serial.tools.list_ports.comports()]
    return {"ports": ports}

@app.get("/api/agent/tools")
async def get_agent_tools():
    return {"tools": AGENT_TOOLS}

@app.get("/api/rag/files")
async def get_rag_files():
    if not os.path.exists(PDF_STORAGE_DIR):
        return {"files": []}
    files = []
    for f in os.listdir(PDF_STORAGE_DIR):
        if f.lower().endswith((".pdf", ".md", ".txt")):
            path = os.path.join(PDF_STORAGE_DIR, f)
            stats = os.stat(path)
            files.append({
                "name": f,
                "size": stats.st_size,
                "mtime": stats.st_mtime
            })
    return {"files": sorted(files, key=lambda x: x["mtime"], reverse=True)}


@app.post("/api/rag/upload")
async def upload_rag_file(file: UploadFile = File(...), target_lib: str = "core"):
    if not os.path.exists(PDF_STORAGE_DIR):
        os.makedirs(PDF_STORAGE_DIR, exist_ok=True)
    
    file_path = os.path.join(PDF_STORAGE_DIR, file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    engine = ensure_rag_engine()
    if engine:
        try:
            num_chunks = engine.ingest_file(file_path, target_lib=target_lib)
            return {"status": "success", "filename": file.filename, "chunks": num_chunks}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        return {"status": "success", "filename": file.filename, "warning": "RAG engine not initialized, file saved but not indexed"}


@app.delete("/api/rag/files/{filename}")
async def delete_rag_file(filename: str, target_lib: str = "core"):
    file_path = os.path.join(PDF_STORAGE_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Optional: Delete from vector store and Knowledge Graph
    engine = ensure_rag_engine()
    if engine:
        store = engine.macro_store if target_lib == "macro" else engine.core_store
        try:
            store.delete(where={"source_file": filename})
            engine.kg_manager.clear_by_file(filename)
        except Exception:
            pass
            
    return {"status": "success"}


@app.get("/api/rag/kg")
async def get_rag_kg_data():
    engine = ensure_rag_engine()
    if engine is None: raise HTTPException(status_code=503, detail="RAG 引擎尚未初始化")
    return engine.get_kg_data()


@app.post("/api/rag/query")
async def rag_query(req: RagQueryRequest):
    engine = ensure_rag_engine()
    if engine is None: raise HTTPException(status_code=503, detail="RAG 引擎尚未初始化")
    result = engine.query_with_rag(user_query=req.query, top_k=req.top_k, model=req.model or load_local_config().get("selected_model", "glm-4-flash"), target_lib=req.target_lib)
    return {"answer": result.get("answer", ""), "usage": result.get("usage", {})}


@app.get("/api/database/experiments")
async def get_database_experiments(
    page: int = 1, 
    page_size: int = 10, 
    sort_by: str = "id", 
    order: str = "desc"
):
    if not os.path.exists(EXPERIMENT_DB_PATH):
        raise HTTPException(status_code=404, detail="数据库文件不存在")
    
    conn = sqlite3.connect(EXPERIMENT_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    offset = (page - 1) * page_size
    
    # 获取总数
    cursor.execute("SELECT COUNT(*) FROM experiments")
    total_count = cursor.fetchone()[0]
    
    # 扩展排序白名单，支持前端点击的所有主要列
    sortable_fields = {
        "id",
        "dataset_id",
        "stage_name",
        "group_name",
        "group_index",
        "run_label",
        "sample_count",
        "status",
        "quality_score",
        "actual_angle_deg",
        "positive_voltage_v",
        "stability"
    }
    safe_sort_by = sort_by if sort_by in sortable_fields else "id"
    # 如果排序字段属于子表，需要调整排序前缀
    sort_prefix = ""
    if safe_sort_by in ["quality_score", "actual_angle_deg", "stability", "roughness", "symmetry_score"]:
        sort_prefix = "m."
    elif safe_sort_by in ["positive_voltage_v", "negative_voltage_v", "frequency_hz", "immersion_depth_um"]:
        sort_prefix = "p."
    else:
        sort_prefix = "e."

    safe_order = "ASC" if order.lower() == "asc" else "DESC"

    # 查询详细数据并关联参数、测量和图片
    query = f"""
        SELECT 
            e.*, 
            p.positive_voltage_v, 
            p.negative_voltage_v, 
            p.frequency_hz,
            p.immersion_depth_um,
            p.solution_concentration,
            p.etching_time_s,
            p.tip_diameter_um,
            p.capillary_diameter_um,
            p.heating_count,
            p.parameter_json,
            m.target_cone_angle_deg AS target_angle_deg, 
            m.cone_angle_deg AS actual_angle_deg, 
            m.angle_diff_deg,
            m.quality_score,
            m.symmetry_score,
            m.roughness,
            m.stability,
            m.measurement_json,
            i.image_path as main_image 
        FROM experiments e
        LEFT JOIN experiment_parameters p ON e.id = p.experiment_id
        LEFT JOIN experiment_measurements m ON e.id = m.experiment_id
        LEFT JOIN experiment_images i ON e.id = i.experiment_id AND (i.image_index = 1 OR i.id = (SELECT MIN(id) FROM experiment_images WHERE experiment_id = e.id))
        ORDER BY {sort_prefix}{safe_sort_by} {safe_order}
        LIMIT ? OFFSET ?
    """
    cursor.execute(query, (page_size, offset))
    rows = [dict(row) for row in cursor.fetchall()]
    
    # 转换路径为 URL 并处理空值与 JSON 备选数据
    for row in rows:
        # 尝试从 JSON 字段解析备选数据
        try:
            p_json = json.loads(row.get("parameter_json")) if row.get("parameter_json") else {}
        except:
            p_json = {}
        try:
            m_json = json.loads(row.get("measurement_json")) if row.get("measurement_json") else {}
        except:
            m_json = {}

        # 补齐关键数值字段
        numeric_fields = [
            "positive_voltage_v", "negative_voltage_v", "frequency_hz", 
            "immersion_depth_um", "solution_concentration", "etching_time_s",
            "actual_angle_deg", "target_angle_deg", "quality_score", "symmetry_score"
        ]
        for field in numeric_fields:
            val = row.get(field)
            # 如果列值为空，尝试从 p_json 或 m_json 获取
            if val is None or val == "":
                val = p_json.get(field) if field in p_json else m_json.get(field)
            
            if val is None or val == "":
                row[field] = 0.0
            else:
                try:
                    row[field] = float(val)
                except (ValueError, TypeError):
                    row[field] = 0.0

        # 处理 SEM 图像 URL
        image_val = row.get("main_image")
        if image_val:
            try:
                # 统一路径处理：支持 Windows 绝对路径映射到 /cvdata/
                path_str = str(image_val).replace("\\", "/")
                # 寻找 LabOSData 标志位，直接进行相对路径提取
                search_key = "LabOSData/"
                if search_key in path_str:
                    rel_path = path_str.split(search_key)[1]
                    row["main_image_url"] = f"/cvdata/{rel_path}"
                else:
                    row["main_image_url"] = None
            except Exception:
                row["main_image_url"] = None
        else:
            row["main_image_url"] = None
    
    conn.close()
    return {
        "API_VERSION": "REALLY_THE_NEW_CODE_002",
        "data": rows,
        "total": total_count,
        "page": page,
        "page_size": page_size
    }

if __name__ == "__main__":
    import uvicorn
    # 确保当前目录在 sys.path 中，以便 uvicorn 找到 main:app
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True, reload_dirs=[current_dir])

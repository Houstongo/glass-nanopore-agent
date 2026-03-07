import os
import sqlite3
from typing import Any, Dict, List, Optional

try:
    from zhipuai import ZhipuAI
except Exception:
    ZhipuAI = None

try:
    from openai import OpenAI
except Exception:
    OpenAI = None

try:
    from langchain_chroma import Chroma
except Exception:
    Chroma = None

try:
    from langchain_core.documents import Document
    from langchain_core.embeddings import Embeddings
except Exception:
    Document = None
    Embeddings = object

from .kg_manager import KnowledgeGraphManager

_global_engine = None


def get_global_engine():
    return _global_engine



class OpenAICompatibleEmbeddingsWrapper(Embeddings):
    """LangChain Embedding 适配器，使用任意 OpenAI 兼容接口（火山方舟/DeepSeek 等）。"""

    def __init__(self, api_key: str, model: str, base_url: str):
        if OpenAI is None:
            raise RuntimeError("openai SDK 未安装")
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        vectors: List[List[float]] = []
        for text in texts:
            text = (text or "").strip()
            if not text:
                continue
            resp = self.client.embeddings.create(model=self.model, input=text)
            vectors.append(resp.data[0].embedding)
        return vectors

    def embed_query(self, text: str) -> List[float]:
        resp = self.client.embeddings.create(model=self.model, input=text)
        return resp.data[0].embedding


class LocalBGEEmbeddingsWrapper(Embeddings):
    """本地 BGE 系列 Embedding 模型适配器（基于 sentence-transformers，无需 API）。

    默认使用 BAAI/bge-large-zh-v1.5，支持后续微调替换。
    模型首次使用时自动从 HuggingFace 下载，缓存到本地。
    """

    def __init__(self, model_name: str = "BAAI/bge-large-zh-v1.5"):
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            raise RuntimeError("sentence-transformers 未安装，请执行：pip install sentence-transformers")
        # 加载模型，device=cpu 保持跨机器兼容性
        self.model = SentenceTransformer(model_name, device="cpu")
        self.model_name = model_name

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        # 过滤空文本，批量 encode 提升效率
        clean_texts = [(t or "").strip() for t in texts]
        clean_texts = [t if t else " " for t in clean_texts]
        vectors = self.model.encode(clean_texts, normalize_embeddings=True)
        return [v.tolist() for v in vectors]

    def embed_query(self, text: str) -> List[float]:
        # BGE 模型查询侧需添加 instruction 前缀以提升检索质量
        query_with_instruction = f"为这个句子生成表示以用于检索相关文章：{text}"
        vector = self.model.encode(query_with_instruction, normalize_embeddings=True)
        return vector.tolist()


class NanoporeRAGEngine:
    def __init__(
        self,
        api_key: str,
        persist_directory: str = "./data/chroma_db",
        base_url: Optional[str] = None,
        embedding_key: Optional[str] = None,
        model_name: str = "glm-4-flash",
        embed_model: str = "embedding-3",
        llm_provider: str = "ZhipuAI",
    ):
        if not api_key:
            raise ValueError("LLM api_key is required")
        if Chroma is None:
            raise RuntimeError("langchain_chroma is not installed")

        self.api_key = api_key
        self.base_url = base_url
        self.embedding_key = embedding_key or api_key
        self.model_name = model_name
        self.embed_model = embed_model
        self.llm_provider = llm_provider
        self.persist_directory = persist_directory

        os.makedirs(self.persist_directory, exist_ok=True)

        # 根据 provider 选择 LLM client
        if llm_provider == "ZhipuAI":
            if ZhipuAI is None:
                raise RuntimeError("zhipuai SDK 未安装")
            self.llm_client = ZhipuAI(api_key=api_key)
            self.llm_mode = "zhipu"
        else:
            # 火山方舟 / DeepSeek / Custom 均走 OpenAI 兼容接口
            if OpenAI is None:
                raise RuntimeError("openai SDK 未安装")
            if not base_url:
                raise ValueError(f"provider={llm_provider} 需要提供 base_url")
            self.llm_client = OpenAI(api_key=api_key, base_url=base_url)
            self.llm_mode = "openai"

        # 向量数据库路径分离
        self.core_dir = os.path.join(persist_directory, "core")
        self.macro_dir = os.path.join(persist_directory, "macro")
        os.makedirs(self.core_dir, exist_ok=True)
        os.makedirs(self.macro_dir, exist_ok=True)

        # 根据 embed_model 选择 Embedding 实现
        # "local:xxx" → 本地 BGE 模型
        # 其他 → OpenAI 兼容接口（需要 base_url）
        if self.embed_model.startswith("local:"):
            local_model_name = self.embed_model[len("local:"):]
            self.embeddings = LocalBGEEmbeddingsWrapper(model_name=local_model_name)
        else:
            embed_base_url = base_url or ""
            self.embeddings = OpenAICompatibleEmbeddingsWrapper(
                api_key=self.embedding_key,
                model=self.embed_model,
                base_url=embed_base_url,
            )
        
        # 1. 核心库 (Core Knowledge) - 实验参数、严谨工艺
        self.core_store = Chroma(
            collection_name="core_knowledge",
            embedding_function=self.embeddings,
            persist_directory=self.core_dir,
        )
        
        # 2. 知识库 (General Knowledge/Macro) - 灵感 Idea、相关知识
        self.macro_store = Chroma(
            collection_name="macro_knowledge",
            embedding_function=self.embeddings,
            persist_directory=self.macro_dir,
        )

        # 向后兼容
        self.vector_store = self.core_store

        # 知识图谱 (共享)
        kg_db_path = os.path.join(os.path.dirname(persist_directory), "knowledge_graph.db")
        self.kg_manager = KnowledgeGraphManager(db_path=kg_db_path, api_key=api_key)

        global _global_engine
        _global_engine = self

    def _chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.3,
        top_p: float = 0.7,
        max_tokens: int = 1200,
    ):
        selected_model = model or self.model_name
        if self.llm_mode == "zhipu":
            return self.llm_client.chat.completions.create(
                model=selected_model,
                messages=messages,
                temperature=temperature,
                top_p=top_p,
                max_tokens=max_tokens,
            )
        return self.llm_client.chat.completions.create(
            model=selected_model,
            messages=messages,
            temperature=temperature,
            top_p=top_p,
            max_tokens=max_tokens,
        )

    def ingest_file(self, file_path: str, target_lib: str = "core") -> int:
        from langchain_community.document_loaders import PyMuPDFLoader, TextLoader
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        store = self.macro_store if target_lib == "macro" else self.core_store

        if not os.path.exists(file_path):
            raise FileNotFoundError(file_path)

        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            docs = PyMuPDFLoader(file_path).load()
            splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=180)
        elif ext in (".md", ".txt"):
            docs = TextLoader(file_path, encoding="utf-8").load()
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1200, chunk_overlap=200, separators=["\n## ", "\n### ", "\n\n", "\n", "。", ".", " "]
            )
        else:
            raise ValueError(f"Unsupported file extension: {ext}")

        chunks = splitter.split_documents(docs)
        if not chunks:
            return 0

        base_name = os.path.basename(file_path)
        for chunk in chunks:
            chunk.metadata["source_file"] = base_name
            chunk.metadata["source"] = base_name

        try:
            sample_text = "\n".join([d.page_content for d in chunks])[:3000]
            if sample_text.strip():
                self.kg_manager.extract_from_text(sample_text, source_file=base_name)
        except Exception as exc:
            print(f"KG extraction skipped: {exc}")

        store.add_documents(chunks)
        return len(chunks)

    def execute_sql(self, sql_query: str) -> str:
        db_path = "./data/logs.db"
        if not os.path.exists(db_path):
            return "Database not found"
        conn = sqlite3.connect(db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(sql_query)
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            return str({"columns": columns, "rows": rows[:50]})
        finally:
            conn.close()

    def query_with_rag(
        self,
        user_query: str,
        top_k: int = 3,
        model: Optional[str] = None,
        temperature: float = 0.3,
        top_p: float = 0.7,
        max_tokens: int = 1200,
        target_lib: str = "core",
    ) -> Dict[str, Any]:
        user_query = (user_query or "").strip()
        if not user_query:
            return {"answer": "", "retrieved_chunks": [], "usage": {}}

        retrieved_docs: List[Any] = []
        store = self.macro_store if target_lib == "macro" else self.core_store
        
        if top_k and top_k > 0:
            try:
                retrieved_docs = store.similarity_search(user_query, k=max(top_k, 1))
            except Exception as exc:
                print(f"Vector retrieval failed: {exc}")
                retrieved_docs = []

        context_text = "\n\n---\n\n".join(
            [f"[Chunk {i + 1}] {doc.page_content}" for i, doc in enumerate(retrieved_docs[: max(top_k, 1)])]
        )
        if not context_text:
            context_text = "No local context retrieved."

        if target_lib == "core":
            system_prompt = (
                "你是“纳米孔实验参数专家”。\n"
                "职责：提供严谨、具体的实验参数建议和工艺步骤。\n"
                "1. 只参考 Context；不要编造数值。\n"
                "2. 给出明确的可执行区间（如：电压 200-300mV）。\n"
                "3. 语气简洁干练。"
            )
        else:
            system_prompt = (
                "你是“科研创意灵感导师”。\n"
                "职责：从宏观文献中提取 Idea，寻找跨学科关联和科学想象力。\n"
                "1. 鼓励基于 Context 进行合理的科学展望。\n"
                "2. 寻找不同文献之间的潜在连接点。\n"
                "3. 提供具有启发性的下一步研究方向。"
            )
        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"用户问题：\n{user_query}\n\n"
                    f"Context（检索片段）：\n{context_text}\n\n"
                    "请按要求输出结构化结论，并在“依据”中引用 [Chunk n]。"
                ),
            },
        ]

        response = self._chat_completion(
            messages=messages,
            model=model,
            temperature=temperature,
            top_p=top_p,
            max_tokens=max_tokens,
        )

        answer_text = response.choices[0].message.content or ""
        usage = {}
        if hasattr(response, "usage") and response.usage is not None:
            try:
                usage = response.usage.model_dump()
            except Exception:
                usage = {}

        return {
            "answer": answer_text,
            "retrieved_chunks": retrieved_docs[: max(top_k, 1)] if top_k and top_k > 0 else [],
            "usage": usage,
        }

    def get_kg_data(self) -> Dict[str, Any]:
        return self.kg_manager.get_graph_data()

    def reset_vector_store(self, target_lib: str = "core") -> bool:
        if target_lib == "macro":
            self.macro_store.delete_collection()
            self.macro_store = Chroma(
                collection_name="macro_knowledge",
                embedding_function=self.embeddings,
                persist_directory=self.macro_dir,
            )
        else:
            self.core_store.delete_collection()
            self.core_store = Chroma(
                collection_name="core_knowledge",
                embedding_function=self.embeddings,
                persist_directory=self.core_dir,
            )
        return True

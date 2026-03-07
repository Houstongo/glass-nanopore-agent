import json
from abc import ABC, abstractmethod
import serial.tools.list_ports

from .hardware_bridge import get_bridge
from .signal_generator import get_signal_generator

# --- 1. 工具定义 (Function Call 格式) ---
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_hardware_telemetry",
            "description": "获取刻蚀系统实时遥测数据，包括电流、电压、温度等物理量",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "start_etching_process",
            "description": "启动纳米通道刻蚀流程，写入深度、时间和循环次数等控制参数",
            "parameters": {
                "type": "object",
                "properties": {
                    "depth_um": {"type": "integer", "description": "目标刻蚀深度 (微米)"},
                    "time_s": {"type": "integer", "description": "单次刻蚀时长 (秒)"},
                    "counts": {"type": "integer", "description": "循环次数"}
                },
                "required": ["depth_um", "time_s"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "emergency_stop",
            "description": "紧急停止所有刻蚀操作，立即切断信号输出并锁定系统",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "set_signal_parameters",
            "description": "设置信号发生器参数，包括电压峰峰值、频率、高低电平",
            "parameters": {
                "type": "object",
                "properties": {
                    "vpp": {"type": "number", "description": "峰峰值电压 (V)"},
                    "freq": {"type": "number", "description": "频率 (Hz)"},
                    "high": {"type": "number", "description": "高电平 (V)"},
                    "low": {"type": "number", "description": "低电平 (V)"}
                },
                "required": ["freq"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_manual_etching_command",
            "description": "向刻蚀控制台发送手动指令帧，直接操作底层硬件协议",
            "parameters": {
                "type": "object",
                "properties": {
                    "command_hex": {"type": "string", "description": "十六进制指令字符串"}
                },
                "required": ["command_hex"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "manage_hardware_connection",
            "description": "管理硬件连接：建立、断开、重连指定设备。支持串口(Serial)和无线(WebSocket)。",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {"type": "string", "description": "操作类型: connect / disconnect / reconnect"},
                    "mode": {"type": "string", "description": "连接模式: Serial / WebSocket"},
                    "port_or_ip": {"type": "string", "description": "目标串口号 (如 COM3) 或 IP:Port (如 192.168.1.137:81)"}
                },
                "required": ["action"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_knowledge_base",
            "description": "查询实验室知识库（RAG），获取关于刻蚀参数、尖端几何形状（如锥角）与控制变量之间关系的科学指导",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "搜索关键词和问题，例如：如何制备 15 度锥角的尖端？"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_system_serial_ports",
            "description": "扫描并返回当前系统所有可用的串口设备列表",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    }
]

# --- 2. 工具执行函数 ---
def fn_get_hardware_telemetry():
    """获取硬件遥测数据"""
    bridge = get_bridge()
    if bridge and bridge.is_connected:
        return json.dumps(bridge.get_telemetry(), ensure_ascii=False)
    return json.dumps({"status": "离线", "message": "硬件未连接"}, ensure_ascii=False)

def fn_start_etching_process(depth_um: int, time_s: int, counts: int = 1):
    """启动刻蚀流程"""
    bridge = get_bridge()
    if bridge and bridge.is_connected:
        result = bridge.trigger_auto_etch(depth_um, time_s, counts)
        return json.dumps(result, ensure_ascii=False)
    return json.dumps({"error": "硬件未连接，无法执行刻蚀"}, ensure_ascii=False)

def fn_emergency_stop():
    """紧急停止"""
    bridge = get_bridge()
    if bridge and bridge.is_connected:
        bridge.send_command(7)
        return json.dumps({"status": "已发送全局紧急停止信号"}, ensure_ascii=False)
    return json.dumps({"status": "硬件未连接，但信号已标记为停止"}, ensure_ascii=False)

def fn_set_signal_parameters(freq: float, vpp: float = None, high: float = None, low: float = None):
    """设置信号发生器参数"""
    sg = get_signal_generator()
    params = {"freq": freq}
    if vpp is not None: params["vpp"] = vpp
    if high is not None: params["high"] = high
    if low is not None: params["low"] = low
    result = sg.set_parameters(**params)
    return json.dumps(result, ensure_ascii=False)

def fn_send_manual_etching_command(command_hex: str):
    """发送手动刻蚀指令"""
    bridge = get_bridge()
    if bridge and bridge.is_connected:
        try:
            raw_bytes = bytes.fromhex(command_hex.replace(" ", ""))
            bridge.send_raw(raw_bytes)
            return json.dumps({"status": "指令已发送", "hex": command_hex}, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"error": f"指令解析失败: {str(e)}"}, ensure_ascii=False)
    return json.dumps({"error": "硬件未连接"}, ensure_ascii=False)

def fn_manage_hardware_connection(action: str, port_or_ip: str = None, mode: str = "Serial"):
    """管理硬件连接"""
    bridge = get_bridge()
    if action == "connect" and port_or_ip:
        result = bridge.connect(mode=mode, port_or_ip=port_or_ip)
        return json.dumps({"status": "连接成功" if result else "连接失败", "target": port_or_ip, "mode": mode}, ensure_ascii=False)
    elif action == "disconnect":
        bridge.disconnect()
        return json.dumps({"status": "已断开连接"}, ensure_ascii=False)
    elif action == "reconnect":
        bridge.disconnect()
        result = bridge.connect(mode=mode, port_or_ip=port_or_ip) if port_or_ip else False
        return json.dumps({"status": "重连成功" if result else "重连失败"}, ensure_ascii=False)
    return json.dumps({"error": f"未知操作: {action}"}, ensure_ascii=False)

def fn_get_system_serial_ports():
    """获取系统串口列表"""
    ports = serial.tools.list_ports.comports()
    port_list = [{"device": p.device, "description": p.description} for p in ports]
    return json.dumps(port_list, ensure_ascii=False)

def fn_query_knowledge_base(query: str):
    """查询 RAG 引擎"""
    from .rag_engine import get_global_engine
    engine = get_global_engine()
    if not engine:
        return json.dumps({"error": "RAG 引擎未初始化"}, ensure_ascii=False)
    
    result = engine.query_with_rag(user_query=query, top_k=3)
    return json.dumps({
        "answer": result.get("answer"),
        "context_summary": [c.page_content[:200] for c in result.get("retrieved_chunks", [])]
    }, ensure_ascii=False)

# 函数名 -> 函数对象的映射表
available_functions = {
    "get_hardware_telemetry": fn_get_hardware_telemetry,
    "start_etching_process": fn_start_etching_process,
    "emergency_stop": fn_emergency_stop,
    "set_signal_parameters": fn_set_signal_parameters,
    "send_manual_etching_command": fn_send_manual_etching_command,
    "manage_hardware_connection": fn_manage_hardware_connection,
    "get_system_serial_ports": fn_get_system_serial_ports,
    "query_knowledge_base": fn_query_knowledge_base,
}

# --- 3. 策略模式: LLM 引擎抽象接口 ---
class BaseLLMStrategy(ABC):
    @abstractmethod
    def create_completion(self, messages: list, tools: list = None, temperature: float = 0.1):
        pass

class ZhipuStrategy(BaseLLMStrategy):
    def __init__(self, api_key: str, model_name: str = "glm-4.7"):
        from zhipuai import ZhipuAI
        self.client = ZhipuAI(api_key=api_key)
        self.model_name = model_name

    def create_completion(self, messages: list, tools: list = None, temperature: float = 0.1):
        kwargs = {"model": self.model_name, "messages": messages, "temperature": temperature}
        if tools: kwargs["tools"] = tools
        return self.client.chat.completions.create(**kwargs).choices[0].message

class OpenAIStrategy(BaseLLMStrategy):
    def __init__(self, api_key: str, base_url: str, model_name: str = "deepseek-chat"):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model_name = model_name

    def create_completion(self, messages: list, tools: list = None, temperature: float = 0.1):
        kwargs = {"model": self.model_name, "messages": messages, "temperature": temperature}
        if tools: kwargs["tools"] = tools
        return self.client.chat.completions.create(**kwargs).choices[0].message

# --- 4. 核心大模型会话流引擎 (Function Call) ---
class EtchingAgent:
    def __init__(self, strategy: BaseLLMStrategy):
        self.llm = strategy
        self.sys_prompt = {"role": "system", "content": """你是一个负责控制'玻璃纳米通道刻蚀系统'的专业多模态智能体。
你的能力通过 LabOS MCP Server 提供的工具和资源来实现。
【核心任务】：
1. 接收用户的自然语言指令（如：制备指定锥角的尖端）。
2. 在调用控制工具前，先通过 query_knowledge_base 查询最佳实验参数。
3. 自动设计实验步骤并调用 start_etching_process 启动流程。

【思维链要求】：
你必须在输出正式回复前，先在 <thought> 标签内展示你的逻辑推理过程：
- 对用户需求的物理建模（如：锥角 15° 对应什么样的进给比例）。
- 检索到的知识库依据。
- 最终设计的参数选择逻辑。

【可用工具】：query_knowledge_base, get_hardware_telemetry, start_etching_process, emergency_stop, set_signal_parameters, send_manual_etching_command, manage_hardware_connection...

【高度约束】：精简、专业、客观。回答中严禁使用任何表情符号，仅输出技术参数和系统判断。"""}

    def chat(self, user_msg: str, message_history: list) -> dict:
        messages = [self.sys_prompt]
        for m in message_history[-8:]:
            if m.get("role") in ["user", "assistant"]:
                content = m.get("content", "")
                messages.append({"role": m["role"], "content": content})
        
        messages.append({"role": "user", "content": user_msg})

        response_msg = self.llm.create_completion(messages=messages, tools=tools, temperature=0.1)
        
        thought = ""
        if response_msg.content and "<thought>" in response_msg.content:
            import re
            match = re.search(r'<thought>(.*?)</thought>', response_msg.content, re.DOTALL)
            if match:
                thought = match.group(1).strip()
                response_msg.content = response_msg.content.replace(match.group(0), "").strip()

        if getattr(response_msg, 'tool_calls', None):
            try:
                msg_dict = response_msg.model_dump()
            except AttributeError:
                msg_dict = {"role": "assistant", "content": response_msg.content, "tool_calls": [{"id": t.id, "type": "function", "function": {"name": t.function.name, "arguments": t.function.arguments}} for t in response_msg.tool_calls]}
            
            messages.append(msg_dict)

            for tool_call in response_msg.tool_calls:
                func_name = tool_call.function.name
                func = available_functions.get(func_name)
                func_result = ""
                if not func:
                    func_result = json.dumps({"error": f"未知工具: {func_name}"}, ensure_ascii=False)
                else:
                    try:
                        args = json.loads(tool_call.function.arguments) if tool_call.function.arguments else {}
                        func_result = func(**args)
                    except Exception as e:
                        func_result = json.dumps({"error": f"执行失败: {str(e)}"}, ensure_ascii=False)

                messages.append({"role": "tool", "content": str(func_result), "tool_call_id": tool_call.id})

            final_resp = self.llm.create_completion(messages=messages, tools=None)
            
            if final_resp.content and "<thought>" in final_resp.content:
                import re
                match_final = re.search(r'<thought>(.*?)</thought>', final_resp.content, re.DOTALL)
                if match_final:
                    thought += "\n" + match_final.group(1).strip()
                    final_resp.content = final_resp.content.replace(match_final.group(0), "").strip()

            return {"thought": thought, "reply": final_resp.content}
        
        return {"thought": thought, "reply": response_msg.content}

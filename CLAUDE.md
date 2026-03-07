# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lab-OS v3.0** — 玻璃纳米孔/纳米通道电化学刻蚀的闭环智能 Agent 平台。系统整合知识检索、参数决策、实验执行、异常诊断、结果复盘与经验反馈。

核心架构为**云-边-端三层递阶**：顶层 LLM 决策 → 中层边缘异常检测 → 底层 STM32 硬件控制。

## 运行命令

### 后端（FastAPI + Python）

```powershell
# 启动后端（默认 conda 环境 lab_agent，端口 8000）
powershell -ExecutionPolicy Bypass -File D:\AntigravityProject\scripts\dev\run-agent.ps1

# 可选参数
scripts\dev\run-agent.ps1 -CondaEnv lab_agent -BindHost 127.0.0.1 -Port 8000
```

手动启动：
```bash
cd apps/glass_nanopore_agent
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 前端（React + Vite）

```powershell
powershell -ExecutionPolicy Bypass -File D:\AntigravityProject\scripts\dev\run-frontend.ps1
```

手动启动：
```bash
cd apps/glass_nanopore_agent/frontend
npm run dev       # 开发服务器 (port 5173)
npm run build     # 生产构建
npm run lint      # ESLint 检查
```

### 同时启动前后端

```powershell
powershell -ExecutionPolicy Bypass -File D:\AntigravityProject\scripts\dev\run-all.ps1 -OpenBrowser
```

### 测试

```bash
# 在项目根目录运行
python -m pytest tests/

# 单个测试文件
python -m pytest tests/test_etching_experiment_db.py
```

### 开发环境自检

```powershell
powershell -ExecutionPolicy Bypass -File D:\AntigravityProject\scripts\dev\check-dev-env.ps1
```

## 架构说明

### 应用层：`apps/glass_nanopore_agent/`

**后端** (`backend/main.py` — 核心入口，696 行):
- FastAPI 应用，提供硬件控制、RAG 查询、对话、实验数据库查询等 REST 端点
- WebSocket 实时推送硬件遥测数据
- 配置文件 `./data/api_config.json` 管理 LLM provider（ZhipuAI / DeepSeek / Custom）
- 启动时自动加载 RAG 引擎和 KG 管理器

**核心模块** (`core/`):

| 文件 | 职责 |
|------|------|
| `agent_core.py` | MCP 工具定义（8+ 个工具）、ZhipuStrategy / OpenAIStrategy 策略模式 |
| `rag_engine.py` | `NanoporeRAGEngine`：Chroma 向量库 + LangChain，双存储架构（core_store / macro_store） |
| `kg_manager.py` | 知识图谱管理，使用 SQLite 存储节点/边，LLM 自动抽取实体关系 |
| `hardware_bridge.py` | 硬件通信桥（当前为 Mock 实现，生产环境替换为真实串口/WebSocket 驱动） |
| `signal_generator.py` | 信号发生器参数封装（频率、电压、波形） |

**RAG 双存储设计**：
- `core_store`：严格的实验流程/操作规范文档（高精度检索）
- `macro_store`：通用知识、文献、创新想法（宽泛知识覆盖）

**前端** (`frontend/src/`):
- React 18 + Vite 5，主要页面：`EtchingConsole`（硬件控制）、`KnowledgeBase`（RAG 管理）、`EtchingDatabase`（实验历史）、`PoreMeasurement`、`CleaningSystem`
- D3-Force + React-Force-Graph-2D 用于知识图谱可视化
- Recharts 用于数据可视化

### 数据层

- **实验数据库**：`D:/AntigravityProject/data/etching_experiments.sqlite`（规范化 SQLite：datasets / experiments / parameters / measurements / images）
- **向量数据库**：`./data/chroma_db/`（运行时创建）
- **外部图像数据**：`D:/LabOSData/cvdata/`（必须提前挂载，工具层依赖此路径）
- **LLM 配置**：`./data/api_config.json`

### 固件层：`firmware/etching_controller/`（只读）

STM32F103 固件，当前开发阶段**不修改固件源码**。CMake + arm-none-eabi-gcc 构建，输出 `.hex` 和 `.bin`。查看固件结构使用 `scripts/firmware/show-firmware-layout.ps1`。

### 知识资产：`knowledge/seed/knowledge_base_seed/`

RAG 知识库源文件，分 5 类：
1. `01_theory_and_literature/` — 理论与文献
2. `02_sop_and_workflow/` — 标准作业流程（含 `NANO_Agent_SOP_v1_0.md`）
3. `03_agent_and_rag/` — Agent 与 RAG 设计
4. `04_hardware_and_firmware/` — 硬件与固件文档
5. `05_experiment_data/` — 实验数据记录

### 数据库工具：`tools/`

- `etching_experiment_data_core.py`：从目录树扫描实验数据、解析命名规范、推断算法类型（FNA-MOBO / IST-MOBO / SingleFactor）
- `etching_sqlite_import.py`：从 XLSX 导入历史数据

## 关键约束

- `firmware/etching_controller` 下的 STM32 代码**默认不修改**
- 外部路径 `D:/LabOSData/cvdata/` 是硬编码依赖，运行工具层前需确认存在
- 后端相对路径（`./data/`）以 `apps/glass_nanopore_agent/` 为工作目录
- LLM provider 优先使用 ZhipuAI（GLM-4-Flash），Embedding 使用 `embedding-3`

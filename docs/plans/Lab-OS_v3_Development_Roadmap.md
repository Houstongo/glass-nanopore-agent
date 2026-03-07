# Lab-OS 3.0：微纳米通道智能制备平台综合开发计划

基于最新的技术方案，本项目将从单一的 Agent 系统演进为 **“云-边-端”异步协同的智能实验底座**。

## 1. 推荐目录结构 (Project Structure)
为了支撑三层异步协同架构，建议对代码仓库进行如下组织：

```text
d:\AntigravityProject\apps\glass_nanopore_agent\
├── backend\                 # L2 战略层：FastAPI 服务
│   ├── main.py              # API 路由与系统入口
│   └── data\                # 向量数据库、知识图谱逻辑、实验元数据 (SQLite/PostgreSQL)
├── core\                    # L1/L2 核心逻辑层
│   ├── agent_core.py        # 大模型决策逻辑 (Cerebral Cortex)
│   ├── rag_engine.py        # RAG 检索增强引擎
│   ├── kg_manager.py        # 知识图谱管理器
│   ├── hardware_bridge.py   # L1 通讯网关：ESP8266/Serial 协议转换
│   ├── anomaly_detector.py  # [NEW] 小模型毫秒级监测 (Spinal Reflex)
│   ├── vision_engine.py     # [NEW] 图像处理与针尖参数量化工具
│   ├── workflow_engine.py   # [NEW] 工作流执行器逻辑
│   └── signal_generator.py  # 信号发生器/驱动底层实现
├── frontend\                # L2 用户交互层 (React + Vite)
│   ├── src\
│   │   ├── pages\           # 实验仪表盘 (Etching, Cleaning, Measuring)
│   │   ├── components\      # 公共 UI 组件
│   │   └── workflow\        # [NEW] Coze 风格可视化编辑器组件
├── docs\                    # 技术文档与实验 SOP (Knowledge Base Source)
│   ├── plans\               # 开发路线图与数据库设计
│   └── specs\               # 硬件原语协议说明书
└── logs\                    # 实验运行日志与高频采样快照
```

## 2. 系统架构演进 (Cloud-Edge-Device)

### Phase 1: 执行层与感知层 (L0 & L1) 固化
- **L0 执行层 (STM32)**:
  - 完善串口帧协议：`55 AA [ID] [LEN] [DATA] [CHECK]`。
  - 实现“硬件看门狗”逻辑：当接收到 Flag 7 时，STM32 需在 10ms 内关断电流。
- **L1 感知层 (Python Edge)**:
  - 在 `core/hardware_bridge.py` 中引入线程池，负责频率为 100Hz 的数据监听。
  - **小模型模块**: 部署一个轻量级的 `AnomalDetector`（1D-CNN 或变分自编码器），用于监控 $dI/dt$ 突变，触发毫秒级快速响应。

### Phase 2: 战略层 (L2 - AI Agent) 升级
- 基于 FastAPI 扩展 API：
  - `/api/agent/mcp/tools`: 按照 Model Context Protocol 规范导出硬件工具。
  - `/api/agent/workflow`: 接收编排后的实验逻辑流。
- **RAG 引擎深度整合**: 将实验故障排查 SOP (Chapter 3) 转化为向量库，供大模型在检测到异常时进行“归因分析”。

## 2. 核心功能模块开发路径

### 第一阶段：MCP 工具化与硬件通信 (2-3 周)
- [ ] **工具封装**:
  - `Etch_Tool`: 下发 `depth_um`, `time_s` 等参数。
  - `Seal_Check_Tool`: 集成气密性检测逻辑（控制真空泵并回读压力梯度）。
  - `Visual_Tool`: 在 `core/vision_engine.py` 中实现基于 OpenCV 的针尖几何参数提取。
- [ ] **驱动重构**: 补全 `core/signal_generator.py` 的 SCPI 脚本发送逻辑。

### 第二阶段：大小模型协同控制 (3-4 周)
- [ ] **脊髓反射 (Spinal Reflex)**:
  - 实现小模型预测器：根据历史电流轨迹预测未来 50ms 波形。
  - 逻辑：`if |I_actual - I_predict| > threshold: trigger_stop()`。
- [ ] **大脑皮层 (Cerebral Cortex)**:
  - 当小模型报警时，L2 Agent 自动调用 RAG 检索“第三章失效模式”，判定是“气泡干扰”还是“电极极化”。
  - 动态修正：Agent 输出新的阈值 $\alpha, \beta$ 写回小模型配置文件。

### 第三阶段：Lab-OS 中央控制平台 (4-6 周)
- [ ] **Coze 风格工作流 (Frontend)**:
  - 使用 `reactflow` 或类似库实现可视化编排界面。
  - 节点类型：`制备节点`、`检测逻辑`、`分支判定（气密性）`、`图像分析`。
- [ ] **多模态实验看板**:
  - `Digital Twin`: Z 轴位移与电流波形的实时映射。
  - `Image Pipeline`: 展示 SEM 图像的处理流水线（灰度 -> 边缘 -> 拟合 -> 参数输出）。

## 3. 基础设施软件管线 (Data Pipeline)

### 数据库层
- **PostgreSQL**: 存储实验元数据（已在 `docs/plans` 中初步设计）。
- **InfluxDB (建议引入)**: 专门存储毫秒级的高频采样电流数据，支持 Agent 进行回放式实验分析。

### 视觉分析工具集
- **量化工具**: 通过边缘检测计算针尖曲率半径。
- **分类工具**: 训练一个小型感知机，判定针尖质量（Grade A/B/C），评分结果直接存入 PostgreSQL 供后续 LLM 进行强化学习优化。

## 4. 关键里程碑 (Milestones)
1. **Milestone 1**: 能够通过 Agent 语义指令执行一次完整且带有气密性自检的制备任务。
2. **Milestone 2**: 实现 $dI/dt$ 异常后的 Agent 自动复盘与工艺参数重构。
3. **Milestone 3**: 完成从图像采集到参数量化评分的自动化全生命周期管线。

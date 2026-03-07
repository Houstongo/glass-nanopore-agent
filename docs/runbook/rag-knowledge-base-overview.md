# RAG 知识库系统说明

## 1. 目标

本项目中的 RAG 知识库用于支撑玻璃纳米孔电刻蚀智能体的知识检索、参数决策、异常复盘和执行约束。

它不是一个通用问答库，而是一个围绕实验场景组织的领域知识系统，重点服务以下任务：

- 工艺参数推荐
- 机理约束检查
- 异常诊断与复盘
- SOP / 安全约束提示
- 视觉评价与图像分析参考
- 硬件协议与动作调用参考

## 2. 知识源范围

当前知识源覆盖六大方向：

- 核心工艺
- 机理约束
- 异常复盘
- SOP / 安全
- 视觉分析
- 硬件协议

知识源类型包括：

- 论文 PDF
- 网页 HTML
- 学位论文
- SOP 文档
- 官方硬件文档
- 图像分析文档

## 3. 数据位置

RAG 知识库原始数据不放在主工作区，而放在外部数据区：

```text
D:\LabOSData\knowledge_raw
```

主工作区只保留脚本、测试和文档：

```text
D:\AntigravityProject
```

## 4. 当前外部数据结构

当前 `D:\LabOSData\knowledge_raw` 包含：

- `00_index`
- `01_theory_physics`
- `02_domain_literature`
- `03_sop_safety`
- `04_failure_modes`
- `05_hardware_protocols`
- `06_agent_rag`
- `07_image_analysis`
- `retrieval_training`

汇总文件包括：

```text
D:\LabOSData\knowledge_raw\master_index.csv
D:\LabOSData\knowledge_raw\master_index_cn.csv
D:\LabOSData\knowledge_raw\master_index_summary.md
D:\LabOSData\knowledge_raw\embedding_input.csv
```

## 5. 已完成的数据整理

当前已经完成：

- 五轮知识源采集
- 总索引汇总
- 中文标题标准化
- 中文关键词生成
- 术语对照表整理
- embedding 输入生成
- 第一批检索训练样本生成

当前核心规模：

- 知识源总条目：`71`
- 中文增强索引条目：`71`
- 检索训练样本：`120`

## 6. 文本工作流

本项目的知识库文本工作流为：

```text
原始资料
-> 索引整理
-> 中文化
-> 术语统一
-> 文本清洗
-> chunk 切分
-> embedding 输入生成
-> 向量库
-> 智能体检索与决策
```

当前已经完成到：

- 原始资料采集
- 索引整理
- 中文化
- embedding 输入生成
- 检索训练样本生成

尚未正式完成：

- chunk 批量切分
- 向量库入库
- 在线检索服务接入

## 7. 中文化策略

当前知识库为中文 embedding 做了预处理：

- 保留英文标题
- 增加中文标准标题
- 增加中文短标题
- 增加中文关键词

对应文件：

```text
D:\LabOSData\knowledge_raw\master_index_cn.csv
D:\LabOSData\knowledge_raw\embedding_input.csv
D:\LabOSData\knowledge_raw\00_index\terminology_glossary_zh.md
```

## 8. 当前输出产物

### 总索引

```text
D:\LabOSData\knowledge_raw\master_index.csv
D:\LabOSData\knowledge_raw\master_index_cn.csv
```

### embedding 输入

```text
D:\LabOSData\knowledge_raw\embedding_input.csv
```

### 检索训练样本

```text
D:\LabOSData\knowledge_raw\retrieval_training\train_candidates.jsonl
D:\LabOSData\knowledge_raw\retrieval_training\train_candidates_summary.md
```

## 9. RAG 知识库在系统中的作用

对智能体来说，RAG 知识库承担的是“外部知识支撑层”角色：

- `核心工艺` -> 支撑参数推荐
- `机理约束` -> 支撑物理边界检查
- `异常复盘` -> 支撑故障归因与修正建议
- `SOP/安全` -> 支撑执行前约束
- `视觉分析` -> 支撑图像评价
- `硬件协议` -> 支撑动作调用参考

## 10. 下一步工作

建议下一阶段按以下顺序推进：

1. 从 `embedding_input.csv` 中筛出核心知识集
2. 做 chunk 切分
3. 建立向量库
4. 建立 query -> retrieval -> answer 的基础检索链
5. 用 `train_candidates.jsonl` 做 embedding 模型对比与微调实验

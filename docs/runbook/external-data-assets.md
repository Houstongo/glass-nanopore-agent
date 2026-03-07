# 外部数据资产说明

## 1. 目的

本文档说明 `D:\LabOSData` 中与知识库、嵌入、训练样本相关的外部数据资产，便于在主工作区 `D:\AntigravityProject` 内统一查看和维护。

## 2. 外部数据根目录

- 数据根目录：`D:\LabOSData`
- 知识源目录：`D:\LabOSData\knowledge_raw`
- 原始实验图片目录：`D:\LabOSData\cvdata`

## 3. 当前知识源目录结构

`D:\LabOSData\knowledge_raw` 当前包含：

- `00_index`
- `01_theory_physics`
- `02_domain_literature`
- `03_sop_safety`
- `04_failure_modes`
- `05_hardware_protocols`
- `06_agent_rag`
- `07_image_analysis`
- `retrieval_training`

以及汇总产物：

- `master_index.csv`
- `master_index_cn.csv`
- `master_index_summary.md`
- `embedding_input.csv`

## 4. 已完成的五轮资料采集

### 第一轮：广谱知识源池

- 索引：`D:\LabOSData\knowledge_raw\00_index\source_manifest.csv`
- 覆盖：物理机理、领域文献、SOP、安全、异常机理、硬件协议、RAG、视觉分析

### 第二轮：核心领域文献

- 目录：`D:\LabOSData\knowledge_raw\02_domain_literature\round2_core`
- 索引：`D:\LabOSData\knowledge_raw\02_domain_literature\round2_core\round2_manifest.csv`
- 说明：聚焦玻璃纳米孔、纳米移液管、电化学刻蚀核心文献

### 第三轮：方法与参数文献

- 目录：`D:\LabOSData\knowledge_raw\02_domain_literature\round3_methods_params`
- 索引：`D:\LabOSData\knowledge_raw\02_domain_literature\round3_methods_params\round3_manifest.csv`
- 说明：聚焦工艺参数、几何表征、方法章节、学位论文 PDF

### 第四轮：异常诊断与失效归因

- 目录：`D:\LabOSData\knowledge_raw\04_failure_modes\round4_diagnostics`
- 索引：`D:\LabOSData\knowledge_raw\04_failure_modes\round4_diagnostics\round4_manifest.csv`
- 说明：聚焦气泡、阻抗、失活、异常波形、复盘诊断

### 第五轮：SOP / 安全 / 清洗 / 校准

- 目录：`D:\LabOSData\knowledge_raw\03_sop_safety\round5_sop_operations`
- 索引：`D:\LabOSData\knowledge_raw\03_sop_safety\round5_sop_operations\round5_manifest.csv`
- 说明：聚焦危险化学品、SOP 模板、校准资源、清洗手册

## 5. 当前核心统计

截至当前：

- 总知识源条目：`71`
- 中文增强索引条目：`71`
- 第一批检索训练样本：`120`

对应文件：

- 总索引：`D:\LabOSData\knowledge_raw\master_index.csv`
- 中文索引：`D:\LabOSData\knowledge_raw\master_index_cn.csv`
- 嵌入输入：`D:\LabOSData\knowledge_raw\embedding_input.csv`
- 训练样本：`D:\LabOSData\knowledge_raw\retrieval_training\train_candidates.jsonl`
- 样本说明：`D:\LabOSData\knowledge_raw\retrieval_training\train_candidates_summary.md`

## 6. 中文化与术语控制

已完成：

- 标题中文标准化
- 中文关键词生成
- 中文 embedding 输入生成
- 术语对照表整理

对应文件：

- 中文索引：`D:\LabOSData\knowledge_raw\master_index_cn.csv`
- 嵌入输入：`D:\LabOSData\knowledge_raw\embedding_input.csv`
- 术语对照表：`D:\LabOSData\knowledge_raw\00_index\terminology_glossary_zh.md`

## 7. 主工作区中的相关脚本

这些脚本保存在主工作区 `D:\AntigravityProject\tools`：

- `knowledge_source_harvester.py`
- `knowledge_master_index.py`
- `knowledge_cn_index.py`
- `knowledge_embedding_input.py`
- `retrieval_training_samples.py`

对应测试在 `D:\AntigravityProject\tests`：

- `test_knowledge_source_harvester.py`
- `test_knowledge_master_index.py`
- `test_knowledge_cn_index.py`
- `test_knowledge_embedding_input.py`
- `test_retrieval_training_samples.py`

## 8. 使用原则

- 代码、脚本、文档保留在主工作区 `D:\AntigravityProject`
- 大体量原始数据、知识源、训练样本、嵌入输入保留在外部数据区 `D:\LabOSData`
- 新生成的数据资产优先写入 `D:\LabOSData`
- 主工作区只保留生成逻辑和说明文档，不长期承载大体量数据文件

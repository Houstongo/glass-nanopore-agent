# RAG 知识库开发实现说明

## 1. 目的

本文档说明当前项目内 RAG 知识库相关脚本、输入输出、数据流和实现边界。

## 2. 主工作区相关脚本

当前与知识库整理直接相关的脚本位于：

```text
D:\AntigravityProject\tools
```

主要脚本包括：

- `knowledge_source_harvester.py`
- `knowledge_master_index.py`
- `knowledge_cn_index.py`
- `knowledge_embedding_input.py`
- `retrieval_training_samples.py`

对应测试位于：

```text
D:\AntigravityProject\tests
```

包括：

- `test_knowledge_source_harvester.py`
- `test_knowledge_master_index.py`
- `test_knowledge_cn_index.py`
- `test_knowledge_embedding_input.py`
- `test_retrieval_training_samples.py`

## 3. 各脚本职责

### 3.1 `knowledge_source_harvester.py`

作用：

- 对抓取失败的来源做补充元数据回填
- 从 DOI 提取 OpenAlex 元数据
- 将失败项从“空失败”提升为“可追踪元数据项”

主要输入：

```text
某一轮的 manifest.csv
```

主要输出：

- 更新后的 manifest
- `fallback_metadata` 下的 OpenAlex JSON 文件

### 3.2 `knowledge_master_index.py`

作用：

- 汇总五轮 manifest
- 为每条资料补统一字段
- 按规则打标签
- 生成总索引

输出：

```text
D:\LabOSData\knowledge_raw\master_index.csv
D:\LabOSData\knowledge_raw\master_index_summary.md
```

### 3.3 `knowledge_cn_index.py`

作用：

- 将英文标题映射成中文标准标题
- 生成中文短标题
- 生成中文关键词

输出：

```text
D:\LabOSData\knowledge_raw\master_index_cn.csv
```

### 3.4 `knowledge_embedding_input.py`

作用：

- 从中文索引生成 embedding 输入
- 拼接适合中文 embedding 的文本字段

输出：

```text
D:\LabOSData\knowledge_raw\embedding_input.csv
```

其中核心字段为：

- `title_zh`
- `title_zh_short`
- `title_en`
- `keywords_zh`
- `embedding_text`

### 3.5 `retrieval_training_samples.py`

作用：

- 基于 `master_index_cn.csv` 生成第一批检索训练样本
- 输出可扩展检索训练格式

输出：

```text
D:\LabOSData\knowledge_raw\retrieval_training\train_candidates.jsonl
D:\LabOSData\knowledge_raw\retrieval_training\train_candidates_summary.md
```

## 4. 总体数据流

当前实现的数据流为：

```text
多轮原始知识源
-> 各轮 manifest
-> master_index.csv
-> master_index_cn.csv
-> embedding_input.csv
-> retrieval_training/train_candidates.jsonl
```

## 5. 当前统一字段

### 5.1 总索引字段

`master_index.csv` 当前核心字段包括：

- `round`
- `category_dir`
- `title`
- `url`
- `source_type`
- `status`
- `local_file`
- `notes`
- `tag_core_process`
- `tag_mechanism_constraint`
- `tag_failure_review`
- `tag_sop_safety`
- `tag_visual_analysis`
- `tag_hardware_protocol`
- `priority`
- `selected_for_kb`

### 5.2 中文索引增强字段

`master_index_cn.csv` 新增：

- `title_zh`
- `title_zh_short`
- `keywords_zh`

### 5.3 embedding 输入字段

`embedding_input.csv` 当前核心字段：

- `title_zh`
- `title_zh_short`
- `title_en`
- `keywords_zh`
- `round`
- `category_dir`
- `status`
- `priority`
- `selected_for_kb`
- `local_file`
- `embedding_text`

### 5.4 检索训练样本字段

`train_candidates.jsonl` 当前结构：

- `id`
- `query`
- `query_type`
- `positive`
- `negatives`
- `tags`
- `difficulty`
- `split`

## 6. 标签规则

当前系统内固定六类标签：

- `核心工艺`
- `机理约束`
- `异常复盘`
- `SOP/安全`
- `视觉分析`
- `硬件协议`

这些标签在索引阶段打标，用于：

- 知识筛选
- embedding 分组
- 训练样本生成
- 后续向量检索约束

## 7. 训练样本生成策略

当前第一批训练样本是基于现有知识条目自动构造的，采用可扩展格式：

- 每条资料生成若干中文查询
- 每条查询绑定一个正样本
- 每条查询附带多个负样本
- 保留标签、难度和 split

当前更适合做：

- embedding 模型对比
- 初始微调样本池
- 后续人工筛选与增强

## 8. chunk 设计建议

正式进入向量库前，建议按语义切块：

- 论文类：摘要 / 方法 / 结果 / 讨论
- SOP 类：适用范围 / 危险事项 / 操作步骤 / 应急处理
- 异常类：现象 / 原因 / 证据 / 修正动作
- 硬件类：接口 / 指令 / 参数 / 返回值
- 视觉类：任务 / 方法 / 输入 / 输出 / 失败情形

当前项目还没有批量 chunk 生成脚本，这将是后续实现重点。

## 9. 当前边界

当前已经完成：

- 外部知识源采集
- 索引汇总
- 中文增强
- embedding 输入准备
- 初始检索训练样本生成

当前尚未完成：

- 正式 chunk 数据集
- 向量库构建
- 检索接口
- 智能体在线 RAG 调用链

## 10. 下一步实现建议

建议按以下顺序继续：

1. 从 `embedding_input.csv` 中筛出核心集
2. 生成 chunk 数据集
3. 为 chunk 生成稳定 `doc_id / chunk_id`
4. 建立向量库
5. 建立检索评测集
6. 做 embedding 模型对比与微调实验

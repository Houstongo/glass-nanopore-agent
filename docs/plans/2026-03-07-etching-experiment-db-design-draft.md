# 实验数据库设计

**目标：** 将当前工作区内的实验批次、实验参数、测量结果、原始来源文件和实验图片整理到一个可查询的 SQLite 数据库中，并保留足够的溯源信息，支持后续统计分析、图片对照和数据清洗。

## 设计原则

1. 优先保存规范化字段，便于后续筛选、统计和建模。
2. 无法稳定解释但有价值的原始字段，不丢弃，放入 JSON 扩展字段。
3. 每条实验记录都尽量能回溯到原始目录、工作簿、工作表或图片文件。
4. 图片不是附件，而是结构化实验资产，需要与实验记录显式关联。
5. 注释、字段命名和导入逻辑以中文说明为主，降低后续维护成本。

## 数据来源

当前优先覆盖以下来源：

- `D:\LabOSData\cvdata`
- `D:\AntigravityProject\knowledge\literature\pdf_archive\pdf`
- 后续若恢复 Excel 原始目录，可将其作为补充输入源纳入同一导入流程

其中：

- `cvdata` 主要包含实验批次目录、阶段目录、分组目录和图片文件
- `knowledge\literature\pdf_archive\pdf` 提供论文和背景语义，不作为逐行实验数据主来源

## 推荐表结构

### 1. `datasets` 数据集表

表示一个实验批次或一组同类实验目录。

字段：

- `id`：主键
- `dataset_name`：数据集名称，例如 `20241228-2obj-angle-mixedcv-20`
- `dataset_family`：数据族，例如 `mixedcv`、`noise`、`single_factor`
- `algorithm_name`：算法名称，例如 `IST-MOBO`、`FNA-MOBO`
- `target_cone_angle_deg`：目标锥角
- `source_root_path`：原始目录路径
- `description`：补充说明
- `created_at`：入库时间

### 2. `experiments` 实验表

表示一个阶段中的一个实验组，是后续分析的核心实体。

字段：

- `id`：主键
- `dataset_id`：外键，关联 `datasets`
- `stage_name`：阶段名，例如 `initial10`、`opt1`、`opt2`
- `group_name`：组名，例如 `opt1-3`
- `group_index`：组号
- `run_label`：原始标签或导入时恢复的原始组标识
- `sample_count`：图片数或样本数
- `status`：状态，例如 `active`、`incomplete`
- `notes`：备注

### 3. `experiment_parameters` 实验参数表

保存实验输入参数。一个实验组通常对应一条参数记录。

字段：

- `id`：主键
- `experiment_id`：外键，关联 `experiments`
- `positive_voltage_v`：正电压
- `negative_voltage_v`：负电压
- `frequency_hz`：频率
- `immersion_depth_um`：浸入深度
- `tip_diameter_um`：尖端直径
- `capillary_diameter_um`：毛细管直径
- `heating_count`：加热次数
- `parameter_json`：未标准化但保留的参数 JSON

### 4. `experiment_measurements` 实验测量表

保存实验输出和质量指标。一个实验组通常对应一条测量记录。

字段：

- `id`：主键
- `experiment_id`：外键，关联 `experiments`
- `cone_angle_deg`：锥角
- `target_cone_angle_deg`：目标锥角
- `angle_diff_deg`：角差
- `stability`：稳定性
- `angle_variance`：角差方差
- `roughness`：粗糙度
- `symmetry_score`：对称性得分
- `quality_score`：综合质量得分
- `measurement_json`：未标准化但保留的测量 JSON

### 5. `experiment_images` 实验图片表

保存与实验组关联的所有图片及其派生测量值。

字段：

- `id`：主键
- `experiment_id`：外键，关联 `experiments`
- `image_path`：图片完整路径
- `image_name`：文件名
- `image_index`：图片序号
- `image_role`：图片角色，例如 `tip`、`overview`、`processed`
- `capture_stage`：图片所属阶段
- `measured_cone_angle_deg`：图片测得锥角
- `measured_angle_diff_deg`：图片测得角差
- `thumbnail_path`：缩略图路径，可为空
- `metadata_json`：图片额外元数据

### 6. `source_files` 来源文件表

保存原始文件级溯源信息。

字段：

- `id`：主键
- `dataset_id`：外键，关联 `datasets`
- `experiment_id`：外键，可为空
- `file_path`：原始文件路径
- `file_type`：文件类型，例如 `xlsx`、`pdf`、`image`
- `sheet_name`：工作表名，可为空
- `source_kind`：来源类型，例如 `input`、`result`、`summary`、`image_metrics`
- `checksum`：校验值，可为空
- `notes`：备注

### 7. `raw_import_rows` 原始导入行表

建议保留，用于数据清洗和回溯。

字段：

- `id`：主键
- `source_file_id`：外键，关联 `source_files`
- `row_identifier`：行标识
- `raw_json`：原始行 JSON
- `normalized_ok`：是否规范化成功
- `error_message`：导入异常说明

## 关联关系

- 一个 `dataset` 对应多个 `experiments`
- 一个 `experiment` 可以有一条或零条 `experiment_parameters`
- 一个 `experiment` 可以有一条或零条 `experiment_measurements`
- 一个 `experiment` 可以关联多张 `experiment_images`
- 一个 `dataset` 和 `experiment` 可以关联多条 `source_files`
- 一个 `source_file` 可以关联多条 `raw_import_rows`

## 字段映射策略

优先规范化的字段：

- 使用算法 -> `datasets.algorithm_name`
- 目标锥角 -> `datasets.target_cone_angle_deg` 或 `experiment_measurements.target_cone_angle_deg`
- 锥角 -> `experiment_measurements.cone_angle_deg`
- 角差 -> `experiment_measurements.angle_diff_deg`
- 正电压 -> `experiment_parameters.positive_voltage_v`
- 负电压 -> `experiment_parameters.negative_voltage_v`
- 浸入深度 -> `experiment_parameters.immersion_depth_um`
- 频率 -> `experiment_parameters.frequency_hz`

图片映射规则：

- 按 `批次目录 / 阶段目录 / 分组目录 / 图片文件` 建立实验与图片的关联
- 若存在图片测量结果文件，则优先补充到 `experiment_images`
- 若只存在图片而没有配套测量文件，也要至少保存路径、序号和分组归属

## 导入优先级

1. 先从目录结构恢复 `datasets`、`experiments`、`experiment_images`
2. 再从工作簿补充 `experiment_parameters`、`experiment_measurements`
3. 最后写入 `source_files` 和 `raw_import_rows`

## 预期产物

- 主数据库文件：`D:\AntigravityProject\data\etching_experiments.sqlite`
- 原始图片目录位于：`D:\LabOSData\cvdata`
- 导入脚本对关键解析逻辑添加中文注释
- 自动化测试覆盖目录解析、字段映射、图片关联和数据库写入

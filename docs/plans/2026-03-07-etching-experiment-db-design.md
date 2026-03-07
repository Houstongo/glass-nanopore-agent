# Etching 实验数据库设计

当前对外命名统一使用 `etching`，不再使用个人姓名命名数据库、脚本或产物。

数据库结构保持不变，仍使用以下核心表：

- `datasets`
- `experiments`
- `experiment_parameters`
- `experiment_measurements`
- `experiment_images`
- `source_files`
- `raw_import_rows`

默认数据库产物路径改为：

- `D:\AntigravityProject\data\etching_experiments.sqlite`

不再向 `pdf` 目录输出兼容副本。

默认脚本入口改为：

- `D:\AntigravityProject\tools\etching_experiment_db.py`

默认测试入口改为：

- `D:\AntigravityProject\tests\test_etching_experiment_db.py`

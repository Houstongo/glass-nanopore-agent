# 实验数据库 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 基于当前工作区的实验目录、图片和后续可恢复的工作簿数据，构建一个支持参数、测量结果、图片和来源追溯的 SQLite 数据库。

**Architecture:** 采用分层规范化模型，将实验批次、实验组、输入参数、输出测量、实验图片和来源文件拆分为独立数据表。导入流程先恢复目录级结构，再补充结构化字段，最后写入原始行和溯源信息。

**Tech Stack:** Python 3、sqlite3、unittest、pathlib、json、openpyxl

---

### Task 1: 为新表结构写失败测试

**Files:**
- Modify: `D:\AntigravityProject\tests\test_etching_sqlite_import.py`
- Modify: `D:\AntigravityProject\tools\etching_sqlite_import.py`

**Step 1: Write the failing test**

为以下行为补测试：

- 新 schema 至少包含 `datasets`、`experiments`、`experiment_parameters`、`experiment_measurements`、`experiment_images`、`source_files`、`raw_import_rows`
- 目录 `dataset/stage/group/image.jpg` 能恢复出实验组和图片关联
- 数据集算法、目标锥角能从目录名恢复

**Step 2: Run test to verify it fails**

Run: `python -m unittest D:\AntigravityProject\tests\test_etching_sqlite_import.py`

Expected: 因新表或新函数尚未实现而失败

**Step 3: Write minimal implementation**

在导入脚本中补充新 schema 创建逻辑和最小目录解析函数。

**Step 4: Run test to verify it passes**

Run: `python -m unittest D:\AntigravityProject\tests\test_etching_sqlite_import.py`

Expected: 新增测试通过

### Task 2: 实现目录驱动的数据集和实验组恢复

**Files:**
- Modify: `D:\AntigravityProject\tools\etching_sqlite_import.py`
- Modify: `D:\AntigravityProject\tests\test_etching_sqlite_import.py`

**Step 1: Write the failing test**

添加测试，验证：

- `20241231-noise-2obj-angle-mixedcv-20` 解析为 `FNA-MOBO`
- `20241228-2obj-angle-mixedcv-20` 解析为 `IST-MOBO`
- `initial10/3/4.jpg` 映射到 `stage_name=initial10`、`group_index=3`、`image_index=4`
- `opt1-3/2.jpg` 或 `opt1/3/2.jpg` 都能映射到相同实验组

**Step 2: Run test to verify it fails**

Run: `python -m unittest D:\AntigravityProject\tests\test_etching_sqlite_import.py`

Expected: 目录解析行为不完整导致失败

**Step 3: Write minimal implementation**

补齐目录解析器和实验归并逻辑，必要位置加中文注释说明不同目录变体。

**Step 4: Run test to verify it passes**

Run: `python -m unittest D:\AntigravityProject\tests\test_etching_sqlite_import.py`

Expected: 目录解析测试通过

### Task 3: 接入参数表、测量表和原始 JSON 扩展字段

**Files:**
- Modify: `D:\AntigravityProject\tools\etching_sqlite_import.py`
- Modify: `D:\AntigravityProject\tests\test_etching_sqlite_import.py`

**Step 1: Write the failing test**

添加测试，验证数据库写入后：

- `experiments` 与 `experiment_parameters`、`experiment_measurements` 的主外键关系成立
- 空缺字段允许为空
- 扩展 JSON 字段能写入字符串化数据

**Step 2: Run test to verify it fails**

Run: `python -m unittest D:\AntigravityProject\tests\test_etching_sqlite_import.py`

Expected: 新表写入或关联逻辑未实现导致失败

**Step 3: Write minimal implementation**

实现新表插入逻辑，并尽量兼容已有字段解析函数。

**Step 4: Run test to verify it passes**

Run: `python -m unittest D:\AntigravityProject\tests\test_etching_sqlite_import.py`

Expected: 关系表写入测试通过

### Task 4: 接入来源文件和原始导入行溯源

**Files:**
- Modify: `D:\AntigravityProject\tools\etching_sqlite_import.py`
- Modify: `D:\AntigravityProject\tests\test_etching_sqlite_import.py`

**Step 1: Write the failing test**

添加测试，验证：

- 图片文件会写入 `source_files`
- 原始解析结果可写入 `raw_import_rows`
- 导入失败行会带 `normalized_ok=0` 和错误信息

**Step 2: Run test to verify it fails**

Run: `python -m unittest D:\AntigravityProject\tests\test_etching_sqlite_import.py`

Expected: 溯源写入尚未实现导致失败

**Step 3: Write minimal implementation**

实现来源文件表和原始行表写入。

**Step 4: Run test to verify it passes**

Run: `python -m unittest D:\AntigravityProject\tests\test_etching_sqlite_import.py`

Expected: 溯源测试通过

### Task 5: 生成数据库并验证产物

**Files:**
- Modify: `D:\AntigravityProject\tools\etching_sqlite_import.py`
- Modify: `D:\AntigravityProject\tests\test_etching_sqlite_import.py`
- Output: `D:\AntigravityProject\data\legacy_etching_import.sqlite`

**Step 1: Write the failing test**

如需要，添加一个 smoke 测试，验证生成数据库后至少存在：

- 数据集记录
- 实验组记录
- 图片记录

**Step 2: Run test to verify it fails**

Run: `python -m unittest D:\AntigravityProject\tests\test_etching_sqlite_import.py`

Expected: 产物生成或结构不符合预期

**Step 3: Write minimal implementation**

修正数据库输出路径和写入时机，避免残留空库和异常 journal 文件。

**Step 4: Run test to verify it passes**

Run: `python -m unittest D:\AntigravityProject\tests\test_etching_sqlite_import.py`

Expected: 全部测试通过

**Step 5: Run end-to-end verification**

Run: `python D:\AntigravityProject\tools\etching_sqlite_import.py --db-path D:\AntigravityProject\data\legacy_etching_import.sqlite`

Expected:

- 脚本正常退出
- 输出 experiments/images 统计
- SQLite 文件可正常打开并查询表数量

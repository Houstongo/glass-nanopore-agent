# Apps And Firmware Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the application and firmware directories into the target top-level structure and update all active references to the new paths.

**Architecture:** Execute the refactor in two verified batches. First move the application directory into `apps`, fix external references, and validate runtime-facing entry points. Then move the firmware directory into `firmware`, update references, and run a final global path audit.

**Tech Stack:** PowerShell, Python, unittest, Markdown

---

### Task 1: Prepare target directories and capture impacted references

**Files:**
- Create: `D:\AntigravityProject\apps`
- Create: `D:\AntigravityProject\firmware`
- Modify: `D:\AntigravityProject\docs\plans\2026-03-08-etching-agent-prd.md`
- Modify: `D:\AntigravityProject\docs\plans\Lab-OS_v3_Development_Roadmap.md`

**Step 1: Write the failing test**

用路径核验代替单元测试，先确认目标目录还不存在旧内容、现有文档仍引用旧路径。

**Step 2: Run test to verify it fails**

Run: `Select-String ... apps/glass_nanopore_agent ...`

Expected: 命中文档中的旧路径说明

**Step 3: Write minimal implementation**

创建 `apps`、`firmware` 目录，并记录需要修正的引用点。

**Step 4: Run test to verify it passes**

Run: `Get-ChildItem D:\AntigravityProject`

Expected: 出现 `apps`、`firmware`

### Task 2: Move application directory into apps

**Files:**
- Rename: `应用旧目录`
- Target: `D:\AntigravityProject\apps\glass_nanopore_agent`

**Step 1: Write the failing test**

先确认旧路径存在、新路径不存在。

**Step 2: Run test to verify it fails**

Run: `Test-Path` for old/new paths

Expected: old=True, new=False

**Step 3: Write minimal implementation**

移动目录到 `apps/glass_nanopore_agent`

**Step 4: Run test to verify it passes**

Run: `Test-Path` for old/new paths

Expected: old=False, new=True

### Task 3: Update application references and docs

**Files:**
- Modify: `D:\AntigravityProject\docs\plans\2026-03-08-etching-agent-prd.md`
- Modify: `D:\AntigravityProject\docs\plans\Lab-OS_v3_Development_Roadmap.md`
- Modify: `D:\AntigravityProject\docs\plans\2026-03-08-etching-dehistoricize-names.md`
- Modify: any active file still pointing at the old app root

**Step 1: Write the failing test**

搜索旧应用路径引用。

**Step 2: Run test to verify it fails**

Run: `Select-String ... old app root ...`

Expected: 仍有命中

**Step 3: Write minimal implementation**

将这些路径改为 `D:\AntigravityProject\apps\glass_nanopore_agent`

**Step 4: Run test to verify it passes**

再次搜索旧路径

Expected: 无命中

### Task 4: Verify application layer after move

**Files:**
- Verify: `D:\AntigravityProject\apps\glass_nanopore_agent\backend\main.py`
- Verify: `D:\AntigravityProject\tests\test_etching_experiment_db.py`
- Verify: `D:\AntigravityProject\tests\test_etching_sqlite_import.py`

**Step 1: Write the failing test**

运行测试和编译校验前，先假设迁移可能导致入口失效。

**Step 2: Run test to verify it fails**

Run: `python -m unittest ...`

Expected: 如有路径依赖，将在这一步暴露

**Step 3: Write minimal implementation**

修复迁移后暴露的引用问题。

**Step 4: Run test to verify it passes**

Run: `python -m unittest ...` and `python -m py_compile ...`

Expected: 通过

### Task 5: Move firmware directory into firmware

**Files:**
- Rename: `旧固件目录`
- Target: `D:\AntigravityProject\firmware\etching_controller`

**Step 1: Write the failing test**

确认旧固件路径存在、新路径不存在。

**Step 2: Run test to verify it fails**

Run: `Test-Path` for old/new paths

Expected: old=True, new=False

**Step 3: Write minimal implementation**

移动目录到 `firmware/etching_controller`

**Step 4: Run test to verify it passes**

Run: `Test-Path` for old/new paths

Expected: old=False, new=True

### Task 6: Update firmware references and run final audit

**Files:**
- Modify: active docs and code that still reference the old firmware root
- Verify: whole workspace

**Step 1: Write the failing test**

搜索旧固件路径引用。

**Step 2: Run test to verify it fails**

Run: `Select-String ... old firmware root ...`

Expected: 仍有命中

**Step 3: Write minimal implementation**

把旧固件路径替换为 `D:\AntigravityProject\firmware\etching_controller`

**Step 4: Run test to verify it passes**

Run: global path search

Expected: 不再命中旧应用/固件主路径

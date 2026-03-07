# Run Entry Standardization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add stable PowerShell run-entry scripts for the app and read-only firmware inspection without modifying STM32 source code.

**Architecture:** Keep runtime logic outside the application and firmware source trees. Development scripts live under `scripts/dev`, firmware inspection scripts live under `scripts/firmware`, and a single docs page explains the supported entry points and constraints.

**Tech Stack:** PowerShell, Python, npm, Markdown

---

### Task 1: Create script directory skeleton

**Files:**
- Create: `D:\AntigravityProject\scripts\dev`
- Create: `D:\AntigravityProject\scripts\firmware`
- Create: `D:\AntigravityProject\docs\runbook`

**Step 1: Write the failing test**

先确认这些目录不存在。

**Step 2: Run test to verify it fails**

Run: `Test-Path` for target directories

Expected: `False`

**Step 3: Write minimal implementation**

创建目录骨架。

**Step 4: Run test to verify it passes**

Run: `Test-Path` for target directories

Expected: `True`

### Task 2: Add app run-entry scripts

**Files:**
- Create: `D:\AntigravityProject\scripts\dev\run-agent.ps1`
- Create: `D:\AntigravityProject\scripts\dev\run-frontend.ps1`
- Create: `D:\AntigravityProject\scripts\dev\run-all.ps1`

**Step 1: Write the failing test**

用脚本解析校验代替单元测试，先确认文件不存在。

**Step 2: Run test to verify it fails**

Run: `Test-Path` for each script

Expected: `False`

**Step 3: Write minimal implementation**

补充三个脚本，支持固定工作目录、参数化启动和新窗口运行。

**Step 4: Run test to verify it passes**

Run: `Test-Path` and PowerShell parser check

Expected: 脚本存在且可解析

### Task 3: Add read-only firmware helper

**Files:**
- Create: `D:\AntigravityProject\scripts\firmware\show-firmware-layout.ps1`

**Step 1: Write the failing test**

先确认脚本不存在。

**Step 2: Run test to verify it fails**

Run: `Test-Path` for firmware helper

Expected: `False`

**Step 3: Write minimal implementation**

编写只读脚本，输出固件目录结构与只读边界说明。

**Step 4: Run test to verify it passes**

Run: script directly

Expected: 输出目录摘要且不修改文件

### Task 4: Add runbook docs and verify

**Files:**
- Create: `D:\AntigravityProject\docs\runbook\project-entrypoints.md`

**Step 1: Write the failing test**

先确认说明文档不存在。

**Step 2: Run test to verify it fails**

Run: `Test-Path` for the doc

Expected: `False`

**Step 3: Write minimal implementation**

写明脚本用途、运行方式、目录位置和“STM32 代码不修改”约束。

**Step 4: Run test to verify it passes**

Run: global search for `scripts/dev` and `scripts/firmware`

Expected: 文档与脚本路径一致

### Task 5: Final verification

**Files:**
- Verify: `D:\AntigravityProject\scripts\dev`
- Verify: `D:\AntigravityProject\scripts\firmware`
- Verify: `D:\AntigravityProject\docs\runbook\project-entrypoints.md`

**Step 1: Write the failing test**

运行脚本解析和路径核验前，假设脚本存在路径错误或语法错误。

**Step 2: Run test to verify it fails**

Run: parser and path audit

Expected: 如有问题在此暴露

**Step 3: Write minimal implementation**

修正参数、路径和说明文案。

**Step 4: Run test to verify it passes**

Run: PowerShell parser check, script dry-run/read-only execution, and Python tests

Expected: 通过

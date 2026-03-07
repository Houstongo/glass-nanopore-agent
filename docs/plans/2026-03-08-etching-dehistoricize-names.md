# Etching Dehistoricize Names Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove personal-name naming from the active project so code, tests, docs, and retained database artifacts all use neutral `etching` or `legacy` names.

**Architecture:** Keep the current working behavior and paths stable while renaming underlying files and references. Preserve backward compatibility only where it avoids breakage during the transition, but the public and canonical names must no longer include personal names.

**Tech Stack:** Python, unittest, SQLite, Markdown, PowerShell file moves

---

### Task 1: Rename active Python and test entry points

**Files:**
- Modify: `D:\AntigravityProject\tools\etching_experiment_db.py`
- Rename: `D:\AntigravityProject\tools\etching_experiment_data_core.py`
- Rename: `D:\AntigravityProject\tools\etching_sqlite_import.py`
- Rename: `D:\AntigravityProject\tests\test_etching_sqlite_import.py`

**Step 1:** Rename the implementation files to neutral `etching_*` names.

**Step 2:** Update imports so `etching_experiment_db.py` points to the new neutral implementation filename.

**Step 3:** Update the renamed test file to import the renamed module and use a neutral test class name.

**Step 4:** Run focused tests to verify imports and CLI entry points still work.

### Task 2: Rename historical design docs and path references

**Files:**
- Rename: `D:\AntigravityProject\docs\plans\2026-03-07-etching-experiment-db-design-draft.md`
- Rename: `D:\AntigravityProject\docs\plans\2026-03-07-etching-experiment-db-implementation-legacy.md`
- Rename: `D:\AntigravityProject\docs\plans\2026-03-07-etching-sqlite-import-legacy.md`
- Modify: renamed Markdown files and any file that still references old names

**Step 1:** Rename the doc files to `etching_*` equivalents.

**Step 2:** Replace remaining personal-name text references in active docs with neutral wording.

**Step 3:** Verify that docs now point to the current `knowledge/` and `data/` layout.

### Task 3: Neutralize retained database artifact names

**Files:**
- Rename: `D:\AntigravityProject\data\legacy_etching_experiments_v1.sqlite`
- Rename: `D:\AntigravityProject\data\legacy_etching_experiments_v2.sqlite`
- Rename: `D:\AntigravityProject\data\legacy_etching_experiments_v3.sqlite`
- Rename: matching `*.sqlite-journal` files if present

**Step 1:** Move these historical database artifacts to neutral `legacy_etching_*` names.

**Step 2:** Keep canonical active database unchanged at `D:\AntigravityProject\data\etching_experiments.sqlite`.

**Step 3:** Verify no active code points at the renamed historical artifacts.

### Task 4: Remove stale compiled artifacts and verify

**Files:**
- Remove: stale `__pycache__` entries containing old names
- Verify: `D:\AntigravityProject\tools`, `D:\AntigravityProject\tests`, `D:\AntigravityProject\apps\glass_nanopore_agent\backend`

**Step 1:** Delete stale `__pycache__` files for old module and test names.

**Step 2:** Run `unittest` and `py_compile`.

**Step 3:** Search the workspace again for personal-name naming and confirm only intentionally historical text remains, if any.

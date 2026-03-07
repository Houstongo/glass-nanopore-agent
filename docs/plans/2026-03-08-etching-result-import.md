# Etching Result Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Import experiment parameters and measurements from `D:\LabOSData\result` so the SQLite database contains positive/negative voltage, frequency, immersion depth, angle, angle difference, and stability instead of mostly image-derived records.

**Architecture:** Keep the existing normalized SQLite schema and update the workbook ingestion logic in `tools/etching_experiment_data_core.py`. Recursively scan dataset directories for workbooks, classify workbook types by filename and headers, map row data into experiment parameter/measurement dictionaries, then write those values into the existing parameter and measurement tables.

**Tech Stack:** Python 3, `openpyxl`, `sqlite3`, `unittest`

---

### Task 1: Add regression tests for recursive workbook import

**Files:**
- Modify: `D:\AntigravityProject\tests\test_etching_sqlite_import.py`

**Step 1: Write the failing test**

Add a test that creates a temporary dataset with nested `*_input.xlsx`, `*_summary.xlsx`, and one image file, then asserts `collect_experiments()` imports:
- one experiment
- `positive_voltage_v`
- `negative_voltage_v`
- `frequency_hz`
- `immersion_depth_um`
- `cone_angle_deg`
- `angle_diff_deg`
- `stability`

**Step 2: Run test to verify it fails**

Run: `python -m unittest tests.test_etching_sqlite_import.EtchingSqliteImportTests.test_collect_experiments_imports_nested_workbook_parameters_and_measurements`

Expected: FAIL because current code only scans top-level workbooks and does not map parameter fields.

**Step 3: Write minimal implementation**

Update the importer to recursively find workbooks and map workbook rows into experiment parameter/measurement fields.

**Step 4: Run test to verify it passes**

Run: `python -m unittest tests.test_etching_sqlite_import.EtchingSqliteImportTests.test_collect_experiments_imports_nested_workbook_parameters_and_measurements`

Expected: PASS

### Task 2: Add regression test for database persistence

**Files:**
- Modify: `D:\AntigravityProject\tests\test_etching_sqlite_import.py`

**Step 1: Write the failing test**

Add a test that builds a temporary SQLite database from the same nested workbook fixture and asserts the stored parameter/measurement rows contain imported values.

**Step 2: Run test to verify it fails**

Run: `python -m unittest tests.test_etching_sqlite_import.EtchingSqliteImportTests.test_build_database_persists_imported_parameters_and_measurements`

Expected: FAIL because imported values are currently `NULL`.

**Step 3: Write minimal implementation**

Ensure collected workbook values survive through `write_database()`.

**Step 4: Run test to verify it passes**

Run: `python -m unittest tests.test_etching_sqlite_import.EtchingSqliteImportTests.test_build_database_persists_imported_parameters_and_measurements`

Expected: PASS

### Task 3: Implement workbook classification and field mapping

**Files:**
- Modify: `D:\AntigravityProject\tools\etching_experiment_data_core.py`

**Step 1: Implement recursive workbook discovery**

Change dataset scanning from `dataset_root.glob("*.xlsx")` to recursive discovery that excludes obviously duplicate temporary files only if needed.

**Step 2: Implement workbook row parsing**

Map common normalized headers:
- `组号`
- `正电压(V)`
- `负电压(V)`
- `频率(Hz)`
- `伸入长度(μm)`
- `角度_mean` / `角度`
- `角度差值_mean` / `角度差值`
- `稳定性`

Use filename/path context to determine default stage names for nested files like `initial10\output_results.xlsx` and `opt1\2\output_results.xlsx`.

**Step 3: Preserve row provenance**

Continue storing source file entries and raw import rows for workbook-derived rows.

**Step 4: Run focused tests**

Run: `python -m unittest tests.test_etching_sqlite_import -v`

Expected: PASS

### Task 4: Rebuild and verify the real database

**Files:**
- Modify: `D:\AntigravityProject\data\etching_experiments.sqlite`

**Step 1: Rebuild the SQLite database**

Run the importer against `D:\LabOSData\result`.

**Step 2: Verify imported field coverage**

Query the rebuilt database and confirm that:
- voltage columns are no longer all `NULL`
- `immersion_depth_um` has values
- `cone_angle_deg`, `angle_diff_deg`, and `stability` have values
- `raw_import_rows` is populated

**Step 3: Run final targeted verification**

Run: `python -m unittest tests.test_etching_sqlite_import -v`

Run a SQLite summary query against `D:\AntigravityProject\data\etching_experiments.sqlite`.

Expected: tests pass and database counts confirm imported values exist.

### Task 5: Map SingleFactor group values into parameter columns

**Files:**
- Modify: `D:\AntigravityProject\tests\test_etching_sqlite_import.py`
- Modify: `D:\AntigravityProject\tools\etching_experiment_data_core.py`

**Step 1: Write the failing test**

Add a fixture for `SingleFactor`-style files where the varying parameter is encoded by the workbook filename and `组号`, then assert:
- `Var2_positive_voltage*` stores `group_index` in `positive_voltage_v`
- `Var3_negative_voltage*` stores `group_index` in `negative_voltage_v`
- `Var4_frequency*` stores `group_index` in `frequency_hz`
- `Var6_length*` stores `group_index` in `immersion_depth_um`

**Step 2: Run test to verify it fails**

Run: `python -m unittest tests.test_etching_sqlite_import.EtchingSqliteImportTests.test_collect_experiments_maps_single_factor_group_values_to_parameters`

Expected: FAIL because current importer does not interpret SingleFactor file prefixes.

**Step 3: Write minimal implementation**

Teach the importer to detect `SingleFactor` workbook stems and map `group_index` into the matching parameter field after the experiment record is resolved.

**Step 4: Run focused tests**

Run: `python -m unittest tests.test_etching_sqlite_import -v`

Expected: PASS

**Step 5: Rebuild and verify the real database**

Run the importer against `D:\LabOSData\result`, then query `SingleFactor` rows and confirm parameter coverage is no longer zero for the supported fields.

### Task 6: Extend parameter schema for SingleFactor concentration and time

**Files:**
- Modify: `D:\AntigravityProject\tests\test_etching_sqlite_import.py`
- Modify: `D:\AntigravityProject\tools\etching_experiment_data_core.py`

**Step 1: Write the failing test**

Add a regression test that asserts:
- `experiment_parameters` schema contains `solution_concentration` and `etching_time_s`
- `Var1_solution_concentration*` stores `group_index` in `solution_concentration`
- `Var5_time*` stores `group_index` in `etching_time_s`

**Step 2: Run test to verify it fails**

Run: `python -m unittest tests.test_etching_sqlite_import.EtchingSqliteImportTests.test_single_factor_concentration_and_time_are_persisted`

Expected: FAIL because the columns and mappings do not exist yet.

**Step 3: Write minimal implementation**

Extend `experiment_parameters`, write the two new values into the schema, and map the two `SingleFactor` stage prefixes.

**Step 4: Run focused tests**

Run: `python -m unittest tests.test_etching_sqlite_import -v`

Expected: PASS

**Step 5: Rebuild and verify the real database**

Rebuild `D:\AntigravityProject\data\etching_experiments.sqlite` and query `SingleFactor` rows to confirm:
- `Var1_solution_concentration` has `solution_concentration`
- `Var5_time` has `etching_time_s`

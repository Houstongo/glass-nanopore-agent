# SQLite Import Plan

## Goal

Build a SQLite database from the thesis-related experiment data under:

- `D:\AntigravityProject\knowledge\literature\pdf_archive\pdf`
- `D:\LabOSData\cvdata`

The database must at minimum contain these fields:

- 使用算法
- 目标锥角
- 锥角
- 差角
- 正电压
- 负电压
- 浸入深度
- 频率

If an experiment row can be mapped to one or more tip images, store those image paths too.

## Source Model

### PDF role

The PDF is used as semantic context only:

- confirm variable meanings
- confirm algorithm names used in the thesis
- confirm that angle difference is the optimization target

The PDF is not the primary row-level data source.

### Excel role

The row-level data comes from the experiment folders under `cvdata`.

Observed workbook patterns:

1. `initial10_input.xlsx` / `initial10_result.xlsx` / `initial10_summary.xlsx`
2. `input.xlsx` / `group.xlsx` / `optN_result.xlsx` / `optN_summary.xlsx`
3. older merged workbooks such as `15°.xlsx`
4. per-group image result workbook: `...\\<stage>\\<group>\\output_results.xlsx`

## Proposed Database Schema

### `experiments`

One row per experimental group.

Fields:

- `id`
- `source_root`
- `source_workbook`
- `source_sheet`
- `stage_name`
- `group_name`
- `group_index`
- `algorithm`
- `target_cone_angle_deg`
- `cone_angle_deg`
- `angle_diff_deg`
- `positive_voltage_v`
- `negative_voltage_v`
- `immersion_depth_um`
- `frequency_hz`
- `stability`
- `angle_variance`
- `notes`

### `experiment_images`

One row per image tied to an experimental group.

Fields:

- `id`
- `experiment_id`
- `image_path`
- `image_name`
- `image_index`
- `metrics_workbook`
- `measured_cone_angle_deg`
- `measured_angle_diff_deg`

## Import Rules

1. Infer `target_cone_angle_deg` from:
   - workbook name like `15°.xlsx`
   - folder name fragments like `mixedcv-15`, `mixedcv-20`, `mixedcv-25`, `mixedcv-30`
2. Infer `algorithm` from folder family:
   - folders containing `noise` -> `FNA-MOBO`
   - non-noise mixedcv optimization folders -> `IST-MOBO`
   - older baseline/manual comparison files keep explicit fallback labels
3. For `initial` or `input` workbooks:
   - use parameter columns and aggregate outputs directly
4. For `group` or `summary` workbooks:
   - use them to recover cone angle, angle variance, and stability
5. For images:
   - map `stage/group/*.jpg` to the corresponding group
   - enrich image rows from sibling `output_results.xlsx`

## Verification

After implementation:

1. run the importer with the `lab_agent` environment
2. verify total row counts
3. sample-query several targets and stages
4. confirm image paths are populated for at least one folder family

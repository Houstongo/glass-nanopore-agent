from __future__ import annotations

import argparse
from pathlib import Path

try:
    from tools.etching_experiment_data_core import (  # noqa: F401
        CV_RESULT_ROOT,
        DatasetRecord,
        ExperimentCollector,
        ExperimentRecord,
        build_database,
        cell_to_float,
        cell_to_int,
        collect_experiments,
        create_schema,
        determine_algorithm,
        determine_target_angle,
        find_header_row,
        import_workbook_rows,
        infer_dataset_family,
        normalize_stage_name,
        normalize_text,
        parse_group_label,
        parse_image_path,
        parse_image_record_label,
        parse_stage_and_group_from_directory,
        safe_load_workbook,
        write_database,
    )
except ModuleNotFoundError:
    from etching_experiment_data_core import (  # type: ignore[no-redef]  # noqa: F401
        CV_RESULT_ROOT,
        DatasetRecord,
        ExperimentCollector,
        ExperimentRecord,
        build_database,
        cell_to_float,
        cell_to_int,
        collect_experiments,
        create_schema,
        determine_algorithm,
        determine_target_angle,
        find_header_row,
        import_workbook_rows,
        infer_dataset_family,
        normalize_stage_name,
        normalize_text,
        parse_group_label,
        parse_image_path,
        parse_image_record_label,
        parse_stage_and_group_from_directory,
        safe_load_workbook,
        write_database,
    )


DEFAULT_DB_PATH = Path(r"D:\AntigravityProject\data\etching_experiments.sqlite")


def main() -> None:
    parser = argparse.ArgumentParser(description="构建 etching 实验数据 SQLite 数据库。")
    parser.add_argument("--result-root", type=Path, default=CV_RESULT_ROOT)
    parser.add_argument("--db-path", type=Path, default=DEFAULT_DB_PATH)
    args = parser.parse_args()

    dataset_count, experiment_count, image_count = build_database(args.result_root, args.db_path)

    print(f"result_root={args.result_root}")
    print(f"db_path={args.db_path}")
    print(f"datasets={dataset_count}")
    print(f"experiments={experiment_count}")
    print(f"images={image_count}")


if __name__ == "__main__":
    main()

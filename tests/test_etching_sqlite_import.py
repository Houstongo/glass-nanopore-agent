import sqlite3
import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

from tools.etching_experiment_data_core import (
    build_database,
    collect_experiments,
    create_schema,
    determine_algorithm,
    infer_dataset_family,
    determine_target_angle,
    normalize_stage_name,
    parse_group_label,
    parse_image_path,
    parse_image_record_label,
)


class EtchingSqliteImportTests(unittest.TestCase):
    def _write_workbook(self, path: Path, rows: list[tuple[object, ...]]) -> None:
        workbook = Workbook()
        worksheet = workbook.active
        for row in rows:
            worksheet.append(row)
        path.parent.mkdir(parents=True, exist_ok=True)
        workbook.save(path)

    def _create_nested_result_fixture(self, root: Path) -> Path:
        dataset_root = root / "20241226-2obj-angle-mixedcv-15-test"
        self._write_workbook(
            dataset_root / "initial10" / "output_results.xlsx",
            [
                ("组号", "角度_mean", "角度差值_mean", "稳定性"),
                (1, 45.2, 30.2, 0.34),
            ],
        )
        self._write_workbook(
            dataset_root / "initial10_input.xlsx",
            [
                ("组号", "正电压(V)", "负电压(V)", "频率(Hz)", "伸入长度(μm)"),
                (1, 4.8, -1.4, 114, 440),
            ],
        )
        image_dir = dataset_root / "initial10" / "1"
        image_dir.mkdir(parents=True)
        (image_dir / "1.jpg").write_bytes(b"fake-image")
        return dataset_root

    def _create_input_without_group_fixture(self, root: Path) -> Path:
        dataset_root = root / "20241226-2obj-angle-mixedcv-15-no-group"
        self._write_workbook(
            dataset_root / "initial10_summary.xlsx",
            [
                ("组号", "角度_mean", "角度差值_mean", "稳定性"),
                (1, 45.2, 30.2, 0.34),
                (2, 43.8, 28.8, 0.59),
            ],
        )
        self._write_workbook(
            dataset_root / "initial10_input.xlsx",
            [
                ("正电压(V)", "负电压(V)", "频率(Hz)", "伸入长度(μm)"),
                (4.8, -1.4, 114, 440),
                (8.8, -3.2, 38, 160),
            ],
        )
        return dataset_root

    def _create_single_factor_parameter_fixture(self, root: Path) -> Path:
        dataset_root = root / "SingleFactor"
        self._write_workbook(
            dataset_root / "Var2_positive_voltage_result.xlsx",
            [
                ("组号", "角度", "稳定性"),
                (2, 39.3, 0.33),
            ],
        )
        self._write_workbook(
            dataset_root / "Var3_negative_voltage_result.xlsx",
            [
                ("组号", "角度", "稳定性"),
                (1, 41.2, 0.32),
            ],
        )
        self._write_workbook(
            dataset_root / "Var4_frequency_result.xlsx",
            [
                ("组号", "角度", "稳定性"),
                (10, 19.5, 0.45),
            ],
        )
        self._write_workbook(
            dataset_root / "Var6_length_result.xlsx",
            [
                ("组号", "角度", "稳定性"),
                (50, 19.3, 0.36),
            ],
        )
        return dataset_root

    def test_determine_algorithm(self) -> None:
        self.assertEqual(determine_algorithm(__import__("pathlib").Path("20241231-noise-2obj-angle-mixedcv-20")), "FNA-MOBO")
        self.assertEqual(determine_algorithm(__import__("pathlib").Path("20241228-2obj-angle-mixedcv-20")), "IST-MOBO")

    def test_determine_target_angle(self) -> None:
        Path = __import__("pathlib").Path
        self.assertEqual(determine_target_angle(Path("20241228-2obj-angle-mixedcv-20")), 20)
        self.assertEqual(determine_target_angle(Path("15°.xlsx")), 15)

    def test_normalize_stage_name(self) -> None:
        self.assertEqual(normalize_stage_name("initial10_input"), "initial10")
        self.assertEqual(normalize_stage_name("input"), "initial")
        self.assertEqual(normalize_stage_name("opt1_result"), "opt1")

    def test_parse_group_label(self) -> None:
        self.assertEqual(parse_group_label("20_opt1-3", "unknown", None), ("opt1", 3, 20))
        self.assertEqual(parse_group_label("initial10-7", "unknown", 15), ("initial10", 7, 15))
        self.assertEqual(parse_group_label(5, "initial", 25), ("initial", 5, 25))

    def test_parse_image_record_label(self) -> None:
        self.assertEqual(parse_image_record_label("1-5"), (1, 5))
        self.assertEqual(parse_image_record_label("initial10-3-4"), (3, 4))

    def test_infer_dataset_family(self) -> None:
        self.assertEqual(infer_dataset_family(Path("20241231-noise-2obj-angle-mixedcv-20")), "noise")
        self.assertEqual(infer_dataset_family(Path("20241228-2obj-angle-mixedcv-20")), "mixedcv")
        self.assertEqual(infer_dataset_family(Path("SingleFactor")), "single_factor")

    def test_parse_image_path_supports_two_directory_layouts(self) -> None:
        dataset_root = Path("D:/LabOSData/cvdata/20241228-2obj-angle-mixedcv-20")
        parsed_a = parse_image_path(dataset_root / "opt1" / "3" / "2.jpg", dataset_root)
        parsed_b = parse_image_path(dataset_root / "opt1-3" / "2.jpg", dataset_root)

        self.assertEqual(parsed_a["stage_name"], "opt1")
        self.assertEqual(parsed_a["group_index"], 3)
        self.assertEqual(parsed_a["image_index"], 2)
        self.assertEqual(parsed_b["stage_name"], "opt1")
        self.assertEqual(parsed_b["group_index"], 3)
        self.assertEqual(parsed_b["image_index"], 2)

    def test_parse_image_path_supports_stage_and_image_only_layout(self) -> None:
        dataset_root = Path("D:/LabOSData/cvdata/20241228-2obj-angle-mixedcv-20")
        parsed = parse_image_path(dataset_root / "opt4" / "1-15s未刻完.jpg", dataset_root)

        self.assertEqual(parsed["stage_name"], "opt4")
        self.assertEqual(parsed["group_index"], 1)
        self.assertEqual(parsed["image_index"], 1)

    def test_parse_image_path_supports_nested_alias_directory(self) -> None:
        dataset_root = Path("D:/LabOSData/cvdata/20241229-2obj-angle-mixedcv-25")
        parsed = parse_image_path(dataset_root / "initial28" / "initial10" / "1" / "1.jpg", dataset_root)

        self.assertEqual(parsed["stage_name"], "initial10")
        self.assertEqual(parsed["group_index"], 1)
        self.assertEqual(parsed["image_index"], 1)

    def test_parse_image_path_supports_target_prefixed_stage_directory(self) -> None:
        dataset_root = Path("D:/LabOSData/cvdata/20241230-2obj-angle-mixedcv-30")
        parsed = parse_image_path(dataset_root / "initial46" / "20_opt1" / "2" / "3.jpg", dataset_root)

        self.assertEqual(parsed["stage_name"], "opt1")
        self.assertEqual(parsed["group_index"], 2)
        self.assertEqual(parsed["image_index"], 3)

    def test_parse_image_path_supports_sem_filename_layout(self) -> None:
        dataset_root = Path("D:/LabOSData/cvdata/20250102SEM")
        parsed = parse_image_path(dataset_root / "SEM" / "4W" / "opt2-2-1-4w.tiff", dataset_root)

        self.assertEqual(parsed["stage_name"], "opt2")
        self.assertEqual(parsed["group_index"], 2)
        self.assertEqual(parsed["image_index"], 1)

    def test_parse_image_path_supports_sem_filename_with_spaces(self) -> None:
        dataset_root = Path("D:/LabOSData/cvdata/20250103SEM")
        parsed = parse_image_path(dataset_root / "SEM" / "4W" / "opt2-2-6 -4w.tiff", dataset_root)

        self.assertEqual(parsed["stage_name"], "opt2")
        self.assertEqual(parsed["group_index"], 2)
        self.assertEqual(parsed["image_index"], 6)

    def test_create_schema_creates_normalized_tables(self) -> None:
        connection = sqlite3.connect(":memory:")
        create_schema(connection)
        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        connection.close()

        self.assertTrue(
            {
                "datasets",
                "experiments",
                "experiment_parameters",
                "experiment_measurements",
                "experiment_images",
                "source_files",
                "raw_import_rows",
            }.issubset(tables)
        )

    def test_collect_experiments_from_directory_structure(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dataset_root = root / "20241231-noise-2obj-angle-mixedcv-20"
            image_dir = dataset_root / "opt1" / "3"
            image_dir.mkdir(parents=True)
            (image_dir / "1.jpg").write_bytes(b"fake-image")
            (image_dir / "2.jpg").write_bytes(b"fake-image")

            collector = collect_experiments(root)

            self.assertEqual(len(collector.datasets), 1)
            self.assertEqual(len(collector.experiments), 1)
            self.assertEqual(len(collector.images), 2)

            dataset = next(iter(collector.datasets.values()))
            experiment = next(iter(collector.experiments.values()))

            self.assertEqual(dataset.algorithm_name, "FNA-MOBO")
            self.assertEqual(dataset.target_cone_angle_deg, 20)
            self.assertEqual(experiment.stage_name, "opt1")
            self.assertEqual(experiment.group_index, 3)

    def test_collect_experiments_imports_nested_workbook_parameters_and_measurements(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._create_nested_result_fixture(root)

            collector = collect_experiments(root)

            self.assertEqual(len(collector.experiments), 1)
            experiment = next(iter(collector.experiments.values()))
            self.assertEqual(experiment.parameters["positive_voltage_v"], 4.8)
            self.assertEqual(experiment.parameters["negative_voltage_v"], -1.4)
            self.assertEqual(experiment.parameters["frequency_hz"], 114.0)
            self.assertEqual(experiment.parameters["immersion_depth_um"], 440.0)
            self.assertEqual(experiment.measurements["cone_angle_deg"], 45.2)
            self.assertEqual(experiment.measurements["angle_diff_deg"], 30.2)
            self.assertEqual(experiment.measurements["stability"], 0.34)

    def test_build_database_persists_imported_parameters_and_measurements(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._create_nested_result_fixture(root)
            db_path = root / "output.sqlite"

            build_database(root, db_path)

            connection = sqlite3.connect(db_path)
            parameter_row = connection.execute(
                """
                SELECT positive_voltage_v, negative_voltage_v, frequency_hz, immersion_depth_um
                FROM experiment_parameters
                """
            ).fetchone()
            measurement_row = connection.execute(
                """
                SELECT cone_angle_deg, angle_diff_deg, stability
                FROM experiment_measurements
                """
            ).fetchone()
            connection.close()

            self.assertEqual(parameter_row, (4.8, -1.4, 114.0, 440.0))
            self.assertEqual(measurement_row, (45.2, 30.2, 0.34))

    def test_collect_experiments_imports_input_workbook_without_group_column(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._create_input_without_group_fixture(root)

            collector = collect_experiments(root)

            experiment_one = collector.experiments[("20241226-2obj-angle-mixedcv-15-no-group", "initial10", 1)]
            experiment_two = collector.experiments[("20241226-2obj-angle-mixedcv-15-no-group", "initial10", 2)]

            self.assertEqual(experiment_one.parameters["positive_voltage_v"], 4.8)
            self.assertEqual(experiment_two.parameters["positive_voltage_v"], 8.8)
            self.assertEqual(experiment_one.parameters["immersion_depth_um"], 440.0)
            self.assertEqual(experiment_two.parameters["immersion_depth_um"], 160.0)

    def test_collect_experiments_skips_excel_helper_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            helper_dir = root / "excel"
            self._write_workbook(
                helper_dir / "result.xlsx",
                [
                    ("组号", "角度_mean", "稳定性"),
                    (1, 45.2, 0.34),
                ],
            )
            dataset_root = root / "20241231-noise-2obj-angle-mixedcv-20"
            image_dir = dataset_root / "opt1" / "3"
            image_dir.mkdir(parents=True)
            (image_dir / "1.jpg").write_bytes(b"fake-image")

            collector = collect_experiments(root)

            self.assertEqual(set(collector.datasets.keys()), {"20241231-noise-2obj-angle-mixedcv-20"})

    def test_collect_experiments_maps_single_factor_group_values_to_parameters(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self._create_single_factor_parameter_fixture(root)

            collector = collect_experiments(root)

            self.assertEqual(
                collector.experiments[("SingleFactor", "Var2_positive_voltage", 2)].parameters["positive_voltage_v"],
                2.0,
            )
            self.assertEqual(
                collector.experiments[("SingleFactor", "Var3_negative_voltage", 1)].parameters["negative_voltage_v"],
                1.0,
            )
            self.assertEqual(
                collector.experiments[("SingleFactor", "Var4_frequency", 10)].parameters["frequency_hz"],
                10.0,
            )
            self.assertEqual(
                collector.experiments[("SingleFactor", "Var6_length", 50)].parameters["immersion_depth_um"],
                50.0,
            )

    def test_single_factor_concentration_and_time_are_persisted(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dataset_root = root / "SingleFactor"
            self._write_workbook(
                dataset_root / "Var1_solution_concentration_result.xlsx",
                [
                    ("组号", "角度", "稳定性"),
                    (5, 65.6, 0.31),
                ],
            )
            self._write_workbook(
                dataset_root / "Var5_time_result.xlsx",
                [
                    ("组号", "角度", "稳定性"),
                    (0, 29.2, 0.46),
                    (1, 32.1, 0.25),
                ],
            )
            db_path = root / "output.sqlite"

            collector = collect_experiments(root)
            self.assertEqual(
                collector.experiments[("SingleFactor", "Var1_solution_concentration", 5)].parameters["solution_concentration"],
                5.0,
            )
            self.assertEqual(
                collector.experiments[("SingleFactor", "Var5_time", 1)].parameters["etching_time_s"],
                1.0,
            )

            build_database(root, db_path)
            connection = sqlite3.connect(db_path)
            parameter_columns = {
                row[1] for row in connection.execute("PRAGMA table_info(experiment_parameters)").fetchall()
            }
            rows = connection.execute(
                """
                SELECT e.stage_name, e.group_index, p.solution_concentration, p.etching_time_s
                FROM experiments e
                JOIN datasets d ON d.id = e.dataset_id
                JOIN experiment_parameters p ON p.experiment_id = e.id
                WHERE d.dataset_name = 'SingleFactor'
                ORDER BY e.stage_name, e.group_index
                """
            ).fetchall()
            connection.close()

            self.assertIn("solution_concentration", parameter_columns)
            self.assertIn("etching_time_s", parameter_columns)
            self.assertIn(("Var1_solution_concentration", 5, 5.0, None), rows)
            self.assertIn(("Var5_time", 0, None, 0.0), rows)
            self.assertIn(("Var5_time", 1, None, 1.0), rows)

    def test_build_database_links_raw_rows_to_their_source_workbook(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dataset_root = root / "20241226-2obj-angle-mixedcv-15-test"
            self._write_workbook(
                dataset_root / "initial10_input.xlsx",
                [
                    ("组号", "正电压(V)", "负电压(V)", "频率(Hz)", "伸入长度(μm)"),
                    (1, 4.8, -1.4, 114, 440),
                    (2, 8.8, -3.2, 38, 160),
                ],
            )
            db_path = root / "output.sqlite"

            build_database(root, db_path)

            connection = sqlite3.connect(db_path)
            rows = connection.execute(
                """
                SELECT sf.file_path, sf.sheet_name, rir.row_identifier
                FROM raw_import_rows rir
                JOIN source_files sf ON sf.id = rir.source_file_id
                ORDER BY rir.id
                """
            ).fetchall()
            null_links = connection.execute(
                "SELECT COUNT(*) FROM raw_import_rows WHERE source_file_id IS NULL"
            ).fetchone()[0]
            connection.close()

            self.assertEqual(null_links, 0)
            self.assertEqual(
                rows,
                [
                    (str(dataset_root / "initial10_input.xlsx"), "Sheet", "Sheet:1:1"),
                    (str(dataset_root / "initial10_input.xlsx"), "Sheet", "Sheet:2:2"),
                ],
            )

    def test_collect_experiments_filters_duplicate_and_helper_workbooks(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dataset_root = root / "20241225-4obj"
            self._write_workbook(
                dataset_root / "opt1_results.xlsx",
                [
                    ("组号", "角度", "稳定性"),
                    (1, 39.0, 0.3),
                ],
            )
            self._write_workbook(
                dataset_root / "output_results - 副本.xlsx",
                [
                    ("组号", "角度", "稳定性"),
                    (1, 40.0, 0.31),
                ],
            )
            self._write_workbook(
                dataset_root / "opt1" / "1" / "output_results.xlsx",
                [
                    ("编号", "角度", "稳定性"),
                    ("1-1", 28.0, 0.2),
                ],
            )
            sem_root = root / "20250103SEM"
            self._write_workbook(
                sem_root / "result.xlsx",
                [
                    ("组号", "角度", "稳定性"),
                    (1, 33.0, 0.1),
                ],
            )
            single_factor = root / "SingleFactor"
            self._write_workbook(
                single_factor / "汇总.xlsx",
                [
                    ("浓度", "角度", "稳定性"),
                    (5, 60.0, 0.3),
                ],
            )

            collector = collect_experiments(root)
            keys = set(collector.experiments.keys())

            self.assertIn(("20241225-4obj", "opt1", 1), keys)
            self.assertNotIn(("20241225-4obj", "opt1_results", 1), keys)
            self.assertNotIn(("20241225-4obj", "output_results - 副本", 1), keys)
            self.assertNotIn(("20250103SEM", "result", 1), keys)
            self.assertNotIn(("SingleFactor", "汇总", 5), keys)

    def test_build_database_can_reuse_existing_db_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dataset_root = root / "20241231-noise-2obj-angle-mixedcv-20"
            image_dir = dataset_root / "opt1" / "3"
            image_dir.mkdir(parents=True)
            (image_dir / "1.jpg").write_bytes(b"fake-image")
            db_path = root / "output.sqlite"

            first_counts = build_database(root, db_path)
            second_counts = build_database(root, db_path)

            self.assertEqual(first_counts, second_counts)
            self.assertTrue(db_path.exists())


if __name__ == "__main__":
    unittest.main()

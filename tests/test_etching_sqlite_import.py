import sqlite3
import tempfile
import unittest
from pathlib import Path

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

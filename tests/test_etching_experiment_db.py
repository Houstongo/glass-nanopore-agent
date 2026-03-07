import sqlite3
import tempfile
import unittest
from pathlib import Path

from tools.etching_experiment_db import (
    CV_RESULT_ROOT,
    build_database,
    collect_experiments,
    create_schema,
    determine_algorithm,
    determine_target_angle,
    infer_dataset_family,
    normalize_stage_name,
    parse_group_label,
    parse_image_path,
    parse_image_record_label,
)


class EtchingExperimentDbTests(unittest.TestCase):
    def test_default_result_root_points_to_labosdata(self) -> None:
        self.assertEqual(CV_RESULT_ROOT, Path(r"D:\LabOSData\cvdata"))

    def test_determine_algorithm(self) -> None:
        self.assertEqual(determine_algorithm(Path("20241231-noise-2obj-angle-mixedcv-20")), "FNA-MOBO")
        self.assertEqual(determine_algorithm(Path("20241228-2obj-angle-mixedcv-20")), "IST-MOBO")

    def test_determine_target_angle(self) -> None:
        self.assertEqual(determine_target_angle(Path("20241228-2obj-angle-mixedcv-20")), 20)
        self.assertEqual(determine_target_angle(Path("15掳.xlsx")), 15)

    def test_infer_dataset_family(self) -> None:
        self.assertEqual(infer_dataset_family(Path("20241231-noise-2obj-angle-mixedcv-20")), "noise")
        self.assertEqual(infer_dataset_family(Path("SingleFactor")), "single_factor")

    def test_parse_path_variants(self) -> None:
        dataset_root = Path("D:/LabOSData/cvdata/20241228-2obj-angle-mixedcv-20")
        parsed_a = parse_image_path(dataset_root / "opt1" / "3" / "2.jpg", dataset_root)
        parsed_b = parse_image_path(dataset_root / "opt1-3" / "2.jpg", dataset_root)
        parsed_c = parse_image_path(dataset_root / "opt4" / "1-15s未刻完.jpg", dataset_root)

        self.assertEqual(parsed_a["group_index"], 3)
        self.assertEqual(parsed_b["group_index"], 3)
        self.assertEqual(parsed_c["group_index"], 1)

    def test_parse_sem_variants(self) -> None:
        dataset_root = Path("D:/LabOSData/cvdata/20250103SEM")
        parsed_a = parse_image_path(dataset_root / "SEM" / "4W" / "opt2-2-1-4w.tiff", dataset_root)
        parsed_b = parse_image_path(dataset_root / "SEM" / "4W" / "opt2-2-6 -4w.tiff", dataset_root)

        self.assertEqual(parsed_a["stage_name"], "opt2")
        self.assertEqual(parsed_a["group_index"], 2)
        self.assertEqual(parsed_b["image_index"], 6)

    def test_schema_contains_normalized_tables(self) -> None:
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

    def test_collect_and_build_database(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dataset_root = root / "20241231-noise-2obj-angle-mixedcv-20"
            image_dir = dataset_root / "opt1" / "3"
            image_dir.mkdir(parents=True)
            (image_dir / "1.jpg").write_bytes(b"fake-image")
            db_path = root / "etching.sqlite"

            collector = collect_experiments(root)
            counts = build_database(root, db_path)

            self.assertEqual(len(collector.datasets), 1)
            self.assertEqual(len(collector.experiments), 1)
            self.assertEqual(counts, (1, 1, 1))
            self.assertTrue(db_path.exists())


if __name__ == "__main__":
    unittest.main()

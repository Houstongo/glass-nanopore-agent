import csv
import tempfile
import unittest
from pathlib import Path

from tools.knowledge_master_index import (
    aggregate_manifests,
    classify_tags,
    write_master_index,
)


class KnowledgeMasterIndexTests(unittest.TestCase):
    def test_classify_tags_marks_method_paper_as_core_process(self) -> None:
        row = {
            "title": "A practical guide to working with nanopipettes",
            "notes": "强方法论文，包含拉制参数、清洁、环境条件、复现性建议",
        }

        tags = classify_tags(row, Path("D:/LabOSData/knowledge_raw/02_domain_literature/round3_methods_params/round3_manifest.csv"))

        self.assertEqual(tags["tag_core_process"], "1")
        self.assertEqual(tags["tag_mechanism_constraint"], "0")
        self.assertEqual(tags["priority"], "high")

    def test_classify_tags_marks_failure_source_as_failure_review(self) -> None:
        row = {
            "title": "Operando monitoring of gas bubble evolution in water electrolysis by single high-frequency impedance",
            "notes": "核心诊断文献，直接对应阻抗/波形监测与气泡归因",
        }

        tags = classify_tags(row, Path("D:/LabOSData/knowledge_raw/04_failure_modes/round4_diagnostics/round4_manifest.csv"))

        self.assertEqual(tags["tag_failure_review"], "1")
        self.assertEqual(tags["priority"], "high")

    def test_classify_tags_marks_sop_source_as_safety(self) -> None:
        row = {
            "title": "University of Minnesota Hydrofluoric Acid SOP",
            "notes": "HF 使用核心安全 SOP，可直接转成强约束",
        }

        tags = classify_tags(row, Path("D:/LabOSData/knowledge_raw/03_sop_safety/round5_sop_operations/round5_manifest.csv"))

        self.assertEqual(tags["tag_sop_safety"], "1")
        self.assertEqual(tags["priority"], "high")

    def test_aggregate_manifests_combines_rows_and_round_names(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            manifest_a = root / "round2_manifest.csv"
            manifest_b = root / "round4_manifest.csv"
            manifest_a.write_text(
                "title,source_type,url,local_file,status,notes\n"
                "Paper A,html,https://example.com/a,a.html,downloaded_html,方法\n",
                encoding="utf-8",
            )
            manifest_b.write_text(
                "title,source_type,url,local_file,status,notes\n"
                "Paper B,html,https://example.com/b,b.html,downloaded_html,诊断\n",
                encoding="utf-8",
            )

            rows = aggregate_manifests([manifest_a, manifest_b])

            self.assertEqual(len(rows), 2)
            self.assertEqual(rows[0]["round"], "round2")
            self.assertEqual(rows[1]["round"], "round4")

    def test_write_master_index_outputs_csv_and_summary(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            csv_path = root / "master_index.csv"
            summary_path = root / "master_index_summary.md"
            rows = [
                {
                    "round": "round3",
                    "category_dir": "02_domain_literature/round3_methods_params",
                    "title": "Paper A",
                    "url": "https://example.com/a",
                    "source_type": "html",
                    "status": "downloaded_html",
                    "local_file": "a.html",
                    "notes": "方法",
                    "tag_core_process": "1",
                    "tag_mechanism_constraint": "0",
                    "tag_failure_review": "0",
                    "tag_sop_safety": "0",
                    "tag_visual_analysis": "0",
                    "tag_hardware_protocol": "0",
                    "priority": "high",
                    "selected_for_kb": "1",
                }
            ]

            write_master_index(csv_path, summary_path, rows)

            self.assertTrue(csv_path.exists())
            self.assertTrue(summary_path.exists())
            with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
                saved_rows = list(csv.DictReader(handle))
            self.assertEqual(saved_rows[0]["title"], "Paper A")
            self.assertIn("核心工艺", summary_path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()

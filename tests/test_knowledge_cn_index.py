import csv
import tempfile
import unittest
from pathlib import Path

from tools.knowledge_cn_index import (
    build_keywords_zh,
    translate_title_zh,
    write_cn_index,
)


class KnowledgeCnIndexTests(unittest.TestCase):
    def test_translate_title_zh_maps_known_titles(self) -> None:
        self.assertEqual(
            translate_title_zh("A practical guide to working with nanopipettes"),
            "纳米移液管实用操作指南",
        )

    def test_translate_title_zh_falls_back_to_original(self) -> None:
        self.assertEqual(
            translate_title_zh("Unknown Source Title"),
            "Unknown Source Title",
        )

    def test_build_keywords_zh_uses_tags_and_title(self) -> None:
        row = {
            "title": "Operando monitoring of gas bubble evolution in water electrolysis by single high-frequency impedance",
            "tag_failure_review": "1",
            "tag_mechanism_constraint": "0",
            "tag_core_process": "0",
            "tag_sop_safety": "0",
            "tag_visual_analysis": "0",
            "tag_hardware_protocol": "0",
        }

        keywords = build_keywords_zh(row)

        self.assertIn("气泡", keywords)
        self.assertIn("异常复盘", keywords)
        self.assertIn("阻抗", keywords)

    def test_write_cn_index_outputs_augmented_columns(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "master_index_cn.csv"
            rows = [
                {
                    "title": "A practical guide to working with nanopipettes",
                    "round": "round3",
                    "tag_core_process": "1",
                    "tag_mechanism_constraint": "0",
                    "tag_failure_review": "0",
                    "tag_sop_safety": "0",
                    "tag_visual_analysis": "0",
                    "tag_hardware_protocol": "0",
                }
            ]

            write_cn_index(output_path, rows)

            with output_path.open("r", encoding="utf-8-sig", newline="") as handle:
                saved_rows = list(csv.DictReader(handle))

            self.assertEqual(saved_rows[0]["title_zh"], "纳米移液管实用操作指南")
            self.assertIn("核心工艺", saved_rows[0]["keywords_zh"])


if __name__ == "__main__":
    unittest.main()

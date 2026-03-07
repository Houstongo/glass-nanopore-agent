import csv
import tempfile
import unittest
from pathlib import Path

from tools.knowledge_embedding_input import build_embedding_row, write_embedding_input


class KnowledgeEmbeddingInputTests(unittest.TestCase):
    def test_build_embedding_row_combines_chinese_fields(self) -> None:
        row = {
            "round": "round3",
            "category_dir": "02_domain_literature/round3_methods_params",
            "title": "A practical guide to working with nanopipettes",
            "title_zh": "纳米移液管实用操作指南",
            "title_zh_short": "纳米移液管实用操作指南",
            "keywords_zh": "纳米移液管；核心工艺",
            "notes": "强方法论文，包含拉制参数、清洁、环境条件、复现性建议",
            "status": "downloaded_html",
            "local_file": "a.html",
            "priority": "high",
            "selected_for_kb": "1",
        }

        built = build_embedding_row(row)

        self.assertEqual(built["title_zh"], "纳米移液管实用操作指南")
        self.assertIn("中文标题：纳米移液管实用操作指南", built["embedding_text"])
        self.assertIn("中文关键词：纳米移液管；核心工艺", built["embedding_text"])

    def test_write_embedding_input_outputs_csv(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "embedding_input.csv"
            rows = [
                {
                    "round": "round3",
                    "category_dir": "02_domain_literature/round3_methods_params",
                    "title": "A practical guide to working with nanopipettes",
                    "title_zh": "纳米移液管实用操作指南",
                    "title_zh_short": "纳米移液管实用操作指南",
                    "keywords_zh": "纳米移液管；核心工艺",
                    "notes": "强方法论文，包含拉制参数、清洁、环境条件、复现性建议",
                    "status": "downloaded_html",
                    "local_file": "a.html",
                    "priority": "high",
                    "selected_for_kb": "1",
                }
            ]

            write_embedding_input(output_path, rows)

            with output_path.open("r", encoding="utf-8-sig", newline="") as handle:
                saved_rows = list(csv.DictReader(handle))
            self.assertEqual(saved_rows[0]["title_zh"], "纳米移液管实用操作指南")
            self.assertIn("embedding_text", saved_rows[0])


if __name__ == "__main__":
    unittest.main()

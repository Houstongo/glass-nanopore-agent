import json
import tempfile
import unittest
from pathlib import Path

from tools.retrieval_training_samples import (
    build_sample,
    generate_queries,
    generate_samples,
    write_jsonl,
)


class RetrievalTrainingSamplesTests(unittest.TestCase):
    def setUp(self) -> None:
        self.rows = [
            {
                "title_zh": "纳米移液管实用操作指南",
                "title_zh_short": "纳米移液管实用操作指南",
                "title": "A practical guide to working with nanopipettes",
                "keywords_zh": "纳米移液管；核心工艺",
                "notes": "强方法论文，包含拉制参数、清洁、环境条件、复现性建议",
                "round": "round3",
                "category_dir": "02_domain_literature/round3_methods_params",
                "status": "downloaded_html",
                "local_file": "a.html",
                "tag_core_process": "1",
                "tag_mechanism_constraint": "0",
                "tag_failure_review": "0",
                "tag_sop_safety": "0",
                "tag_visual_analysis": "0",
                "tag_hardware_protocol": "0",
                "priority": "high",
                "selected_for_kb": "1",
            },
            {
                "title_zh": "基于单一高频阻抗的水电解气泡演化原位监测",
                "title_zh_short": "基于单一高频阻抗的水电解气泡演化原位监测",
                "title": "Operando monitoring of gas bubble evolution in water electrolysis by single high-frequency impedance",
                "keywords_zh": "气泡；阻抗；水电解；异常复盘",
                "notes": "核心诊断文献，直接对应阻抗、波形监测与气泡归因",
                "round": "round4",
                "category_dir": "04_failure_modes/round4_diagnostics",
                "status": "downloaded_html",
                "local_file": "b.html",
                "tag_core_process": "0",
                "tag_mechanism_constraint": "0",
                "tag_failure_review": "1",
                "tag_sop_safety": "0",
                "tag_visual_analysis": "0",
                "tag_hardware_protocol": "0",
                "priority": "high",
                "selected_for_kb": "1",
            },
            {
                "title_zh": "明尼苏达大学氢氟酸 SOP",
                "title_zh_short": "明尼苏达大学氢氟酸 SOP",
                "title": "University of Minnesota Hydrofluoric Acid SOP",
                "keywords_zh": "SOP；氢氟酸；SOP/安全",
                "notes": "HF 使用核心安全 SOP，可直接转成强约束",
                "round": "round5",
                "category_dir": "03_sop_safety/round5_sop_operations",
                "status": "downloaded_html",
                "local_file": "c.html",
                "tag_core_process": "0",
                "tag_mechanism_constraint": "0",
                "tag_failure_review": "0",
                "tag_sop_safety": "1",
                "tag_visual_analysis": "0",
                "tag_hardware_protocol": "0",
                "priority": "high",
                "selected_for_kb": "1",
            },
        ]

    def test_generate_queries_for_core_process(self) -> None:
        queries = generate_queries(self.rows[0])
        self.assertTrue(any("工艺" in query["query"] or "参数" in query["query"] for query in queries))

    def test_build_sample_contains_negatives(self) -> None:
        sample = build_sample("retrieval_0001", self.rows[0], self.rows, 0)
        self.assertEqual(sample["positive"]["title_zh"], "纳米移液管实用操作指南")
        self.assertGreaterEqual(len(sample["negatives"]), 2)
        self.assertNotEqual(sample["negatives"][0]["title_zh"], sample["positive"]["title_zh"])

    def test_generate_samples_produces_multiple_queries(self) -> None:
        samples = generate_samples(self.rows, target_count=6)
        self.assertGreaterEqual(len(samples), 6)
        self.assertEqual(samples[0]["id"], "retrieval_0001")

    def test_write_jsonl_outputs_lines(self) -> None:
        samples = generate_samples(self.rows, target_count=4)
        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "samples.jsonl"
            write_jsonl(output_path, samples)
            lines = output_path.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(lines), len(samples))
            loaded = json.loads(lines[0])
            self.assertIn("query", loaded)
            self.assertIn("negatives", loaded)


if __name__ == "__main__":
    unittest.main()

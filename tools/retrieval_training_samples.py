import csv
import json
from pathlib import Path


def detect_query_type(row: dict[str, str]) -> str:
    if row.get("tag_core_process") == "1":
        return "core_process"
    if row.get("tag_mechanism_constraint") == "1":
        return "mechanism_constraint"
    if row.get("tag_failure_review") == "1":
        return "failure_diagnosis"
    if row.get("tag_sop_safety") == "1":
        return "sop_safety"
    if row.get("tag_visual_analysis") == "1":
        return "visual_analysis"
    if row.get("tag_hardware_protocol") == "1":
        return "hardware_protocol"
    return "general_retrieval"


def generate_queries(row: dict[str, str]) -> list[dict[str, str]]:
    title = row.get("title_zh", "")
    keywords = row.get("keywords_zh", "")
    query_type = detect_query_type(row)

    templates = {
        "core_process": [
            f"{title}对应的关键工艺参数是什么",
            f"如何复现实验方法：{title}",
        ],
        "mechanism_constraint": [
            f"{title}说明了什么物理机理",
            f"哪些机理约束和{title}相关",
        ],
        "failure_diagnosis": [
            f"{title}对应的异常现象怎么判断",
            f"遇到气泡或阻抗异常时可以参考什么资料",
        ],
        "sop_safety": [
            f"{title}有哪些安全约束",
            f"执行前需要查看什么SOP：{title}",
        ],
        "visual_analysis": [
            f"{title}可以支持哪些图像分析任务",
            f"如何做视觉特征提取：{title}",
        ],
        "hardware_protocol": [
            f"{title}包含哪些硬件协议或指令",
            f"需要查看什么硬件文档：{title}",
        ],
        "general_retrieval": [
            f"{title}相关资料",
            f"{keywords}相关文献",
        ],
    }

    return [
        {"query": query, "query_type": query_type}
        for query in templates[query_type]
    ]


def build_doc_id(row: dict[str, str], index: int) -> str:
    return f"{row.get('round', 'roundx')}_{index + 1:03d}"


def build_sample(sample_id: str, positive_row: dict[str, str], all_rows: list[dict[str, str]], query_index: int) -> dict:
    queries = generate_queries(positive_row)
    query = queries[query_index % len(queries)]
    positive_doc_id = build_doc_id(positive_row, all_rows.index(positive_row))
    negatives = []

    for idx, candidate in enumerate(all_rows):
        if candidate is positive_row:
            continue
        negatives.append(
            {
                "doc_id": build_doc_id(candidate, idx),
                "title_zh": candidate.get("title_zh", ""),
                "text": candidate.get("notes", ""),
            }
        )
        if len(negatives) >= 3:
            break

    tags = []
    tag_map = {
        "tag_core_process": "核心工艺",
        "tag_mechanism_constraint": "机理约束",
        "tag_failure_review": "异常复盘",
        "tag_sop_safety": "SOP/安全",
        "tag_visual_analysis": "视觉分析",
        "tag_hardware_protocol": "硬件协议",
    }
    for field, label in tag_map.items():
        if positive_row.get(field) == "1":
            tags.append(label)

    return {
        "id": sample_id,
        "query": query["query"],
        "query_type": query["query_type"],
        "positive": {
            "doc_id": positive_doc_id,
            "title_zh": positive_row.get("title_zh", ""),
            "text": positive_row.get("notes", ""),
        },
        "negatives": negatives,
        "tags": tags,
        "difficulty": "medium" if len(tags) <= 1 else "hard",
        "split": "train",
    }


def generate_samples(rows: list[dict[str, str]], target_count: int = 120) -> list[dict]:
    samples = []
    sample_index = 1
    while len(samples) < target_count:
        for row in rows:
            if len(samples) >= target_count:
                break
            for query_idx, _ in enumerate(generate_queries(row)):
                if len(samples) >= target_count:
                    break
                samples.append(build_sample(f"retrieval_{sample_index:04d}", row, rows, query_idx))
                sample_index += 1
    return samples


def write_jsonl(output_path: Path, samples: list[dict]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        for sample in samples:
            handle.write(json.dumps(sample, ensure_ascii=False) + "\n")


def write_summary(output_path: Path, samples: list[dict]) -> None:
    counts: dict[str, int] = {}
    for sample in samples:
        query_type = sample["query_type"]
        counts[query_type] = counts.get(query_type, 0) + 1
    lines = ["# 检索训练样本汇总", "", f"- 总样本数：{len(samples)}"]
    for key, value in sorted(counts.items()):
        lines.append(f"- {key}：{value}")
    output_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    root = Path("D:/LabOSData/knowledge_raw")
    input_path = root / "master_index_cn.csv"
    output_dir = root / "retrieval_training"
    output_jsonl = output_dir / "train_candidates.jsonl"
    output_summary = output_dir / "train_candidates_summary.md"

    with input_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    samples = generate_samples(rows, target_count=120)
    write_jsonl(output_jsonl, samples)
    write_summary(output_summary, samples)
    print(f"samples={len(samples)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

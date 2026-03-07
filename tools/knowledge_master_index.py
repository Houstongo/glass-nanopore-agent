import csv
from collections import Counter
from pathlib import Path


def infer_round(manifest_path: Path) -> str:
    name = manifest_path.stem.lower()
    for token in ("round2", "round3", "round4", "round5", "source"):
        if token in name:
            return "round1" if token == "source" else token
    return "unknown"


def infer_category_dir(manifest_path: Path) -> str:
    return str(manifest_path.parent).split("knowledge_raw", 1)[-1].lstrip("\\/").replace("\\", "/")


def classify_tags(row: dict[str, str], manifest_path: Path) -> dict[str, str]:
    title = (row.get("title") or "").lower()
    notes = (row.get("notes") or "").lower()
    category_dir = infer_category_dir(manifest_path).lower()
    haystack = " ".join((title, notes, category_dir))

    tags = {
        "tag_core_process": "0",
        "tag_mechanism_constraint": "0",
        "tag_failure_review": "0",
        "tag_sop_safety": "0",
        "tag_visual_analysis": "0",
        "tag_hardware_protocol": "0",
        "priority": "medium",
        "selected_for_kb": "0",
    }

    if any(word in haystack for word in ("method", "practical guide", "nanopipette", "参数", "工艺", "拉制", "制备", "characterization")):
        tags["tag_core_process"] = "1"

    if any(word in haystack for word in ("faraday", "butler", "kinetics", "capillary", "surface tension", "physics", "theory", "机理", "动力学", "毛细")):
        tags["tag_mechanism_constraint"] = "1"

    if any(word in haystack for word in ("bubble", "impedance", "diagnostic", "inactivation", "failure", "gas evolution", "异常", "失效", "归因", "阻抗", "气泡")):
        tags["tag_failure_review"] = "1"

    if any(word in haystack for word in ("sop", "safety", "hydrofluoric", "cleaning", "hazard", "calibration", "安全", "清洗", "校准", "标准操作", "hf")):
        tags["tag_sop_safety"] = "1"

    if any(word in haystack for word in ("opencv", "image", "contour", "canny", "blob", "visual", "图像", "视觉", "轮廓")):
        tags["tag_visual_analysis"] = "1"

    if any(word in haystack for word in ("stm32", "esp-at", "hardware", "protocol", "scpi", "硬件", "协议")):
        tags["tag_hardware_protocol"] = "1"

    high_priority = (
        tags["tag_core_process"] == "1"
        or tags["tag_failure_review"] == "1"
        or tags["tag_sop_safety"] == "1"
    )
    if high_priority:
        tags["priority"] = "high"
        tags["selected_for_kb"] = "1"

    return tags


def aggregate_manifests(manifest_paths: list[Path]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for manifest_path in manifest_paths:
        with manifest_path.open("r", encoding="utf-8-sig", newline="") as handle:
            for row in csv.DictReader(handle):
                merged = {
                    "round": infer_round(manifest_path),
                    "category_dir": infer_category_dir(manifest_path),
                    "title": row.get("title", ""),
                    "url": row.get("url", ""),
                    "source_type": row.get("source_type", ""),
                    "status": row.get("status", ""),
                    "local_file": row.get("local_file", ""),
                    "notes": row.get("notes", ""),
                }
                merged.update(classify_tags(row, manifest_path))
                rows.append(merged)
    return rows


def write_master_index(csv_path: Path, summary_path: Path, rows: list[dict[str, str]]) -> None:
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys()) if rows else []
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    counter = Counter()
    for row in rows:
        counter["total"] += 1
        for key in (
            "tag_core_process",
            "tag_mechanism_constraint",
            "tag_failure_review",
            "tag_sop_safety",
            "tag_visual_analysis",
            "tag_hardware_protocol",
        ):
            if row.get(key) == "1":
                counter[key] += 1

    summary = (
        "# 知识源总索引\n\n"
        f"- 总条目数：{counter['total']}\n"
        f"- 核心工艺：{counter['tag_core_process']}\n"
        f"- 机理约束：{counter['tag_mechanism_constraint']}\n"
        f"- 异常复盘：{counter['tag_failure_review']}\n"
        f"- SOP/安全：{counter['tag_sop_safety']}\n"
        f"- 视觉分析：{counter['tag_visual_analysis']}\n"
        f"- 硬件协议：{counter['tag_hardware_protocol']}\n"
    )
    summary_path.write_text(summary, encoding="utf-8")


def main() -> int:
    root = Path("D:/LabOSData/knowledge_raw")
    manifest_paths = sorted(root.rglob("*manifest.csv"))
    rows = aggregate_manifests(manifest_paths)
    write_master_index(root / "master_index.csv", root / "master_index_summary.md", rows)
    print(f"indexed={len(rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

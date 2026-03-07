import csv
from pathlib import Path


def build_embedding_row(row: dict[str, str]) -> dict[str, str]:
    embedding_text = "\n".join(
        [
            f"中文标题：{row.get('title_zh', '')}",
            f"短标题：{row.get('title_zh_short', '')}",
            f"中文关键词：{row.get('keywords_zh', '')}",
            f"轮次：{row.get('round', '')}",
            f"分类目录：{row.get('category_dir', '')}",
            f"说明：{row.get('notes', '')}",
            f"来源状态：{row.get('status', '')}",
        ]
    )

    return {
        "title_zh": row.get("title_zh", ""),
        "title_zh_short": row.get("title_zh_short", ""),
        "title_en": row.get("title", ""),
        "keywords_zh": row.get("keywords_zh", ""),
        "round": row.get("round", ""),
        "category_dir": row.get("category_dir", ""),
        "status": row.get("status", ""),
        "priority": row.get("priority", ""),
        "selected_for_kb": row.get("selected_for_kb", ""),
        "local_file": row.get("local_file", ""),
        "embedding_text": embedding_text,
    }


def write_embedding_input(output_path: Path, rows: list[dict[str, str]]) -> None:
    built_rows = [build_embedding_row(row) for row in rows]
    fieldnames = list(built_rows[0].keys()) if built_rows else []
    with output_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(built_rows)


def main() -> int:
    root = Path("D:/LabOSData/knowledge_raw")
    input_path = root / "master_index_cn.csv"
    output_path = root / "embedding_input.csv"

    with input_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    write_embedding_input(output_path, rows)
    print(f"embedding_rows={len(rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

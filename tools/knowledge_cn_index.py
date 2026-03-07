import csv
from pathlib import Path


TITLE_TRANSLATIONS = {
    "Faraday's Law - Chemistry LibreTexts": "法拉第定律",
    "MIT OCW Frumkin-Butler-Volmer kinetics": "MIT 公开课：Frumkin-Butler-Volmer 电化学动力学",
    "EPFL Electrochemical Kinetics": "EPFL 电化学动力学",
    "EPFL Surface Tension Capillary Effects": "EPFL 表面张力与毛细效应",
    "Electrostatic-gated transport in chemically modified glass nanopore electrodes": "化学修饰玻璃纳米孔电极中的静电门控传输",
    "Bench-Top Method for Fabricating Glass-Sealed Nanodisk Electrodes": "台式方法制备玻璃封装纳米盘电极",
    "Fabrication and Characterization of Nanopore-Based Electrodes with Radii down to 2 nm": "制备并表征半径低至 2 nm 的纳米孔电极",
    "Facile and Ultraclean Graphene-on-Glass Nanopores by Controlled Electrochemical Etching": "通过受控电化学刻蚀实现超洁净石墨烯-玻璃纳米孔",
    "ACS Sensors abstract page for graphene-on-glass nanopores": "石墨烯-玻璃纳米孔论文摘要页",
    "Supporting Information for graphene-on-glass nanopores": "石墨烯-玻璃纳米孔补充材料",
    "Nanopipette delivery-based multifunctional scanning ion conductance microscopy": "基于纳米移液管递送的多功能扫描离子电导显微技术",
    "Applications of nanopipettes in the analytical sciences": "纳米移液管在分析科学中的应用",
    "Electrochemistry in conductive nanopipettes": "导电纳米移液管中的电化学",
    "A practical guide to working with nanopipettes": "纳米移液管实用操作指南",
    "Recognition of plastic nanoparticles using a single gold nanopore fabricated at the tip of a glass nanopipette": "利用玻璃纳米移液管尖端单金纳米孔识别塑料纳米颗粒",
    "Facile one-step photochemical fabrication and characterization of an ultrathin gold-decorated single glass nanopipette": "单步光化学法制备并表征超薄金修饰单玻璃纳米移液管",
    "Characterization of nanopipettes - WRAP page": "纳米移液管表征（WRAP 页面）",
    "Characterization of nanopipettes - WRAP PDF": "纳米移液管表征（WRAP PDF）",
    "Geometrical Characterization of Glass Nanopipettes with Sub-10 nm Pore Diameter by TEM": "利用 TEM 对孔径小于 10 nm 的玻璃纳米移液管进行几何表征",
    "Electrochemical control of calcium carbonate crystallization and dissolution in nanopipettes - WRAP page": "纳米移液管中碳酸钙结晶与溶解的电化学控制（WRAP 页面）",
    "Electrochemical control of calcium carbonate crystallization and dissolution in nanopipettes - WRAP PDF": "纳米移液管中碳酸钙结晶与溶解的电化学控制（WRAP PDF）",
    "Multifunctional scanning ion conductance microscopy - WRAP page": "多功能扫描离子电导显微技术（WRAP 页面）",
    "Multifunctional scanning ion conductance microscopy - WRAP PDF": "多功能扫描离子电导显微技术（WRAP PDF）",
    "Nanopipette delivery-based multifunctional SICM - WRAP page": "基于纳米移液管递送的多功能 SICM（WRAP 页面）",
    "Nanopipette delivery-based multifunctional SICM - WRAP PDF": "基于纳米移液管递送的多功能 SICM（WRAP PDF）",
    "Differential-concentration scanning ion conductance microscopy - WRAP page": "差分浓度扫描离子电导显微技术（WRAP 页面）",
    "Differential-concentration scanning ion conductance microscopy - WRAP PDF": "差分浓度扫描离子电导显微技术（WRAP PDF）",
    "USC Environmental Health and Safety SOP Portal": "USC 环境健康与安全 SOP 入口",
    "USC Standard Operating Procedures portal": "USC 标准操作规程入口",
    "University of Minnesota Hydrofluoric Acid SOP": "明尼苏达大学氢氟酸 SOP",
    "Harvard Lab Standard Operating Procedure Templates": "哈佛实验室标准操作规程模板",
    "Harvard Lab Standard Operating Procedure Example": "哈佛实验室标准操作规程示例",
    "RIT Semiconductor Nanofabrication Lab Manual SOP": "RIT 半导体纳米加工实验室手册 SOP",
    "NIST Resources Standard Operating Procedures": "NIST 标准操作规程资源",
    "Cal Poly Laboratory Standard Operating Procedures": "Cal Poly 实验室标准操作规程",
    "NanoCuvette One Cleaning Manual": "NanoCuvette One 清洗手册",
    "Cleaning Nanoelectrodes with Air Plasma": "使用空气等离子体清洗纳米电极",
    "Harvard Hazardous Chemical SOP Template": "哈佛危险化学品 SOP 模板",
    "Gas Evolution in Water Electrolysis": "水电解中的气体析出",
    "The effect of magnetic field on the dynamics of gas bubbles in water electrolysis": "磁场对水电解中气泡动力学的影响",
    "Operando monitoring of gas bubble evolution by single high-frequency impedance": "基于单一高频阻抗的气泡演化原位监测",
    "Operando monitoring of gas bubble evolution in water electrolysis by single high-frequency impedance": "基于单一高频阻抗的水电解气泡演化原位监测",
    "Gas bubble behaviour and electrolyte resistance during water electrolysis": "水电解中气泡行为与电解液电阻",
    "Nanobubble Formation and Coverage during High Current Density Alkaline Water Electrolysis": "高电流密度碱性水电解中的纳米气泡形成与覆盖",
    "Nanocone-Modified Surface Facilitates Gas Bubble Detachment for High-Rate Alkaline Water Splitting": "纳米锥改性表面促进高倍率碱性析气中的气泡脱附",
    "Periodic Porous 3D Electrodes Mitigate Gas Bubble Traffic during Alkaline Water Electrolysis at High Current Densities": "周期性多孔三维电极缓解高电流密度碱性水电解中的气泡拥堵",
    "Machine learning-guided discovery of gas evolving electrode bubble inactivation": "机器学习引导发现析气电极中的气泡失活机制",
    "Electrical breakdown of a bubble in a water-filled capillary": "充水毛细管中气泡的电击穿",
    "Nanobubble Formation and Coverage DOI shortcut": "纳米气泡形成与覆盖 DOI 入口",
    "Gas Evolution in Water Electrolysis DOI shortcut": "水电解气体析出 DOI 入口",
    "STM32F103 Documentation Portal": "STM32F103 官方文档入口",
    "ESP-AT Command Set": "ESP-AT 指令集",
    "What is ESP-AT": "什么是 ESP-AT",
    "Chroma Docs - Google ADK": "Chroma 文档：Google ADK 集成",
    "Faiss GitHub README": "Faiss GitHub 说明",
    "Retrieval-Augmented Generation for Large Language Models A Survey": "面向大语言模型的检索增强生成综述",
    "RQ-RAG Learning to Refine Queries for Retrieval Augmented Generation": "RQ-RAG：面向检索增强生成的查询改写",
    "Chain-of-Retrieval Augmented Generation": "检索链增强生成",
    "PDF Retrieval Augmented Question Answering": "PDF 检索增强问答",
    "The Faiss Library": "Faiss 库论文",
    "OpenCV Image Thresholding": "OpenCV 图像阈值分割",
    "OpenCV Finding Contours": "OpenCV 轮廓提取",
    "OpenCV Canny Edge Detector": "OpenCV Canny 边缘检测",
    "OpenCV SimpleBlobDetector": "OpenCV SimpleBlobDetector 文档",
}


def translate_title_zh(title: str) -> str:
    return TITLE_TRANSLATIONS.get(title, title)


def build_short_title(title_zh: str) -> str:
    return title_zh.replace("（WRAP 页面）", "").replace("（WRAP PDF）", "")


def build_keywords_zh(row: dict[str, str]) -> str:
    keywords: list[str] = []
    title = row.get("title", "")
    title_zh = translate_title_zh(title)
    lowered = title.lower()

    if "nanopipette" in lowered or "纳米移液管" in title_zh:
        keywords.append("纳米移液管")
    if "nanopore" in lowered or "纳米孔" in title_zh:
        keywords.append("纳米孔")
    if "bubble" in lowered or "气泡" in title_zh:
        keywords.append("气泡")
    if "impedance" in lowered or "阻抗" in title_zh:
        keywords.append("阻抗")
    if "electrolysis" in lowered or "水电解" in title_zh:
        keywords.append("水电解")
    if "sop" in lowered or "SOP" in title:
        keywords.append("SOP")
    if "stm32" in lowered:
        keywords.append("STM32")
    if "esp-at" in lowered:
        keywords.append("ESP-AT")
    if "opencv" in lowered:
        keywords.append("OpenCV")
    if "rag" in lowered or "retrieval" in lowered:
        keywords.append("RAG")

    tag_map = {
        "tag_core_process": "核心工艺",
        "tag_mechanism_constraint": "机理约束",
        "tag_failure_review": "异常复盘",
        "tag_sop_safety": "SOP/安全",
        "tag_visual_analysis": "视觉分析",
        "tag_hardware_protocol": "硬件协议",
    }
    for field, label in tag_map.items():
        if row.get(field) == "1":
            keywords.append(label)

    deduped: list[str] = []
    for keyword in keywords:
        if keyword and keyword not in deduped:
            deduped.append(keyword)
    return "；".join(deduped)


def write_cn_index(output_path: Path, rows: list[dict[str, str]]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    enriched_rows: list[dict[str, str]] = []
    for row in rows:
        enriched = dict(row)
        title_zh = translate_title_zh(row.get("title", ""))
        enriched["title_zh"] = title_zh
        enriched["title_zh_short"] = build_short_title(title_zh)
        enriched["keywords_zh"] = build_keywords_zh(row)
        enriched_rows.append(enriched)

    fieldnames = list(enriched_rows[0].keys()) if enriched_rows else []
    with output_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(enriched_rows)


def main() -> int:
    root = Path("D:/LabOSData/knowledge_raw")
    input_path = root / "master_index.csv"
    output_path = root / "master_index_cn.csv"

    with input_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    write_cn_index(output_path, rows)
    print(f"translated={len(rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

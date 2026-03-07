import sqlite3
import os

EXPERIMENT_DB_PATH = "D:/AntigravityProject/data/etching_experiments.sqlite"
CVDATA_DIR = "D:/LabOSData/cvdata"

conn = sqlite3.connect(EXPERIMENT_DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

page_size = 5
offset = 0
safe_sort_by = "id"
safe_order = "DESC"

query = f"""
    SELECT 
        e.*, 
        p.positive_voltage_v, 
        p.negative_voltage_v, 
        p.frequency_hz,
        m.target_cone_angle_deg AS target_angle_deg, 
        m.cone_angle_deg AS actual_angle_deg, 
        m.angle_diff_deg,
        m.quality_score,
        i.image_path as main_image 
    FROM experiments e
    LEFT JOIN experiment_parameters p ON e.id = p.experiment_id
    LEFT JOIN experiment_measurements m ON e.id = m.experiment_id
    LEFT JOIN experiment_images i ON e.id = i.experiment_id AND i.image_index = 0
    ORDER BY e.{safe_sort_by} {safe_order}
    LIMIT ? OFFSET ?
"""

cursor.execute(query, (page_size, offset))
rows = [dict(row) for row in cursor.fetchall()]

print(f"Total rows fetched: {len(rows)}")
if rows:
    for i, row in enumerate(rows):
        print(f"Row {i}:")
        print(f"  id: {row['id']}")
        print(f"  run_label: {row.get('run_label')}")
        print(f"  positive_voltage_v: {row.get('positive_voltage_v')}")
        print(f"  actual_angle_deg: {row.get('actual_angle_deg')}")
        print(f"  main_image: {row.get('main_image')}")

conn.close()

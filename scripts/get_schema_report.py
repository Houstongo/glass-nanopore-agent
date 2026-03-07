import sqlite3
import json

db_path = "D:/AntigravityProject/data/etching_experiments.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def get_columns(table):
    cursor.execute(f"PRAGMA table_info({table})")
    return [col[1] for col in cursor.fetchall()]

schema = {
    "experiments": get_columns("experiments"),
    "experiment_parameters": get_columns("experiment_parameters"),
    "experiment_measurements": get_columns("experiment_measurements"),
    "experiment_images": get_columns("experiment_images")
}

with open("D:/AntigravityProject/scripts/schema_report.json", "w", encoding="utf-8") as f:
    json.dump(schema, f, indent=2)

conn.close()

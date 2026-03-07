import sqlite3

db_path = "D:/AntigravityProject/data/etching_experiments.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

tables = ["experiments", "experiment_parameters", "experiment_measurements", "experiment_images"]

for t in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {t}")
    count = cursor.fetchone()[0]
    print(f"Table {t}: {count} rows")

print("\nSchema of experiment_parameters:")
cursor.execute("PRAGMA table_info(experiment_parameters)")
for col in cursor.fetchall():
    print(f"  {col[1]}")

print("\nSchema of experiment_measurements:")
cursor.execute("PRAGMA table_info(experiment_measurements)")
for col in cursor.fetchall():
    print(f"  {col[1]}")

conn.close()

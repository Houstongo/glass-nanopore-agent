import sqlite3

db_path = "D:/AntigravityProject/data/etching_experiments.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Experiments with matching records:")
query = """
    SELECT e.id, COUNT(p.id), COUNT(m.id), COUNT(i.id)
    FROM experiments e
    LEFT JOIN experiment_parameters p ON e.id = p.experiment_id
    LEFT JOIN experiment_measurements m ON e.id = m.experiment_id
    LEFT JOIN experiment_images i ON e.id = i.experiment_id
    GROUP BY e.id
    HAVING COUNT(p.id) > 0 OR COUNT(m.id) > 0
    LIMIT 10
"""
cursor.execute(query)
for row in cursor.fetchall():
    print(f"ID {row[0]}: Params={row[1]}, Measurements={row[2]}, Images={row[3]}")

conn.close()

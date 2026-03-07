import sqlite3

db_path = "D:/AntigravityProject/data/etching_experiments.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 检查 experiments 里的 id 是否出现在其它表中
cursor.execute("SELECT id FROM experiments LIMIT 10")
exp_ids = [row[0] for row in cursor.fetchall()]

for eid in exp_ids:
    print(f"Exp ID: {eid}")
    cursor.execute("SELECT COUNT(*) FROM experiment_parameters WHERE experiment_id = ?", (eid,))
    p_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM experiment_measurements WHERE experiment_id = ?", (eid,))
    m_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM experiment_images WHERE experiment_id = ?", (eid,))
    i_count = cursor.fetchone()[0]
    print(f"  Params: {p_count}, Measurements: {m_count}, Images: {i_count}")

conn.close()

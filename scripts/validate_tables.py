import sqlite3
import os

db_path = "D:/AntigravityProject/data/etching_experiments.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def check_table(table_name):
    print(f"Checking table: {table_name}")
    try:
        cursor.execute(f"PRAGMA table_info({table_name});")
        cols = cursor.fetchall()
        if not cols:
            print(f"  Result: Table {table_name} NOT FOUND")
        else:
            for col in cols:
                print(f"  Field: {col[1]}")
    except Exception as e:
        print(f"  Error: {e}")

check_table("experiments")
check_table("experiment_parameters")
check_table("experiment_measurements")
check_table("experiment_images")

print("\nSample from experiments:")
try:
    cursor.execute("SELECT * FROM experiments LIMIT 1;")
    row = cursor.fetchone()
    print(f"  Sample: {row}")
except Exception as e:
    print(f"  Error: {e}")

conn.close()

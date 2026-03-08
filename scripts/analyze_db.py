
import sqlite3
import json

db_path = "D:/AntigravityProject/data/etching_experiments.sqlite"

def analyze_db():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 获取所有表名
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Tables: {tables}")
    
    for table in tables:
        print(f"\n--- Table: {table} ---")
        cursor.execute(f"PRAGMA table_info({table});")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"Columns: {columns}")
        
        # 检查数据填充情况
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"Total rows: {count}")
        
        if count > 0:
            cursor.execute(f"SELECT * FROM {table} LIMIT 1")
            row = dict(cursor.fetchone())
            print("Sample data:")
            for k, v in row.items():
                if v is None:
                    print(f"  [EMPTY] {k}")
                else:
                    print(f"  {k}: {v}")
                    
            # 统计各列的空值率
            print("Null ratios:")
            for col in columns:
                cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE {col} IS NULL OR {col} = ''")
                null_count = cursor.fetchone()[0]
                ratio = (null_count / count) * 100
                if ratio > 50:
                    print(f"  [WARN] {col}: {ratio:.1f}% empty")
                else:
                    print(f"  {col}: {ratio:.1f}%")

    conn.close()

if __name__ == "__main__":
    analyze_db()

import sqlite3
import json
from typing import Dict, List, Any
import os

class KnowledgeGraphManager:
    def __init__(self, db_path: str, api_key: str):
        self.db_path = db_path
        self.api_key = api_key
        self._init_db()

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        # 创建节点表：实体
        cursor.execute('''CREATE TABLE IF NOT EXISTS nodes (
            id TEXT PRIMARY KEY,
            label TEXT,
            type TEXT,
            source_file TEXT
        )''')
        # 创建边表：关系
        cursor.execute('''CREATE TABLE IF NOT EXISTS edges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT,
            target TEXT,
            relation TEXT,
            source_file TEXT,
            FOREIGN KEY(source) REFERENCES nodes(id),
            FOREIGN KEY(target) REFERENCES nodes(id)
        )''')
        conn.commit()
        conn.close()

    def extract_from_text(self, text: str, source_file: str):
        """使用 LLM 从文本中提取实体和关系"""
        from zhipuai import ZhipuAI
        client = ZhipuAI(api_key=self.api_key)

        # 提示词参考论文第三章模式：提取实验参数、几何特征、物理化学机理等
        system_prompt = (
            "你是一个工业微纳制造与材料科学领域的知识提取专家。\n"
            "任务：从输入的文本中提取关键实体（Entity）以及它们之间的关系（Relation）。\n"
            "实体类型推荐：实验参数（电压、频率、温度）、几何形貌（锥角、内径）、材质（石英、钨丝）、物理效应、制备方法等。\n"
            "关系类型推荐：包含、影响、产生、制备于、设定为等。\n"
            "输出格式必须为严格的 JSON：\n"
            "{\n"
            "  \"nodes\": [{\"id\": \"唯一标识符\", \"label\": \"显示名\", \"type\": \"实体类型\"}],\n"
            "  \"edges\": [{\"source\": \"节点id\", \"target\": \"节点id\", \"relation\": \"关系名\"}]\n"
            "}\n"
            "注意：只需按 JSON 输出，不要有任何多余文字。"
        )

        try:
            response = client.chat.completions.create(
                model="glm-4-flash",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"输入文本：\n{text}"}
                ],
                temperature=0.1,
                max_tokens=1500
            )
            content = response.choices[0].message.content
            # 去掉可能的 markdown 代码块标识
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()
            
            data = json.loads(content)
            self._save_to_db(data, source_file)
            return True
        except Exception as e:
            print(f"KG extraction error: {e}")
            return False

    def _save_to_db(self, data: Dict[str, Any], source_file: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 批量存入节点
        for node in data.get("nodes", []):
            try:
                cursor.execute("INSERT OR REPLACE INTO nodes (id, label, type, source_file) VALUES (?, ?, ?, ?)",
                               (node["id"], node["label"], node.get("type", "entity"), source_file))
            except: pass
            
        # 批量存入边
        for edge in data.get("edges", []):
            try:
                cursor.execute("INSERT OR IGNORE INTO edges (source, target, relation, source_file) VALUES (?, ?, ?, ?)",
                               (edge["source"], edge["target"], edge["relation"], source_file))
            except: pass
            
        conn.commit()
        conn.close()

    def get_graph_data(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        nodes = [dict(row) for row in cursor.execute("SELECT * FROM nodes")]
        edges = [dict(row) for row in cursor.execute("SELECT * FROM edges")]
        
        conn.close()
        return {"nodes": nodes, "links": edges} # link for force-graph library

    def clear_by_file(self, source_file: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM edges WHERE source_file = ?", (source_file,))
        cursor.execute("DELETE FROM nodes WHERE source_file = ?", (source_file,))
        conn.commit()
        conn.close()

# =============================================================================
# logic/database.py  -  Persistence for Success Loop
# =============================================================================

import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "success_loop.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS optimizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME,
            resume_hash TEXT,
            input_resume TEXT,
            input_jd TEXT,
            optimized_text TEXT,
            full_json TEXT,
            outcome TEXT DEFAULT 'pending'
        )
    """)
    conn.commit()
    conn.close()

def save_optimization(resume_hash, input_resume, input_jd, optimized_text, full_json, outcome="pending"):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO optimizations (timestamp, resume_hash, input_resume, input_jd, optimized_text, full_json, outcome)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (datetime.now().isoformat(), resume_hash, input_resume, input_jd, optimized_text, json.dumps(full_json), outcome))
    last_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return last_id

def update_outcome(opt_id, outcome):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE optimizations SET outcome = ? WHERE id = ?", (outcome, opt_id))
    conn.commit()
    conn.close()

def get_winning_phrases(limit=50):
    """Retrieves phrases from successful optimizations (Offer/Interview)."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Simple heuristic: extracting bullet points from successful resumes
    cursor.execute("""
        SELECT optimized_text FROM optimizations 
        WHERE outcome IN ('Offer', 'Interview')
        ORDER BY timestamp DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    phrases = []
    import re
    for (text,) in rows:
        # Extract bullet points
        found = re.findall(r"^\s*[-*]\s+(.*)", text, re.MULTILINE)
        phrases.extend(found)
    return phrases

init_db()

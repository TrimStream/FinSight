import os
import re
from urllib import response

import psycopg2
import google.generativeai as genai
from cffi import model
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        dbname=os.getenv("DB_NAME"),
    )

SCHEMA_CONTEXT = """
You are a SQL expert. You have access to a PostgreSQL database with these tables:

stocks(id, symbol, company, sector, created_at)
price_history(id, stock_id, open, high, low, close, volume, recorded_at, created_at)

stocks.id joins to price_history.stock_id

Rules:
- Only generate SELECT queries, never INSERT, UPDATE, DELETE, or DROP
- Always return valid PostgreSQL SQL
- Return ONLY the SQL query with no explanation, no markdown, no backticks
- Use recorded_at for date filtering
- Round decimal values to 2 places
"""

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    question: str
    sql: str
    results: list
    columns: list

@app.post("/api/query", response_model=QueryResponse)
async def natural_language_query(request: QueryRequest):
    prompt = f"{SCHEMA_CONTEXT}\n\nQuestion: {request.question}\n\nSQL:"

    response = model.generate_content(prompt)
    sql = response.text.strip()

    sql = re.sub(r' ```sql|```', '', sql).strip()

    if not sql.upper().startswith("SELECT"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed.")

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(sql)
        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]
        cur.close()
        conn.close()

        conn2 = get_db()
        cur2 = conn2.cursor()
        cur2.execute("""
            INSERT INTO queries (natural_language, generated_sql, result_count, success)
            VALUES (%s, %s, %s, %s)
        """, (request.question, sql, len(rows), True))
        conn2.commit()
        cur2.close()
        conn2.close()

        return QueryResponse(
            question=request.question,
            sql=sql,
            results=[list(row) for row in rows],
            columns=columns,
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query failed: {str(e)}")

@app.get("/api/health")
async def health():
    return {"status": "ok"}
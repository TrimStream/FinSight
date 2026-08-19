import os
import re
import psycopg2
from google import genai
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

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        dbname=os.getenv("DB_NAME"),
        sslmode=os.getenv("DB_SSLMODE", "require"),
    )

SCHEMA_CONTEXT = """
You are a SQL expert. You have access to a PostgreSQL database with this table:

stock_prices(id, symbol, date, open, high, low, close, volume, created_at)

Rules:
- Only generate SELECT queries, never INSERT, UPDATE, DELETE, or DROP
- Always return valid PostgreSQL SQL
- Return ONLY the SQL query with no explanation, no markdown, no backticks
- Use date for date filtering
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

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query failed: {str(e)}")

    try:
        conn2 = get_db()
        cur2 = conn2.cursor()
        cur2.execute("""
            INSERT INTO queries (natural_language, generated_sql, result_count, success)
            VALUES (%s, %s, %s, %s)
        """, (request.question, sql, len(rows), True))
        conn2.commit()
        cur2.close()
        conn2.close()
    except Exception as e:
        print(f"Warning: failed to log query: {e}")

    return QueryResponse(
        question=request.question,
        sql=sql,
        results=[list(row) for row in rows],
        columns=columns,
    )

@app.get("/api/health")
async def health():
    return {"status": "ok"}

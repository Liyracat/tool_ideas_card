from __future__ import annotations

from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from db import fetch_all, fetch_one, get_connection, init_db

app = FastAPI(title="Idea Cards")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] ,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IdeaLink(BaseModel):
    idea_id: int
    body: str
    tags: List[str]


class Idea(BaseModel):
    idea_id: int
    body: str
    status: str
    tags: List[str] = Field(default_factory=list)
    blockers: List[str] = Field(default_factory=list)
    born_with: List[IdeaLink] = Field(default_factory=list)


class IdeaUpdate(BaseModel):
    body: str
    tags: List[str] = Field(default_factory=list)
    blockers: List[str] = Field(default_factory=list)
    born_with_ids: List[int] = Field(default_factory=list)


class IdeaCreate(IdeaUpdate):
    status: str = "active"


class IdeaSearchResult(BaseModel):
    idea_id: int
    body: str
    tags: List[str] = Field(default_factory=list)


@app.on_event("startup")
def startup() -> None:
    init_db()


def serialize_idea(conn, idea_row) -> Idea:
    if not idea_row:
        raise HTTPException(status_code=404, detail="Idea not found")
    idea_id = idea_row["idea_id"]
    tag_rows = fetch_all(
        conn,
        """
        SELECT t.name
        FROM tags t
        JOIN idea_tags it ON it.tag_id = t.tag_id
        WHERE it.idea_id = ?
        ORDER BY t.name
        """,
        (idea_id,),
    )
    blocker_rows = fetch_all(
        conn,
        """
        SELECT text
        FROM idea_blockers
        WHERE idea_id = ?
        ORDER BY ord
        """,
        (idea_id,),
    )
    link_rows = fetch_all(
        conn,
        """
        SELECT i.idea_id, i.body
        FROM idea_links l
        JOIN ideas i ON i.idea_id = l.linked_idea_id
        WHERE l.idea_id = ? AND l.link_type = 'born_with'
        ORDER BY i.idea_id
        """,
        (idea_id,),
    )
    born_with: List[IdeaLink] = []
    for link in link_rows:
        linked_tags = fetch_all(
            conn,
            """
            SELECT t.name
            FROM tags t
            JOIN idea_tags it ON it.tag_id = t.tag_id
            WHERE it.idea_id = ?
            ORDER BY t.name
            """,
            (link["idea_id"],),
        )
        born_with.append(
            IdeaLink(
                idea_id=link["idea_id"],
                body=link["body"],
                tags=[row["name"] for row in linked_tags],
            )
        )
    return Idea(
        idea_id=idea_id,
        body=idea_row["body"],
        status=idea_row["status"],
        tags=[row["name"] for row in tag_rows],
        blockers=[row["text"] for row in blocker_rows],
        born_with=born_with,
    )


def upsert_tags(conn, idea_id: int, tags: List[str]) -> None:
    conn.execute("DELETE FROM idea_tags WHERE idea_id = ?", (idea_id,))
    normalized = [tag.strip() for tag in tags if tag.strip()]
    for tag in normalized:
        conn.execute(
            "INSERT OR IGNORE INTO tags(name, path) VALUES (?, '')",
            (tag,),
        )
        tag_row = fetch_one(conn, "SELECT tag_id FROM tags WHERE name = ?", (tag,))
        conn.execute(
            "INSERT OR IGNORE INTO idea_tags(idea_id, tag_id) VALUES (?, ?)",
            (idea_id, tag_row["tag_id"]),
        )


def replace_blockers(conn, idea_id: int, blockers: List[str]) -> None:
    conn.execute("DELETE FROM idea_blockers WHERE idea_id = ?", (idea_id,))
    normalized = [blocker.strip() for blocker in blockers if blocker.strip()]
    for idx, blocker in enumerate(normalized):
        conn.execute(
            "INSERT INTO idea_blockers(idea_id, ord, text) VALUES (?, ?, ?)",
            (idea_id, idx, blocker),
        )


def replace_links(conn, idea_id: int, born_with_ids: List[int]) -> None:
    conn.execute(
        "DELETE FROM idea_links WHERE link_type = 'born_with' AND (idea_id = ? OR linked_idea_id = ?)",
        (idea_id, idea_id),
    )
    unique_ids = {int(item) for item in born_with_ids if int(item) != idea_id}
    for linked_id in unique_ids:
        conn.execute(
            "INSERT OR IGNORE INTO idea_links(idea_id, linked_idea_id, link_type) VALUES (?, ?, 'born_with')",
            (idea_id, linked_id),
        )
        conn.execute(
            "INSERT OR IGNORE INTO idea_links(idea_id, linked_idea_id, link_type) VALUES (?, ?, 'born_with')",
            (linked_id, idea_id),
        )


@app.get("/api/ideas/random", response_model=Idea)
def get_random_idea(status: str = "active") -> Idea:
    conn = get_connection()
    try:
        idea_row = fetch_one(
            conn,
            "SELECT * FROM ideas WHERE status = ? ORDER BY RANDOM() LIMIT 1",
            (status,),
        )
        if not idea_row:
            raise HTTPException(status_code=404, detail="No ideas found")
        return serialize_idea(conn, idea_row)
    finally:
        conn.close()


@app.get("/api/ideas/{idea_id}", response_model=Idea)
def get_idea(idea_id: int) -> Idea:
    conn = get_connection()
    try:
        idea_row = fetch_one(conn, "SELECT * FROM ideas WHERE idea_id = ?", (idea_id,))
        return serialize_idea(conn, idea_row)
    finally:
        conn.close()


@app.post("/api/ideas", response_model=Idea)
def create_idea(payload: IdeaCreate) -> Idea:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO ideas(body, status) VALUES (?, ?)",
            (payload.body, payload.status),
        )
        idea_id = cursor.lastrowid
        upsert_tags(conn, idea_id, payload.tags)
        replace_blockers(conn, idea_id, payload.blockers)
        replace_links(conn, idea_id, payload.born_with_ids)
        conn.commit()
        idea_row = fetch_one(conn, "SELECT * FROM ideas WHERE idea_id = ?", (idea_id,))
        return serialize_idea(conn, idea_row)
    finally:
        conn.close()


@app.put("/api/ideas/{idea_id}", response_model=Idea)
def update_idea(idea_id: int, payload: IdeaUpdate) -> Idea:
    conn = get_connection()
    try:
        updated = conn.execute(
            "UPDATE ideas SET body = ?, updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE idea_id = ?",
            (payload.body, idea_id),
        )
        if updated.rowcount == 0:
            raise HTTPException(status_code=404, detail="Idea not found")
        upsert_tags(conn, idea_id, payload.tags)
        replace_blockers(conn, idea_id, payload.blockers)
        replace_links(conn, idea_id, payload.born_with_ids)
        conn.commit()
        idea_row = fetch_one(conn, "SELECT * FROM ideas WHERE idea_id = ?", (idea_id,))
        return serialize_idea(conn, idea_row)
    finally:
        conn.close()


@app.post("/api/ideas/{idea_id}/status", response_model=Idea)
def update_status(idea_id: int, status: str = Query(..., pattern="^(active|execute|transfer|deleted)$")) -> Idea:
    conn = get_connection()
    try:
        updated = conn.execute(
            "UPDATE ideas SET status = ?, updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE idea_id = ?",
            (status, idea_id),
        )
        if updated.rowcount == 0:
            raise HTTPException(status_code=404, detail="Idea not found")
        conn.commit()
        idea_row = fetch_one(conn, "SELECT * FROM ideas WHERE idea_id = ?", (idea_id,))
        return serialize_idea(conn, idea_row)
    finally:
        conn.close()


@app.get("/api/ideas/search", response_model=List[IdeaSearchResult])
def search_ideas(
    keyword: Optional[str] = None,
    tags: Optional[str] = None,
    status: str = "active",
) -> List[IdeaSearchResult]:
    conn = get_connection()
    try:
        tag_list = [tag.strip() for tag in tags.split(",")] if tags else []
        tag_list = [tag for tag in tag_list if tag]
        params: List = [status]
        query = "SELECT DISTINCT i.idea_id, i.body FROM ideas i WHERE i.status = ?"
        if keyword:
            query += " AND i.body LIKE ?"
            params.append(f"%{keyword}%")
        if tag_list:
            for tag in tag_list:
                query += (
                    " AND EXISTS ("
                    "SELECT 1 FROM idea_tags it JOIN tags t ON t.tag_id = it.tag_id "
                    "WHERE it.idea_id = i.idea_id AND t.name = ?)"
                )
                params.append(tag)
        query += " ORDER BY i.updated_at DESC"
        rows = fetch_all(conn, query, params)
        results: List[IdeaSearchResult] = []
        for row in rows:
            tag_rows = fetch_all(
                conn,
                """
                SELECT t.name
                FROM tags t
                JOIN idea_tags it ON it.tag_id = t.tag_id
                WHERE it.idea_id = ?
                ORDER BY t.name
                """,
                (row["idea_id"],),
            )
            results.append(
                IdeaSearchResult(
                    idea_id=row["idea_id"],
                    body=row["body"],
                    tags=[tag_row["name"] for tag_row in tag_rows],
                )
            )
        return results
    finally:
        conn.close()


@app.get("/api/ideas/suggest", response_model=List[IdeaSearchResult])
def suggest_ideas(
    keyword: Optional[str] = None,
    tags: Optional[str] = None,
) -> List[IdeaSearchResult]:
    return search_ideas(keyword=keyword, tags=tags, status="active")
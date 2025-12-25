import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchIdeas } from "../api.js";

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("active");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSearch = async (event) => {
    event.preventDefault();
    try {
      setError("");
      const data = await searchIdeas({ keyword, tags, status });
      setResults(data);
    } catch (err) {
      setError(err.message || "検索に失敗しました");
    }
  };

  return (
    <div className="page">
      <header className="header">
        <h1>検索</h1>
        <button className="btn" onClick={() => navigate("/")}>戻る</button>
      </header>

      <form className="form" onSubmit={handleSearch}>
        <label>
          キーワード
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </label>
        <label>
          タグ
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="例: アイデア, Tech" />
        </label>
        <label>
          ステータス
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">active</option>
            <option value="execute">execute</option>
            <option value="transfer">transfer</option>
            <option value="deleted">deleted</option>
          </select>
        </label>
        <button className="btn primary" type="submit">検索</button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="list">
        {results.map((idea) => (
          <button
            key={idea.idea_id}
            className="list-item"
            onClick={() => navigate(`/ideas/${idea.idea_id}`, { state: { from: "search" } })}
          >
            <div>
              <strong>#{idea.idea_id}</strong>
              <p className="clamp">{idea.body}</p>
            </div>
            <div className="tag-list">
              {idea.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
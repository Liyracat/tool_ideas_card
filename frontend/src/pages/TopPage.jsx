import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRandomIdea } from "../api.js";

export default function TopPage() {
  const [idea, setIdea] = useState(null);
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadIdea = async () => {
    try {
      setError("");
      const data = await fetchRandomIdea("active");
      setIdea(data);
    } catch (err) {
      setError(err.message || "読み込みに失敗しました");
      setIdea(null);
    }
  };

  useEffect(() => {
    loadIdea();
  }, []);

  const handleNext = () => {
    if (!pinned) {
      loadIdea();
    }
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Idea Cards</h1>
        <div className="header-actions">
          <button className="btn" onClick={() => setPinned((prev) => !prev)}>
            {pinned ? "固定表示" : "ランダム表示"}
          </button>
          <button className="btn" onClick={handleNext}>
            次のカード
          </button>
          <button className="btn" onClick={() => navigate("/search")}>
            検索
          </button>
          <button className="btn primary" onClick={() => navigate("/ideas/new")}>
            追加
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {idea ? (
        <button
          type="button"
          className="card"
          onClick={() => navigate(`/ideas/${idea.idea_id}`, { state: { from: "top" } })}
        >
          <h2>#{idea.idea_id}</h2>
          <p className="card-body">{idea.body}</p>
          <div className="tag-list">
            {idea.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
          <div className="card-meta">
            <strong>Blockers:</strong>
            <ul>
              {idea.blockers.map((blocker, index) => (
                <li key={`${blocker}-${index}`}>{blocker}</li>
              ))}
            </ul>
          </div>
          <div className="card-meta">
            <strong>Born with:</strong>
            <div className="tag-list">
              {idea.born_with.map((link) => (
                <span key={link.idea_id} className="tag muted">
                  #{link.idea_id}
                </span>
              ))}
            </div>
          </div>
        </button>
      ) : (
        !error && <p>カードがありません。追加してください。</p>
      )}
    </div>
  );
}
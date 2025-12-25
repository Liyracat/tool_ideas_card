import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createIdea } from "../api.js";

export default function NewIdeaPage() {
  const navigate = useNavigate();
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [blockers, setBlockers] = useState([""]);
  const [error, setError] = useState("");

  const addBlockerField = () => {
    setBlockers((prev) => [...prev, ""]);
  };

  const removeBlockerField = (index) => {
    setBlockers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateBlocker = (index, value) => {
    setBlockers((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setError("");
      const created = await createIdea({
        body,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        blockers,
        born_with_ids: [],
      });
      navigate(`/ideas/${created.idea_id}`, { state: { from: "top" } });
    } catch (err) {
      setError(err.message || "追加に失敗しました");
    }
  };

  return (
    <div className="page">
      <header className="header">
        <h1>追加</h1>
        <button className="btn" onClick={() => navigate("/")}>戻る</button>
      </header>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          body
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
        </label>
        <label>
          tags
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="カンマ区切り" />
        </label>
        <div>
          <div className="blocker-header">
            <span>blockers</span>
            <button className="btn" type="button" onClick={addBlockerField}>追加</button>
          </div>
          {blockers.map((blocker, index) => (
            <div key={`blocker-${index}`} className="blocker-item">
              <input
                value={blocker}
                onChange={(e) => updateBlocker(index, e.target.value)}
              />
              <button className="btn" type="button" onClick={() => removeBlockerField(index)}>
                削除
              </button>
            </div>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit">追加する</button>
      </form>
    </div>
  );
}
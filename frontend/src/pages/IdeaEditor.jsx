import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  fetchIdea,
  suggestIdeas,
  updateIdea,
  updateStatus,
} from "../api.js";

export default function IdeaEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [idea, setIdea] = useState(null);
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [blockers, setBlockers] = useState([""]);
  const [bornWith, setBornWith] = useState([]);
  const [savedMessage, setSavedMessage] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suggestKeyword, setSuggestKeyword] = useState("");
  const [suggestTags, setSuggestTags] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const backTarget = useMemo(() => {
    return location.state?.from === "top" ? "/" : "/search";
  }, [location.state]);

  const loadIdea = async () => {
    try {
      const data = await fetchIdea(id);
      setIdea(data);
      setBody(data.body);
      setTags(data.tags.join(", "));
      setBlockers(data.blockers.length ? data.blockers : [""]);
      setBornWith(data.born_with);
    } catch (err) {
      setError(err.message || "読み込みに失敗しました");
    }
  };

  useEffect(() => {
    loadIdea();
  }, [id]);

  const showSavedMessage = () => {
    setSavedMessage(true);
    window.setTimeout(() => setSavedMessage(false), 5000);
  };

  const handleSave = async () => {
    try {
      setError("");
      const updated = await updateIdea(id, {
        body,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        blockers,
        born_with_ids: bornWith.map((item) => item.idea_id),
      });
      setIdea(updated);
      showSavedMessage();
    } catch (err) {
      setError(err.message || "保存に失敗しました");
    }
  };

  const handleStatus = async (status) => {
    try {
      setError("");
      const updated = await updateStatus(id, status);
      setIdea(updated);
      showSavedMessage();
    } catch (err) {
      setError(err.message || "更新に失敗しました");
    }
  };

  const handleDelete = async () => {
    await handleStatus("deleted");
    navigate(backTarget);
  };

  const handleBack = () => {
    navigate(backTarget);
  };

  const addBlockerField = () => {
    setBlockers((prev) => [...prev, ""]);
  };

  const removeBlockerField = (index) => {
    setBlockers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateBlocker = (index, value) => {
    setBlockers((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const openModal = async () => {
    setIsModalOpen(true);
    try {
      const data = await suggestIdeas({ keyword: suggestKeyword, tags: suggestTags });
      setSuggestions(data);
    } catch (err) {
      setError(err.message || "サジェストに失敗しました");
    }
  };

  const runSuggest = async (event) => {
    event.preventDefault();
    try {
      const data = await suggestIdeas({ keyword: suggestKeyword, tags: suggestTags });
      setSuggestions(data);
    } catch (err) {
      setError(err.message || "サジェストに失敗しました");
    }
  };

  const addBornWith = (suggestion) => {
    if (bornWith.some((item) => item.idea_id === suggestion.idea_id)) {
      return;
    }
    setBornWith((prev) => [...prev, suggestion]);
  };

  const removeBornWith = (ideaId) => {
    setBornWith((prev) => prev.filter((item) => item.idea_id !== ideaId));
  };

  if (!idea) {
    return (
      <div className="page">
        <p>{error || "読み込み中..."}</p>
        <button className="btn" onClick={handleBack}>戻る</button>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <h1>カード編集 #{idea.idea_id}</h1>
        <button className="btn" onClick={handleBack}>戻る</button>
      </header>

      <div className="button-group">
        <button className="btn primary" onClick={handleSave}>保存</button>
        <button className="btn" onClick={() => handleStatus("execute")}>実行済み</button>
        <button className="btn" onClick={() => handleStatus("transfer")}>辞書移行済み</button>
        <button className="btn danger" onClick={handleDelete}>削除</button>
      </div>
      {savedMessage && <p className="success">保存しました</p>}
      {error && <p className="error">{error}</p>}

      <section className="form">
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
      </section>

      <section className="section">
        <div className="section-header">
          <h2>born_with</h2>
          <button className="btn" onClick={openModal}>追加</button>
        </div>
        <div className="list">
          {bornWith.map((link) => (
            <div key={link.idea_id} className="born-with-item">
              <button
                className="link"
                onClick={() => navigate(`/ideas/${link.idea_id}`, { state: { from: location.state?.from } })}
              >
                #{link.idea_id} {link.body}
              </button>
              <button className="btn" onClick={() => removeBornWith(link.idea_id)}>
                削除
              </button>
            </div>
          ))}
        </div>
      </section>

      {isModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <header className="modal-header">
              <h3>born_with 追加</h3>
              <button className="btn" onClick={() => setIsModalOpen(false)}>閉じる</button>
            </header>
            <form className="form" onSubmit={runSuggest}>
              <label>
                キーワード
                <input value={suggestKeyword} onChange={(e) => setSuggestKeyword(e.target.value)} />
              </label>
              <label>
                タグ
                <input value={suggestTags} onChange={(e) => setSuggestTags(e.target.value)} />
              </label>
              <button className="btn primary" type="submit">検索</button>
            </form>
            <div className="list">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.idea_id}
                  className="list-item"
                  type="button"
                  onClick={() => addBornWith(suggestion)}
                >
                  <div>
                    <strong>#{suggestion.idea_id}</strong>
                    <p className="clamp">{suggestion.body}</p>
                  </div>
                  <div className="tag-list">
                    {suggestion.tags.map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
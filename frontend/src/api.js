const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function fetchRandomIdea(status = "active") {
  const response = await fetch(`${API_BASE}/api/ideas/random?status=${status}`);
  if (!response.ok) {
    throw new Error("No ideas found");
  }
  return response.json();
}

export async function fetchIdea(id) {
  const response = await fetch(`${API_BASE}/api/ideas/${id}`);
  if (!response.ok) {
    throw new Error("Idea not found");
  }
  return response.json();
}

export async function searchIdeas({ keyword, tags, status }) {
  const params = new URLSearchParams();
  if (keyword) params.set("keyword", keyword);
  if (tags) params.set("tags", tags);
  if (status) params.set("status", status);
  const response = await fetch(`${API_BASE}/api/ideas/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Search failed");
  }
  return response.json();
}

export async function suggestIdeas({ keyword, tags }) {
  const params = new URLSearchParams();
  if (keyword) params.set("keyword", keyword);
  if (tags) params.set("tags", tags);
  const response = await fetch(`${API_BASE}/api/ideas/suggest?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Suggest failed");
  }
  return response.json();
}

export async function createIdea(payload) {
  const response = await fetch(`${API_BASE}/api/ideas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Create failed");
  }
  return response.json();
}

export async function updateIdea(id, payload) {
  const response = await fetch(`${API_BASE}/api/ideas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Update failed");
  }
  return response.json();
}

export async function updateStatus(id, status) {
  const response = await fetch(`${API_BASE}/api/ideas/${id}/status?status=${status}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Status update failed");
  }
  return response.json();
}
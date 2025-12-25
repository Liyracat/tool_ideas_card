import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import TopPage from "./pages/TopPage.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import IdeaEditor from "./pages/IdeaEditor.jsx";
import NewIdeaPage from "./pages/NewIdeaPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TopPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/ideas/new" element={<NewIdeaPage />} />
      <Route path="/ideas/:id" element={<IdeaEditor />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
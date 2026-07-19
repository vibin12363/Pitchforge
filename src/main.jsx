import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppWrapper from "./AppWrapper";
import SharedDeck from "./pages/SharedDeck";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppWrapper />} />
        <Route path="/deck/:shareId" element={<SharedDeck />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
"use client";

import { useState } from "react";
import "./globals.css";
import MergeTool from "../components/MergeTool";
import SplitTool from "../components/SplitTool";
import ThemeToggle from "../components/ThemeToggle";

// ---- EDIT THESE TWO LINES BEFORE DEPLOYING ----
const YOUR_NAME = "Your Full Name";
const YOUR_EMAIL = "your.email@example.com";
// ------------------------------------------------

export default function Home() {
  const [tab, setTab] = useState("merge"); // "merge" | "split"

  return (
    <div className="page">
      <div className="header">
        <div className="header-row">
          <h1>📎 Free PDF Tools</h1>
          <ThemeToggle />
        </div>
        <p>
          Merge or split PDF files — free, entirely in your browser. Nothing
          is ever uploaded to a server.
        </p>
      </div>

      <div className="tabs">
        <button
          className={`tab${tab === "merge" ? " active" : ""}`}
          onClick={() => setTab("merge")}
        >
          Merge PDFs
        </button>
        <button
          className={`tab${tab === "split" ? " active" : ""}`}
          onClick={() => setTab("split")}
        >
          Split PDF
        </button>
      </div>

      {tab === "merge" ? <MergeTool /> : <SplitTool />}

      <footer>
        <div>
          Built by <strong>{YOUR_NAME}</strong> — {YOUR_EMAIL}
        </div>
        <a
          className="built-for"
          href="https://digitalheroesco.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Built for Digital Heroes
        </a>
      </footer>
    </div>
  );
}

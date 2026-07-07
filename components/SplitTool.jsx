"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { formatSize, renderPdfThumbnail } from "../lib/pdfUtils";

export default function SplitTool() {
  const [entry, setEntry] = useState(null); // { file, pageCount, thumb }
  const [dragging, setDragging] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("");
  const inputRef = useRef(null);

  async function handleFile(fileList) {
    const file = Array.from(fileList).find(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (!file) {
      setError("Please choose a single PDF file.");
      return;
    }
    setError("");
    setDownloadUrl("");
    setEntry({ file, pageCount: null, thumb: null });

    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const count = pdf.getPageCount();
      setEntry((prev) => (prev && prev.file === file ? { ...prev, pageCount: count } : prev));
    } catch {
      setEntry((prev) => (prev && prev.file === file ? { ...prev, pageCount: "error" } : prev));
    }
    const thumb = await renderPdfThumbnail(file);
    setEntry((prev) => (prev && prev.file === file ? { ...prev, thumb } : prev));
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) handleFile(e.dataTransfer.files);
  }

  function clearFile() {
    setEntry(null);
    setDownloadUrl("");
    setError("");
  }

  async function handleSplit() {
    if (!entry || typeof entry.pageCount !== "number") {
      setError("Add a valid PDF first.");
      return;
    }
    if (entry.pageCount < 2) {
      setError("This PDF only has 1 page — nothing to split.");
      return;
    }

    setError("");
    setSplitting(true);
    setDownloadUrl("");
    setProgress(0);
    setProgressLabel("Starting…");
    await new Promise((r) => setTimeout(r, 30));

    try {
      const bytes = await entry.file.arrayBuffer();
      let srcPdf;
      try {
        srcPdf = await PDFDocument.load(bytes);
      } catch (loadErr) {
        const msg = String(loadErr?.message || "").toLowerCase();
        if (msg.includes("encrypt")) {
          throw new Error(`"${entry.file.name}" is password-protected. Remove the password first.`);
        }
        throw new Error(`"${entry.file.name}" doesn't look like a valid PDF.`);
      }

      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const total = srcPdf.getPageCount();
      const baseName = entry.file.name.replace(/\.pdf$/i, "");
      const padWidth = String(total).length;

      for (let i = 0; i < total; i++) {
        setProgressLabel(`Extracting page ${i + 1} of ${total}…`);
        const newPdf = await PDFDocument.create();
        const [copied] = await newPdf.copyPages(srcPdf, [i]);
        newPdf.addPage(copied);
        const pageBytes = await newPdf.save();
        const pageNum = String(i + 1).padStart(padWidth, "0");
        zip.file(`${baseName}-page-${pageNum}.pdf`, pageBytes);

        setProgress(Math.round(((i + 1) / total) * 85));
        await new Promise((r) => setTimeout(r, 0));
      }

      setProgressLabel("Zipping pages…");
      const zipBlob = await zip.generateAsync({ type: "blob" }, (meta) => {
        setProgress(85 + Math.round(meta.percent * 0.15));
      });
      setProgress(100);

      setDownloadUrl(URL.createObjectURL(zipBlob));
      setDownloadName(`${baseName}-pages.zip`);
      setProgressLabel("Done!");
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't split this file. Make sure it's a valid, non password-protected PDF."
      );
      setProgress(0);
      setProgressLabel("");
    } finally {
      setSplitting(false);
    }
  }

  return (
    <div>
      {!entry && (
        <div
          className={`dropzone${dragging ? " dragging" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <p>
            Drag & drop one PDF here, or <span className="browse">browse</span>
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => e.target.files && handleFile(e.target.files)}
          />
        </div>
      )}

      {entry && (
        <div className="file-list">
          <div className="file-item">
            {entry.thumb ? (
              <img className="thumb" src={entry.thumb} alt="" />
            ) : (
              <div className="thumb thumb-placeholder">📄</div>
            )}
            <span className="name">{entry.file.name}</span>
            <span className="pages">
              {entry.pageCount === null && "…"}
              {entry.pageCount === "error" && "⚠ can't read"}
              {typeof entry.pageCount === "number" &&
                `${entry.pageCount} page${entry.pageCount === 1 ? "" : "s"}`}
            </span>
            <span className="size">{formatSize(entry.file.size)}</span>
            <button className="icon-btn" onClick={clearFile} title="Remove">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="actions">
        <button
          className="btn btn-primary"
          onClick={handleSplit}
          disabled={splitting || !entry || typeof entry.pageCount !== "number"}
        >
          {splitting ? "Splitting…" : "Split into pages"}
        </button>
        {entry && !splitting && (
          <button className="btn btn-secondary" onClick={clearFile}>
            Clear
          </button>
        )}
      </div>

      {splitting && (
        <div className="progress-wrap">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-label">
            <span>{progressLabel}</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {error && <div className="status error">{error}</div>}

      {downloadUrl && (
        <div className="download-card">
          <div>Your pages are ready 🎉 — zipped into one download</div>
          <a href={downloadUrl} download={downloadName}>
            Download {downloadName}
          </a>
        </div>
      )}
    </div>
  );
}

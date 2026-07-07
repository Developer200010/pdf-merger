"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { formatSize, renderPdfThumbnail } from "../lib/pdfUtils";

const LARGE_TOTAL_BYTES = 100 * 1024 * 1024; // 100MB — heads-up threshold, not a hard limit

export default function MergeTool() {
  const [files, setFiles] = useState([]); // { id, file, pageCount, thumb }
  const [dragging, setDragging] = useState(false); // dropzone hover state
  const [dragIndex, setDragIndex] = useState(null); // which file-item is being reordered
  const [overIndex, setOverIndex] = useState(null);
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [mergedPageCount, setMergedPageCount] = useState(0);
  const inputRef = useRef(null);
  const idCounter = useRef(0);

  async function loadMeta(id, file) {
    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const count = pdf.getPageCount();
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, pageCount: count } : f)));
    } catch {
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, pageCount: "error" } : f)));
    }
    const thumb = await renderPdfThumbnail(file);
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, thumb } : f)));
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (incoming.length === 0) {
      setError("Please choose PDF files only.");
      return;
    }
    setError("");
    setDownloadUrl("");

    let skippedDuplicates = 0;
    const toAdd = [];
    setFiles((prev) => {
      for (const file of incoming) {
        const isDuplicate = prev.some(
          (f) => f.file.name === file.name && f.file.size === file.size
        );
        if (isDuplicate) {
          skippedDuplicates++;
          continue;
        }
        toAdd.push({ id: ++idCounter.current, file, pageCount: null, thumb: null });
      }
      const next = [...prev, ...toAdd];

      const totalSize = next.reduce((sum, f) => sum + f.file.size, 0);
      if (skippedDuplicates > 0) {
        setWarning(
          `Skipped ${skippedDuplicates} file${skippedDuplicates === 1 ? "" : "s"} already in the list.`
        );
      } else if (totalSize > LARGE_TOTAL_BYTES) {
        setWarning(
          `Total size is ${formatSize(totalSize)} — large merges may take a little longer in the browser.`
        );
      } else {
        setWarning("");
      }
      return next;
    });

    toAdd.forEach((entry) => loadMeta(entry.id, entry.file));
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function removeFile(id) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setDownloadUrl("");
  }

  function moveFile(index, direction) {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDownloadUrl("");
  }

  // --- Native HTML5 drag-and-drop reordering of the file list ---
  function onItemDragStart(index) {
    setDragIndex(index);
  }
  function onItemDragOver(e, index) {
    e.preventDefault();
    if (index !== overIndex) setOverIndex(index);
  }
  function onItemDrop(index) {
    setFiles((prev) => {
      if (dragIndex === null || dragIndex === index) return prev;
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(null);
    setOverIndex(null);
    setDownloadUrl("");
  }
  function onItemDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
  }

  async function handleMerge() {
    if (files.length < 2) {
      setError("Add at least 2 PDF files to merge.");
      return;
    }
    setError("");
    setMerging(true);
    setDownloadUrl("");
    setProgress(0);
    setProgressLabel("Starting…");
    await new Promise((r) => setTimeout(r, 30));

    try {
      const mergedPdf = await PDFDocument.create();
      const total = files.length;

      for (let i = 0; i < total; i++) {
        const { file } = files[i];
        setProgressLabel(`Reading ${file.name} (${i + 1} of ${total})…`);

        let bytes, srcPdf;
        try {
          bytes = await file.arrayBuffer();
          srcPdf = await PDFDocument.load(bytes);
        } catch (loadErr) {
          const msg = String(loadErr?.message || "").toLowerCase();
          if (msg.includes("encrypt")) {
            throw new Error(
              `"${file.name}" is password-protected. Remove the password and try again.`
            );
          }
          throw new Error(`"${file.name}" doesn't look like a valid PDF and couldn't be read.`);
        }

        const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));

        setProgress(Math.round(((i + 1) / total) * 90));
        await new Promise((r) => setTimeout(r, 0));
      }

      setProgressLabel("Saving merged PDF…");
      const mergedBytes = await mergedPdf.save();
      setProgress(100);

      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      setDownloadUrl(URL.createObjectURL(blob));
      setMergedPageCount(mergedPdf.getPageCount());
      setProgressLabel("Done!");
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't merge these files. Make sure every file is a valid, non password-protected PDF."
      );
      setProgress(0);
      setProgressLabel("");
    } finally {
      setMerging(false);
    }
  }

  function resetAll() {
    setFiles([]);
    setDownloadUrl("");
    setError("");
    setWarning("");
  }

  const totalPages = files.every((f) => typeof f.pageCount === "number")
    ? files.reduce((sum, f) => sum + f.pageCount, 0)
    : null;

  return (
    <div>
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
          Drag & drop PDF files here, or <span className="browse">browse</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          hidden
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <>
          <div className="file-list">
            {files.map((f, i) => (
              <div
                className={`file-item${dragIndex === i ? " dragging-item" : ""}${
                  overIndex === i && dragIndex !== null && dragIndex !== i ? " drag-over" : ""
                }`}
                key={f.id}
                draggable
                onDragStart={() => onItemDragStart(i)}
                onDragOver={(e) => onItemDragOver(e, i)}
                onDrop={() => onItemDrop(i)}
                onDragEnd={onItemDragEnd}
              >
                <span className="drag-handle" title="Drag to reorder">
                  ⠿
                </span>
                {f.thumb ? (
                  <img className="thumb" src={f.thumb} alt="" />
                ) : (
                  <div className="thumb thumb-placeholder">📄</div>
                )}
                <button
                  className="icon-btn move"
                  onClick={() => moveFile(i, -1)}
                  disabled={i === 0}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  className="icon-btn move"
                  onClick={() => moveFile(i, 1)}
                  disabled={i === files.length - 1}
                  title="Move down"
                >
                  ↓
                </button>
                <span className="name">
                  {i + 1}. {f.file.name}
                </span>
                <span className="pages">
                  {f.pageCount === null && "…"}
                  {f.pageCount === "error" && "⚠ can't read"}
                  {typeof f.pageCount === "number" &&
                    `${f.pageCount} page${f.pageCount === 1 ? "" : "s"}`}
                </span>
                <span className="size">{formatSize(f.file.size)}</span>
                <button className="icon-btn" onClick={() => removeFile(f.id)} title="Remove">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="total-pages">
            {files.length} file{files.length === 1 ? "" : "s"} selected
            {totalPages !== null && <> — {totalPages} pages total</>}
          </div>
        </>
      )}

      <div className="actions">
        <button
          className="btn btn-primary"
          onClick={handleMerge}
          disabled={merging || files.length < 2}
        >
          {merging ? "Merging…" : "Merge PDFs"}
        </button>
        {files.length > 0 && !merging && (
          <button className="btn btn-secondary" onClick={resetAll}>
            Clear all
          </button>
        )}
      </div>

      {merging && (
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

      {warning && !error && <div className="status warning">⚠ {warning}</div>}
      {error && <div className="status error">{error}</div>}

      {downloadUrl && (
        <div className="download-card">
          <div>
            Your merged PDF is ready 🎉 — {mergedPageCount} page
            {mergedPageCount === 1 ? "" : "s"} total
          </div>
          <a href={downloadUrl} download="merged.pdf">
            Download merged.pdf
          </a>
        </div>
      )}
    </div>
  );
}

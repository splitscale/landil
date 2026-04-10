"use client";

import { useState, useEffect } from "react";
import { FileText, Lock, Globe, Download, X } from "lucide-react";

type Doc = {
  id: string;
  name: string;
  url: string;
  visibility: string;
  createdAt: Date;
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getFileType(name: string, url: string): "pdf" | "image" | "other" {
  const ext = (name.split(".").pop() ?? url.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext)) return "image";
  return "other";
}

export default function DocRow({ doc }: { doc: Doc }) {
  const [open, setOpen] = useState(false);
  const isPrivate = doc.visibility === "private";
  const fileType = getFileType(doc.name, doc.url);
  const canPreview = fileType === "pdf" || fileType === "image";

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div
        onClick={() => canPreview && setOpen(true)}
        className={`flex items-center gap-3 rounded-lg border border-border px-4 py-3 transition-colors ${
          canPreview ? "cursor-pointer hover:bg-muted/50" : ""
        }`}
      >
        <FileText size={16} className="shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{doc.name}</p>
          <p className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              isPrivate ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
            }`}
          >
            {isPrivate ? <Lock size={8} /> : <Globe size={8} />}
            {doc.visibility}
          </span>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            download={doc.name}
            onClick={(e) => e.stopPropagation()}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Download"
          >
            <Download size={14} />
          </a>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Top bar */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
            <p className="truncate text-sm font-medium">{doc.name}</p>
            <div className="flex items-center gap-2">
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                download={doc.name}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Download size={12} />
                Download
              </a>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Viewer */}
          <div className="flex-1 min-h-0">
            {fileType === "pdf" && (
              <iframe
                src={doc.url}
                className="w-full h-full"
                title={doc.name}
              />
            )}
            {fileType === "image" && (
              <div className="flex h-full items-center justify-center bg-muted/20 p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.url}
                  alt={doc.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

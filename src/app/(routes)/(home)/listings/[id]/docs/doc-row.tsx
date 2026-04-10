"use client";

import { useState } from "react";
import { FileText, Lock, Globe, Download, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
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
          {canPreview && (
            <button
              onClick={() => setOpen(true)}
              title="Preview"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Eye size={14} />
            </button>
          )}
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            download={doc.name}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Download"
          >
            <Download size={14} />
          </a>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-border shrink-0">
            <DialogTitle className="truncate text-sm font-medium">{doc.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted/30">
            {fileType === "pdf" && (
              <iframe
                src={doc.url}
                className="w-full h-full"
                title={doc.name}
              />
            )}
            {fileType === "image" && (
              <div className="flex h-full items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.url}
                  alt={doc.name}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

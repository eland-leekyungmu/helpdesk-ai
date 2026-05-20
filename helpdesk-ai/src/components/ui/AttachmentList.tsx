"use client";

import { useState, useEffect } from "react";
import { Download, FileText, File, Loader2, X, ZoomIn } from "lucide-react";
import { getDownloadUrl } from "@/lib/api";

export interface AttachmentItem {
  key: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface AttachmentListProps {
  attachments: AttachmentItem[];
}

function isImage(mimeType: string) {
  return mimeType?.startsWith("image/");
}

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/** 이미지 썸네일 — presigned URL을 받아서 표시 */
function ImageThumbnail({
  attachment,
  onPreview,
}: {
  attachment: AttachmentItem;
  onPreview: (url: string, filename: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getDownloadUrl(attachment.key, attachment.filename)
      .then((u) => { setUrl(u); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [attachment.key, attachment.filename]);

  if (loading) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
        <Loader2 size={18} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400">
        이미지를 불러올 수 없습니다
      </div>
    );
  }

  return (
    <div
      className="relative group cursor-pointer rounded-xl overflow-hidden border border-gray-200"
      onClick={() => onPreview(url, attachment.filename)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={attachment.filename}
        className="w-full object-cover max-h-64"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
        <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {/* 파일명 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate">{attachment.filename}</p>
        {attachment.size > 0 && (
          <p className="text-xs text-white/70">{formatSize(attachment.size)}</p>
        )}
      </div>
    </div>
  );
}

/** 일반 파일 다운로드 버튼 */
function FileItem({ attachment }: { attachment: AttachmentItem }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = await getDownloadUrl(attachment.key, attachment.filename);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      console.error("다운로드 실패");
    } finally {
      setDownloading(false);
    }
  };

  const isPdf = attachment.mimeType === "application/pdf";

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-indigo-50 rounded-xl text-sm transition-colors group disabled:opacity-50"
    >
      <div className="w-7 h-7 bg-white rounded-lg border border-gray-200 flex items-center justify-center shrink-0">
        {isPdf
          ? <FileText size={14} className="text-red-500" />
          : <File size={14} className="text-gray-400" />
        }
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="truncate text-gray-700 group-hover:text-indigo-700 font-medium">{attachment.filename}</p>
        {attachment.size > 0 && <p className="text-xs text-gray-400">{formatSize(attachment.size)}</p>}
      </div>
      {downloading
        ? <Loader2 size={14} className="animate-spin text-indigo-500 shrink-0" />
        : <Download size={14} className="text-gray-400 group-hover:text-indigo-500 shrink-0" />
      }
    </button>
  );
}

/** 이미지 라이트박스 */
function Lightbox({
  url,
  filename,
  onClose,
}: {
  url: string;
  filename: string;
  onClose: () => void;
}) {
  // ESC 키 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
          aria-label="닫기"
        >
          <X size={24} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={filename}
          className="max-w-full max-h-[85vh] rounded-xl object-contain"
        />
        <p className="text-center text-white/60 text-sm mt-2">{filename}</p>
      </div>
    </div>
  );
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  const [lightbox, setLightbox] = useState<{ url: string; filename: string } | null>(null);

  if (!attachments?.length) return null;

  const images = attachments.filter((a) => isImage(a.mimeType));
  const files = attachments.filter((a) => !isImage(a.mimeType));

  return (
    <>
      <div className="mt-3 space-y-2">
        <p className="text-xs text-gray-400 font-medium">첨부파일 {attachments.length}개</p>

        {/* 이미지 그리드 */}
        {images.length > 0 && (
          <div className={`grid gap-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {images.map((att) => (
              <ImageThumbnail
                key={att.key}
                attachment={att}
                onPreview={(url, filename) => setLightbox({ url, filename })}
              />
            ))}
          </div>
        )}

        {/* 일반 파일 목록 */}
        {files.length > 0 && (
          <div className="space-y-1.5">
            {files.map((att) => (
              <FileItem key={att.key} attachment={att} />
            ))}
          </div>
        )}
      </div>

      {/* 라이트박스 */}
      {lightbox && (
        <Lightbox
          url={lightbox.url}
          filename={lightbox.filename}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

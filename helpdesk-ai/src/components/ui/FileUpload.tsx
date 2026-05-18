"use client";

import { useRef, useState } from "react";
import { Paperclip, X, FileText, Image, File } from "lucide-react";

export interface SelectedFile {
  file: File;
  preview?: string; // 이미지 미리보기 URL
}

interface FileUploadProps {
  files: SelectedFile[];
  onChange: (files: SelectedFile[]) => void;
  maxCount?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image size={14} className="text-indigo-500" />;
  if (mimeType === "application/pdf") return <FileText size={14} className="text-red-500" />;
  return <File size={14} className="text-gray-400" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function FileUpload({
  files,
  onChange,
  maxCount = 10,
  maxSizeMB = 200,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    const remaining = maxCount - files.length;

    if (newFiles.length > remaining) {
      setError(`파일은 최대 ${maxCount}개까지 첨부할 수 있습니다.`);
      return;
    }

    const oversized = newFiles.find((f) => f.size > maxSizeMB * 1024 * 1024);
    if (oversized) {
      setError(`파일 크기는 ${maxSizeMB}MB를 초과할 수 없습니다. (${oversized.name})`);
      return;
    }

    const selected: SelectedFile[] = newFiles.map((file) => {
      const sf: SelectedFile = { file };
      if (file.type.startsWith("image/")) {
        sf.preview = URL.createObjectURL(file);
      }
      return sf;
    });

    onChange([...files, ...selected]);
    // input 초기화 (같은 파일 재선택 허용)
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    // 미리보기 URL 해제
    if (files[index].preview) URL.revokeObjectURL(files[index].preview!);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <label
        className={`
          flex items-center gap-2 px-4 py-2.5 border border-dashed rounded-xl
          transition-colors cursor-pointer
          ${disabled
            ? "border-gray-100 bg-gray-50 cursor-not-allowed"
            : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50"
          }
        `}
      >
        <Paperclip size={16} className="text-gray-400 shrink-0" />
        <span className="text-sm text-gray-500">
          {files.length > 0
            ? `${files.length}개 파일 선택됨 (최대 ${maxCount}개)`
            : "파일을 선택하거나 드래그하세요"}
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleChange}
          disabled={disabled || files.length >= maxCount}
          className="hidden"
        />
      </label>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((sf, i) => (
            <li
              key={i}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl text-sm"
            >
              {sf.preview ? (
                <img src={sf.preview} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center shrink-0">
                  {getFileIcon(sf.file.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-gray-800 font-medium">{sf.file.name}</p>
                <p className="text-xs text-gray-400">{formatSize(sf.file.size)}</p>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label={`${sf.file.name} 제거`}
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

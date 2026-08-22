"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from "@/types/tryon";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface PhotoUploadProps {
  image: string | null;
  fileName: string | null;
  onImageSelect: (dataUrl: string, fileName: string) => void;
  onClear: () => void;
  onContinue: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PhotoUpload({
  image,
  fileName,
  onImageSelect,
  onClear,
  onContinue,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  const validateAndProcess = useCallback(
    (file: File) => {
      setError(null);

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        setError("Please upload a JPG, PNG, or WEBP image.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("File is too large. Maximum size is 10MB.");
        return;
      }

      setFileSize(file.size);

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1024;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
                const optimizedDataUrl = canvas.toDataURL(mime, 0.85);
                onImageSelect(optimizedDataUrl, file.name);
                return;
              }
            }
            onImageSelect(result, file.name);
          };
          img.onerror = () => {
            onImageSelect(result, file.name);
          };
          img.src = result;
        }
      };
      reader.onerror = () => {
        setError("Failed to read the file. Please try again.");
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndProcess(file);
    },
    [validateAndProcess]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndProcess(file);
  };

  return (
    <div className="animate-fade-in mx-auto max-w-xl">
      <div className="mb-8 text-center">
        <h1 className="font-display mb-3 text-3xl text-charcoal sm:text-4xl">
          Let&apos;s start with you.
        </h1>
        <p className="text-charcoal-muted">
          Upload a clear photo and we&apos;ll create a personalized preview.
        </p>
      </div>

      {!image ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "cursor-pointer rounded-lg border-2 border-dashed bg-surface p-10 text-center transition-colors",
            isDragging
              ? "border-champagne bg-champagne-light/20"
              : "border-border hover:border-champagne/60 hover:bg-ivory-dark/50"
          )}
          aria-label="Upload photo area. Click or drag and drop an image."
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ivory-dark">
            <Upload className="h-6 w-6 text-champagne" aria-hidden="true" />
          </div>
          <p className="mb-1 font-medium text-charcoal">
            Drag and drop your photo here
          </p>
          <p className="mb-4 text-sm text-charcoal-muted">
            or click to browse
          </p>
          <p className="text-xs text-charcoal-muted">
            JPG, PNG, or WEBP · Max 10MB
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-soft animate-fade-in">
          <div className="relative aspect-[3/4] max-h-[420px] w-full overflow-hidden bg-ivory-dark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="Your uploaded photo preview"
              className="h-full w-full object-cover"
            />
            <button
              onClick={onClear}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-charcoal/70 text-ivory transition-colors hover:bg-charcoal"
              aria-label="Remove photo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-charcoal-muted">
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
              <span className="truncate">{fileName}</span>
              {fileSize && (
                <span className="text-charcoal-muted/70">
                  · {formatFileSize(fileSize)}
                </span>
              )}
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="text-sm font-medium text-champagne hover:underline"
            >
              Replace
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Choose photo file"
      />

      {error && (
        <p role="alert" className="mt-3 text-center text-sm text-error">
          {error}
        </p>
      )}

      <div className="mt-8 rounded-lg border border-border bg-surface/60 p-5">
        <p className="mb-3 text-sm font-medium text-charcoal">
          For the best result
        </p>
        <ul className="space-y-1.5 text-sm text-charcoal-muted">
          <li>· Face clearly visible</li>
          <li>· Good lighting</li>
          <li>· Front-facing photo recommended</li>
        </ul>
      </div>

      <p className="mt-4 text-center text-xs text-charcoal-muted">
        Your photo is used only to create your preview.
      </p>

      <div className="mt-8">
        <Button
          fullWidth
          size="lg"
          disabled={!image}
          onClick={onContinue}
        >
          Choose Your Look
        </Button>
      </div>
    </div>
  );
}

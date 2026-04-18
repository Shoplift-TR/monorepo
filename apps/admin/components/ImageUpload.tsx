"use client";

import React, { useEffect, useState, useRef } from "react";
import { adminApi } from "@/lib/api";
import { Upload, X, Loader2 } from "lucide-react";

interface ImageUploadProps {
  onUpload: (url: string) => void;
  defaultValue?: string;
  bucket?: string;
  className?: string;
}

export default function ImageUpload({
  onUpload,
  defaultValue = "",
  bucket = "images",
  className = "w-full aspect-video bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 transition-colors overflow-hidden group",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(defaultValue);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(defaultValue || "");
  }, [defaultValue]);

  const toWebPBlob = async (file: File): Promise<Blob> => {
    const imageBitmap = await createImageBitmap(file);
    const maxDimension = 1600;
    const scale = Math.min(
      1,
      maxDimension / Math.max(imageBitmap.width, imageBitmap.height),
    );

    const targetWidth = Math.max(1, Math.round(imageBitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(imageBitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to process image");

    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.82);
    });

    if (!blob) throw new Error("Image compression failed");
    return blob;
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read image data"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read image data"));
      reader.readAsDataURL(blob);
    });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    let localPreviewUrl: string | null = null;
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
      const MAX_SIZE_BYTES = 3 * 1024 * 1024;

      if (!ALLOWED_TYPES.includes(file.type)) {
        alert("Only JPEG, PNG and WebP images are allowed");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        alert("File size must be under 3MB");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Immediate local preview while upload/optimization is in progress
      localPreviewUrl = URL.createObjectURL(file);
      setPreview(localPreviewUrl);

      const optimized = await toWebPBlob(file);
      const imageDataUrl = await blobToDataUrl(optimized);
      const { data, error } = await adminApi.uploadMenuImage(imageDataUrl);

      if (error) throw new Error(error);
      const publicUrl = data?.url;
      if (!publicUrl) throw new Error("Failed to receive uploaded image URL");

      setPreview(publicUrl);
      onUpload(publicUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      const message =
        error instanceof Error ? error.message : "Unknown upload error";
      alert(`Error uploading image: ${message}`);
    } finally {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      setUploading(false);
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview("");
    onUpload("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      className={className}
      onClick={() => !uploading && fileInputRef.current?.click()}
    >
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleUpload}
        accept=".jpg,.jpeg,.png,.webp"
      />

      {preview ? (
        <div className="relative w-full h-full group">
          <img
            src={preview}
            alt="Upload Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={handleClear}
              className="p-2 bg-white rounded-full text-red-500 hover:scale-110 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center p-6">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-[#E2103C] animate-spin mx-auto mb-2" />
          ) : (
            <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2 group-hover:text-zinc-600 transition-colors" />
          )}
          <p className="text-sm font-bold text-zinc-600">
            Click to upload image
          </p>
          <p className="text-xs text-zinc-400 mt-1">PNG, JPG, WebP up to 3MB</p>
        </div>
      )}
    </div>
  );
}

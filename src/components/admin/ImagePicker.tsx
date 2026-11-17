"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { Camera, ImageIcon, Loader2, Search, Upload, X } from "lucide-react";
import { uploadMediaAction } from "@/app/(admin)/admin/(dashboard)/media/actions";

type MediaItem = {
  id: string;
  url: string;
  thumbUrl: string | null;
  alt: string;
  originalName: string;
  folder: string;
};

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif";
const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILES = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1800;

type Drawable = {
  width: number;
  height: number;
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  release: () => void;
};

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The image could not be processed."))),
      type,
      quality,
    );
  });
}

async function loadDrawable(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
        release: () => bitmap.close(),
      };
    } catch {
      // Fall back to the browser's image decoder below.
    }
  }

  return new Promise<Drawable>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = document.createElement("img");
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
        draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
        release: () => URL.revokeObjectURL(url),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The file could not be read as an image."));
    };
    image.src = url;
  });
}

async function compressImage(file: File): Promise<File> {
  const source = await loadDrawable(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The image could not be processed.");

    source.draw(context, width, height);
    const type = file.type === "image/png" ? "image/webp" : "image/jpeg";
    const blob = await canvasToBlob(canvas, type, type === "image/webp" ? 0.9 : 0.88);
    if (blob.size > MAX_BYTES) throw new Error("the image is larger than 5 MB even after resizing.");

    const extension = type === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "product-image";
    return new File([blob], `${baseName}.${extension}`, { type });
  } finally {
    source.release();
  }
}

async function prepareImage(file: File): Promise<File> {
  if (file.type === "image/gif") {
    if (file.size <= MAX_BYTES) return file;
    throw new Error("GIF images must be 5 MB or smaller.");
  }
  if (SUPPORTED_TYPES.has(file.type) && file.size <= MAX_BYTES) return file;
  return compressImage(file);
}

function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Camera permission was denied. Allow camera access in your browser, then try again.";
    }
    if (error.name === "NotFoundError") return "No camera was found on this device.";
    if (error.name === "NotReadableError") return "The camera is in use by another application.";
  }
  return error instanceof Error ? error.message : "The camera could not be started.";
}

export function ImagePicker({
  value,
  onChange,
  label = "Image",
  hint,
  folder = "general",
  allowMultiple = false,
  onUploaded,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  folder?: string;
  allowMultiple?: boolean;
  onUploaded?: (urls: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      if (active) setLoading(true);
      try {
        const response = await fetch(`/api/admin/media?q=${encodeURIComponent(query)}&limit=36`);
        const payload = (await response.json()) as { ok: boolean; data?: { items: MediaItem[] } };
        if (active && payload.ok && payload.data) setItems(payload.data.items);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  useEffect(() => {
    if (!cameraOpen) return;
    const video = videoRef.current;
    let cancelled = false;
    let stream: MediaStream | null = null;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not supported in this browser. Upload a photo from your device instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (video) {
          video.srcObject = stream;
          void video.play().catch(() => undefined);
        }
      } catch (error) {
        if (!cancelled) setCameraError(cameraErrorMessage(error));
      }
    };

    void start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, [cameraOpen]);

  const uploadFiles = async (files: File[]) => {
    const selected = files.slice(0, MAX_FILES);
    if (!selected.length) return;
    setUploading(true);
    setUploadError(null);
    const messages: string[] = [];
    if (files.length > MAX_FILES) messages.push(`Only the first ${MAX_FILES} images were uploaded.`);

    try {
      const preparedResults = await Promise.allSettled(selected.map(prepareImage));
      const prepared: File[] = [];
      preparedResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          prepared.push(result.value);
        } else {
          const reason = result.reason instanceof Error ? result.reason.message : "the file could not be processed.";
          messages.push(`${selected[index].name}: ${reason}`);
        }
      });

      if (!prepared.length) {
        setUploadError(messages.join(" "));
        return;
      }

      const formData = new FormData();
      prepared.forEach((file) => formData.append("files", file, file.name));
      formData.set("folder", folder);

      const response = await uploadMediaAction(formData);
      if (!response.ok) {
        messages.push(response.error);
      } else {
        messages.push(...response.data.errors);
        const urls = response.data.items.map((item) => item.url);
        if (urls.length) {
          if (onUploaded) onUploaded(urls);
          else onChange(urls[0]);
        }
      }
      setUploadError(messages.length ? messages.join(" ") : null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const openCamera = () => {
    setCameraReady(false);
    setCameraError(null);
    setCapturing(false);
    setCameraOpen(true);
  };

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady || !video.videoWidth) return;
    setCapturing(true);
    setCameraError(null);
    try {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The photo could not be captured.");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
      setCameraOpen(false);
      await uploadFiles([file]);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "The photo could not be captured.");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div>
      <span className="admin-label">{label}</span>
      <div className="flex items-start gap-3">
        <div className="relative h-[72px] w-[104px] shrink-0 overflow-hidden rounded-[6px] border border-admin-line bg-tile">
          {value ? (
            <Image src={value} alt="" fill sizes="104px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-admin-muted">
              <ImageIcon className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          {uploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-navy-deep/50 text-white">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            className="admin-field"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/images/example.jpg or https://..."
            aria-label={label}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple={allowMultiple}
              className="sr-only"
              onChange={(event) => {
                const files = event.target.files ? Array.from(event.target.files) : [];
                event.target.value = "";
                void uploadFiles(files);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Upload from your device"
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <button
              type="button"
              onClick={openCamera}
              disabled={uploading}
              title="Take a photo with your camera"
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
              Take photo
            </button>
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  disabled={uploading}
                  title="Choose from the media library"
                  className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile disabled:opacity-50"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Library
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[100] bg-navy-deep/45" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] flex h-[min(620px,calc(100vh-40px))] w-[min(860px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[8px] border border-admin-line bg-white">
                  <div className="flex items-center justify-between border-b border-admin-line px-5 py-4">
                    <Dialog.Title className="text-[15px] font-semibold text-ink">Media library</Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Close"
                        className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Dialog.Close>
                  </div>
                  <div className="border-b border-admin-line p-4">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by name, alt text or tag"
                        className="admin-field pl-9"
                        aria-label="Search media"
                      />
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {loading ? (
                      <p className="py-10 text-center text-[13px] text-admin-muted">Loading media...</p>
                    ) : items.length ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onChange(item.url);
                              setOpen(false);
                            }}
                            className="group overflow-hidden rounded-[6px] border border-admin-line text-left hover:border-brand"
                          >
                            <span className="relative block aspect-[4/3] bg-tile">
                              <Image
                                src={item.thumbUrl || item.url}
                                alt={item.alt || item.originalName}
                                fill
                                sizes="200px"
                                className="object-cover"
                              />
                            </span>
                            <span className="block truncate px-2 py-1.5 text-[11px] text-admin-muted">{item.originalName}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="py-10 text-center text-[13px] text-admin-muted">No media matches this search.</p>
                    )}
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
          {uploadError ? (
            <p className="text-[11px] leading-5 text-danger" role="alert">
              {uploadError}
            </p>
          ) : null}
        </div>
      </div>
      {hint ? <p className="admin-help">{hint}</p> : null}

      <Dialog.Root
        open={cameraOpen}
        onOpenChange={(next) => {
          setCameraOpen(next);
          setCameraReady(false);
          setCameraError(null);
          setCapturing(false);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-navy-deep/60" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(680px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[8px] border border-admin-line bg-white">
            <div className="flex items-center justify-between border-b border-admin-line px-5 py-4">
              <div>
                <Dialog.Title className="text-[15px] font-semibold text-ink">Take a photo</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-[12px] text-admin-muted">
                  Position the product in the frame, then capture.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close camera"
                  className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <div className="bg-navy-deep p-3">
              <div className="relative aspect-video overflow-hidden rounded-[6px] bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onCanPlay={() => setCameraReady(true)}
                  className="h-full w-full object-cover"
                  aria-label="Camera preview"
                />
                {!cameraReady && !cameraError ? (
                  <p className="absolute inset-0 flex items-center justify-center text-[12px] text-white/80">
                    Starting camera...
                  </p>
                ) : null}
                {cameraError ? (
                  <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[12px] leading-5 text-white">
                    {cameraError}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 px-5 py-4">
              {cameraError ? (
                <button
                  type="button"
                  onClick={() => {
                    setCameraOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-4 text-[13px] font-medium text-ink hover:bg-tile"
                >
                  <Upload className="h-4 w-4" />
                  Upload instead
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setCameraOpen(false)}
                className="inline-flex h-9 items-center rounded-[6px] border border-admin-line px-4 text-[13px] font-medium text-ink hover:bg-tile"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void takePhoto()}
                disabled={!cameraReady || capturing}
                className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white hover:bg-navy-deep disabled:opacity-50"
              >
                {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {capturing ? "Capturing..." : "Take photo"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

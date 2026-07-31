import { API_V1_BASE_URL } from "@/lib/env";
import { getAccessToken } from "@/features/auth/store";
import type { ApiResponse } from "@/shared/types";

export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 - 16 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
]);

type UploadImageResponse =
  | ApiResponse<string>
  | string
  | {
      url?: string;
      secure_url?: string;
    };

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

async function compressImageFile(
  file: File,
  maxWidth = 1600,
  quality = 0.8,
): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("Cannot read file for compression"));
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Cannot load image for compression"));
    i.src = dataUrl;
  });

  const scale = Math.min(1, maxWidth / (img.width || maxWidth));
  const width = Math.round((img.width || maxWidth) * scale);
  const height = Math.round((img.height || maxWidth) * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot get canvas context for compression");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/webp", quality),
  );
  if (!blob) throw new Error("Compression produced no data");

  const newName = file.name.replace(/\.[^/.]+$/, ".webp");
  return new File([blob], newName, { type: "image/webp" });
}

export function validateImageFile(file: File) {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Ảnh phải nhỏ hơn 5MB.");
  }

  const contentType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  if (
    !SUPPORTED_IMAGE_TYPES.has(contentType) ||
    !SUPPORTED_IMAGE_EXTENSIONS.has(extension)
  ) {
    throw new Error("Chỉ hỗ trợ ảnh JPG, PNG, GIF hoặc WebP.");
  }
}

export async function uploadImage(file: File) {
  // Compress large images on the client to reduce upload failures.
  const fileToSend = await (async function maybeCompress(f: File) {
    // If file already small, skip compression
    const SMALL_LIMIT = 200 * 1024; // 200KB
    if (f.size <= SMALL_LIMIT) return f;

    try {
      return await compressImageFile(f, 1600, 0.8);
    } catch (e) {
      console.warn("image compression failed, will upload original file", e);
      return f;
    }
  })(file);

  validateImageFile(fileToSend);

  const formData = new FormData();
  formData.append("file", fileToSend, fileToSend.name);

  let data: UploadImageResponse;

  try {
    // Use fetch directly to let the browser set multipart/form-data boundary
    // (some axios defaults/interceptors can interfere with the Content-Type)
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const url = `${API_V1_BASE_URL}/media/images`;
    // debug: log what we send
    console.debug("media upload: file info", {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    for (const entry of Array.from(formData.entries())) {
      const [k, v] = entry as [string, unknown];
      if (v instanceof File) {
        console.debug("media upload: formData entry", k, {
          name: v.name,
          size: v.size,
          type: v.type,
        });
      } else {
        console.debug("media upload: formData entry", k, v);
      }
    }

    console.debug("media upload: hasToken", !!token);

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
      // credentials omitted: token sent via Authorization header
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      const msg = text || resp.statusText || `status code ${resp.status}`;
      // Log server response for easier debugging
      console.error("media upload failed response:", {
        status: resp.status,
        body: msg,
      });
      const err = new Error(
        `Request failed with status code ${resp.status}: ${msg}`,
      );
      throw err;
    }

    // try parse JSON, fallback to text
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await resp.json();
    } else {
      data = await resp.text();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // If server returned 400, prefer to show server message (if available)
    if (message.includes("status code 400")) {
      // message format: 'Request failed with status code 400: <server text>'
      const parts = message.split(":");
      const serverText =
        parts.slice(2).join(":").trim() || parts.slice(1).join(":").trim();
      if (serverText) {
        console.error("media upload server message:", serverText);
        throw new Error(serverText);
      }

      throw new Error(
        "Không thể tải ảnh lên. Hãy chọn ảnh JPG, PNG, GIF hoặc WebP nhỏ hơn 5MB.",
      );
    }

    throw error;
  }

  // Xử lý trường hợp backend trả về trực tiếp chuỗi URL (plain string)
  if (typeof data === "string") {
    if (!data) throw new Error("Không nhận được URL ảnh sau khi tải lên.");
    return data;
  }

  // Xử lý trường hợp backend trả về object (ví dụ: Cloudinary upload result hoặc ApiResponse)
  if (data && typeof data === "object") {
    // Nếu được wrap trong ApiResponse
    if ("data" in data && typeof data.data === "string") {
      return data.data;
    }

    // Nếu trả về JSON raw từ Cloudinary thường có field secure_url hoặc url
    const cloudinaryResponse = data as Record<string, unknown>;
    if (typeof cloudinaryResponse.secure_url === "string") {
      return cloudinaryResponse.secure_url;
    }
    if (typeof cloudinaryResponse.url === "string") {
      return cloudinaryResponse.url;
    }
  }

  console.error("Upload response không đúng định dạng:", data);
  throw new Error("Không nhận được URL ảnh sau khi tải lên.");
}

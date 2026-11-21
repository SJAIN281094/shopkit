import { API_ORIGIN } from "./api-origin";
import { session } from "./session";

export const MAX_IMAGE_MB = 5;
export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";
export const MAX_FONT_MB = 2;
export const ACCEPTED_FONT_TYPES = ".woff2,.woff,.ttf,.otf";

async function uploadFile(path: string, file: File): Promise<string> {
  const token = session.getToken();
  const shopId = session.getShopId();
  const body = new FormData();
  body.append("file", file);

  const res = await fetch(`${API_ORIGIN}${path}`, {
    method: "POST",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(shopId && { "x-shop-id": shopId }),
    },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string | string[] };
  if (!res.ok || !data.url) {
    const message = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new Error(message ?? "Upload failed. Please try again.");
  }
  return data.url;
}

/** Uploads an image for the current store and returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`Images must be ${MAX_IMAGE_MB} MB or smaller`);
  return uploadFile("/uploads/images", file);
}

/** Uploads a WOFF2/WOFF/TTF/OTF font for the current store and returns its public URL. */
export async function uploadFont(file: File): Promise<string> {
  if (file.size > MAX_FONT_MB * 1024 * 1024) throw new Error(`Font files must be ${MAX_FONT_MB} MB or smaller`);
  return uploadFile("/uploads/fonts", file);
}

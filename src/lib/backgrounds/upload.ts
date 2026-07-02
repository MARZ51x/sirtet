import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Client-side background upload: validate -> downscale/re-encode to WebP ->
// upload to a timestamped path -> delete older objects. Timestamped names
// keep the public CDN URL fresh on replacement.

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 2560;
const WEBP_QUALITY = 0.82;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type UploadResult =
  | { ok: true; path: string }
  | { ok: false; error: "type" | "size" | "decode" | "upload" };

export async function processAndUploadBackground(
  file: File,
  userId: string,
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, error: "type" };
  if (file.size > MAX_INPUT_BYTES) return { ok: false, error: "size" };

  let blob: Blob;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, error: "decode" };
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    ).then((b) => {
      if (!b) throw new Error("encode failed");
      return b;
    });
  } catch {
    return { ok: false, error: "decode" };
  }

  const supabase = createSupabaseBrowserClient();
  const path = `${userId}/bg-${Date.now()}.webp`;
  const { error } = await supabase.storage
    .from("backgrounds")
    .upload(path, blob, { contentType: "image/webp" });
  if (error) return { ok: false, error: "upload" };

  // best-effort cleanup of older files (exactly one background per user)
  const { data: objects } = await supabase.storage
    .from("backgrounds")
    .list(userId);
  const stale = (objects ?? [])
    .map((o) => `${userId}/${o.name}`)
    .filter((p) => p !== path);
  if (stale.length > 0) {
    await supabase.storage.from("backgrounds").remove(stale);
  }

  return { ok: true, path };
}

export async function removeBackground(userId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { data: objects } = await supabase.storage
    .from("backgrounds")
    .list(userId);
  const paths = (objects ?? []).map((o) => `${userId}/${o.name}`);
  if (paths.length > 0) {
    await supabase.storage.from("backgrounds").remove(paths);
  }
}

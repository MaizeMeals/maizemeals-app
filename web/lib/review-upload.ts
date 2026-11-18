/** Max photo size in bytes for review attach/upload (e.g. 2MB). */
export const MAX_REVIEW_PHOTO_BYTES = 2 * 1024 * 1024;

const ALLOWED_REVIEW_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const REVIEW_PHOTO_TYPE_ERROR =
  "Photo must be a JPEG, PNG, WebP, or GIF.";

/**
 * True only for an explicit JPEG, PNG, WebP, or GIF media type.
 * Empty, missing, and unknown types are rejected.
 */
export function isAllowedReviewPhotoType(type: unknown): boolean {
  if (typeof type !== "string") return false;
  const normalized = type.trim().toLowerCase();
  return normalized.length > 0 && ALLOWED_REVIEW_PHOTO_TYPES.has(normalized);
}

/** Size check first, then media type. Returns a user-facing error, or null. */
export function reviewPhotoValidationError(file: File): string | null {
  if (file.size > MAX_REVIEW_PHOTO_BYTES) {
    return `Photo must be under ${MAX_REVIEW_PHOTO_BYTES / 1024 / 1024}MB.`;
  }
  if (!isAllowedReviewPhotoType(file.type)) {
    return REVIEW_PHOTO_TYPE_ERROR;
  }
  return null;
}

export function reviewPhotoFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return ".jpg";
  const ext = filename.slice(lastDot).toLowerCase();
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  return allowed.includes(ext) ? ext : ".jpg";
}

/** Max photo size in bytes for review attach/upload (e.g. 2MB). */
export const MAX_REVIEW_PHOTO_BYTES = 2 * 1024 * 1024;

export function reviewPhotoFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return ".jpg";
  const ext = filename.slice(lastDot).toLowerCase();
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  return allowed.includes(ext) ? ext : ".jpg";
}

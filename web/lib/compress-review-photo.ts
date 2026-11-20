import imageCompression from "browser-image-compression";
import { isAllowedReviewPhotoType } from "@/lib/review-upload";

/** Shown when a photo cannot be decoded or is not a usable JPEG, PNG, WebP, or GIF. */
export const REVIEW_PHOTO_PROCESS_ERROR =
  "Couldn't process this photo. Try a JPEG or PNG.";

/**
 * Shrink a review photo to the upload target (about 100–150 KB, longest edge 1600).
 * Throws if decoding fails or the result is not an allowed type. Callers must drop
 * the original file in that case — do not upload it.
 */
export async function compressReviewPhoto(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.15,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    // Phone cameras/libraries can hand over HEIC/HEIF; re-encode those as JPEG.
    ...(isAllowedReviewPhotoType(file.type.trim().toLowerCase()) ? {} : { fileType: "image/jpeg" }),
  });

  const type = compressed.type.trim().toLowerCase();
  if (!isAllowedReviewPhotoType(type)) {
    throw new Error("Unsupported photo type");
  }

  const baseName = compressed.name.trim() || file.name.trim() || "photo";
  // Keep the extension in step with the (possibly converted) type.
  const name = type === "image/jpeg" ? baseName.replace(/\.(heic|heif)$/i, ".jpg") : baseName;
  return new File([compressed], name, {
    type,
    lastModified: Number.isFinite(compressed.lastModified)
      ? compressed.lastModified
      : Date.now(),
  });
}

/**
 * Supabase Storage bucket for item / review photos.
 * Create via migration `20260409120000_storage_item_photos_bucket.sql` or Dashboard → Storage.
 */
export const ITEM_PHOTOS_BUCKET = "item-photos";

export function getItemPhotoPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/${ITEM_PHOTOS_BUCKET}/${storagePath}`;
}

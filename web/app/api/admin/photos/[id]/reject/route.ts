import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminUserId } from "@/lib/supabase/admin";

import { ITEM_PHOTOS_BUCKET } from "@/lib/item-photos";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUserId(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admin = createAdminClient();

    const { data: photo, error: fetchError } = await admin
      .from("photos")
      .select("storage_path")
      .eq("id", id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json(
        { error: fetchError?.message ?? "Photo not found" },
        { status: 404 }
      );
    }

    await admin.storage.from(ITEM_PHOTOS_BUCKET).remove([photo.storage_path]);

    const { error: deleteError } = await admin.from("photos").delete().eq("id", id);

    if (deleteError) {
      console.error("Admin reject delete row error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin reject error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

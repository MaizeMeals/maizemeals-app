import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Download the signed-in user's whole food log as CSV. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=%2Fnutrition", request.url));

  const { data, error } = await supabase
    .from("food_logs")
    .select("consumed_on, meal_type, item_name, serving_size, servings, calories_per_serving, protein_g_per_serving, carbs_g_per_serving, fat_g_per_serving, is_planned, item_id, logged_at")
    .eq("user_id", user.id)
    .order("consumed_on", { ascending: true })
    .order("logged_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Could not export your log." }, { status: 500 });

  const header = ["date", "meal", "food", "serving_size", "servings", "calories", "protein_g", "carbs_g", "fat_g", "planned", "source"];
  const lines = (data ?? []).map((r) => {
    const n = Number(r.servings);
    return [
      r.consumed_on,
      r.meal_type.toLowerCase(),
      r.item_name,
      r.serving_size ?? "",
      n,
      Math.round(Number(r.calories_per_serving) * n),
      Math.round(Number(r.protein_g_per_serving) * n * 10) / 10,
      Math.round(Number(r.carbs_g_per_serving) * n * 10) / 10,
      Math.round(Number(r.fat_g_per_serving) * n * 10) / 10,
      r.is_planned ? "yes" : "no",
      r.item_id ? "campus menu" : "custom",
    ]
      .map(csvCell)
      .join(",");
  });
  const body = [header.join(","), ...lines].join("\n") + "\n";
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="maizemacros-log.csv"',
      "Cache-Control": "no-store",
    },
  });
}

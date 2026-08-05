import { redirect } from "next/navigation";

/** Keep legacy and marketing links working while menus remain location-scoped. */
export default function MenusPage() {
  redirect("/locations");
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MaizeMeals",
    short_name: "MaizeMeals",
    description:
      "U-M dining menus, ratings, and macros — find the best dining hall for your next meal.",
    start_url: "/locations?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#00274C",
    theme_color: "#00274C",
    categories: ["food", "lifestyle", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Find food",
        short_name: "Find food",
        url: "/menus?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Dining halls",
        short_name: "Dining",
        url: "/locations?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "MaizeMacros",
        short_name: "Macros",
        url: "/nutrition?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}

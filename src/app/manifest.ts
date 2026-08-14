import type { MetadataRoute } from "next";
import { EVENT_NAME } from "@/lib/event";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: EVENT_NAME,
    short_name: "Yuva Sabha",
    description: "Yuva Sabha — companion app",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf9f6",
    theme_color: "#faf9f6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

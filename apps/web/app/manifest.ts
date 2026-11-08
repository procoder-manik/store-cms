import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.NEXT_PUBLIC_SITE_NAME ?? "Lumen";
  return {
    name, short_name: name, description: "Online shopping in Bangladesh", start_url: "/", scope: "/", display: "standalone",
    background_color: "#f5f5f7", theme_color: "#f5f5f7", orientation: "portrait",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}

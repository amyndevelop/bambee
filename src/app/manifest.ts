import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BAMBEE",
    short_name: "BAMBEE",
    description: "Creciendo juntos, desde el comienzo.",
    lang: "es-AR",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF7F0",
    theme_color: "#F59B8F",
    icons: [
      {
        src: "/brand/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

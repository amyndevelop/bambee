import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/600.css";
import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BAMBEE · Creciendo juntos",
  description: "Tu embarazo, acompañado con amor y privacidad.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "BAMBEE", statusBarStyle: "default" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFF7F0",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}

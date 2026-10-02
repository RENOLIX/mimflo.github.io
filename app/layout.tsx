import type { Metadata } from "next";
import "./globals.css";
import "./home.css";

export const metadata: Metadata = {
  title: "MimFlo · Votre voix, votre plus belle progression",
  description: "Entraînez votre prononciation et votre expression orale en français. Des articles, des exercices ciblés et votre progression au même endroit.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["400", "600", "700"],
  subsets: ["vietnamese", "latin"],
  variable: "--font-be-vietnam-pro",
});

export const metadata: Metadata = {
  title: "Con Rối Bị Troll",
  description: "Game Con Rối Bị Troll với lưu tiến trình Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col items-center justify-center">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "学習記録 | Stay Focused",
  description: "日々の学習時間を記録して、モチベーションを維持しましょう。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  );
}

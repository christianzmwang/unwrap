import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Black Swan",
  description: "Black Swan App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

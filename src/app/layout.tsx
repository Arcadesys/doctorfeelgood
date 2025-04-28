'use client';

import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head />
      <body
        className="antialiased"
        style={{ overscrollBehaviorX: "auto" }}
      >
        {children}
      </body>
    </html>
  );
}

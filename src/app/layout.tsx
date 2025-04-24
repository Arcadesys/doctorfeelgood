'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { CacheProvider } from '@chakra-ui/next-js'
import theme from '@/theme'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ overscrollBehaviorX: "auto" }}
      >
        <CacheProvider>
          <ChakraProvider theme={theme}>
            {children}
          </ChakraProvider>
        </CacheProvider>
      </body>
    </html>
  );
}

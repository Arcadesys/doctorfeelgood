'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { CacheProvider } from '@chakra-ui/next-js'
import theme from '@/theme'

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
      <head>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      </head>
      <body
        className="antialiased"
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

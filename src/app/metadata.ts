import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Doctor Feel Good - EMDR Therapy Tool",
  description: "A professional EMDR therapy tool with visual and audio guidance for therapists and clients. Features include bilateral stimulation, customizable visual targets, and audio feedback.",
  keywords: ["EMDR", "therapy", "bilateral stimulation", "mental health", "visual target", "audio feedback"],
  authors: [{ name: "Doctor Feel Good Team" }],
  creator: "Doctor Feel Good",
  publisher: "Doctor Feel Good",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://doctorfeelgood.app'),
  openGraph: {
    title: "Doctor Feel Good - EMDR Therapy Tool",
    description: "Professional EMDR therapy tool with visual and audio guidance",
    url: 'https://doctorfeelgood.app',
    siteName: 'Doctor Feel Good',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Doctor Feel Good EMDR Tool',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Doctor Feel Good - EMDR Therapy Tool',
    description: 'Professional EMDR therapy tool with visual and audio guidance',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification',
  },
  alternates: {
    canonical: 'https://doctorfeelgood.app',
  },
}; 
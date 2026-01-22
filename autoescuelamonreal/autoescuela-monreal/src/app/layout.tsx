import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Autoescuela Monreal | Todos los permisos de conducir en Zaragoza",
  description: "Autoescuela en Zaragoza especializada en todos los permisos de conducir: B, A1, A2, C, D, CAP, ADR. Dos sedes en La Paz y Rosales. Profesionales con experiencia.",
  keywords: "autoescuela zaragoza, carnet de conducir, permiso B, permiso A2, CAP, ADR, autoescuela monreal",
  openGraph: {
    title: "Autoescuela Monreal | Todos los permisos de conducir en Zaragoza",
    description: "Tu autoescuela de confianza en Zaragoza. Formamos conductores desde hace años con los mejores profesionales.",
    type: "website",
    locale: "es_ES",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}

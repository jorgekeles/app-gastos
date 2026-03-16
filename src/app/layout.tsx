import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Manrope,
  Nunito_Sans,
  Poppins,
} from "next/font/google";
import "./globals.css";

const bodyFont = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600", "700", "800"],
});

const displayFont = Poppins({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
});

const claraBodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-clara-body",
  weight: ["400", "500", "600", "700"],
});

const claraDisplayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-clara-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AppGastos | Finanzas familiares",
  description:
    "Gestion financiera familiar en ARS y USD con dashboard, ahorro, cuotas y calendario compartido.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${claraBodyFont.variable} ${claraDisplayFont.variable}`}
      >
        {children}
      </body>
    </html>
  );
}

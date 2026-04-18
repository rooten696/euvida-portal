import Navbar from './components/Navbar';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: 'Euvida | Průvodce životem a prací v Evropě',
  description: 'Objevte Evropu bez hranic. Váš průvodce cestováním, prací a kulturou v zemích EU i mimo ni.',
  // Tohle se ukáže, když web nasdílíš na sítě:
  openGraph: {
    title: 'Euvida | Objevte Evropu bez hranic',
    description: 'Váš komplexní průvodce životem v evropských zemích.',
    url: 'https://euvida.eu',
    siteName: 'Euvida',
    locale: 'cs_CZ',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><Navbar />{children}</body>
    </html>
  );
}

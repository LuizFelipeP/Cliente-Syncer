import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Head from "next/head"; // importar isso

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Meu App",
  description: "Gerencie seus gastos mesmo offline",
  icons: {
    icon: "favicon.ico",
    apple: "favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
      <html lang="pt-BR">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="favicon.ico" />
        <meta name="theme-color" content="#0d9488" />
        <meta name="description" content="Gerenciador de gastos offline" />
      </Head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
      {children}
      </body>
      </html>
  );
}

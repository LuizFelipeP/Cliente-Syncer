// app/layout.tsx

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

export const metadata = {
    title: "Meu App",
    description: "Gerencie seus gastos mesmo offline",
    icons: {
        icon: "/favicon.ico",
        apple: "/favicon.ico",
    },
    manifest: "/manifest.json",
};

export const viewport = {
    themeColor: "#0d9488",
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR">
        <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        </body>
        </html>
    );
}

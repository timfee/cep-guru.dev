import type { Metadata } from "next";
import { Google_Sans_Code, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const googleSansCode = Google_Sans_Code({
  variable: "--font-google-sans-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chrome Enterprise Guru",
  description:
    "Your go-to resource for Chrome Enterprise management and deployment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${googleSansCode.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

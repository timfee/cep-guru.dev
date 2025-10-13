import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { JetBrains_Mono, Roboto_Flex } from "next/font/google";

import "./globals.css";

const inter = Roboto_Flex({
  variable: "--font-inter",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} antialiased`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

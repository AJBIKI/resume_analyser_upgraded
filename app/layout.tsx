import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import Navbar from "./components/Navbar";
import { ThemeProvider } from "./components/ThemeProvider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "AI Resume Analyzer",
  description: "Advanced agentic resume analysis using Qdrant and HuggingFace.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className={`${jakarta.variable} font-sans`}>
        <body className="antialiased bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100 selection:bg-pink-500/30 selection:text-pink-200">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Navbar />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}


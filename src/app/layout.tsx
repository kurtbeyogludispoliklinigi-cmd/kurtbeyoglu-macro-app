import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { InstallPrompt } from "@/components/InstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kurtbeyoğlu ADSP Macro",
  description: "Özel Kurtbeyoğlu Ağız ve Diş Sağlığı Polikliniği - Hasta Takip Sistemi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Kurtbeyoğlu Macro",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ToastProvider>
            {children}
            <OfflineIndicator />
            <InstallPrompt />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

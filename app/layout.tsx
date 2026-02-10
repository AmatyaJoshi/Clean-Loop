import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./animations.css";
import AuthProvider from "@/components/SessionProvider";
import CityPicker from "@/components/CityPicker";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CleanLoop - Premium Laundry Service",
  description: "Professional laundry service at your doorstep. Free pickup & delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <CityPicker />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

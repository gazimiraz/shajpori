import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import QueryProvider from "@/components/providers/query-provider";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Shaj Fashion — Premium Lifestyle & Fashion",
    template: "%s | Shaj Fashion",
  },
  description:
    "Discover the latest trends in fashion & lifestyle at Shaj. Shop premium clothing, accessories, and more with fast delivery across Bangladesh.",
  keywords: [
    "fashion",
    "lifestyle",
    "clothing",
    "accessories",
    "bangladesh",
    "online shopping",
    "shaj",
  ],
  authors: [{ name: "Shaj Fashion" }],
  creator: "Shaj Fashion",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://shaj.com.bd",
    siteName: "Shaj Fashion",
    title: "Shaj Fashion — Premium Lifestyle & Fashion",
    description:
      "Discover the latest trends in fashion & lifestyle at Shaj. Premium clothing & accessories.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Shaj Fashion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shaj Fashion",
    description: "Premium Lifestyle & Fashion",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen flex flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          <QueryProvider>
            <Navbar />
            <main className="flex-1 page-enter">{children}</main>
            <Footer />
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 3500,
                style: {
                  borderRadius: "12px",
                  background: "#1e293b",
                  color: "#f8fafc",
                  fontSize: "14px",
                  padding: "12px 16px",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
                },
                success: {
                  iconTheme: { primary: "#10b981", secondary: "#fff" },
                },
                error: {
                  iconTheme: { primary: "#f43f5e", secondary: "#fff" },
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

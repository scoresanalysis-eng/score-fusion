import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { AppNavbar } from "@/components/layout/app-navbar";
import { Toaster } from "@/components/ui/toaster";
import AuthShell from "@/components/layout/auth-shell";
import { FollowUsFloatingButton } from "@/components/follow-us-dialog";
import { ThemeProvider } from "@/contexts/theme-context";
import DeploymentPaused from "@/components/vercel";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  icons: {
    icon: "/images/2.png",
  },

  title: "ScoreFusion - Premium Betting Tips & Predictions",
  description:
    "Get exclusive betting tips, VIP predictions, and earn rewards with ScoreFusion. Join thousands of winners today!",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ScoreFusion",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#ca8a04",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <AppNavbar />
            <FollowUsFloatingButton />
            <AuthShell>
              <main className="min-h-screen pt-16">{children}</main>
            </AuthShell>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>

        {/* <DeploymentPaused /> */}
      </body>
    </html>
  );
}

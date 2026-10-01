import type { Metadata, Viewport } from "next";
import { EB_Garamond, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import FirebaseAnalytics from "@/components/FirebaseAnalytics";
import { AuthProvider } from "@/context/AuthContext";

const displayFont = EB_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const interfaceFont = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://bayesinstitute.com"),
  title: {
    default: "Bayes Institute | Learn with clarity",
    template: "%s | Bayes Institute",
  },
  description:
    "Explore clear, considered learning in statistics, data, and decision science.",
  manifest: "/assets/web/site.webmanifest",
  icons: {
    icon: [
      { url: "/assets/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/assets/icons/favicon.ico", sizes: "any" },
    ],
    apple: "/assets/icons/apple-touch-icon-180.png",
  },
  openGraph: {
    title: "Bayes Institute | Learn with clarity",
    description:
      "Explore clear, considered learning in statistics, data, and decision science.",
    images: [
      {
        url: "/assets/social/open-graph-1200x630.png",
        width: 1200,
        height: 630,
        alt: "Bayes Institute",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/assets/social/open-graph-1200x630.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFEFA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${interfaceFont.variable}`}>
      <body>
        <FirebaseAnalytics />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

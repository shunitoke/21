import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Fraunces, Manrope, Press_Start_2P } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const pressStart = Press_Start_2P({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400"],
});

const APP_TITLE = "Программа 21";
const APP_DESCRIPTION = "Приватный трекер привычек и место практики.";

export const metadata: Metadata = {
  metadataBase: new URL("https://21-five-gamma.vercel.app"),
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  applicationName: APP_TITLE,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Program 21 - Private Habit Trainer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1115",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
    >
      <head>
        <style>{`html,body{background-color:#fff;color-scheme:light}`}</style>
        <script dangerouslySetInnerHTML={{__html: `(function(){var h=document.documentElement,m=window.matchMedia,c=document.cookie.match(/program21\\.theme=([^;]+)/),t=c?c[1]:'system',b='#fff',cs='light';if(t==='dark'||(t==='system'&&m&&m('(prefers-color-scheme: dark)').matches)){b='#0a0b0f';cs='dark';}h.style.backgroundColor=b;h.style.colorScheme=cs;})();`}} />
        <link
          rel="preload"
          href="/Zvezda NHZDN Bold Italic v.1.1.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/Zvezda NHZDN Bold Italic v.1.1.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${fraunces.variable} ${manrope.variable} ${pressStart.variable} antialiased`} style={{ backgroundColor: 'inherit' }}>
        {children}
      </body>
    </html>
  );
}

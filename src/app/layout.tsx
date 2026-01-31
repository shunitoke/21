import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
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

const APP_TITLE = "Program 21";
const APP_DESCRIPTION = "Private habit trainer and practice space.";

export const metadata: Metadata = {
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
    icon: "/demo.png",
    apple: "/demo.png",
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
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("program21.theme")?.value ?? "system";
  const initialTheme = themeCookie === "dark" || themeCookie === "light" ? themeCookie : "light";
  const initialBackground = initialTheme === "dark" ? "#0a0b0f" : "#ffffff";

  return (
    <html
      lang="ru"
      suppressHydrationWarning
      data-theme={initialTheme}
      data-appearance={initialTheme}
      style={{ backgroundColor: initialBackground, colorScheme: initialTheme }}
    >
      <head>
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
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(() => {
  const apply = (mode) => {
    const resolved = mode && mode !== "system" ? mode : (window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light");
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.appearance = resolved;
    document.documentElement.style.backgroundColor = resolved === "dark" ? "#0a0b0f" : "#ffffff";
    document.documentElement.style.colorScheme = resolved;
  };
  // Try to get theme from cookie first (set by server), then fallback
  const cookieTheme = document.cookie.match(/program21\.theme=([^;]+)/)?.[1];
  if (cookieTheme) {
    apply(cookieTheme);
  } else {
    // Wait for IndexedDB to be available and read theme
    const checkDb = async () => {
      try {
        const { openDB } = await import('idb');
        const db = await openDB('program-21', 2);
        const theme = await db.get('meta', 'theme');
        apply(theme || 'system');
      } catch {
        apply('system');
      }
    };
    checkDb();
  }
})();`,
          }}
        />
      </head>
      <body className={`${fraunces.variable} ${manrope.variable} ${pressStart.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

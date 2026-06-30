import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ContinueReadingBanner } from "@/components/reader/continue-reading-banner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tomoverso — Onde Light Novels brasileiras ganham vida",
  description:
    "Plataforma brasileira de Light Novels. Leia, escreva e descubra histórias originais em português.",
  keywords: ["light novel", "ln", "web novel", "brasil", "leitura", "escrita"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${jakarta.variable} ${lora.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2780687772948357"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var s=JSON.parse(localStorage.getItem('tomoverso-ui-theme')||'{}');var themes=['dark','light','system'];var colors=['purple','blue','rose','cyan','emerald','red','amber'];var pref=themes.indexOf(s.theme)>=0?s.theme:'dark';var color=colors.indexOf(s.color)>=0?s.color:(s.color==='sepia'?'amber':(s.color==='ocean'?'cyan':'purple'));var resolved=pref==='system'?(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):pref;document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(resolved);document.documentElement.setAttribute('data-theme',pref);document.documentElement.setAttribute('data-color',color);}catch(e){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');document.documentElement.setAttribute('data-color','purple');}})()`
        }} />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <ThemeProvider defaultTheme="dark" defaultColor="purple">
          <Navbar />
          <ContinueReadingBanner />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}

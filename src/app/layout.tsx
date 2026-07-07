import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { Toaster } from "@/components/ui/sonner";
import { ContinueReadingBanner } from "@/components/reader/continue-reading-banner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { TomoversoIntroSplash } from "@/components/layout/tomoverso-intro-splash";
import { TomoversoRoutePreloader } from "@/components/layout/tomoverso-route-preloader";
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
  title: "Tomo Verso Editora — Onde histórias ganham vida",
  description:
    "A Tomo Verso Editora é uma editora digital dedicada a transformar histórias em experiências marcantes. Nosso objetivo é conectar leitores e autores através de obras envolventes, criativas e acessíveis, reunindo novels, light novels, mangás, manhwas, livros e narrativas originais em um só universo.",
  keywords: ["light novel", "ln", "mangá", "editora", "tomoverso editora", "brasil", "leitura", "escrita"],
  icons: {
    icon: [{ url: "/favicon-20260706.ico", type: "image/x-icon" }, { url: "/favicon-20260706.png", type: "image/png" }],
  },
  openGraph: {
    title: "Tomo Verso Editora",
    description: "Editora digital de histórias — novels, mangás, light novels e mais.",
    images: [{ url: "https://tomoverso.studio/logo-tomoverso-editora-20260706.png", width: 1254, height: 1254 }],
    siteName: "Tomo Verso Editora",
  },
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
        <link rel="icon" type="image/x-icon" href="/favicon-20260706.ico" />
        <link rel="icon" type="image/png" href="/favicon-20260706.png" />
        <link rel="preload" as="image" href="/logo-tomoverso-mark-192.png" />
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{document.documentElement.setAttribute('data-intro-seen',sessionStorage.getItem('tomoverso_intro_seen')==='true'?'true':'false');}catch(e){document.documentElement.setAttribute('data-intro-seen','false');}})()`
        }} />
        <meta property="og:image" content="https://tomoverso.studio/logo-tomoverso-editora-20260706.png" />
        <meta property="og:image:width" content="1254" />
        <meta property="og:image:height" content="1254" />
        <meta property="og:site_name" content="Tomo Verso Editora" />
        <meta name="google-adsense-account" content="ca-pub-2780687772948357" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-R28LZTKXV6"></script>
        <script dangerouslySetInnerHTML={{__html:`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-R28LZTKXV6');`}} />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2780687772948357"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var s=JSON.parse(localStorage.getItem('tomoverso-ui-theme')||'{}');var themes=['dark','light','system'];var colors=['sepia','blue','purple','rose','amber'];var free=['sepia','blue','purple'];var pref=themes.indexOf(s.theme)>=0?s.theme:'dark';var hasSub=/(?:^|; )tomoverso-subscriber=1(?:;|$)/.test(document.cookie);var rawColor=colors.indexOf(s.color)>=0?s.color:'sepia';var color=(free.indexOf(rawColor)>=0||hasSub)?rawColor:'sepia';var resolved=pref==='system'?(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):pref;var cookie=(document.cookie.match(/(?:^|; )novel_lang=([^;]+)/)||[])[1];var lang=localStorage.getItem('tomoverso-locale')||decodeURIComponent(cookie||'pt-BR');if(lang==='pt')lang='pt-BR';if(lang==='zh-CN')lang='zh';var allowed=['pt-BR','en','es','fr','de','it','ja','ko','zh'];var html={'pt-BR':'pt-BR',en:'en',es:'es',fr:'fr',de:'de',it:'it',ja:'ja',ko:'ko',zh:'zh-CN'};if(allowed.indexOf(lang)<0)lang='pt-BR';document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(resolved);document.documentElement.setAttribute('data-theme',pref);document.documentElement.setAttribute('data-color',color);document.documentElement.lang=html[lang]||'pt-BR';document.documentElement.setAttribute('data-locale',lang);document.documentElement.setAttribute('data-translation-status',lang==='pt-BR'?'ready':'translating');}catch(e){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');document.documentElement.setAttribute('data-color','sepia');document.documentElement.lang='pt-BR';document.documentElement.setAttribute('data-locale','pt-BR');document.documentElement.setAttribute('data-translation-status','ready');}})()`
        }} />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <LanguageProvider>
          <ThemeProvider defaultTheme="dark" defaultColor="sepia">
            <TomoversoIntroSplash />
            <Navbar />
            <ContinueReadingBanner />
            <main className="flex-1">{children}</main>
            <Footer />
            <CookieConsent />
            <TomoversoRoutePreloader />
            <Toaster position="top-center" richColors />
            </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

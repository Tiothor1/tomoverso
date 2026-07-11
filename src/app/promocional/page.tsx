import Link from "next/link";

const banners = [
  { file: "banner-principal.svg", label: "Principal (TikTok/Story)", w: 1080, h: 1920 },
  { file: "banner-mangas.svg", label: "Mangás (TikTok/Story)", w: 1080, h: 1920 },
  { file: "banner-novels.svg", label: "Light Novels (TikTok/Story)", w: 1080, h: 1920 },
  { file: "banner-quadrado.svg", label: "Instagram Feed (quadrado)", w: 1080, h: 1080 },
  { file: "banner-publicar.svg", label: "Publique (Instagram Feed)", w: 1080, h: 1080 },
];

export default function PromocionalPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">📢 Material Promocional</h1>
          <p className="text-zinc-400 text-lg">
            Banners prontos para TikTok, Instagram e outras redes
          </p>
          <div className="flex gap-4 justify-center mt-6 flex-wrap">
            <a
              href="/promocional/banner-principal.svg"
              download
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              ⬇ Baixar todos os banners
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {banners.map((b) => (
            <div
              key={b.file}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-zinc-700 transition-colors"
            >
              <a
                href={`/promocional/${b.file}`}
                target="_blank"
                className="block"
              >
                <div className={`aspect-[${b.w}/${b.h}] bg-zinc-800/50 flex items-center justify-center`}>
                  <img
                    src={`/promocional/${b.file}`}
                    alt={b.label}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
              </a>
              <div className="p-4">
                <h3 className="font-semibold text-sm mb-1">{b.label}</h3>
                <p className="text-xs text-zinc-500 mb-3">{b.w}×{b.h}px</p>
                <div className="flex gap-2">
                  <a
                    href={`/promocional/${b.file}`}
                    download
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ⬇ Download
                  </a>
                  <Link
                    href={`/promocional/${b.file}`}
                    target="_blank"
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    🔍 Abrir
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">📋 Como usar</h2>
          <ol className="space-y-3 text-zinc-300">
            <li className="flex gap-3">
              <span className="text-amber-500 font-bold shrink-0">1.</span>
              <span>Clique no banner que você gostou para abrir em tela cheia</span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-500 font-bold shrink-0">2.</span>
              <span>Clique com botão direito → "Salvar imagem como..." (salva como SVG)</span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-500 font-bold shrink-0">3.</span>
              <span>Se precisar de PNG, abra o SVG no navegador, tire um print ou use um conversor online (svg2png.com)</span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-500 font-bold shrink-0">4.</span>
              <span>Poste no TikTok, Instagram Stories, Feed ou onde quiser!</span>
            </li>
          </ol>
        </div>

        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">📝 Texto sugerido para legenda</h2>
          <pre className="bg-zinc-950 text-zinc-300 p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap font-sans">
📚 Leitura de graça? Temos sim!{'\n'}{'\n'}
172+ mangás, 52+ novels e mais de 20 MIL capítulos pra ler AGORA no celular.{'\n'}{'\n'}
Sem enrolação, sem pagar nada — só clicar e ler.{'\n'}{'\n'}
👇 Link na bio{'\n'}
#mangá #lightnovel #leitura #tomoverso #mangáonline
          </pre>
        </div>
      </div>
    </div>
  );
}

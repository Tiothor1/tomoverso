import type { Novel } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NovelCoverProps {
  novel: Novel;
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Capas SVG estilizadas — únicas por slug
export function NovelCover({ novel, className, size = "md" }: NovelCoverProps) {
  const coverArt = getCoverArt(novel.slug);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-border/30",
        className
      )}
    >
      <svg
        viewBox="0 0 300 400"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
      >
        <defs>
          {coverArt.defs}
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
            <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
        {coverArt.background}
        {coverArt.foreground}
        {/* Vinheta */}
        <rect width="300" height="400" fill="url(#vignette)" />
        <rect width="300" height="400" filter="url(#grain)" opacity="0.15" />
      </svg>

      {/* Title overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
        <div className="text-[10px] uppercase tracking-widest text-white/70 mb-1">
          Light Novel
        </div>
        <div className="font-heading font-bold text-white text-sm leading-tight line-clamp-2">
          {novel.title}
        </div>
        {novel.author && (
          <div className="text-[10px] text-white/60 mt-1">
            por {novel.author.display_name}
          </div>
        )}
      </div>

      {novel.is_featured && (
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
          ★ Top
        </div>
      )}
    </div>
  );
}

function getCoverArt(slug: string) {
  switch (slug) {
    case "o-que-eu-desenhei-existe":
      return oqedeCover();
    case "dublador-de-almas":
      return dubladorCover();
    case "sistema-ultima-posicao":
      return sistemaCover();
    default:
      return defaultCover(slug);
  }
}

// ============= OQEDE: roxo/pink, mundo de fantasia + caderno =============
function oqedeCover() {
  return {
    defs: (
      <>
        <linearGradient id="oqede-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a0b2e" />
          <stop offset="50%" stopColor="#3d1452" />
          <stop offset="100%" stopColor="#7c2d6f" />
        </linearGradient>
        <linearGradient id="oqede-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff6ec7" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="oqede-orb" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ff9ee5" />
          <stop offset="60%" stopColor="#c026d3" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7c2d6f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.7">
          <stop offset="50%" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.6" />
        </radialGradient>
      </>
    ),
    background: (
      <>
        <rect width="300" height="400" fill="url(#oqede-bg)" />
        {/* Orbe mágico */}
        <circle cx="150" cy="180" r="120" fill="url(#oqede-orb)" />
        {/* Glow superior */}
        <ellipse cx="150" cy="50" rx="200" ry="80" fill="url(#oqede-glow)" />
        {/* Estrelas */}
        {Array.from({ length: 30 }).map((_, i) => (
          <circle
            key={i}
            cx={Math.random() * 300}
            cy={Math.random() * 200}
            r={Math.random() * 1.2}
            fill="white"
            opacity={Math.random() * 0.8}
          />
        ))}
        {/* Castelo flutuante */}
        <g opacity="0.7" transform="translate(180, 100)">
          <path
            d="M0 30 L10 20 L20 25 L30 15 L40 25 L50 20 L60 30 L60 60 L0 60 Z"
            fill="#1a0b2e"
            stroke="#ff9ee5"
            strokeWidth="0.5"
          />
          <rect x="20" y="10" width="3" height="15" fill="#ff9ee5" />
          <rect x="35" y="5" width="3" height="20" fill="#ff9ee5" />
        </g>
        {/* Tinta caindo */}
        <path
          d="M50 100 Q60 150 50 200 Q40 250 55 300"
          stroke="#ff9ee5"
          strokeWidth="0.8"
          fill="none"
          opacity="0.4"
        />
        <path
          d="M250 120 Q240 180 255 240 Q260 280 245 320"
          stroke="#c026d3"
          strokeWidth="0.8"
          fill="none"
          opacity="0.4"
        />
      </>
    ),
    foreground: (
      <>
        {/* Silhueta de garota com caderno */}
        <g transform="translate(80, 200)">
          {/* Cabelo */}
          <path
            d="M50 0 Q40 30 35 80 L20 100 L80 100 L75 80 Q80 50 70 20 Q60 5 50 0 Z"
            fill="#0a0414"
            opacity="0.85"
          />
          {/* Cabeça */}
          <ellipse cx="50" cy="40" rx="22" ry="25" fill="#1a0b2e" />
          {/* Corpo */}
          <path
            d="M30 70 L25 180 L75 180 L70 70 Z"
            fill="#0a0414"
            opacity="0.9"
          />
          {/* Caderno */}
          <rect
            x="35"
            y="110"
            width="35"
            height="45"
            fill="#3d1452"
            stroke="#ff9ee5"
            strokeWidth="1"
            transform="rotate(-5 52 132)"
          />
          <line
            x1="40"
            y1="120"
            x2="65"
            y2="118"
            stroke="#ff9ee5"
            strokeWidth="0.5"
            transform="rotate(-5 52 132)"
          />
          <line
            x1="40"
            y1="130"
            x2="60"
            y2="128"
            stroke="#ff9ee5"
            strokeWidth="0.5"
            transform="rotate(-5 52 132)"
          />
        </g>
      </>
    ),
  };
}

// ============= DUBLADOR: azul/verde, medieval + som =============
function dubladorCover() {
  return {
    defs: (
      <>
        <linearGradient id="dub-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0a1929" />
          <stop offset="50%" stopColor="#0d3a5c" />
          <stop offset="100%" stopColor="#1a5d8e" />
        </linearGradient>
        <linearGradient id="dub-wave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="dub-orb" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="60%" stopColor="#0891b2" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0a1929" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.7">
          <stop offset="50%" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.6" />
        </radialGradient>
      </>
    ),
    background: (
      <>
        <rect width="300" height="400" fill="url(#dub-bg)" />
        <circle cx="150" cy="200" r="140" fill="url(#dub-orb)" />
        {/* Ondas sonoras */}
        {Array.from({ length: 5 }).map((_, i) => (
          <path
            key={i}
            d={`M 50 ${100 + i * 40} Q 150 ${60 + i * 40}, 250 ${100 + i * 40}`}
            stroke="url(#dub-wave)"
            strokeWidth="1.5"
            fill="none"
            opacity={0.4 + i * 0.1}
          />
        ))}
        {/* Dragão distante */}
        <g opacity="0.4" transform="translate(200, 80)">
          <path
            d="M0 20 Q15 10 30 15 Q45 5 60 18 L55 25 L50 22 L40 28 L30 22 L20 28 L10 22 Z"
            fill="#0a1929"
            stroke="#22d3ee"
            strokeWidth="0.5"
          />
        </g>
        {/* Castelo medieval */}
        <g opacity="0.5" transform="translate(0, 280)">
          <path
            d="M0 120 L0 80 L20 80 L20 60 L40 60 L40 80 L60 80 L60 50 L80 50 L80 80 L100 80 L100 60 L120 60 L120 80 L140 80 L140 120 Z"
            fill="#0a1929"
            stroke="#22d3ee"
            strokeWidth="0.5"
          />
        </g>
      </>
    ),
    foreground: (
      <>
        {/* Silhueta de homem com fone */}
        <g transform="translate(100, 130)">
          <ellipse cx="50" cy="40" rx="25" ry="30" fill="#020617" />
          {/* Fone de ouvido */}
          <ellipse cx="22" cy="35" rx="8" ry="12" fill="#06b6d4" />
          <ellipse cx="78" cy="35" rx="8" ry="12" fill="#06b6d4" />
          <path
            d="M22 25 Q50 5 78 25"
            stroke="#06b6d4"
            strokeWidth="2"
            fill="none"
          />
          {/* Corpo */}
          <path
            d="M25 75 L20 200 L80 200 L75 75 Z"
            fill="#020617"
            opacity="0.95"
          />
        </g>
      </>
    ),
  };
}

// ============= SISTEMA: vermelho/preto, monstro + level =============
function sistemaCover() {
  return {
    defs: (
      <>
        <linearGradient id="sis-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0a0000" />
          <stop offset="50%" stopColor="#3a0a0a" />
          <stop offset="100%" stopColor="#7c1818" />
        </linearGradient>
        <linearGradient id="sis-energy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sis-orb" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="40%" stopColor="#ef4444" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#7c1818" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.7">
          <stop offset="50%" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.7" />
        </radialGradient>
      </>
    ),
    background: (
      <>
        <rect width="300" height="400" fill="url(#sis-bg)" />
        <circle cx="150" cy="200" r="150" fill="url(#sis-orb)" />
        {/* Linhas de sistema */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={i}
            x1="0"
            y1={i * 35}
            x2="300"
            y2={i * 35}
            stroke="#ef4444"
            strokeWidth="0.3"
            opacity="0.2"
          />
        ))}
        {/* Dragão ancestral */}
        <g opacity="0.6" transform="translate(150, 130)">
          <path
            d="M-80 0 Q-50 -30 0 -20 Q50 -30 80 0 Q60 30 30 25 L20 35 L10 25 L-10 30 L-20 25 L-30 30 L-40 25 L-50 30 Z"
            fill="#0a0000"
            stroke="#fbbf24"
            strokeWidth="1"
          />
          {/* Olhos do dragão */}
          <circle cx="-30" cy="-5" r="3" fill="#fbbf24" />
          <circle cx="30" cy="-5" r="3" fill="#fbbf24" />
          {/* Aura */}
          <circle cx="0" cy="0" r="80" fill="url(#sis-energy)" opacity="0.5" />
        </g>
        {/* Level E (rank mais baixo) */}
        <g transform="translate(20, 340)">
          <rect width="40" height="40" fill="none" stroke="#ef4444" strokeWidth="2" />
          <text
            x="20"
            y="28"
            textAnchor="middle"
            fill="#ef4444"
            fontSize="24"
            fontWeight="bold"
            fontFamily="monospace"
          >
            E
          </text>
        </g>
        {/* Level S (rank máximo) */}
        <g transform="translate(240, 340)">
          <rect width="40" height="40" fill="#ef4444" />
          <text
            x="20"
            y="28"
            textAnchor="middle"
            fill="white"
            fontSize="24"
            fontWeight="bold"
            fontFamily="monospace"
          >
            S
          </text>
        </g>
      </>
    ),
    foreground: (
      <>
        {/* Silhueta de caçador */}
        <g transform="translate(110, 200)">
          <ellipse cx="40" cy="25" rx="18" ry="22" fill="#0a0000" />
          <path
            d="M20 50 L15 150 L65 150 L60 50 Z"
            fill="#0a0000"
            opacity="0.95"
          />
          {/* Espada */}
          <line
            x1="60"
            y1="60"
            x2="75"
            y2="20"
            stroke="#fbbf24"
            strokeWidth="2"
          />
          <polygon points="73,18 77,18 75,15" fill="#fbbf24" />
        </g>
      </>
    ),
  };
}

function defaultCover(slug: string) {
  const hue = (slug.charCodeAt(0) * 13) % 360;
  return {
    defs: (
      <>
        <linearGradient id={`def-bg-${slug}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue}, 30%, 15%)`} />
          <stop offset="100%" stopColor={`hsl(${(hue + 60) % 360}, 40%, 25%)`} />
        </linearGradient>
        <radialGradient id={`def-orb-${slug}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={`hsl(${hue}, 70%, 50%)`} stopOpacity="0.4" />
          <stop offset="100%" stopColor={`hsl(${hue}, 30%, 15%)`} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.7">
          <stop offset="50%" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.6" />
        </radialGradient>
      </>
    ),
    background: (
      <>
        <rect width="300" height="400" fill={`url(#def-bg-${slug})`} />
        <circle cx="150" cy="180" r="120" fill={`url(#def-orb-${slug})`} />
      </>
    ),
    foreground: <></>,
  };
}

/**
 * Generates an SVG image for a quote — designed for GitHub README embeds.
 *
 * Font strategy: embeds Google Fonts via @import so SVG renders Vietnamese
 * (and other Unicode) text correctly in browsers and GitHub README previews.
 * The `font` param maps to a curated list of Google Font slugs.
 */

export type ThemeName = 'dark' | 'light' | 'ocean' | 'rose' | 'forest' | 'sunset' | 'mono';
export type FontName = 'bevietnampro' | 'notosans' | 'lato' | 'merriweather' | 'playfair' | 'roboto' | 'inter';

export interface QuoteImageOptions {
    content: string;
    author: string;

    // ── Color ──────────────────────────────────────────────────────────────────
    /** Preset color theme (default: dark). bg/color/accent/authorColor override it. */
    theme?: ThemeName;
    /** Background color — hex without # or CSS name. E.g. `0d1117` */
    bg?: string;
    /** Quote text color — hex without # or CSS name. */
    color?: string;
    /** Author text color — hex without # or CSS name. Falls back to accent. */
    authorColor?: string;
    /** Accent / left-border color — hex without # or CSS name. */
    accent?: string;
    /** Opacity of the decorative quote mark (0.0–1.0, default: 0.5) */
    quoteMarkOpacity?: number;

    // ── Typography ─────────────────────────────────────────────────────────────
    /**
     * Font preset — selects a Google Font with full Unicode/Vietnamese support.
     * Options: bevietnampro | notosans | lato | merriweather | playfair | roboto | inter
     * Default: bevietnampro
     */
    font?: FontName;
    /** Quote content font size in px (12–60, default: 20) */
    fontSize?: number;
    /** Author name font size in px (10–48, default: auto = fontSize * 0.82) */
    authorSize?: number;
    /** Make quote content italic (default: true) */
    italic?: boolean;
    /** Make author name bold (default: true) */
    boldAuthor?: boolean;
    /** Extra letter-spacing for content in em (default: 0.01) */
    letterSpacing?: number;

    // ── Layout ─────────────────────────────────────────────────────────────────
    /** Image width in px (300–1200, default: 800) */
    width?: number;
    /** Card border radius in px (0–40, default: 12) */
    radius?: number;
    /** Inner padding in px (16–80, default: 40) */
    padding?: number;
    /** Left accent bar width in px (0–12, default: 4). Set 0 to hide. */
    borderWidth?: number;
    /** Show decorative opening quote mark (default: true) */
    showQuoteIcon?: boolean;
}

// ── Google Fonts registry ──────────────────────────────────────────────────
// Each entry: { importUrl, cssFamily }
// importUrl is the Google Fonts CSS2 URL that loads the woff2.
// Using display=swap for performance; subset=vietnamese+latin.
const GOOGLE_FONTS: Record<FontName, { importUrl: string; cssFamily: string }> = {
    bevietnampro: {
        importUrl:
            'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,700;1,400;1,700&display=swap',
        cssFamily: "'Be Vietnam Pro', sans-serif",
    },
    notosans: {
        importUrl:
            'https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400&display=swap',
        cssFamily: "'Noto Sans', sans-serif",
    },
    lato: {
        importUrl:
            'https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&display=swap',
        cssFamily: "'Lato', sans-serif",
    },
    merriweather: {
        importUrl:
            'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap',
        cssFamily: "'Merriweather', serif",
    },
    playfair: {
        importUrl:
            'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap',
        cssFamily: "'Playfair Display', serif",
    },
    roboto: {
        importUrl:
            'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400&display=swap',
        cssFamily: "'Roboto', sans-serif",
    },
    inter: {
        importUrl:
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
        cssFamily: "'Inter', sans-serif",
    },
};

// ── Theme presets ──────────────────────────────────────────────────────────
const THEMES: Record<ThemeName, { bg: string; color: string; accent: string; authorColor?: string }> = {
    dark: { bg: '0d1117', color: 'e6edf3', accent: '6366f1' },
    light: { bg: 'ffffff', color: '1f2937', accent: '6366f1' },
    ocean: { bg: '0f172a', color: 'bae6fd', accent: '38bdf8' },
    rose: { bg: '1c1917', color: 'fce7f3', accent: 'fb7185' },
    forest: { bg: '052e16', color: 'd1fae5', accent: '34d399' },
    sunset: { bg: '1c0a00', color: 'fef3c7', accent: 'f97316', authorColor: 'fbbf24' },
    mono: { bg: '18181b', color: 'd4d4d8', accent: 'a1a1aa' },
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Escape XML special characters for safe SVG text embedding */
function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Word-wrap for Vietnamese + Latin mixed text.
 * Vietnamese uses spaces between syllables, so splitting on space works well.
 * `maxChars` is an estimate; SVG text isn't pixel-perfect without canvas.
 */
function wordWrap(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxChars && current) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);
    return lines;
}

/** Normalise color: ensure it has a leading `#` */
function normalizeColor(raw: string): string {
    return raw.startsWith('#') ? raw : `#${raw}`;
}

/** Clamp a number between min and max */
function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

// ── Main render function ───────────────────────────────────────────────────

/**
 * Renders a quote as a complete SVG string.
 *
 * The SVG embeds a Google Fonts @import so Vietnamese and other Unicode
 * characters render correctly in browsers and GitHub READMEs.
 *
 * GitHub note: GitHub's image proxy (camo) fetches external resources, so
 * Google Fonts will load correctly when viewed on github.com.
 */
export function renderQuoteSVG(opts: QuoteImageOptions): string {
    // ── Resolve colors from theme + overrides ──
    const preset = THEMES[opts.theme ?? 'dark'];
    const bgColor = normalizeColor(opts.bg ?? preset.bg);
    const textColor = normalizeColor(opts.color ?? preset.color);
    const accentColor = normalizeColor(opts.accent ?? preset.accent);
    const authorColor = normalizeColor(opts.authorColor ?? preset.authorColor ?? preset.accent);

    // ── Resolve font ──
    const fontKey = opts.font ?? 'bevietnampro';
    const fontDef = GOOGLE_FONTS[fontKey] ?? GOOGLE_FONTS.bevietnampro;
    const cssFamily = fontDef.cssFamily;

    // ── Layout values ──
    const width = clamp(opts.width ?? 800, 300, 1200);
    const fontSize = clamp(opts.fontSize ?? 20, 12, 60);
    const radius = clamp(opts.radius ?? 12, 0, 40);
    const padding = clamp(opts.padding ?? 40, 16, 80);
    const borderWidth = clamp(opts.borderWidth ?? 4, 0, 12);
    const authorSize = clamp(opts.authorSize ?? Math.round(fontSize * 0.82), 10, 48);
    const letterSpacing = clamp(opts.letterSpacing ?? 0.01, -0.05, 0.2);
    const quoteMarkOpacity = clamp(opts.quoteMarkOpacity ?? 0.5, 0, 1);

    const italic = opts.italic !== false;  // default true
    const boldAuthor = opts.boldAuthor !== false;  // default true
    const showQuoteIcon = opts.showQuoteIcon !== false;  // default true

    // ── Text layout ──
    // Vietnamese syllables average ~2.5 px per char at fontSize 20;
    // scale factor 0.52 gives a reasonable estimate for line wrapping.
    const innerWidth = width - padding * 2 - (borderWidth > 0 ? borderWidth + 4 : 0);
    const charsPerLine = Math.max(10, Math.floor(innerWidth / (fontSize * 0.52)));

    const contentLines = wordWrap(escapeXml(opts.content), charsPerLine);
    const authorText = escapeXml(`— ${opts.author}`);

    const lineHeight = fontSize * 1.65;
    const quoteMarkSize = fontSize * 2.2;
    const quoteIconHeight = showQuoteIcon ? quoteMarkSize * 0.75 : 0;
    const topOffset = padding + quoteIconHeight;
    const contentHeight = contentLines.length * lineHeight;
    const authorBlockHeight = authorSize * 2.2;
    const totalHeight = topOffset + contentHeight + authorBlockHeight + padding;

    // ── SVG text content ──
    const contentSvgLines = contentLines
        .map(
            (line, i) =>
                `        <tspan x="${padding + (borderWidth > 0 ? borderWidth + 4 : 0)}" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`,
        )
        .join('\n');

    const contentX = padding + (borderWidth > 0 ? borderWidth + 4 : 0);
    const contentY = topOffset + fontSize; // baseline of first line
    const authorY = topOffset + contentHeight + authorSize * 1.6;

    return `<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}" height="${Math.ceil(totalHeight)}"
     viewBox="0 0 ${width} ${Math.ceil(totalHeight)}">

  <defs>
    <style>
      @import url('${fontDef.importUrl}');

      .q-bg {
        fill: ${bgColor};
      }
      .q-border {
        fill: ${accentColor};
      }
      .q-icon {
        font-family: ${cssFamily};
        font-size: ${quoteMarkSize}px;
        fill: ${accentColor};
        opacity: ${quoteMarkOpacity};
        user-select: none;
      }
      .q-content {
        font-family: ${cssFamily};
        font-size: ${fontSize}px;
        fill: ${textColor};
        font-style: ${italic ? 'italic' : 'normal'};
        font-weight: 400;
        letter-spacing: ${letterSpacing}em;
        dominant-baseline: hanging;
      }
      .q-author {
        font-family: ${cssFamily};
        font-size: ${authorSize}px;
        fill: ${authorColor};
        font-style: normal;
        font-weight: ${boldAuthor ? '700' : '400'};
      }
    </style>
  </defs>

  <!-- Card background -->
  <rect class="q-bg"
    width="${width}" height="${Math.ceil(totalHeight)}"
    rx="${radius}" ry="${radius}" />

  ${borderWidth > 0 ? `<!-- Left accent border -->
  <rect class="q-border"
    x="0" y="${radius}"
    width="${borderWidth}" height="${Math.ceil(totalHeight) - radius * 2}"
    rx="${Math.min(borderWidth / 2, 3)}" />` : '<!-- border hidden -->'}

  ${showQuoteIcon ? `<!-- Decorative opening quote mark -->
  <text class="q-icon"
    x="${contentX}" y="${padding + quoteMarkSize * 0.55}"
    dominant-baseline="auto">\u201C</text>` : ''}

  <!-- Quote content -->
  <text class="q-content" x="${contentX}" y="${contentY}">
${contentSvgLines}
  </text>

  <!-- Author -->
  <text class="q-author"
    x="${width - padding}" y="${authorY}"
    text-anchor="end">${authorText}</text>

</svg>`.trim();
}

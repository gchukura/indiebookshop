/**
 * Shared Open Graph card (1200×630) for the opengraph-image.tsx routes:
 * cream background, the book-stack mark, serif title, and an orange accent bar.
 * Fonts are the brand TTFs in public/fonts (static weights — next/og can't use
 * variable fonts).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { COLORS } from '@/lib/constants';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

const fontsDir = path.join(process.cwd(), 'public', 'fonts');

let fonts: Promise<Array<{ name: string; data: Buffer; weight: 400 | 700; style: 'normal' }>> | null = null;
function loadFonts() {
  fonts ??= Promise.all([
    readFile(path.join(fontsDir, 'LibreBaskerville-Bold.ttf')),
    readFile(path.join(fontsDir, 'OpenSans-Regular.ttf')),
  ]).then(([serif, sans]) => [
    { name: 'Libre Baskerville', data: serif, weight: 700 as const, style: 'normal' as const },
    { name: 'Open Sans', data: sans, weight: 400 as const, style: 'normal' as const },
  ]);
  return fonts;
}

/** The three-book stack from the logo, plus the site name. */
function Mark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ width: 64, height: 18, marginLeft: 10, background: COLORS.primary, borderRadius: 3 }} />
        <div style={{ width: 64, height: 18, marginLeft: 5, background: COLORS.accent, borderRadius: 3 }} />
        <div style={{ width: 64, height: 18, background: COLORS.secondary, borderRadius: 3 }} />
      </div>
      <div style={{ display: 'flex', fontFamily: 'Libre Baskerville', fontSize: 34, color: COLORS.primary }}>
        <span>Indie</span>
        <span style={{ color: COLORS.accent }}>Book</span>
        <span>Shop</span>
        <span style={{ fontFamily: 'Open Sans', fontSize: 24, color: COLORS.secondary, marginLeft: 4, marginTop: 10 }}>.com</span>
      </div>
    </div>
  );
}

type OgCardProps = {
  /** Small line above the title, e.g. "Independent bookshop". */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Bottom line, e.g. "★ 4.8 · 1,195 Google reviews". */
  footer?: string;
};

/** Title size steps down for long names so they fit on two or three lines. */
function titleSize(title: string): number {
  if (title.length <= 28) return 76;
  if (title.length <= 48) return 64;
  if (title.length <= 70) return 54;
  return 46;
}

export async function ogCard({ eyebrow, title, subtitle, footer }: OgCardProps): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: COLORS.cream,
          padding: '64px 80px',
          fontFamily: 'Open Sans',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, background: COLORS.accent }} />
        <Mark />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {eyebrow && (
            <div style={{ fontSize: 28, color: COLORS.secondary, textTransform: 'uppercase', letterSpacing: 3 }}>{eyebrow}</div>
          )}
          <div style={{ fontFamily: 'Libre Baskerville', fontSize: titleSize(title), lineHeight: 1.15, color: COLORS.primary }}>
            {title}
          </div>
          {subtitle && <div style={{ fontSize: 36, color: '#4b5563' }}>{subtitle}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 120, height: 8, background: COLORS.accent, borderRadius: 4 }} />
          {footer && <div style={{ fontSize: 30, color: COLORS.primary }}>{footer}</div>}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts() }
  );
}

// Scalloped wax-seal outlines (14 lobes), generated once; the halo separates the seal from the sheet.
const SEAL_HALO = "M44.49 32.62Q46.00 31.50 47.51 32.62Q49.03 33.74 50.88 33.39Q52.73 33.03 53.60 34.70Q54.48 36.37 56.30 36.85Q58.12 37.34 58.19 39.22Q58.25 41.10 59.68 42.33Q61.11 43.55 60.36 45.28Q59.60 47.00 60.36 48.72Q61.11 50.45 59.68 51.67Q58.25 52.90 58.19 54.78Q58.12 56.66 56.30 57.15Q54.48 57.63 53.60 59.30Q52.73 60.97 50.88 60.61Q49.03 60.26 47.51 61.38Q46.00 62.50 44.49 61.38Q42.97 60.26 41.12 60.61Q39.27 60.97 38.40 59.30Q37.52 57.63 35.70 57.15Q33.88 56.66 33.81 54.78Q33.75 52.90 32.32 51.67Q30.89 50.45 31.64 48.72Q32.40 47.00 31.64 45.28Q30.89 43.55 32.32 42.33Q33.75 41.10 33.81 39.22Q33.88 37.34 35.70 36.85Q37.52 36.37 38.40 34.70Q39.27 33.03 41.12 33.39Q42.97 33.74 44.49 32.62Z"
const SEAL = "M44.78 35.34Q46.00 34.40 47.22 35.34Q48.45 36.28 49.96 35.96Q51.47 35.65 52.16 37.02Q52.86 38.40 54.35 38.77Q55.85 39.14 55.88 40.69Q55.91 42.23 57.10 43.21Q58.28 44.20 57.64 45.60Q57.00 47.00 57.64 48.40Q58.28 49.80 57.10 50.79Q55.91 51.77 55.88 53.31Q55.85 54.86 54.35 55.23Q52.86 55.60 52.16 56.98Q51.47 58.35 49.96 58.04Q48.45 57.72 47.22 58.66Q46.00 59.60 44.78 58.66Q43.55 57.72 42.04 58.04Q40.53 58.35 39.84 56.98Q39.14 55.60 37.65 55.23Q36.15 54.86 36.12 53.31Q36.09 51.77 34.90 50.79Q33.72 49.80 34.36 48.40Q35.00 47.00 34.36 45.60Q33.72 44.20 34.90 43.21Q36.09 42.23 36.12 40.69Q36.15 39.14 37.65 38.77Q39.14 38.40 39.84 37.02Q40.53 35.65 42.04 35.96Q43.55 36.28 44.78 35.34Z"

/**
 * The mark: a notice with one line redacted, sealed. Drawn with theme tokens so it follows dark mode;
 * the standalone files (src/app/icon.svg, public/logo.svg) use the light palette.
 */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="10" y="6" width="31" height="43" rx="4" fill="var(--card)" stroke="var(--ink)" strokeWidth="4" />
      <path d="M14.5 14H36.5" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="14" y="19" width="23" height="7.5" rx="1.2" fill="var(--ink)" />
      <path d="M14.5 32H27.7" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" />
      <path d={SEAL_HALO} fill="var(--bg)" />
      <path d={SEAL} fill="var(--accent)" />
      <path d="M41 47.3l3.4 3.4l6.6-6.8" fill="none" stroke="var(--card)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Génère l'image d'aperçu de partage (Open Graph) 1200×630 → public/og.jpg
// Lancer : node scripts/gen-og.mjs
import sharp from 'sharp'

const W = 1200
const H = 630

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="78%" cy="18%" r="65%">
      <stop offset="0%" stop-color="#c9a84c" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#c9a84c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="or" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e8c766"/>
      <stop offset="100%" stop-color="#c9a84c"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#111111"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="28"
        fill="none" stroke="#ffffff" stroke-opacity="0.10" stroke-width="2"/>

  <!-- ciseaux -->
  <g transform="translate(96,150) scale(5.0)" fill="none" stroke="url(#or)"
     stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="6" cy="6" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <path d="M20 4 8.12 15.88"/>
    <path d="M14.47 14.48 20 20"/>
    <path d="M8.12 8.12 12 12"/>
  </g>

  <!-- wordmark -->
  <text x="96" y="400" font-family="Arial, Helvetica, sans-serif" font-size="118"
        font-weight="800" letter-spacing="4" fill="#ffffff">BARBER<tspan fill="url(#or)">95</tspan></text>

  <!-- tagline -->
  <text x="100" y="462" font-family="Arial, Helvetica, sans-serif" font-size="34"
        font-weight="500" fill="#cfcfcf">Coiffeur barbier · Val-d'Oise (95)</text>

  <!-- pill CTA -->
  <g transform="translate(100,512)">
    <rect width="430" height="64" rx="32" fill="url(#or)"/>
    <text x="215" y="42" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
          font-size="27" font-weight="700" letter-spacing="1" fill="#1a1a1a">Réserve ta coupe en ligne</text>
  </g>
</svg>`

await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile('public/og.jpg')
console.log('✓ public/og.jpg (1200×630)')

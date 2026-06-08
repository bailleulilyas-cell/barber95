// Génère les icônes PNG depuis public/icon.svg (pour l'installation PWA fiable).
// Lancer : node scripts/gen-icons.mjs
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/icon.svg')
const tailles = [
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['public/icon-180.png', 180],
]

for (const [out, size] of tailles) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out)
  console.log('✓', out)
}

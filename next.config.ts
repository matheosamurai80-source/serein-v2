import type { NextConfig } from 'next'

const config: NextConfig = {
  async redirects() {
    // PanierMalin est hébergé en statique dans public/paniermalin/ ;
    // Next ne résout pas index.html sur un dossier, d'où cette redirection.
    return [
      { source: '/paniermalin', destination: '/paniermalin/index.html', permanent: false },
    ]
  },
}

export default config

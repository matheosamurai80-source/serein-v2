import type { NextConfig } from 'next'

const config: NextConfig = {
  // `pdf-parse` lit des fichiers à l'exécution : on le garde externe au bundle
  // (secours serveur de lecture PDF, quand pdf.js échoue côté navigateur mobile).
  serverExternalPackages: ['pdf-parse'],
  async redirects() {
    // PanierMalin est hébergé en statique dans public/paniermalin/ ;
    // Next ne résout pas index.html sur un dossier, d'où cette redirection.
    return [
      { source: '/paniermalin', destination: '/paniermalin/index.html', permanent: false },
    ]
  },
}

export default config

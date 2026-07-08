import { LegalPage } from '@/components/legal'

export const metadata = { title: 'Mentions légales — Serein & PanierMalin' }

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales" updated="5 juillet 2026">
      <h2>Éditeur</h2>
      <p>
        Serein et PanierMalin sont édités par <strong>Julien Peltier</strong>, entrepreneur
        individuel (France).<br />
        Contact : <a href="mailto:julienpeltier60@gmail.com">julienpeltier60@gmail.com</a><br />
        <em>[Numéro SIREN/SIRET et adresse professionnelle à compléter avant ouverture commerciale.]</em>
      </p>

      <h2>Hébergement</h2>
      <ul>
        <li><strong>Site :</strong> Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com</li>
        <li><strong>Données :</strong> Supabase (projet hébergé en Union européenne, région Irlande) — supabase.com</li>
        <li><strong>Analyse documentaire :</strong> Mistral (traitement des documents soumis, Union européenne) — <em>[À COMPLÉTER : entité juridique et adresse]</em></li>
      </ul>

      <h2>Nature du service</h2>
      <p>
        Serein est un outil d&apos;<strong>information et d&apos;organisation</strong> : il détecte des
        abonnements, calcule des échéances, rappelle des dates et génère des courriers types.
        Il n&apos;exécute <strong>aucune démarche</strong> à la place de l&apos;utilisateur, ne prend
        aucun mandat, ne perçoit aucune commission d&apos;aucun fournisseur, et ne fournit ni
        conseil en assurance ni intermédiation au sens du Code des assurances — c&apos;est toujours
        l&apos;utilisateur qui décide et qui envoie. Les tarifs d&apos;offres tierces affichés sont indicatifs et à vérifier auprès
        des fournisseurs concernés.
      </p>
      <p>
        PanierMalin affiche des informations nutritionnelles issues de la base publique
        Open Food Facts (licence ouverte) ; elles sont fournies à titre indicatif.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les noms, marques et logos de tiers cités (Orange, Free, Netflix, EDF…) appartiennent à
        leurs propriétaires respectifs et ne sont mentionnés qu&apos;à titre d&apos;identification.
      </p>
    </LegalPage>
  )
}

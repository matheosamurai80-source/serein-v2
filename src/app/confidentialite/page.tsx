import { LegalPage } from '@/components/legal'

export const metadata = { title: 'Confidentialité — Serein & PanierMalin' }

// Chaque section décrit le comportement RÉEL du code — si le code change,
// cette page doit changer dans la même livraison.

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updated="5 juillet 2026">
      <p>
        Serein et PanierMalin sont conçus « local d&apos;abord » : par défaut, vos données restent
        sur votre appareil. Cette page décrit précisément ce qui reste local, ce qui est stocké
        sur nos serveurs, et pourquoi.
      </p>

      <h2>Serein — Analyse de relevé</h2>
      <p>
        L&apos;analyse d&apos;un relevé bancaire (PDF ou texte collé) s&apos;exécute <strong>entièrement dans
        votre navigateur</strong>. Le fichier n&apos;est jamais téléversé : aucune transaction, aucun
        montant, aucun libellé ne quitte votre appareil.
      </p>

      <h2>Serein — Mode sans compte</h2>
      <p>
        Sans compte, vos engagements, rappels et lettres sont enregistrés dans le stockage local
        de votre navigateur (localStorage), sur cet appareil uniquement. Rien n&apos;est transmis.
        Vous pouvez tout effacer depuis la page <a href="/compte">Mon compte</a>.
      </p>

      <h2>Serein — Compte et engagements</h2>
      <p>
        Si vous créez un compte (e-mail + mot de passe), vos engagements, rappels et lettres sont
        stockés chez notre sous-traitant <strong>Supabase</strong> (hébergement en Union européenne,
        région Irlande), afin de les retrouver sur tous vos appareils.
        <strong> Base légale :</strong> exécution du contrat (art. 6.1.b RGPD). Chaque ligne est
        protégée par des règles d&apos;accès strictes : seul votre compte peut lire vos données.
      </p>

      <h2>PanierMalin — Inventaire et liste de courses</h2>
      <p>
        L&apos;inventaire scanné, les prix saisis et la liste de courses sont enregistrés dans le
        stockage local de votre téléphone. Rien n&apos;est transmis, <strong>sauf</strong> si vous
        activez la <strong>Synchro famille</strong> : la liste (noms d&apos;articles, cases cochées —
        rien d&apos;autre) est alors stockée chez Supabase (UE) sous un <strong>code de partage
        aléatoire</strong>, sans lien avec votre identité (pas de compte, pas d&apos;e-mail, pas
        d&apos;identifiant d&apos;appareil). Toute personne disposant du code accède à la liste : ne le
        partagez qu&apos;avec votre famille. Désactiver la synchro (✕) suffit à s&apos;en détacher.
      </p>

      <h2>PanierMalin — Recherche produit</h2>
      <p>
        Lors d&apos;un scan, seul le <strong>code-barres</strong> du produit est envoyé à la base
        alimentaire publique <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Food Facts</a> pour
        récupérer la fiche (Nutri-Score, calories…). Aucune donnée personnelle n&apos;accompagne
        cette requête.
      </p>

      <h2>Sous-traitants</h2>
      <ul>
        <li><strong>Supabase</strong> (base de données et comptes) — hébergement Union européenne, région Irlande.</li>
        <li><strong>Vercel</strong> (hébergement du site) — diffusion des pages ; les journaux techniques standards du serveur peuvent inclure votre adresse IP.</li>
      </ul>
      <p>Aucune donnée n&apos;est vendue, louée ni partagée à des fins publicitaires. Aucun cookie de traçage publicitaire.</p>

      <h2>Vos droits (RGPD)</h2>
      <p>
        Vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de portabilité et
        d&apos;opposition. <strong>Effacement en autonomie :</strong> la page{' '}
        <a href="/compte">Mon compte</a> permet de supprimer définitivement votre compte et toutes
        les données liées (engagements, rappels, lettres) en une action — effet immédiat et
        irréversible. Pour toute autre demande :{' '}
        <a href="mailto:julienpeltier60@gmail.com">julienpeltier60@gmail.com</a> (réponse sous 30 jours).
        Vous pouvez aussi saisir la CNIL (cnil.fr).
      </p>
    </LegalPage>
  )
}

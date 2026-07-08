import { LegalPage } from '@/components/legal'

export const metadata = { title: 'Confidentialité — Serein & PanierMalin' }

// Chaque section décrit le traitement RÉEL des données. Le traitement des
// documents (relevés, contrats) passe par l'API Mistral (OCR/analyse, UE).
// Les éléments non arbitrés sont laissés en [À COMPLÉTER] visibles.

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updated="7 juillet 2026">
      <p>
        Cette page décrit quelles données sont traitées, où, et pourquoi. Nous n&apos;utilisons
        aucune donnée à des fins publicitaires et n&apos;installons aucun cookie de traçage
        publicitaire.
      </p>

      <h2>Serein — Analyse d&apos;un document (relevé, contrat)</h2>
      <p>
        Lorsque vous soumettez un document à analyser, il est <strong>transmis à notre
        sous-traitant Mistral</strong> pour en extraire le texte et détecter vos abonnements
        (service d&apos;analyse documentaire, traitement en Union européenne). Le résultat de
        l&apos;analyse vous est renvoyé, puis c&apos;est vous qui choisissez ce que vous ajoutez à votre
        suivi. <strong>Base légale :</strong> votre demande explicite d&apos;analyse (exécution du
        service à votre initiative).
      </p>
      <p>
        <em>[À COMPLÉTER : localisation précise du traitement Mistral, durée de conservation du
        document côté sous-traitant, et référence de l&apos;accord de sous-traitance (DPA).]</em>
      </p>

      <h2>Serein — Compte et engagements</h2>
      <p>
        Si vous créez un compte (e-mail + mot de passe), vos engagements, rappels et lettres
        sont stockés chez notre sous-traitant <strong>Supabase</strong> (hébergement en Union
        européenne, région Irlande), afin de les retrouver sur tous vos appareils.
        <strong> Base légale :</strong> exécution du contrat (art. 6.1.b RGPD). Des règles
        d&apos;accès strictes garantissent que seul votre compte lit vos données.
      </p>

      <h2>Serein — Sans compte</h2>
      <p>
        Sans compte, vos engagements, rappels et lettres sont enregistrés dans le stockage de
        votre navigateur (localStorage), sur cet appareil, et ne sont pas synchronisés sur nos
        serveurs. L&apos;analyse d&apos;un document, elle, passe toujours par le traitement décrit
        ci-dessus.
      </p>

      <h2>PanierMalin — Inventaire et liste de courses</h2>
      <p>
        L&apos;inventaire scanné, les prix saisis et la liste de courses sont enregistrés dans le
        stockage de votre téléphone. Ils ne sont pas transmis, <strong>sauf</strong> si vous
        activez la <strong>Synchro famille</strong> : la liste (noms d&apos;articles et cases
        cochées, rien d&apos;autre) est alors stockée chez Supabase (UE) sous un <strong>code de
        partage aléatoire</strong>, sans lien avec votre identité (pas de compte, pas d&apos;e-mail).
        Toute personne disposant du code accède à la liste : ne le partagez qu&apos;avec vos proches.
      </p>

      <h2>PanierMalin — Scan et lecture de ticket</h2>
      <p>
        Lors d&apos;un scan de code-barres, seul le <strong>code-barres</strong> est envoyé à la base
        alimentaire publique <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Food Facts</a> pour
        récupérer la fiche produit. La lecture d&apos;un ticket de caisse par photo s&apos;effectue dans
        votre navigateur ; l&apos;image n&apos;est pas envoyée à un serveur.
      </p>

      <h2>Sous-traitants</h2>
      <ul>
        <li><strong>Mistral</strong> — analyse des documents soumis (OCR / extraction). Traitement en Union européenne. <em>[À COMPLÉTER : entité juridique, localisation datacenter, DPA.]</em></li>
        <li><strong>Supabase</strong> — base de données et comptes, hébergement Union européenne (Irlande).</li>
        <li><strong>Vercel</strong> — hébergement du site ; les journaux techniques standards peuvent inclure votre adresse IP.</li>
      </ul>

      <h2>Vos droits (RGPD)</h2>
      <p>
        Vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de portabilité et
        d&apos;opposition. La page <a href="/compte">Mon compte</a> permet d&apos;exporter vos données
        (CSV) et de supprimer définitivement votre compte. Pour toute autre demande :{' '}
        <a href="mailto:julienpeltier60@gmail.com">julienpeltier60@gmail.com</a>. Vous pouvez
        aussi saisir la CNIL (cnil.fr).
      </p>
      <p>
        <em>[À COMPLÉTER : identité et coordonnées du responsable de traitement, éventuel DPO,
        et délai de réponse aux demandes.]</em>
      </p>
    </LegalPage>
  )
}

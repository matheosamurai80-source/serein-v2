import { LegalPage } from '@/components/legal'

export const metadata = { title: 'CGU — Serein & PanierMalin' }

export default function CguPage() {
  return (
    <LegalPage title="Conditions générales d'utilisation" updated="5 juillet 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions encadrent l&apos;utilisation de Serein (suivi d&apos;engagements
        récurrents, rappels, lettres de résiliation, analyse de relevés) et de PanierMalin
        (scan de produits, comparaison nutritionnelle et de prix, listes de courses), accessibles
        depuis une même adresse. L&apos;utilisation des services vaut acceptation de ces conditions.
      </p>

      <h2>2. Gratuité actuelle</h2>
      <p>
        Les services sont aujourd&apos;hui proposés gratuitement, en phase de construction. À terme,
        un abonnement unique pourra couvrir plusieurs services activables à la demande ; toute
        évolution tarifaire sera annoncée clairement et n&apos;aura jamais d&apos;effet rétroactif.
      </p>

      <h2>3. Compte</h2>
      <p>
        Le compte est facultatif : les services fonctionnent sans compte, avec des données
        enregistrées sur votre appareil. Le compte (e-mail + mot de passe) sert uniquement à
        retrouver ses données sur plusieurs appareils. Vous êtes responsable de la
        confidentialité de votre mot de passe. La suppression du compte (page Mon compte) est
        immédiate et irréversible.
      </p>

      <h2>4. Rôle et limites du service</h2>
      <ul>
        <li>Serein <strong>informe et prépare</strong> : détection, calculs d&apos;échéances, courriers types. Il n&apos;envoie rien, ne résilie rien et ne souscrit rien à votre place.</li>
        <li>Les régimes légaux (Hamon, Chatel, télécom, énergie) sont appliqués selon les informations que vous saisissez ; vérifiez les dates et adresses sur vos contrats et factures avant tout envoi.</li>
        <li>Les tarifs d&apos;offres tierces sont indicatifs, sans engagement de notre part, et aucun partenariat rémunéré n&apos;influence leur affichage.</li>
        <li>Les informations nutritionnelles de PanierMalin proviennent d&apos;Open Food Facts et peuvent comporter des erreurs ou lacunes.</li>
      </ul>

      <h2>5. Responsabilité</h2>
      <p>
        Les services sont fournis « en l&apos;état ». Nous ne saurions être tenus responsables des
        conséquences d&apos;une résiliation, d&apos;un changement de fournisseur ou d&apos;une décision d&apos;achat
        prises par l&apos;utilisateur, ni d&apos;une indisponibilité temporaire du service. Rien dans les
        services ne constitue un conseil financier, juridique ou en assurance personnalisé.
      </p>

      <h2>6. Synchro famille (PanierMalin)</h2>
      <p>
        Le code de partage donne accès à la liste à quiconque le détient : vous êtes responsable
        des personnes à qui vous le transmettez. N&apos;y inscrivez pas d&apos;informations sensibles.
      </p>

      <h2>7. Droit applicable</h2>
      <p>Droit français. En cas de litige, une solution amiable sera recherchée avant toute action.</p>
    </LegalPage>
  )
}

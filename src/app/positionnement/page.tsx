import { LegalPage } from '@/components/legal'

export const metadata = { title: 'Notre positionnement — Serein' }

// Page de positionnement : la différence de fond avec les services qui
// résilient à la place de l'utilisateur. Texte uniquement, aucune logique.

export default function PositionnementPage() {
  return (
    <LegalPage title="Notre positionnement" updated="7 juillet 2026">
      <p>
        Serein vous <strong>arme</strong>, il n&apos;agit pas à votre place. Nous détectons vos
        abonnements et contrats, nous vous prévenons avant chaque fenêtre de résiliation, et
        nous préparons pour vous la lettre à envoyer. <strong>C&apos;est vous qui décidez, c&apos;est
        vous qui envoyez.</strong> À aucun moment nous ne contactons un fournisseur en votre nom.
      </p>

      <h2>Deux façons d&apos;aider — deux modèles opposés</h2>
      <p>
        Des services comme <strong>Papernest</strong> ou <strong>Ideel</strong> agissent
        <strong> à votre place</strong> : vous leur donnez mandat, et ils contactent le
        fournisseur pour résilier en votre nom. C&apos;est pratique, mais vous confiez à un tiers
        le pouvoir d&apos;agir sur vos contrats.
      </p>
      <p>
        Serein fait le choix inverse. Nous vous donnons l&apos;information, l&apos;échéance et la lettre
        prête ; <strong>la décision et l&apos;envoi restent entre vos mains.</strong> Vous ne signez
        aucun mandat, vous ne déléguez rien.
      </p>

      <h2>Pourquoi ce choix</h2>
      <ul>
        <li><strong>Vous gardez le contrôle.</strong> Rien ne part sans votre geste.</li>
        <li><strong>Neutralité.</strong> Nous ne percevons aucune commission d&apos;aucun fournisseur : ce que nous vous montrons n&apos;est pas orienté par un partenariat rémunéré.</li>
        <li><strong>Un cadre clair.</strong> Comme nous n&apos;agissons pas pour vous et ne prenons pas de mandat, Serein reste un outil d&apos;information et d&apos;organisation — il ne fournit ni conseil en assurance ni intermédiation au sens du Code des assurances.</li>
      </ul>

      <h2>Ce que Serein fait, et ne fait pas</h2>
      <ul>
        <li>✅ Détecter vos abonnements à partir d&apos;un relevé que vous fournissez.</li>
        <li>✅ Calculer les échéances et vous rappeler avant la fenêtre de résiliation.</li>
        <li>✅ Préparer la lettre de résiliation adaptée au régime légal applicable.</li>
        <li>✅ Vous indiquer des offres de référence du marché, à titre informatif.</li>
        <li>❌ Résilier à votre place.</li>
        <li>❌ Signer ou envoyer quoi que ce soit en votre nom.</li>
        <li>❌ Prendre un mandat sur vos contrats.</li>
      </ul>

      <p className="!text-ink font-semibold">
        Serein veille. Vous décidez. Vous envoyez.
      </p>
    </LegalPage>
  )
}

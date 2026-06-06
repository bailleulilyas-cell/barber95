import Reveal from '../../components/Reveal/Reveal'
import { Footer } from '../../components/Layout'
import { SITE } from '../../config'
import styles from './Legal.module.css'

export default function Legal({ type }) {
  const mentions = type === 'mentions'
  return (
    <main className="page">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">{SITE.nom}</span>
          <h1 className={styles.titre}>{mentions ? 'Mentions légales' : 'Confidentialité'}</h1>
        </Reveal>

        <Reveal delay={80} className={styles.corps}>
          {mentions ? <Mentions /> : <Confidentialite />}
          <p className={styles.maj}>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}.</p>
        </Reveal>

        <Footer />
      </div>
    </main>
  )
}

function Mentions() {
  return (
    <>
      <h2>Éditeur du site</h2>
      <p>
        Le site <strong>{SITE.nom}</strong> est édité par Adam [NOM À COMPLÉTER], coiffeur barbier
        en {SITE.zone}.
        <br />
        Statut : [auto-entrepreneur / société — à compléter] · SIRET : [à compléter]
        <br />
        Contact : [email de contact à compléter]
      </p>

      <h2>Hébergement</h2>
      <p>
        Site hébergé par <strong>Vercel Inc.</strong> — 340 S Lemon Ave #4133, Walnut, CA 91789,
        États-Unis.
        <br />
        Base de données et authentification : <strong>Supabase</strong>. Médias :{' '}
        <strong>Cloudinary</strong>. Emails : <strong>Resend</strong>.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L’ensemble des contenus (textes, photos, identité visuelle) est la propriété de {SITE.nom},
        sauf mention contraire. Toute reproduction sans autorisation est interdite.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans la{' '}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>
    </>
  )
}

function Confidentialite() {
  return (
    <>
      <p>
        {SITE.nom} attache de l’importance à la protection de tes données. Cette page explique
        quelles données sont collectées et comment elles sont utilisées.
      </p>

      <h2>Données collectées</h2>
      <p>
        Lors de la connexion (via Google) et de la prise de rendez-vous, nous collectons :
        prénom, adresse e-mail, numéro de téléphone, ainsi que l’historique de tes rendez-vous et
        tes points de fidélité.
      </p>

      <h2>Finalités</h2>
      <p>
        Ces données servent uniquement à : gérer tes réservations, t’envoyer les confirmations et
        rappels par e-mail, faire fonctionner le programme de fidélité et afficher tes avis (si tu
        en laisses). Elles ne sont ni revendues ni transmises à des tiers à des fins commerciales.
      </p>

      <h2>Sous-traitants</h2>
      <p>
        Tes données sont stockées chez <strong>Supabase</strong> (hébergement base de données, UE)
        et les e-mails sont envoyés via <strong>Resend</strong>. L’authentification est gérée par
        <strong> Google</strong>.
      </p>

      <h2>Durée de conservation</h2>
      <p>
        Tes données sont conservées tant que ton compte est actif. Tu peux demander leur suppression
        à tout moment.
      </p>

      <h2>Tes droits</h2>
      <p>
        Conformément au RGPD, tu disposes d’un droit d’accès, de rectification et de suppression de
        tes données. Pour l’exercer, contacte Adam à [email de contact à compléter].
      </p>
    </>
  )
}

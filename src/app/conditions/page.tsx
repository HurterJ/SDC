import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { List, Section, ToComplete } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions générales d'utilisation de SiteSuivi, le suivi des réserves de chantier.",
}

const linkClass = 'text-blue-700 underline underline-offset-2 hover:text-blue-800'

export default function ConditionsPage() {
  return (
    <LegalPage title="Conditions générales d'utilisation" updatedAt="18 octobre 2026">
      <Section title="1. Objet">
        <p>
          Les présentes conditions régissent l&apos;utilisation de SiteSuivi, service de suivi des
          réserves et observations de chantier exploité par{' '}
          <ToComplete>nom ou raison sociale de l&apos;exploitant</ToComplete> (ci-après
          « l&apos;exploitant »). Utiliser le service vaut acceptation de ces conditions.
        </p>
      </Section>

      <Section title="2. Accès au service">
        <List>
          <li>
            L&apos;accès se fait <strong>sur invitation</strong> : les comptes sont créés par
            l&apos;exploitant ou par un administrateur qu&apos;il désigne.
          </li>
          <li>
            Les installateurs accèdent au service par un <strong>lien personnel</strong> créé par le
            conducteur de travaux. Ce lien contient une clé secrète : il ne doit pas être transmis à
            un tiers. Le conducteur peut le désactiver ou lui fixer une date d&apos;expiration.
          </li>
          <li>
            Chaque utilisateur garde son mot de passe confidentiel et signale sans délai toute
            utilisation non autorisée de son compte ou de son lien.
          </li>
        </List>
      </Section>

      <Section title="3. Utilisation autorisée">
        <p>Le service est destiné à un usage professionnel. Il est notamment interdit :</p>
        <List>
          <li>de publier des contenus illicites, injurieux ou sans rapport avec le chantier ;</li>
          <li>d&apos;enregistrer des données personnelles qui ne sont pas utiles au suivi du chantier ;</li>
          <li>de tenter d&apos;accéder à des projets ou des données auxquels on n&apos;a pas été invité ;</li>
          <li>de perturber le service, par exemple par des envois automatisés ou massifs.</li>
        </List>
      </Section>

      <Section title="4. Contenus des utilisateurs">
        <p>
          Chaque utilisateur reste responsable des contenus qu&apos;il envoie (observations,
          commentaires, photos, plans) et garantit disposer des droits nécessaires, notamment sur
          les photos où apparaissent des personnes. Il autorise l&apos;exploitant à héberger et
          afficher ces contenus aux membres du projet concerné, dans le seul but de fournir le
          service.
        </p>
      </Section>

      <Section title="5. Aide à la rédaction par intelligence artificielle">
        <p>
          Les propositions de rédaction sont générées automatiquement et peuvent être inexactes ou
          incomplètes. Elles doivent être relues avant d&apos;être enregistrées et ne remplacent pas
          l&apos;appréciation d&apos;un professionnel du bâtiment.
        </p>
      </Section>

      <Section title="6. Exports">
        <p>
          Les exports Excel et PDF reflètent les données au moment où ils sont produits. Avant de les
          utiliser dans un cadre contractuel, par exemple un procès-verbal de réception,
          l&apos;utilisateur vérifie qu&apos;ils sont exacts et complets.
        </p>
      </Section>

      <Section title="7. Disponibilité">
        <p>
          L&apos;exploitant s&apos;efforce d&apos;assurer un service disponible et sécurisé, sans
          garantir un fonctionnement ininterrompu. Des interruptions peuvent survenir pour la
          maintenance ou en cas de panne d&apos;un prestataire. Il est recommandé
          d&apos;exporter régulièrement les données importantes.
        </p>
      </Section>

      <Section title="8. Responsabilité">
        <p>
          Dans les limites autorisées par la loi, l&apos;exploitant n&apos;est pas responsable des
          dommages indirects ni des décisions de chantier prises sur la base des données du service.
          La responsabilité pour dol ou faute grave demeure réservée (art. 100 CO).
        </p>
      </Section>

      <Section title="9. Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans la{' '}
          <Link href="/confidentialite" className={linkClass}>
            politique de confidentialité
          </Link>
          .
        </p>
      </Section>

      <Section title="10. Suspension et fin de l'accès">
        <p>
          L&apos;exploitant peut suspendre ou supprimer un accès en cas de non-respect des présentes
          conditions. Un utilisateur peut demander à tout moment la fermeture de son compte.
        </p>
      </Section>

      <Section title="11. Modifications">
        <p>
          Ces conditions peuvent évoluer. La version en vigueur est celle publiée sur cette page, avec
          sa date de mise à jour.
        </p>
      </Section>

      <Section title="12. Droit applicable et for">
        <p>
          Les présentes conditions sont soumises au droit suisse. Le for est à{' '}
          <ToComplete>ville du siège de l&apos;exploitant</ToComplete>, sous réserve des fors
          impératifs prévus par la loi.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          <ToComplete>adresse email de contact</ToComplete>
        </p>
      </Section>
    </LegalPage>
  )
}

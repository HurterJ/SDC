import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { List, Section, ToComplete } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Données personnelles traitées par SiteSuivi, finalités, sous-traitants et droits des personnes concernées (nLPD).',
}

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="18 octobre 2026">
      <p>
        Cette politique explique quelles données personnelles SiteSuivi traite, pourquoi, avec qui
        elles sont partagées et quels sont vos droits. Elle s&apos;appuie sur la loi fédérale sur la
        protection des données (nLPD) et son ordonnance (OPDo).
      </p>

      <Section title="1. Responsable du traitement">
        <p>
          <ToComplete>nom ou raison sociale de l&apos;exploitant</ToComplete>
          <br />
          <ToComplete>adresse postale</ToComplete>
          <br />
          Contact pour toute question sur vos données : <ToComplete>adresse email</ToComplete>
        </p>
      </Section>

      <Section title="2. Données traitées">
        <List>
          <li>
            <strong>Comptes utilisateurs</strong> (conducteurs de travaux et membres des projets) :
            adresse email, nom, rôle dans chaque projet. Le mot de passe n&apos;est jamais stocké en
            clair : seule une empreinte chiffrée est conservée par le service d&apos;authentification.
          </li>
          <li>
            <strong>Données de chantier</strong> : projets (nom, description, adresse), plans,
            observations et réserves (titre, description, catégorie, priorité, statut, échéance,
            position sur le plan), photos et commentaires.
          </li>
          <li>
            <strong>Installateurs invités par lien</strong> : nom et entreprise saisis par le
            conducteur de travaux à la création du lien, ainsi que les commentaires, photos et
            changements de statut envoyés depuis ce lien. Les photos peuvent montrer des personnes
            ou des lieux privés : n&apos;envoyez que ce qui est utile au suivi du chantier.
          </li>
          <li>
            <strong>Données techniques</strong> : cookies de session (voir point 7) et journaux
            techniques de l&apos;hébergeur (adresse IP, date et page demandée), conservés{' '}
            <ToComplete>durée, selon l&apos;hébergeur</ToComplete>.
          </li>
        </List>
      </Section>

      <Section title="3. Finalités">
        <List>
          <li>fournir le service de suivi des réserves et observations de chantier ;</li>
          <li>authentifier les utilisateurs et protéger l&apos;accès aux projets ;</li>
          <li>permettre les échanges entre conducteurs de travaux et installateurs ;</li>
          <li>produire les exports Excel et PDF demandés par les utilisateurs ;</li>
          <li>proposer, à la demande, une aide à la rédaction par intelligence artificielle (point 4).</li>
        </List>
        <p>
          Les données ne sont ni vendues, ni utilisées à des fins publicitaires, ni utilisées pour
          établir des profils.
        </p>
      </Section>

      <Section title="4. Aide à la rédaction par intelligence artificielle">
        <p>
          Lorsque vous demandez une proposition de rédaction (création d&apos;une observation ou
          suggestion de réponse), le texte concerné est envoyé à Anthropic PBC (États-Unis) : la
          description saisie ou le titre, la description et les commentaires de l&apos;observation,
          avec le nom de leur auteur. Les photos ne sont pas envoyées. Selon ses conditions
          commerciales, Anthropic n&apos;utilise pas les données reçues via son API pour entraîner ses
          modèles.
        </p>
        <p>
          La proposition générée doit être relue et validée par une personne avant
          d&apos;être enregistrée : aucune décision n&apos;est prise de manière automatisée.
        </p>
      </Section>

      <Section title="5. Destinataires et sous-traitants">
        <List>
          <li>
            <strong>Supabase</strong> : base de données, authentification et stockage des fichiers.
            Les données sont hébergées dans la région eu-north-1 (Stockholm, Suède).
          </li>
          <li>
            <strong>Anthropic</strong> : aide à la rédaction par IA, uniquement à la demande (point 4).
          </li>
          <li>
            <strong>Hébergement de l&apos;application</strong> : <ToComplete>nom de l&apos;hébergeur et pays</ToComplete>.
          </li>
        </List>
        <p>
          Au sein du service, les membres d&apos;un projet voient les données de ce projet. Un
          installateur ne voit que les observations du projet auquel son lien donne accès.
        </p>
      </Section>

      <Section title="6. Communication de données à l'étranger">
        <p>
          La Suède fait partie des États dont le Conseil fédéral reconnaît le niveau de protection
          adéquat (annexe 1 OPDo). Pour les États-Unis, la communication à Anthropic repose sur{' '}
          <ToComplete>
            la certification Swiss-U.S. Data Privacy Framework du destinataire ou des clauses
            contractuelles types reconnues par le PFPDT
          </ToComplete>
          .
        </p>
      </Section>

      <Section title="7. Cookies et stockage local">
        <p>
          SiteSuivi n&apos;utilise que des cookies strictement nécessaires à son fonctionnement : les
          cookies de session du service d&apos;authentification (<code>sb-…-auth-token</code>), qui
          vous gardent connecté. Il n&apos;y a ni cookie publicitaire, ni outil de mesure
          d&apos;audience, ni traceur tiers ; aucun consentement n&apos;est donc demandé.
        </p>
        <p>
          L&apos;application installable enregistre aussi certaines pages dans le cache de votre
          navigateur pour fonctionner avec un réseau faible sur le chantier. Ce cache reste sur votre
          appareil et s&apos;efface avec les données du site.
        </p>
      </Section>

      <Section title="8. Durée de conservation">
        <p>
          Les données d&apos;un projet sont conservées tant que le projet existe, puis{' '}
          <ToComplete>durée de conservation après la fin du chantier</ToComplete>. Un compte et ses
          données peuvent être supprimés sur demande. Les liens installateur peuvent être désactivés
          ou recevoir une date d&apos;expiration à tout moment.
        </p>
      </Section>

      <Section title="9. Sécurité">
        <p>
          Les échanges sont chiffrés (HTTPS). L&apos;accès aux données est restreint selon le rôle de
          chaque utilisateur dans le projet, et chaque lien installateur repose sur un jeton secret
          propre à la personne invitée.
        </p>
      </Section>

      <Section title="10. Vos droits">
        <p>Conformément à la nLPD, vous pouvez à tout moment :</p>
        <List>
          <li>demander quelles données vous concernant sont traitées (droit d&apos;accès) ;</li>
          <li>faire rectifier des données inexactes ;</li>
          <li>demander l&apos;effacement de vos données ou vous opposer à leur traitement ;</li>
          <li>recevoir vos données dans un format électronique courant ou les faire transmettre à un tiers.</li>
        </List>
        <p>
          Adressez votre demande au contact indiqué au point 1. Vous pouvez aussi saisir le Préposé
          fédéral à la protection des données et à la transparence (PFPDT), Feldeggweg 1, 3003 Berne,{' '}
          <a
            href="https://www.edoeb.admin.ch"
            className="text-blue-700 underline underline-offset-2 hover:text-blue-800"
            rel="noopener noreferrer"
            target="_blank"
          >
            www.edoeb.admin.ch
          </a>
          .
        </p>
      </Section>

      <Section title="11. Modifications">
        <p>
          Cette politique peut évoluer avec le service. La date de mise à jour figure en haut de la
          page. Voir aussi les{' '}
          <Link href="/conditions" className="text-blue-700 underline underline-offset-2 hover:text-blue-800">
            conditions d&apos;utilisation
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  )
}

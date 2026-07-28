<template>
  <LegalDocLayout
    kicker="Documents juridiques"
    title="CGU, CGV, confidentialité et cookies"
    subtitle="Conditions générales d'utilisation et de vente d'EcoBoty, édité par KHAORYS ESPORT. Les textes ci-dessous s'appliquent au site https://ecoboty.eu, au dashboard web et au bot Discord EcoBoty."
    updated="27 juillet 2026"
    version="2026-07-27"
    :toc="toc"
  >
    <template #links>
      <NuxtLink to="/mentions-legales">Mentions légales</NuxtLink>
      <NuxtLink to="/tarifs">Tarifs</NuxtLink>
    </template>

    <p class="doc-part" id="partie-cgu">Partie I — Conditions générales d'utilisation (CGU)</p>

    <article id="cgu-1" class="doc-section">
      <h2>1. Objet</h2>
      <p>
        Les présentes CGU définissent les conditions d'accès et d'utilisation d'EcoBoty, service en ligne
        (SaaS) édité par KHAORYS ESPORT, accessible via https://ecoboty.eu et via le bot Discord EcoBoty.
      </p>
      <p>
        Le Service permet la gestion d'une économie de serveur Discord : monnaie virtuelle, daily et streaks,
        gains automatiques, boutiques serveur et utilisateurs, inventaires, lootbox (Premium), jeux, logs,
        classements, espace membre web, intégration Twitch, succès et paramètres d'administration.
      </p>
    </article>

    <article id="cgu-2" class="doc-section">
      <h2>2. Définitions</h2>
      <ul>
        <li><strong>Service</strong> : l'ensemble des fonctionnalités EcoBoty (bot Discord, dashboard admin, espace membre).</li>
        <li><strong>Utilisateur</strong> : toute personne disposant d'un compte via Discord OAuth.</li>
        <li><strong>Administrateur</strong> : utilisateur disposant des droits de gestion d'un serveur Discord sur lequel le bot est présent.</li>
        <li><strong>Serveur</strong> : serveur Discord configuré avec EcoBoty.</li>
        <li><strong>Plan Free</strong> : accès gratuit avec fonctionnalités et quotas limités (voir page <NuxtLink to="/tarifs">Tarifs</NuxtLink>).</li>
        <li><strong>Plan Premium</strong> : abonnement payant par serveur Discord, avec fonctionnalités et quotas étendus.</li>
        <li><strong>Contenu administrateur</strong> : paramètres, articles de boutique, règles de gains, messages et configurations saisis par les administrateurs.</li>
        <li><strong>API tierces</strong> : services externes intégrés (Discord, Twitch, Stripe, Top.gg, etc.).</li>
      </ul>
    </article>

    <article id="cgu-3" class="doc-section">
      <h2>3. Acceptation et opposabilité</h2>
      <p>
        L'utilisation du Service implique l'acceptation pleine et entière des présentes CGU, des CGV (Partie II),
        de la <a href="#partie-rgpd">politique de confidentialité</a> et de la
        <a href="#partie-cookies">politique de cookies</a>.
      </p>
      <p>
        Lors de la souscription Premium, l'administrateur doit accepter les CGV et, le cas échéant, renoncer au
        droit de rétractation pour la partie de service déjà exécutée (voir CGV § 11). La version en vigueur est
        identifiable par la date de mise à jour en tête de document.
      </p>
    </article>

    <article id="cgu-4" class="doc-section">
      <h2>4. Compte et authentification Discord</h2>
      <h3>4.1 Conditions</h3>
      <p>
        L'utilisateur doit disposer de la capacité juridique pour contracter (ou de l'autorisation de son
        représentant légal). L'accès au dashboard nécessite une connexion via Discord OAuth.
      </p>
      <h3>4.2 Sécurité</h3>
      <p>
        L'utilisateur est responsable de la confidentialité de son compte Discord et de toute activité réalisée
        via le Service. Il doit informer sans délai <strong>contact@khaorys.com</strong> en cas de suspicion
        d'accès non autorisé.
      </p>
      <h3>4.3 Données échangées</h3>
      <p>
        En connectant Discord, vous autorisez l'échange des données techniques nécessaires (identifiant, pseudo,
        avatar, serveurs autorisés) selon les permissions accordées. Discord Inc. traite certaines données selon
        sa propre politique. Vous pouvez révoquer l'accès depuis Discord.
      </p>
    </article>

    <article id="cgu-5" class="doc-section">
      <h2>5. Rôles administrateur et membre</h2>
      <h3>5.1 Administrateur</h3>
      <p>
        L'administrateur configure l'économie, les boutiques, les jeux, les logs, l'interface membre et, le
        cas échéant, l'abonnement Premium du serveur. Il est responsable du traitement des données de ses
        membres dans le cadre de l'utilisation du Service (responsable conjoint ou autonome selon les cas, au
        sens du RGPD — voir politique de confidentialité).
      </p>
      <h3>5.2 Membre / joueur</h3>
      <p>
        Le membre accède à l'espace utilisateur web (activé par défaut, désactivable par l'administrateur),
        aux commandes Discord et aux fonctionnalités autorisées sur le serveur. Il n'est pas partie au contrat
        d'abonnement Premium souscrit par l'administrateur du serveur.
      </p>
    </article>

    <article id="cgu-6" class="doc-section">
      <h2>6. Intégration Twitch</h2>
      <p>
        Le Service peut proposer une liaison Twitch (OAuth, chat, EventSub, récompenses live). L'activation
        autorise l'échange des données techniques nécessaires. Twitch / Amazon appliquent leurs propres
        politiques. KHAORYS ESPORT n'est pas responsable des indisponibilités ou évolutions de Twitch.
      </p>
    </article>

    <article id="cgu-7" class="doc-section">
      <h2>7. Plan Free</h2>
      <p>L'offre Free permet d'utiliser un socle de fonctionnalités sans paiement, notamment :</p>
      <ul>
        <li>économie de base (monnaie, daily, gains automatiques de base) ;</li>
        <li>1 boutique serveur, 6 articles maximum par boutique ;</li>
        <li>jeu Coin Flip uniquement ;</li>
        <li>interface membre web activée par défaut (désactivable par l'administrateur) ;</li>
        <li>logs conservés 15 jours ;</li>
        <li>succès limités (5 uniques, 1 à paliers) ;</li>
        <li>pas de lootbox, multi-boutiques, jeux avancés, module Twitch complet, boutiques membres ni automatisations avancées.</li>
      </ul>
      <p>
        KHAORYS ESPORT peut faire évoluer le périmètre de l'offre Free avec information préalable sur le Site
        et la page <NuxtLink to="/tarifs">Tarifs</NuxtLink>.
      </p>
    </article>

    <article id="cgu-8" class="doc-section">
      <h2>8. Plan Premium</h2>
      <p>
        L'abonnement Premium est souscrit <strong>par serveur Discord</strong> (1 abonnement = 1 serveur).
        Il débloque notamment : multi-boutiques (jusqu'à 10), lootbox, jeux avancés, module Twitch complet,
        automatisations avancées, boutiques utilisateurs, logs étendus et quotas de succès supérieurs.
      </p>
      <p>
        Le détail des fonctionnalités est présenté sur la page <NuxtLink to="/tarifs">Tarifs</NuxtLink> et dans
        le dashboard (onglet Premium). En cas de fin d'abonnement, le contenu Premium existant est conservé mais
        peut être verrouillé (soft-lock) jusqu'à un nouveau passage en Premium — il n'est pas supprimé
        automatiquement.
      </p>
    </article>

    <article id="cgu-9" class="doc-section">
      <h2>9. Abonnements Stripe</h2>
      <p>
        Les abonnements payants sont souscrits en ligne via Stripe Checkout / Customer Portal. KHAORYS ESPORT
        ne stocke pas les numéros de carte bancaire. Le paiement est traité par Stripe Payments Europe Ltd
        (ou filiale applicable). Les conditions financières sont détaillées en Partie II (CGV).
      </p>
    </article>

    <article id="cgu-10" class="doc-section">
      <h2>10. Comportements interdits</h2>
      <p>Sont notamment interdits :</p>
      <ul>
        <li>toute tentative d'accès non autorisé, de contournement de sécurité ou d'intrusion ;</li>
        <li>l'utilisation du Service à des fins illicites, frauduleuses ou portant atteinte aux droits de tiers ;</li>
        <li>l'abus de l'économie (exploit, automatisation malveillante, contournement des quotas Free/Premium) ;</li>
        <li>le scraping massif, la surcharge volontaire des serveurs ou le partage de comptes ;</li>
        <li>la publication de contenus illicites, haineux ou portant atteinte à la vie privée via le Service.</li>
      </ul>
    </article>

    <article id="cgu-11" class="doc-section">
      <h2>11. Suspension et résiliation</h2>
      <p>
        KHAORYS ESPORT peut suspendre ou restreindre l'accès en cas de violation des CGU/CGV, d'impayé,
        de demande des autorités ou de menace pour la sécurité du Service. La suspension n'ouvre droit à aucun
        remboursement sauf disposition légale impérative.
      </p>
    </article>

    <article id="cgu-12" class="doc-section">
      <h2>12. Suppression de compte et données</h2>
      <p>
        L'utilisateur peut demander la suppression de ses données via <strong>contact@khaorys.com</strong>.
        L'administrateur reste responsable de la configuration de son serveur et de la résiliation de
        l'abonnement actif avant retrait du bot. Les délais de conservation sont précisés dans la politique
        de confidentialité.
      </p>
    </article>

    <article id="cgu-13" class="doc-section">
      <h2>13. Responsabilité</h2>
      <p>KHAORYS ESPORT est soumise à une obligation de moyens. Elle n'est notamment pas responsable :</p>
      <ul>
        <li>des contenus et règles configurés par les administrateurs de serveurs ;</li>
        <li>des décisions économiques prises au sein d'une communauté Discord ;</li>
        <li>des interruptions liées à la maintenance, à la force majeure ou aux tiers (Discord, Twitch, Stripe, hébergeur) ;</li>
        <li>des dommages indirects (perte de chance, d'image, etc.).</li>
      </ul>
      <p>
        En tout état de cause, la responsabilité de KHAORYS ESPORT est limitée aux sommes effectivement
        versées au titre des douze (12) derniers mois pour l'abonnement concerné, sauf faute lourde ou
        disposition légale impérative.
      </p>
    </article>

    <article id="cgu-14" class="doc-section">
      <h2>14. Propriété intellectuelle</h2>
      <p>
        Le Service, sa documentation, son code et sa charte graphique restent la propriété de KHAORYS ESPORT
        ou de ses concédants. L'utilisateur bénéficie d'un droit d'utilisation personnel, non exclusif et
        révocable, pour la durée du compte et selon le plan souscrit. Les administrateurs conservent leurs
        droits sur les contenus qu'ils configurent et accordent une licence limitée nécessaire au
        fonctionnement du Service.
      </p>
    </article>

    <article id="cgu-15" class="doc-section">
      <h2>15. Modification des CGU</h2>
      <p>
        KHAORYS ESPORT peut modifier les présentes CGU. Les utilisateurs seront informés par message sur le
        Site ou par e-mail au moins trente (30) jours avant l'entrée en vigueur des modifications
        substantielles. La poursuite de l'utilisation après ce délai vaut acceptation, sous réserve des droits
        des consommateurs.
      </p>
    </article>

    <article id="cgu-16" class="doc-section">
      <h2>16. Droit applicable — litiges</h2>
      <p>
        Les CGU sont soumises au droit français. En cas de litige, les parties rechercheront une solution
        amiable. À défaut, les tribunaux français seront compétents selon les règles de droit commun, sous
        réserve des dispositions protectrices applicables aux consommateurs.
      </p>
    </article>

    <p class="doc-part" id="partie-cgv">Partie II — Conditions générales de vente (CGV)</p>

    <article id="cgv-intro" class="doc-section">
      <p>
        Les présentes CGV régissent les offres d'abonnement payantes Premium d'EcoBoty. Elles complètent les
        CGU (Partie I). En souscrivant un abonnement, le Client accepte les CGU, les présentes CGV, la
        politique de confidentialité et la politique de cookies.
      </p>
    </article>

    <article id="cgv-1" class="doc-section">
      <h2>1. Identification du vendeur</h2>
      <p>
        <strong>Vendeur / Prestataire :</strong> KHAORYS ESPORT<br />
        Association déclarée régie par la loi du 1er juillet 1901 — RNA : W263014601 — SIRET : 107 299 778 00012<br />
        Siège : 11 rue Ernest Bonnardel, 26100 Romans-sur-Isère, France<br />
        Site : https://ecoboty.eu<br />
        Contact et facturation : <strong>contact@khaorys.com</strong> (objet « Abonnement EcoBoty »)
      </p>
    </article>

    <article id="cgv-2" class="doc-section">
      <h2>2. Description des offres</h2>
      <h3>2.1 Plan Free</h3>
      <p>Accès sans paiement, fonctionnalités et quotas limités (voir page Tarifs).</p>
      <h3>2.2 Plan Premium (par serveur Discord)</h3>
      <p>
        Abonnement par serveur Discord, débloquant les fonctionnalités Premium selon le plan en vigueur au
        moment de la souscription.
      </p>
    </article>

    <article id="cgv-3" class="doc-section">
      <h2>3. Tarifs (TTC — TVA non applicable, article 293 B du CGI)</h2>
      <p>
        KHAORYS ESPORT n'est pas assujettie à la TVA en application de l'article 293 B du Code général des
        impôts. Les prix sont indiqués en euros.
      </p>
      <div class="doc-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Périodicité</th>
              <th>Prix TTC indicatif</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Free</td><td>—</td><td>0 €</td></tr>
            <tr><td>Premium</td><td>Mensuel</td><td>4,99 € / mois</td></tr>
            <tr><td>Premium</td><td>Trimestriel</td><td>13,47 € / trimestre</td></tr>
            <tr><td>Premium</td><td>Annuel</td><td>47,90 € / an</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Les prix applicables sont ceux affichés sur la page <NuxtLink to="/tarifs">Tarifs</NuxtLink> et dans
        le dashboard au moment de la souscription. KHAORYS ESPORT se réserve le droit de modifier ses tarifs
        pour les nouvelles souscriptions ; les modifications s'appliquent aux renouvellements ultérieurs avec
        possibilité de résiliation avant échéance.
      </p>
    </article>

    <article id="cgv-4" class="doc-section">
      <h2>4. Souscription et paiement Stripe</h2>
      <ul>
        <li>La souscription s'effectue en ligne depuis l'onglet Premium du dashboard serveur.</li>
        <li>Le paiement est traité par Stripe ; KHAORYS ESPORT ne conserve pas les données de carte bancaire.</li>
        <li>Le contrat est conclu à la validation du paiement et de l'acceptation des présentes CGV.</li>
        <li>Le Client déclare agir avec autorité pour le serveur Discord concerné et être majeur ou dûment autorisé.</li>
        <li>Moyens de paiement acceptés : selon Stripe (cartes Visa, Mastercard, Apple Pay, Google Pay, Link, Revolut Pay, PayPal, etc.).</li>
      </ul>
    </article>

    <article id="cgv-5" class="doc-section">
      <h2>5. Renouvellement</h2>
      <p>
        Les abonnements sont conclus pour la durée de la période choisie (mensuelle, trimestrielle ou annuelle)
        et se renouvellent automatiquement pour une période de même durée, sauf résiliation par le Client avant
        la date de renouvellement via le portail Stripe (Customer Portal) accessible depuis le dashboard ou par
        e-mail à <strong>contact@khaorys.com</strong>.
      </p>
    </article>

    <article id="cgv-6" class="doc-section">
      <h2>6. Résiliation</h2>
      <ul>
        <li>Le Client peut résilier à tout moment. La résiliation prend effet à la fin de la période en cours.</li>
        <li>Aucun remboursement au prorata n'est dû pour la période commencée, sauf disposition légale impérative.</li>
        <li>KHAORYS ESPORT peut résilier ou suspendre un abonnement en cas de manquement grave aux CGU/CGV, de fraude, d'impayé ou de demande des autorités.</li>
      </ul>
    </article>

    <article id="cgv-7" class="doc-section">
      <h2>7. Facturation</h2>
      <p>
        Les factures et reçus sont émis via Stripe et adressés à l'e-mail de facturation du Client. Le Client
        s'engage à signaler toute anomalie de facturation dans un délai raisonnable à
        <strong>contact@khaorys.com</strong>.
      </p>
    </article>

    <article id="cgv-8" class="doc-section">
      <h2>8. Impayé — retour au plan Free</h2>
      <p>
        En cas d'échec de paiement, l'accès Premium est suspendu et le serveur repasse au plan Free jusqu'à
        régularisation. Le contenu créé sous Premium est conservé mais peut être verrouillé (soft-lock) dans
        les limites du plan Free.
      </p>
    </article>

    <article id="cgv-9" class="doc-section">
      <h2>9. Quotas et usage</h2>
      <p>
        Les quotas (boutiques, articles par boutique, jeux, lootbox, logs, succès, etc.) dépendent du plan
        actif. Le détail est disponible sur la page Tarifs. En cas de rétrogradation vers Free, l'administrateur
        conserve ses données ; seules les fonctionnalités et quotas Premium sont restreints.
      </p>
    </article>

    <article id="cgv-10" class="doc-section">
      <h2>10. Client professionnel (B2B)</h2>
      <p>
        Lorsque le Client agit pour des besoins entrant dans le cadre de son activité professionnelle ou
        associatif, les dispositions du Code de la consommation relatives au droit de rétractation des
        consommateurs ne s'appliquent pas (article L221-3 du Code de la consommation).
      </p>
    </article>

    <article id="cgv-11" class="doc-section">
      <h2>11. Client consommateur (B2C) — droit de rétractation</h2>
      <ul>
        <li>Le Client consommateur dispose d'un délai de 14 jours calendaires à compter de la conclusion du contrat pour exercer son droit de rétractation (articles L221-18 et suivants).</li>
        <li>Pour les services numériques exécutés de manière continue, le remboursement peut être réduit d'un montant proportionnel au service fourni (article L221-25).</li>
        <li>Avant paiement, le Client consommateur doit accepter expressément le démarrage immédiat du service et reconnaître renoncer à son droit de rétractation pour la partie déjà exécutée (article L221-28 13°), faute de quoi la souscription ne peut être finalisée.</li>
        <li>Pour exercer la rétractation : <strong>contact@khaorys.com</strong> en indiquant nom, e-mail et référence d'abonnement.</li>
      </ul>
    </article>

    <article id="cgv-12" class="doc-section">
      <h2>12. Remboursements</h2>
      <p>
        Les remboursements dus (rétractation légale, erreur de facturation, décision de KHAORYS ESPORT) sont
        effectués via Stripe sur le moyen de paiement initial, dans un délai maximal de 14 jours, sauf
        disposition légale contraire.
      </p>
    </article>

    <article id="cgv-13" class="doc-section">
      <h2>13. Disponibilité — évolutions</h2>
      <p>
        KHAORYS ESPORT s'efforce d'assurer une disponibilité continue mais ne garantit pas un fonctionnement
        ininterrompu (maintenance, incidents, tiers). Les fonctionnalités peuvent évoluer avec information
        préalable en cas de modification substantielle.
      </p>
    </article>

    <article id="cgv-14" class="doc-section">
      <h2>14. Données personnelles</h2>
      <p>
        Les données de facturation sont traitées conformément à la
        <a href="#partie-rgpd">politique de confidentialité</a>.
      </p>
    </article>

    <article id="cgv-15" class="doc-section">
      <h2>15. Modification des CGV et des tarifs</h2>
      <p>
        Les Clients actifs sont informés au moins 30 jours avant l'entrée en vigueur des modifications
        substantielles. Les modifications tarifaires s'appliquent aux renouvellements ; le Client peut résilier
        avant renouvellement.
      </p>
    </article>

    <article id="cgv-16" class="doc-section">
      <h2>16. Médiation — litiges</h2>
      <p>
        Le Client consommateur peut recourir gratuitement à un médiateur de la consommation conformément aux
        articles L612-1 et suivants du Code de la consommation.
      </p>
      <p>
        Médiateur : <strong>MEDICYS</strong> — Centre de médiation et de règlement amiable des différends —
        <a href="https://www.medicys.fr" target="_blank" rel="noreferrer">www.medicys.fr</a> —
        courriel : contact@medicys.fr
      </p>
      <p>À défaut de résolution amiable, les tribunaux français seront compétents selon les règles de droit commun.</p>
    </article>

    <article id="cgv-17" class="doc-section">
      <h2>17. Contact</h2>
      <p>
        Toute question relative aux abonnements, factures ou résiliations :
        <strong>contact@khaorys.com</strong>
      </p>
    </article>

    <p class="doc-part" id="partie-rgpd">Partie III — Politique de confidentialité (RGPD)</p>

    <article id="rgpd-1" class="doc-section">
      <h2>1. Responsable de traitement</h2>
      <p>
        KHAORYS ESPORT — association loi 1901 — RNA W263014601 — SIRET 107 299 778 00012 —
        11 rue Ernest Bonnardel, 26100 Romans-sur-Isère — contact@khaorys.com
      </p>
    </article>

    <article id="rgpd-2" class="doc-section">
      <h2>2. Données collectées</h2>
      <p>
        Selon votre usage : identifiant Discord, pseudo, avatar, serveurs Discord autorisés ;
        paramètres d'économie, soldes, transactions, inventaires, logs ; données Twitch (login,
        activité liée aux récompenses) si vous activez l'intégration ; données techniques
        (horodatages, journaux de sécurité, adresse IP limitée).
      </p>
    </article>

    <article id="rgpd-3" class="doc-section">
      <h2>3. Finalités et bases légales</h2>
      <p>
        Fourniture du Service (exécution du contrat / mesures précontractuelles) ; sécurité et
        prévention des abus (intérêt légitime) ; obligations légales (facturation, conservation) ;
        cookies non essentiels uniquement avec consentement (voir
        <a href="#partie-cookies">politique de cookies</a>).
      </p>
    </article>

    <article id="rgpd-4" class="doc-section">
      <h2>4. Destinataires et sous-traitants</h2>
      <p>
        Les données ne sont pas vendues. Elles peuvent être traitées par : hébergeur (IONOS SE),
        Discord Inc., Twitch / Amazon (si intégration), Stripe (facturation), et le chat de support
        (Tawk.to) uniquement si vous avez accepté les cookies concernés. Ces tiers appliquent
        leurs propres politiques.
      </p>
    </article>

    <article id="rgpd-5" class="doc-section">
      <h2>5. Conservation</h2>
      <p>
        Les données sont conservées tant que le Service est utilisé sur un serveur ou qu'un compte est
        actif, puis effacées ou anonymisées dans un délai raisonnable, sous réserve des obligations
        légales (facturation, litiges, sécurité).
      </p>
    </article>

    <article id="rgpd-6" class="doc-section">
      <h2>6. Sécurité</h2>
      <p>
        Mesures techniques et organisationnelles raisonnables pour protéger les données contre l'accès
        non autorisé, la perte ou l'altération (contrôles d'accès, HTTPS, journalisation limitée).
      </p>
    </article>

    <article id="rgpd-7" class="doc-section">
      <h2>7. Vos droits</h2>
      <p>
        Accès, rectification, effacement, limitation, opposition, portabilité. Contact :
        <strong>contact@khaorys.com</strong>. Vous pouvez aussi saisir la CNIL (www.cnil.fr).
      </p>
    </article>

    <article id="rgpd-8" class="doc-section">
      <h2>8. Mineurs</h2>
      <p>
        Le Service s'adresse aux communautés Discord. Si vous avez moins de 15 ans en France,
        l'utilisation doit se faire avec l'accord d'un représentant légal.
      </p>
    </article>

    <p class="doc-part" id="partie-cookies">Partie IV — Politique de cookies</p>

    <article id="cookies-1" class="doc-section">
      <h2>1. Qu'est-ce qu'un cookie ?</h2>
      <p>
        Un cookie est un petit fichier déposé sur votre terminal (ordinateur, tablette, smartphone) lors de la
        visite d'un site. Il permet de mémoriser des informations relatives à votre navigation ou à vos
        préférences. Un traceur désigne toute technologie similaire (localStorage, pixel, etc.).
      </p>
    </article>

    <article id="cookies-2" class="doc-section">
      <h2>2. Responsable</h2>
      <p>
        KHAORYS ESPORT — 11 rue Ernest Bonnardel, 26100 Romans-sur-Isère — contact@khaorys.com — édite le Site
        EcoBoty et est responsable des cookies qu'elle dépose directement (cookies « first-party »).
      </p>
    </article>

    <article id="cookies-3" class="doc-section">
      <h2>3. Bandeau de consentement</h2>
      <p>
        Lors de votre première visite, un bandeau vous informe de l'utilisation de cookies et vous permet
        d'accepter ou de refuser les cookies non essentiels. Votre choix est enregistré dans le cookie
        <code>cookie_consent</code> (durée : environ 180 jours).
      </p>
      <p>
        Vous pouvez modifier votre choix à tout moment en effaçant les cookies de votre navigateur : le
        bandeau réapparaîtra lors de votre prochaine visite.
      </p>
    </article>

    <article id="cookies-4" class="doc-section">
      <h2>4. Cookies strictement nécessaires</h2>
      <p>Ces cookies sont indispensables au fonctionnement du Service. Ils ne nécessitent pas de consentement préalable :</p>
      <div class="doc-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Finalité</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>cookie_consent</code></td>
              <td>Mémoriser votre choix de consentement cookies</td>
              <td>~180 jours</td>
            </tr>
            <tr>
              <td><code>ecoboty_locale</code></td>
              <td>Mémoriser la langue choisie (FR / EN / ES)</td>
              <td>Session / persistant</td>
            </tr>
            <tr>
              <td>Session / token</td>
              <td>Authentification Discord (sessionStorage / localStorage selon connexion)</td>
              <td>Session ou jusqu'à déconnexion</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <article id="cookies-5" class="doc-section">
      <h2>5. Cookies soumis à consentement</h2>
      <p>
        Après acceptation via le bandeau, les traceurs suivants peuvent être activés. Si vous refusez, le Site
        reste utilisable pour ses fonctions essentielles :
      </p>
      <div class="doc-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Finalité</th>
              <th>Éditeur</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Tawk.to</td>
              <td>Chat de support en ligne (si activé)</td>
              <td>Tawk.to Ltd</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Ces services appliquent leurs propres politiques de confidentialité. Ils ne sont chargés qu'après votre
        acceptation explicite des cookies.
      </p>
    </article>

    <article id="cookies-6" class="doc-section">
      <h2>6. Cookies tiers intégrés au Service</h2>
      <p>
        Lors de la souscription Premium, vous êtes redirigé vers Stripe Checkout. Stripe peut déposer des
        cookies nécessaires au paiement selon sa propre politique. Discord OAuth peut également impliquer des
        traceurs lors de l'authentification, soumis aux conditions de Discord Inc.
      </p>
    </article>

    <article id="cookies-7" class="doc-section">
      <h2>7. Gestion via votre navigateur</h2>
      <p>
        Vous pouvez configurer votre navigateur pour refuser les cookies ou être averti avant leur dépôt.
        Le refus des cookies essentiels peut dégrader ou empêcher l'utilisation du Service (connexion,
        préférences, consentement).
      </p>
      <p>Guides des principaux navigateurs : Chrome, Firefox, Safari, Edge — section « Confidentialité / Cookies ».</p>
    </article>

    <article id="cookies-8" class="doc-section">
      <h2>8. Vos droits</h2>
      <p>
        Pour toute question relative aux cookies ou à vos données personnelles, contactez
        <strong>contact@khaorys.com</strong>. Vous disposez des droits prévus par le RGPD (accès, rectification,
        opposition, etc.) — voir la <a href="#partie-rgpd">politique de confidentialité</a>.
      </p>
    </article>
  </LegalDocLayout>
</template>

<script setup>
const toc = [
  { id: "partie-cgu", label: "Partie I — CGU" },
  { id: "cgu-1", label: "1. Objet" },
  { id: "cgu-4", label: "4. Compte Discord" },
  { id: "cgu-7", label: "7. Plan Free" },
  { id: "cgu-8", label: "8. Plan Premium" },
  { id: "cgu-9", label: "9. Stripe" },
  { id: "cgu-13", label: "13. Responsabilité" },
  { id: "partie-cgv", label: "Partie II — CGV" },
  { id: "cgv-3", label: "3. Tarifs" },
  { id: "cgv-4", label: "4. Paiement Stripe" },
  { id: "cgv-6", label: "6. Résiliation" },
  { id: "cgv-11", label: "11. Rétractation (B2C)" },
  { id: "cgv-16", label: "16. Médiation" },
  { id: "partie-rgpd", label: "Partie III — Confidentialité" },
  { id: "rgpd-7", label: "7. Vos droits" },
  { id: "partie-cookies", label: "Partie IV — Cookies" },
  { id: "cookies-3", label: "3. Bandeau de consentement" },
  { id: "cookies-4", label: "4. Cookies nécessaires" },
  { id: "cookies-5", label: "5. Cookies avec consentement" }
];

useHead({
  title: "CGU / CGV / Confidentialité / Cookies — EcoBoty",
  meta: [{
    name: "description",
    content: "Conditions générales d'utilisation et de vente, politique de confidentialité et cookies d'EcoBoty."
  }]
});
</script>

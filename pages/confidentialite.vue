<template>
  <section class="policy-page">
    <header class="policy-hero">
      <div>
        <h2>Politique de confidentialité</h2>
        <p>
          Cette politique explique quelles données sont traitées par ECOBOTY, pourquoi et
          comment elles sont protégées, conformément au RGPD.
        </p>
      </div>
    </header>

    <div class="policy-grid">
      <article class="policy-card">
        <h3>1. Données collectées</h3>
        <p>
          Lorsque vous vous connectez via Discord ou utilisez le bot, nous pouvons traiter :
          identifiant Discord, nom d’utilisateur, avatar, serveurs autorisés, paramètres
          d’économie, transactions, logs et historiques d’utilisation du bot.
        </p>
      </article>

      <article class="policy-card">
        <h3>2. Finalités</h3>
        <p>
          Les données sont utilisées uniquement pour fournir les fonctionnalités du service :
          gestion des gains, boutiques, inventaire, jeux, logs, et intégration Twitch.
        </p>
      </article>

      <article class="policy-card">
        <h3>3. Base légale du traitement</h3>
        <p>
          Les traitements sont fondés sur l’exécution du service (fournir les fonctionnalités
          du bot), l’intérêt légitime (sécurité, prévention des abus) et, si nécessaire, le
          consentement (par exemple pour certaines intégrations optionnelles).
        </p>
      </article>

      <article class="policy-card">
        <h3>4. Partage des données</h3>
        <p>
          Les données ne sont pas vendues. Elles peuvent être traitées par nos prestataires
          techniques (hébergeur) uniquement pour assurer le fonctionnement du service.
          Les services tiers (Discord, Twitch) appliquent leurs propres politiques.
        </p>
      </article>

      <article class="policy-card">
        <h3>5. Conservation</h3>
        <p>
          Les données sont conservées tant que le bot est utilisé sur un serveur ou tant que
          cela est nécessaire au fonctionnement du service. Elles peuvent être supprimées
          sur demande.
        </p>
      </article>

      <article class="policy-card">
        <h3>6. Sécurité</h3>
        <p>
          Nous mettons en place des mesures techniques pour protéger les données contre
          l’accès non autorisé, la perte ou l’altération.
        </p>
      </article>

      <article class="policy-card">
        <h3>7. Vos droits (RGPD)</h3>
        <p>
          Vous pouvez demander l’accès, la rectification, l’effacement, la limitation,
          l’opposition et la portabilité de vos données. Contactez‑nous à
          <strong>adriizzplat@gmail.com</strong>. Vous pouvez aussi déposer une réclamation
          auprès de la CNIL.
        </p>
      </article>

      <article class="policy-card">
        <h3>8. Cookies</h3>
        <p>
          Le dashboard peut utiliser des cookies techniques pour maintenir la session et
          améliorer l’expérience utilisateur.
        </p>
      </article>

      <article class="policy-card">
        <h3>9. Hébergement</h3>
        <p>
          Les données sont hébergées par YorkHost SAS (60 rue de la Prairie, 88100 Saint‑Dié
          des Vosges). L’hébergeur intervient uniquement pour l’exécution technique.
        </p>
      </article>

      <article class="policy-card">
        <h3>10. Contact</h3>
        <p>
          Pour toute question relative à la confidentialité, contactez‑nous à
          <strong>adriizzplat@gmail.com</strong>.
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.policy-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.policy-hero p {
  color: var(--text-soft);
  line-height: 1.6;
}
.policy-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.policy-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 20px;
  display: grid;
  gap: 10px;
}
.policy-card h3 {
  margin: 0;
}
.policy-card p {
  margin: 0;
  color: var(--text);
  line-height: 1.6;
}

:global(body.theme-light) .policy-hero p,
:global(body.theme-light) .policy-card p {
  color: var(--text-soft);
}
:global(body.theme-light) .policy-card {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow);
}
</style>

<template>
  <section class="policy-page">
    <header class="policy-hero">
      <div>
        <h2>Conditions d'utilisation</h2>
        <p>
          Ces conditions définissent les règles d’utilisation du site et du bot ECOBOTY.
          En utilisant le service, vous acceptez ces conditions.
        </p>
      </div>
    </header>

    <div class="policy-grid">
      <article class="policy-card">
        <h3>1. Présentation du service</h3>
        <p>
          ECOBOTY est un bot Discord d’économie et de divertissement. Il propose des gains
          automatiques, un daily, des boutiques, un inventaire, des lootboxes, des ventes et
          des mini‑jeux. La configuration se fait via le dashboard web.
        </p>
      </article>

      <article class="policy-card">
        <h3>2. Accès et usage</h3>
        <p>
          L’accès au dashboard nécessite une connexion via Discord. Vous êtes responsable
          des actions effectuées sur votre serveur (paramètres, salons, rôles, prix).
        </p>
      </article>

      <article class="policy-card">
        <h3>3. Règles de bonne conduite</h3>
        <p>
          Il est interdit d’utiliser le service pour tromper, nuire, harceler, contourner
          les règles de Discord ou créer des abus d’économie.
        </p>
      </article>

      <article class="policy-card">
        <h3>4. Disponibilité</h3>
        <p>
          Nous faisons notre possible pour assurer la disponibilité du service. Toutefois,
          des interruptions peuvent survenir (maintenance, incidents techniques, hébergeur).
        </p>
      </article>

      <article class="policy-card">
        <h3>5. Responsabilités</h3>
        <p>
          ECOBOTY fournit des outils, mais l’éditeur ne peut être tenu responsable des
          décisions prises par les administrateurs de serveurs ni des pertes liées à
          une configuration incorrecte.
        </p>
      </article>

      <article class="policy-card">
        <h3>6. Contenus et données</h3>
        <p>
          Les données nécessaires au fonctionnement (identifiants Discord, paramètres,
          transactions, logs) sont stockées de manière sécurisée. Pour plus d’informations,
          consultez la politique de confidentialité.
        </p>
      </article>

      <article class="policy-card">
        <h3>7. Modification des conditions</h3>
        <p>
          Nous pouvons mettre à jour ces conditions. La version la plus récente est
          publiée sur cette page.
        </p>
      </article>

      <article class="policy-card">
        <h3>8. Contact</h3>
        <p>
          Pour toute question, vous pouvez nous contacter à l’adresse
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

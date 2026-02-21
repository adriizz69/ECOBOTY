<template>
  <section class="legal-page">
    <header class="legal-hero">
      <div>
        <h2>Mentions légales</h2>
        <p>
          Conformément à la législation française, vous trouverez ci‑dessous les informations
          obligatoires liées à l’éditeur du site et à l’hébergeur.
        </p>
      </div>
    </header>

    <div class="legal-grid">
      <article class="legal-card">
        <h3>Éditeur du site</h3>
        <div class="legal-list">
          <div class="legal-row">
            <span>Statut</span>
            <span>Auto‑entrepreneur (entrepreneur individuel)</span>
          </div>
          <div class="legal-row">
            <span>Nom commercial</span>
            <span>AE ADZSOC</span>
          </div>
          <div class="legal-row">
            <span>Nom / Prénom (EI)</span>
            <span class="muted">À compléter</span>
          </div>
          <div class="legal-row">
            <span>Adresse</span>
            <span>30 AVENUE MARECHAL FOCH BUREAU 3, 69006 LYON</span>
          </div>
          <div class="legal-row">
            <span>RCS</span>
            <span>LYON — <span class="muted">numéro à compléter</span></span>
          </div>
          <div class="legal-row">
            <span>TVA intracommunautaire</span>
            <span>FR68827707647</span>
          </div>
          <div class="legal-row">
            <span>Email</span>
            <span>adriizzplat@gmail.com</span>
          </div>
          <div class="legal-row">
            <span>Téléphone</span>
            <span class="muted">Non renseigné</span>
          </div>
        </div>
      </article>

      <article class="legal-card">
        <h3>Hébergeur</h3>
        <div class="legal-list">
          <div class="legal-row">
            <span>Nom</span>
            <span>YorkHost SAS</span>
          </div>
          <div class="legal-row">
            <span>SIRET</span>
            <span>93093392400019</span>
          </div>
          <div class="legal-row">
            <span>SIREN</span>
            <span>930933924</span>
          </div>
          <div class="legal-row">
            <span>Adresse</span>
            <span>60 RUE DE LA PRAIRIE, 88100 ST DIE DES VOSGES</span>
          </div>
          <div class="legal-row">
            <span>Téléphone</span>
            <span class="muted">À compléter</span>
          </div>
        </div>
      </article>

      <article class="legal-card">
        <h3>Activité réglementée</h3>
        <p class="muted">Activité non réglementée.</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.legal-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.legal-hero p {
  color: var(--text-soft);
  line-height: 1.6;
}
.legal-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.legal-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 20px;
  display: grid;
  gap: 12px;
}
.legal-card h3 {
  margin: 0;
}
.legal-list {
  display: grid;
  gap: 10px;
}
.legal-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
  font-size: 14px;
  color: var(--text);
}
.legal-row span:first-child {
  color: var(--text-muted);
}
.muted {
  color: var(--text-muted);
}

:global(body.theme-light) .legal-hero p,
:global(body.theme-light) .legal-row {
  color: var(--text-soft);
}
:global(body.theme-light) .legal-row span:first-child,
:global(body.theme-light) .muted {
  color: var(--text-muted);
}
:global(body.theme-light) .legal-card {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow);
}
@media (max-width: 720px) {
  .legal-row {
    grid-template-columns: 1fr;
  }
}
</style>

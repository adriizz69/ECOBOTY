<template>
  <section class="doc-page">
    <header class="doc-hero">
      <div>
        <h2>{{ $t("docUser.title") }}</h2>
        <p>{{ $t("docUser.subtitle") }}</p>
        <div class="doc-badges">
          <span>{{ $t("docUser.badges.commands") }}</span>
          <span>{{ $t("docUser.badges.shop") }}</span>
          <span>{{ $t("docUser.badges.inventory") }}</span>
          <span>{{ $t("docUser.badges.market") }}</span>
          <span>{{ $t("docUser.badges.games") }}</span>
        </div>
      </div>
      <div class="hero-panel">
        <div class="panel-card">
          <div class="panel-title">{{ $t("docUser.hero.startTitle") }}</div>
          <ol>
            <li>{{ $t("docUser.hero.start1") }}</li>
            <li>{{ $t("docUser.hero.start2") }}</li>
            <li>{{ $t("docUser.hero.start3") }}</li>
          </ol>
        </div>
        <div class="panel-card subtle">
          <div class="panel-title">{{ $t("docUser.hero.supportTitle") }}</div>
          <p>{{ $t("docUser.hero.supportText") }}</p>
        </div>
      </div>
    </header>

    <div class="doc-layout">
      <aside class="doc-toc">
        <div class="toc-title">{{ $t("docUser.toc.title") }}</div>
        <a href="#overview">{{ $t("docUser.toc.overview") }}</a>
        <a href="#boutique">{{ $t("docUser.toc.shop") }}</a>
        <a href="#inventaire">{{ $t("docUser.toc.inventory") }}</a>
        <a href="#lootbox">{{ $t("docUser.toc.lootbox") }}</a>
        <a href="#marche">{{ $t("docUser.toc.market") }}</a>
        <a href="#jeux">{{ $t("docUser.toc.games") }}</a>
        <a href="#logs">{{ $t("docUser.toc.logs") }}</a>
        <a href="#commandes">{{ $t("docUser.toc.commands") }}</a>
        <a href="#faq">{{ $t("docUser.toc.faq") }}</a>
      </aside>

      <div class="doc-content">
        <section id="overview" class="doc-section">
          <h3>{{ $t("docUser.overview.title") }}</h3>
          <p>{{ $t("docUser.overview.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docUser.overview.list1") }}</li>
            <li>{{ $t("docUser.overview.list2") }}</li>
            <li>{{ $t("docUser.overview.list3") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docUser.overview.accessTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docUser.overview.access1") }}</li>
              <li>{{ $t("docUser.overview.access2") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/user-home.png" alt="Capture de l'interface utilisateur" />
            <figcaption>{{ $t("docUser.overview.caption") }}</figcaption>
          </figure>
        </section>

        <section id="boutique" class="doc-section">
          <h3>{{ $t("docUser.shop.title") }}</h3>
          <p>{{ $t("docUser.shop.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docUser.shop.list1") }}</li>
            <li>{{ $t("docUser.shop.list2") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docUser.shop.howTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docUser.shop.how1") }}</li>
              <li>{{ $t("docUser.shop.how2") }}</li>
              <li>{{ $t("docUser.shop.how3") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/user-boutiques.png" alt="Capture des boutiques" />
            <figcaption>{{ $t("docUser.shop.caption") }}</figcaption>
          </figure>
        </section>

        <section id="inventaire" class="doc-section">
          <h3>{{ $t("docUser.inventory.title") }}</h3>
          <p>{{ $t("docUser.inventory.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docUser.inventory.list1") }}</li>
            <li>{{ $t("docUser.inventory.list2") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docUser.inventory.howTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docUser.inventory.how1") }}</li>
              <li>{{ $t("docUser.inventory.how2") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/user-inventaire.png" alt="Capture de l'inventaire" />
            <figcaption>{{ $t("docUser.inventory.caption") }}</figcaption>
          </figure>
        </section>

        <section id="lootbox" class="doc-section">
          <h3>{{ $t("docUser.lootbox.title") }}</h3>
          <p>{{ $t("docUser.lootbox.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docUser.lootbox.list1") }}</li>
            <li>{{ $t("docUser.lootbox.list2") }}</li>
            <li>{{ $t("docUser.lootbox.list3") }}</li>
            <li>{{ $t("docUser.lootbox.list4") }}</li>
            <li>{{ $t("docUser.lootbox.list5") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docUser.lootbox.howTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docUser.lootbox.how1") }}</li>
              <li>{{ $t("docUser.lootbox.how2") }}</li>
              <li>{{ $t("docUser.lootbox.how3") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/user-lootbox.png" alt="Capture d'ouverture de lootbox" />
            <figcaption>{{ $t("docUser.lootbox.caption") }}</figcaption>
          </figure>
        </section>

        <section id="marche" class="doc-section">
          <h3>{{ $t("docUser.market.title") }}</h3>
          <p>{{ $t("docUser.market.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docUser.market.list1") }}</li>
            <li>{{ $t("docUser.market.list2") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docUser.market.sellTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docUser.market.sell1") }}</li>
              <li>{{ $t("docUser.market.sell2") }}</li>
              <li>{{ $t("docUser.market.sell3") }}</li>
            </ul>
          </div>
          <div class="doc-subsection">
            <h4>{{ $t("docUser.market.buyTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docUser.market.buy1") }}</li>
              <li>{{ $t("docUser.market.buy2") }}</li>
              <li>{{ $t("docUser.market.buy3") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/user-vente.png" alt="Capture du marché" />
            <figcaption>{{ $t("docUser.market.caption") }}</figcaption>
          </figure>
        </section>

        <section id="jeux" class="doc-section">
          <h3>{{ $t("docUser.games.title") }}</h3>
          <p>{{ $t("docUser.games.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docUser.games.list1") }}</li>
            <li>{{ $t("docUser.games.list2") }}</li>
            <li>{{ $t("docUser.games.list3") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docUser.games.howTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docUser.games.how1") }}</li>
              <li>{{ $t("docUser.games.how2") }}</li>
              <li>{{ $t("docUser.games.how3") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/user-jeux.png" alt="Capture des jeux" />
            <figcaption>{{ $t("docUser.games.caption") }}</figcaption>
          </figure>
        </section>

        <section id="logs" class="doc-section">
          <h3>{{ $t("docUser.logs.title") }}</h3>
          <p>{{ $t("docUser.logs.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docUser.logs.list1") }}</li>
            <li>{{ $t("docUser.logs.list2") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docUser.logs.howTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docUser.logs.how1") }}</li>
              <li>{{ $t("docUser.logs.how2") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/user-logs.png" alt="Capture des logs utilisateur" />
            <figcaption>{{ $t("docUser.logs.caption") }}</figcaption>
          </figure>
        </section>

        <section id="commandes" class="doc-section">
          <h3>{{ $t("docUser.commands.title") }}</h3>
          <div class="doc-grid">
            <article class="doc-card">
              <h4>{{ $t("docUser.commands.cmdBalance") }}</h4>
              <p>{{ $t("docUser.commands.balance") }}</p>
            </article>
            <article class="doc-card">
              <h4>{{ $t("docUser.commands.cmdDaily") }}</h4>
              <p>{{ $t("docUser.commands.daily") }}</p>
            </article>
            <article class="doc-card">
              <h4>{{ $t("docUser.commands.cmdShop") }}</h4>
              <p>{{ $t("docUser.commands.shop") }}</p>
            </article>
            <article class="doc-card">
              <h4>{{ $t("docUser.commands.cmdInventory") }}</h4>
              <p>{{ $t("docUser.commands.inventory") }}</p>
            </article>
            <article class="doc-card">
              <h4>{{ $t("docUser.commands.cmdMarket") }}</h4>
              <p>{{ $t("docUser.commands.market") }}</p>
            </article>
            <article class="doc-card">
              <h4>{{ $t("docUser.commands.cmdLeaderboard") }}</h4>
              <p>{{ $t("docUser.commands.leaderboard") }}</p>
            </article>
            <article class="doc-card">
              <h4>{{ $t("docUser.commands.cmdSlot") }}</h4>
              <p>{{ $t("docUser.commands.slot") }}</p>
            </article>
            <article class="doc-card">
              <h4>{{ $t("docUser.commands.cmdDouble") }}</h4>
              <p>{{ $t("docUser.commands.double") }}</p>
            </article>
            <article class="doc-card">
              <h4>{{ $t("docUser.commands.cmdLootbox") }}</h4>
              <p>{{ $t("docUser.commands.lootbox") }}</p>
            </article>
          </div>
        </section>

        <section id="faq" class="doc-section">
          <h3>{{ $t("docUser.faq.title") }}</h3>
          <ul class="doc-list">
            <li>{{ $t("docUser.faq.list1") }}</li>
            <li>{{ $t("docUser.faq.list2") }}</li>
            <li>{{ $t("docUser.faq.list3") }}</li>
            <li>{{ $t("docUser.faq.list4") }}</li>
          </ul>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.doc-hero {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 24px;
  align-items: start;
}
.doc-hero p {
  color: var(--text-soft);
  line-height: 1.6;
}
.doc-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.doc-badges span {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--border);
}
.hero-panel {
  display: grid;
  gap: 12px;
}
.panel-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 18px;
}
.panel-card.subtle {
  background: var(--surface-2);
}
.panel-title {
  font-weight: 700;
  margin-bottom: 8px;
}
.panel-card ol {
  margin: 0;
  padding-left: 18px;
  color: var(--text);
  display: grid;
  gap: 6px;
}
.doc-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 24px;
  align-items: start;
}
.doc-toc {
  position: sticky;
  top: 88px;
  align-self: start;
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 16px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.toc-title {
  font-weight: 700;
  margin-bottom: 4px;
}
.doc-toc a {
  color: var(--text-soft);
  text-decoration: none;
  font-size: 14px;
}
.doc-toc a:hover {
  color: #fff;
}
.doc-content {
  display: grid;
  gap: 28px;
}
.doc-section {
  background: rgba(10, 15, 28, 0.7);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 22px;
  display: grid;
  gap: 12px;
}
.doc-section h3 {
  margin: 0;
}
.doc-subsection {
  margin-top: 6px;
}
.doc-subsection h4 {
  margin-bottom: 8px;
}
.doc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
  color: #d6def8;
}
.doc-list li {
  padding-left: 16px;
  position: relative;
}
.doc-list li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: #5ce1ff;
}
.doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
}
.doc-card {
  background: rgba(15, 22, 36, 0.85);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  display: grid;
  gap: 6px;
}
.doc-card h4 {
  margin: 0;
}
.doc-card p {
  margin: 0;
  color: #c9d4f7;
}
.doc-shot {
  margin: 6px 0 0;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 12px;
  display: grid;
  gap: 8px;
}
.doc-shot img {
  width: 100%;
  border-radius: 12px;
  display: block;
  background: var(--surface-2);
}
.doc-shot figcaption {
  font-size: 12px;
  color: #c9d4f7;
}

:global(body.theme-light) .doc-hero p,
:global(body.theme-light) .doc-toc a,
:global(body.theme-light) .doc-list,
:global(body.theme-light) .doc-card p {
  color: var(--text-soft);
}
:global(body.theme-light) .doc-badges span {
  background: #eef2ff;
}
:global(body.theme-light) .panel-card,
:global(body.theme-light) .doc-toc,
:global(body.theme-light) .doc-section,
:global(body.theme-light) .doc-card,
:global(body.theme-light) .doc-shot {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow);
}
:global(body.theme-light) .panel-card.subtle {
  background: #f8fafc;
}
:global(body.theme-light) .doc-list li::before {
  color: #0e7490;
}
:global(body.theme-light) .doc-shot figcaption {
  color: var(--text-muted);
}

@media (max-width: 960px) {
  .doc-hero {
    grid-template-columns: 1fr;
  }
  .doc-layout {
    grid-template-columns: 1fr;
  }
  .doc-toc {
    position: static;
  }
}
</style>

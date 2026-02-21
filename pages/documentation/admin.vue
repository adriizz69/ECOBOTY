<template>
  <section class="doc-page">
    <header class="doc-hero">
      <div>
        <h2>{{ $t("docAdmin.title") }}</h2>
        <p>{{ $t("docAdmin.subtitle") }}</p>
        <div class="doc-badges">
          <span>{{ $t("docAdmin.badges.config") }}</span>
          <span>{{ $t("docAdmin.badges.economy") }}</span>
          <span>{{ $t("docAdmin.badges.shop") }}</span>
          <span>{{ $t("docAdmin.badges.inventory") }}</span>
          <span>{{ $t("docAdmin.badges.games") }}</span>
          <span>{{ $t("docAdmin.badges.logs") }}</span>
        </div>
      </div>
      <div class="hero-panel">
        <div class="panel-card">
          <div class="panel-title">{{ $t("docAdmin.hero.startTitle") }}</div>
          <ol>
            <li>{{ $t("docAdmin.hero.start1") }}</li>
            <li>{{ $t("docAdmin.hero.start2") }}</li>
            <li>{{ $t("docAdmin.hero.start3") }}</li>
            <li>{{ $t("docAdmin.hero.start4") }}</li>
          </ol>
        </div>
        <div class="panel-card subtle">
          <div class="panel-title">{{ $t("docAdmin.hero.supportTitle") }}</div>
          <p>{{ $t("docAdmin.hero.supportText") }}</p>
        </div>
      </div>
    </header>

    <div class="doc-layout">
      <aside class="doc-toc">
        <div class="toc-title">{{ $t("docAdmin.toc.title") }}</div>
        <a href="#overview">{{ $t("docAdmin.toc.overview") }}</a>
        <a href="#economy">{{ $t("docAdmin.toc.economy") }}</a>
        <a href="#shops">{{ $t("docAdmin.toc.shops") }}</a>
        <a href="#lootbox">{{ $t("docAdmin.toc.lootbox") }}</a>
        <a href="#inventaires">{{ $t("docAdmin.toc.inventories") }}</a>
        <a href="#corbeille">{{ $t("docAdmin.toc.trash") }}</a>
        <a href="#automation">{{ $t("docAdmin.toc.automation") }}</a>
        <a href="#leaderboard">{{ $t("docAdmin.toc.leaderboard") }}</a>
        <a href="#logs">{{ $t("docAdmin.toc.logs") }}</a>
        <a href="#twitch">{{ $t("docAdmin.toc.twitch") }}</a>
        <a href="#games">{{ $t("docAdmin.toc.games") }}</a>
        <a href="#sensible">{{ $t("docAdmin.toc.sensitive") }}</a>
        <a href="#faq">{{ $t("docAdmin.toc.faq") }}</a>
      </aside>

      <div class="doc-content">
        <section id="overview" class="doc-section">
          <h3>{{ $t("docAdmin.overview.title") }}</h3>
          <p>{{ $t("docAdmin.overview.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docAdmin.overview.list1") }}</li>
            <li>{{ $t("docAdmin.overview.list2") }}</li>
            <li>{{ $t("docAdmin.overview.list3") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.overview.accessTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.overview.access1") }}</li>
              <li>{{ $t("docAdmin.overview.access2") }}</li>
              <li>{{ $t("docAdmin.overview.access3") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/admin-dashboard.png" alt="Capture d'écran du dashboard admin" />
            <figcaption>{{ $t("docAdmin.overview.caption") }}</figcaption>
          </figure>
        </section>

        <section id="economy" class="doc-section">
          <h3>{{ $t("docAdmin.economy.title") }}</h3>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.economy.currencyTitle") }}</h4>
            <p>{{ $t("docAdmin.economy.currencyText") }}</p>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.economy.currencyList1") }}</li>
              <li>{{ $t("docAdmin.economy.currencyList2") }}</li>
              <li>{{ $t("docAdmin.economy.currencyList3") }}</li>
              <li>{{ $t("docAdmin.economy.currencyList4") }}</li>
              <li>{{ $t("docAdmin.economy.currencyList5") }}</li>
            </ul>
            <div class="doc-subsection">
              <h4>{{ $t("docAdmin.economy.currencyHowTitle") }}</h4>
              <ul class="doc-list">
                <li>{{ $t("docAdmin.economy.currencyHow1") }}</li>
                <li>{{ $t("docAdmin.economy.currencyHow2") }}</li>
                <li>{{ $t("docAdmin.economy.currencyHow3") }}</li>
              </ul>
            </div>
          </div>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.economy.dailyTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.economy.dailyList1") }}</li>
              <li>{{ $t("docAdmin.economy.dailyList2") }}</li>
              <li>{{ $t("docAdmin.economy.dailyList3") }}</li>
            </ul>
            <div class="doc-subsection">
              <h4>{{ $t("docAdmin.economy.dailyHowTitle") }}</h4>
              <ul class="doc-list">
                <li>{{ $t("docAdmin.economy.dailyHow1") }}</li>
                <li>{{ $t("docAdmin.economy.dailyHow2") }}</li>
              </ul>
            </div>
          </div>
          <figure class="doc-shot">
            <img src="/docs/admin-economie.png" alt="Capture des paramètres économie" />
            <figcaption>{{ $t("docAdmin.economy.caption") }}</figcaption>
          </figure>
        </section>

        <section id="shops" class="doc-section">
          <h3>{{ $t("docAdmin.shops.title") }}</h3>
          <p>{{ $t("docAdmin.shops.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docAdmin.shops.list1") }}</li>
            <li>{{ $t("docAdmin.shops.list2") }}</li>
            <li>{{ $t("docAdmin.shops.list3") }}</li>
            <li>{{ $t("docAdmin.shops.list4") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.shops.createTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.shops.create1") }}</li>
              <li>{{ $t("docAdmin.shops.create2") }}</li>
              <li>{{ $t("docAdmin.shops.create3") }}</li>
            </ul>
          </div>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.shops.addTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.shops.add1") }}</li>
              <li>{{ $t("docAdmin.shops.add2") }}</li>
              <li>{{ $t("docAdmin.shops.add3") }}</li>
              <li>{{ $t("docAdmin.shops.add4") }}</li>
              <li>{{ $t("docAdmin.shops.add5") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/admin-boutique.png" alt="Capture des boutiques" />
            <figcaption>{{ $t("docAdmin.shops.caption") }}</figcaption>
          </figure>
        </section>

        <section id="lootbox" class="doc-section">
          <h3>{{ $t("docAdmin.lootbox.title") }}</h3>
          <p>{{ $t("docAdmin.lootbox.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docAdmin.lootbox.list1") }}</li>
            <li>{{ $t("docAdmin.lootbox.list2") }}</li>
            <li>{{ $t("docAdmin.lootbox.list3") }}</li>
            <li>{{ $t("docAdmin.lootbox.list4") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.lootbox.configTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.lootbox.config1") }}</li>
              <li>{{ $t("docAdmin.lootbox.config2") }}</li>
              <li>{{ $t("docAdmin.lootbox.config3") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/admin-lootbox.png" alt="Capture de l'éditeur de lootbox" />
            <figcaption>{{ $t("docAdmin.lootbox.caption") }}</figcaption>
          </figure>
        </section>

        <section id="inventaires" class="doc-section">
          <h3>{{ $t("docAdmin.inventories.title") }}</h3>
          <p>{{ $t("docAdmin.inventories.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docAdmin.inventories.list1") }}</li>
            <li>{{ $t("docAdmin.inventories.list2") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.inventories.removeTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.inventories.remove1") }}</li>
              <li>{{ $t("docAdmin.inventories.remove2") }}</li>
              <li>{{ $t("docAdmin.inventories.remove3") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/admin-inventaires.png" alt="Capture des inventaires membres" />
            <figcaption>{{ $t("docAdmin.inventories.caption") }}</figcaption>
          </figure>
        </section>

        <section id="corbeille" class="doc-section">
          <h3>{{ $t("docAdmin.trash.title") }}</h3>
          <p>{{ $t("docAdmin.trash.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docAdmin.trash.list1") }}</li>
            <li>{{ $t("docAdmin.trash.list2") }}</li>
            <li>{{ $t("docAdmin.trash.list3") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.trash.howTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.trash.how1") }}</li>
              <li>{{ $t("docAdmin.trash.how2") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/admin-corbeille.png" alt="Capture de la corbeille" />
            <figcaption>{{ $t("docAdmin.trash.caption") }}</figcaption>
          </figure>
        </section>

        <section id="automation" class="doc-section">
          <h3>{{ $t("docAdmin.automation.title") }}</h3>
          <p>{{ $t("docAdmin.automation.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docAdmin.automation.list1") }}</li>
            <li>{{ $t("docAdmin.automation.list2") }}</li>
            <li>{{ $t("docAdmin.automation.list3") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.automation.howTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.automation.how1") }}</li>
              <li>{{ $t("docAdmin.automation.how2") }}</li>
              <li>{{ $t("docAdmin.automation.how3") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/admin-gains-auto.png" alt="Capture des gains automatiques" />
            <figcaption>{{ $t("docAdmin.automation.caption") }}</figcaption>
          </figure>
        </section>

        <section id="leaderboard" class="doc-section">
          <h3>{{ $t("docAdmin.leaderboard.title") }}</h3>
          <p>{{ $t("docAdmin.leaderboard.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docAdmin.leaderboard.list1") }}</li>
            <li>{{ $t("docAdmin.leaderboard.list2") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.leaderboard.howTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.leaderboard.how1") }}</li>
              <li>{{ $t("docAdmin.leaderboard.how2") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/admin-classement.png" alt="Capture du classement" />
            <figcaption>{{ $t("docAdmin.leaderboard.caption") }}</figcaption>
          </figure>
        </section>

        <section id="logs" class="doc-section">
          <h3>{{ $t("docAdmin.logs.title") }}</h3>
          <p>{{ $t("docAdmin.logs.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docAdmin.logs.list1") }}</li>
            <li>{{ $t("docAdmin.logs.list2") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.logs.howTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.logs.how1") }}</li>
              <li>{{ $t("docAdmin.logs.how2") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/admin-logs.png" alt="Capture des logs" />
            <figcaption>{{ $t("docAdmin.logs.caption") }}</figcaption>
          </figure>
        </section>

        <section id="twitch" class="doc-section">
          <h3>{{ $t("docAdmin.twitch.title") }}</h3>
          <p>{{ $t("docAdmin.twitch.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docAdmin.twitch.list1") }}</li>
            <li>{{ $t("docAdmin.twitch.list2") }}</li>
            <li>{{ $t("docAdmin.twitch.list3") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.twitch.howTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.twitch.how1") }}</li>
              <li>{{ $t("docAdmin.twitch.how2") }}</li>
              <li>{{ $t("docAdmin.twitch.how3") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/admin-twitch.png" alt="Capture des paramètres Twitch" />
            <figcaption>{{ $t("docAdmin.twitch.caption") }}</figcaption>
          </figure>
        </section>

        <section id="games" class="doc-section">
          <h3>{{ $t("docAdmin.games.title") }}</h3>
          <p>{{ $t("docAdmin.games.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docAdmin.games.list1") }}</li>
            <li>{{ $t("docAdmin.games.list2") }}</li>
            <li>{{ $t("docAdmin.games.list3") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.games.howTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.games.how1") }}</li>
              <li>{{ $t("docAdmin.games.how2") }}</li>
              <li>{{ $t("docAdmin.games.how3") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/admin-jeux.png" alt="Capture des paramètres jeux" />
            <figcaption>{{ $t("docAdmin.games.caption") }}</figcaption>
          </figure>
        </section>

        <section id="sensible" class="doc-section">
          <h3>{{ $t("docAdmin.sensitive.title") }}</h3>
          <p>{{ $t("docAdmin.sensitive.text") }}</p>
          <ul class="doc-list">
            <li>{{ $t("docAdmin.sensitive.list1") }}</li>
            <li>{{ $t("docAdmin.sensitive.list2") }}</li>
            <li>{{ $t("docAdmin.sensitive.list3") }}</li>
            <li>{{ $t("docAdmin.sensitive.list4") }}</li>
          </ul>
          <div class="doc-subsection">
            <h4>{{ $t("docAdmin.sensitive.bestTitle") }}</h4>
            <ul class="doc-list">
              <li>{{ $t("docAdmin.sensitive.best1") }}</li>
              <li>{{ $t("docAdmin.sensitive.best2") }}</li>
            </ul>
          </div>
          <figure class="doc-shot">
            <img src="/docs/admin-parametres-sensibles.png" alt="Capture des paramètres sensibles" />
            <figcaption>{{ $t("docAdmin.sensitive.caption") }}</figcaption>
          </figure>
        </section>

        <section id="faq" class="doc-section">
          <h3>{{ $t("docAdmin.faq.title") }}</h3>
          <ul class="doc-list">
            <li>{{ $t("docAdmin.faq.list1") }}</li>
            <li>{{ $t("docAdmin.faq.list2") }}</li>
            <li>{{ $t("docAdmin.faq.list3") }}</li>
            <li>{{ $t("docAdmin.faq.list4") }}</li>
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
:global(body.theme-light) .doc-list {
  color: var(--text-soft);
}
:global(body.theme-light) .doc-badges span {
  background: #eef2ff;
}
:global(body.theme-light) .panel-card,
:global(body.theme-light) .doc-toc,
:global(body.theme-light) .doc-section,
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

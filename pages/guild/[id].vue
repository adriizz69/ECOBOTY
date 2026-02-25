<template>
  <ClientOnly>
    <section class="page">
      <aside v-if="!guildBan?.banned" class="section-nav" :class="{ open: mobileMenuOpen }">
      <div class="section-head">
        <div class="section-title">{{ $t("adminGuild.sidebar.title") }}</div>
        <button
          class="section-toggle"
          type="button"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <span class="burger" :class="{ open: mobileMenuOpen }"></span>
          <span class="toggle-text">{{ $t("adminGuild.sidebar.menu") }}</span>
        </button>
      </div>
      <div class="section-links">
          <div class="nav-group">{{ $t("adminGuild.sidebar.groups.economy") }}</div>
          <button :class="['nav-item economy', activeTab === 'economy' && 'active']" @click="selectTab('economy')">
          🏠 {{ $t("adminGuild.sidebar.items.overview") }}
        </button>
          <button :class="['nav-item daily', activeTab === 'daily' && 'active']" @click="selectTab('daily')">
          📅 {{ $t("adminGuild.sidebar.items.daily") }}
        </button>
          <button :class="['nav-item shops', activeTab === 'shops' && 'active']" @click="selectTab('shops')">
          🏪 {{ $t("adminGuild.sidebar.items.shops") }}
        </button>
          <button :class="['nav-item inventories', activeTab === 'inventories' && 'active']" @click="selectTab('inventories')">
          📦 {{ $t("adminGuild.sidebar.items.inventories") }}
        </button>
          <button :class="['nav-item automation', activeTab === 'automation' && 'active']" @click="selectTab('automation')">
          🕐 {{ $t("adminGuild.sidebar.items.automation") }}
        </button>
          <div class="nav-divider"></div>
          <div class="nav-group">{{ $t("adminGuild.sidebar.groups.community") }}</div>
          <button :class="['nav-item nav-leaderboard', activeTab === 'leaderboard' && 'active']" @click="selectTab('leaderboard')">
          🏆 {{ $t("adminGuild.sidebar.items.leaderboard") }}
        </button>
          <button :class="['nav-item logs', activeTab === 'logs' && 'active']" @click="selectTab('logs')">
          📜 {{ $t("adminGuild.sidebar.items.logs") }}
        </button>
          <button
            :class="['nav-item message', activeTab === 'communityMessage' && 'active']"
            @click="selectTab('communityMessage')"
          >
            ✉️ {{ $t("adminGuild.sidebar.items.communityMessage") }}
          </button>
          <div class="nav-divider"></div>
          <div class="nav-group">{{ $t("adminGuild.sidebar.groups.integrations") }}</div>
          <button :class="['nav-item twitch', activeTab === 'twitch' && 'active']" @click="selectTab('twitch')">
          💬 {{ $t("adminGuild.sidebar.items.twitch") }}
        </button>
          <button :class="['nav-item games', activeTab === 'games' && 'active']" @click="selectTab('games')">
          🎮 {{ $t("adminGuild.sidebar.items.games") }}
        </button>
          <button :class="['nav-item achievements', activeTab === 'achievements' && 'active']" @click="selectTab('achievements')">
          🏅 Succes
        </button>
          <button
            :class="['nav-item achievements-giveaway', activeTab === 'achievementsGiveaway' && 'active']"
            @click="selectTab('achievementsGiveaway')"
          >
            🎉 Giveaway (bientot)
          </button>
          <button
            :class="['nav-item achievements-birthday', activeTab === 'achievementsBirthday' && 'active']"
            @click="selectTab('achievementsBirthday')"
          >
            🎂 Anniversaire
          </button>
          <div class="nav-divider"></div>
          <div class="nav-group">{{ $t("adminGuild.sidebar.groups.system") }}</div>
          <button
            v-if="!apiTabDisabled"
            :class="['nav-item api', activeTab === 'api' && 'active']"
            @click="selectTab('api')"
          >
            🛠️ {{ $t("adminGuild.sidebar.items.api") }}
          </button>
          <button :class="['nav-item bot', activeTab === 'bot' && 'active']" @click="selectTab('bot')">
            🤖 {{ $t("adminGuild.sidebar.items.bot") }}
          </button>
          <button :class="['nav-item sensitive', activeTab === 'sensitive' && 'active']" @click="selectTab('sensitive')">
          ⚠️ {{ $t("adminGuild.sidebar.items.sensitive") }}
        </button>
      </div>
    </aside>

      <div v-if="guildBan?.banned" class="card ban-card">
        <h3>{{ $t("adminGuild.ban.title") }}</h3>
        <p class="muted">{{ $t("adminGuild.ban.subtitle") }}</p>
        <p v-if="guildBan?.reason" class="muted">{{ $t("adminGuild.ban.reason") }} {{ guildBan?.reason }}</p>
      </div>
      <div v-if="!guildBan?.banned" class="section-content" :class="`theme-${activeTab}`">
      <div class="hero">
        <div class="hero-info">
          <span class="hero-kicker">{{ $t("adminGuild.sidebar.title") }}</span>
          <div class="hero-title">{{ $t("adminGuild.hero.title") }}</div>
          <div class="hero-sub">{{ $t("adminGuild.hero.subtitle") }}</div>
          <div class="hero-badges">
            <span class="hero-badge hero-badge-id">ID: {{ id }}</span>
            <span class="hero-badge" :class="form.enabled ? 'ok' : 'ko'">
              {{ form.enabled ? $t("adminGuild.status.enabled") : $t("adminGuild.status.disabled") }}
            </span>
            <span class="hero-badge">{{ $t("adminGuild.status.saved") }}</span>
          </div>
        </div>
        <div class="hero-actions">
          <UButton color="neutral" variant="outline">
            {{ form.enabled ? $t("adminGuild.status.enabled") : $t("adminGuild.status.disabled") }}
          </UButton>
          <UButton color="neutral" variant="outline">{{ $t("adminGuild.status.saved") }}</UButton>
        </div>
      </div>

      <UCard v-show="activeTab === 'economy'" class="card">
        <div class="card-head">
          <h3>{{ $t("adminGuild.economy.title") }}</h3>
          <UButton color="primary" @click="save">{{ $t("common.save") }}</UButton>
        </div>
        <div class="sub-card">
          <h4>{{ $t("adminGuild.economy.overviewTitle") }}</h4>
          <p class="muted">{{ $t("adminGuild.economy.overviewHelp") }}</p>
          <div class="stats-grid">
            <div class="stat-tile">
              <span>{{ $t("adminGuild.economy.stats.members") }}</span>
              <strong>{{ overviewStats.members ?? '—' }}</strong>
            </div>
            <div class="stat-tile">
              <span>{{ $t("adminGuild.economy.stats.online") }}</span>
              <strong>{{ overviewStats.online ?? '—' }}</strong>
            </div>
            <div class="stat-tile">
              <span>{{ $t("adminGuild.economy.stats.bots") }}</span>
              <strong>{{ overviewStats.bots ?? '—' }}</strong>
            </div>
          </div>
        </div>
        <div class="grid">
          <label>
            {{ $t("adminGuild.economy.currencyName") }}
            <input v-model="form.name" :placeholder="$t('adminGuild.economy.currencyPlaceholder')" />
          </label>
          <label>
            {{ $t("adminGuild.economy.currencySymbol") }}
            <div class="emoji-field">
              <UButton color="neutral" variant="outline" @click.stop="toggleEmojiPicker">
                <span class="emoji-preview" v-html="renderEmojiPreview(form.emoji || '💰')"></span>
                <span>{{ $t("adminGuild.economy.pickEmoji") }}</span>
              </UButton>
            </div>
            <div v-if="showEmojiPicker" class="emoji-popover floating" @click.stop>
              <div class="emoji-tabs">
                <button
                  type="button"
                  :class="['tab-pill', emojiTab === 'standard' && 'active']"
                  @click="emojiTab = 'standard'"
                >
                  {{ $t("adminGuild.economy.emojiTabs.standard") }}
                </button>
                <button
                  type="button"
                  :class="['tab-pill', emojiTab === 'server' && 'active']"
                  @click="emojiTab = 'server'"
                >
                  {{ $t("adminGuild.economy.emojiTabs.server") }}
                </button>
                <button
                  type="button"
                  :class="['tab-pill', emojiTab === 'bot' && 'active']"
                  @click="emojiTab = 'bot'"
                >
                  {{ $t("adminGuild.economy.emojiTabs.bot") }}
                </button>
              </div>
              <input v-model="emojiSearch" class="search" :placeholder="$t('adminGuild.economy.emojiSearch')" />
              <div v-if="emojiTab === 'standard'" class="emoji-grid">
                <button
                  v-for="emoji in filteredStandardEmojis"
                  :key="emoji"
                  class="emoji-item"
                  type="button"
                  @click="onEmojiSelect(emoji)"
                >
                  <span>{{ emoji }}</span>
                </button>
              </div>
              <div v-else class="emoji-grid">
                <button
                  v-for="emoji in filteredCustomEmojis"
                  :key="emoji.id"
                  class="emoji-item"
                  type="button"
                  @click.stop="onEmojiSelect(renderEmoji(emoji))"
                >
                  <img :src="emojiUrl(emoji)" :alt="emoji.name" />
                </button>
              </div>
              <div v-if="emojiTab === 'standard' && !filteredStandardEmojis.length" class="muted">
                {{ $t("adminGuild.economy.noEmoji") }}
              </div>
              <div v-if="emojiTab !== 'standard' && !filteredCustomEmojis.length" class="muted">
                {{ $t("adminGuild.economy.noEmoji") }}
              </div>
            </div>
          </label>
          <label>
            {{ $t("adminGuild.economy.startBalance") }}
            <input v-model.number="form.startBalance" type="number" />
          </label>
          <label>
            {{ $t("adminGuild.economy.maxBalance") }}
            <input v-model.number="form.maxBalance" type="number" />
          </label>
          <div class="switch-field">
            <span>{{ $t("adminGuild.economy.enabled") }}</span>
            <label class="switch">
              <input v-model="form.enabled" type="checkbox" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        <div class="sub-card">
          <h4>{{ $t("adminGuild.economy.logsTitle") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.economy.logsHelp") }}
          </p>
          <label>
            {{ $t("adminGuild.economy.logsChannel") }}
            <select v-model="form.logChannelId">
              <option value="">{{ $t("common.disabled") }}</option>
              <option v-for="channel in channels" :key="channel.id" :value="channel.id">
                {{ channel.name }}
              </option>
            </select>
          </label>
        </div>
        <div class="sub-card">
          <h4>{{ $t("adminGuild.userUi.title") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.userUi.help") }}
          </p>
          <div class="switch-field">
            <span>{{ $t("adminGuild.userUi.disabledLabel") }}</span>
            <label class="switch">
              <input v-model="userUiDisabled" type="checkbox" :disabled="userUiSaving" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </UCard>

      <UCard v-show="activeTab === 'bot'" class="card">
        <div class="card-head">
          <h3>{{ $t("adminGuild.bot.title") }}</h3>
          <UButton color="primary" @click="saveBotSettings">{{ $t("common.save") }}</UButton>
        </div>
        <div class="grid">
          <label>
            {{ $t("adminGuild.bot.language") }}
            <select v-model="botLanguage">
              <option v-for="option in botLanguageOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label>
            {{ $t("adminGuild.bot.timezone") }}
            <input
              v-model="timezoneInput"
              class="search"
              list="timezone-options"
              :placeholder="$t('adminGuild.bot.timezonePlaceholder')"
              @blur="applyTimezoneInput"
            />
            <datalist id="timezone-options">
              <option :value="autoTimezoneLabel"></option>
              <option v-for="row in timezoneOptionRows" :key="row.value" :value="row.label"></option>
            </datalist>
            <p class="muted" style="margin-top:6px;">
              {{ $t("adminGuild.bot.timezoneHelp") }}
            </p>
          </label>
        </div>
        <div class="sub-card">
          <h4>{{ $t("adminGuild.bot.logsTitle") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.bot.logsHelp") }}
          </p>
          <label>
            {{ $t("adminGuild.bot.logsChannel") }}
            <select v-model="botLogChannelId">
              <option value="">{{ $t("common.disabled") }}</option>
              <option v-for="channel in channels" :key="channel.id" :value="channel.id">
                {{ channel.name }}
              </option>
            </select>
          </label>
        </div>
      </UCard>

      <UCard v-show="activeTab === 'daily'" class="card">
        <div class="card-head">
          <h3>{{ $t("adminGuild.daily.title") }}</h3>
          <UButton color="primary" @click="save">{{ $t("common.save") }}</UButton>
        </div>
        <div class="sub-card">
          <h4>{{ $t("adminGuild.daily.aboutTitle") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.daily.aboutLine1") }}
            {{ $t("adminGuild.daily.aboutLine2") }}
          </p>
        </div>
        <div class="grid">
          <label>
            {{ $t("adminGuild.daily.base") }}
            <input v-model.number="form.dailyAmount" type="number" />
          </label>
          <label>
            {{ $t("adminGuild.daily.bonus7") }}
            <input v-model.number="form.streak7" type="number" />
          </label>
          <label>
            {{ $t("adminGuild.daily.bonus14") }}
            <input v-model.number="form.streak14" type="number" />
          </label>
          <label>
            {{ $t("adminGuild.daily.bonus30") }}
            <input v-model.number="form.streak30" type="number" />
          </label>
        </div>
      </UCard>

      <UCard v-show="activeTab === 'leaderboard'" class="card">
        <div class="card-head">
          <h3>{{ $t("adminGuild.leaderboard.title") }}</h3>
          <UButton color="neutral" variant="outline" @click="refreshLeaderboard">{{ $t("common.refresh") }}</UButton>
        </div>
        <div class="sub-card">
          <h4>{{ $t("adminGuild.leaderboard.autoTitle") }}</h4>
          <div class="muted" style="margin-bottom: 8px;">
            <span v-if="leaderboardPostStatus.status === 'exists'">
              {{ $t("adminGuild.leaderboard.posted", { channel: leaderboardPostStatus.channelName }) }}
            </span>
            <span v-else>
              {{ $t("adminGuild.leaderboard.none") }}
            </span>
          </div>
          <div v-if="leaderboardPostError" class="muted" style="margin-bottom: 8px; color: #fca5a5;">
            {{ leaderboardPostError }}
          </div>
          <div class="grid">
            <label>
              {{ $t("adminGuild.leaderboard.channel") }}
              <select v-model="leaderboardPost.channel_id">
                <option value="">{{ $t("adminGuild.leaderboard.selectChannel") }}</option>
                <option v-for="channel in channels" :key="channel.id" :value="channel.id">
                  {{ channel.name }}
                </option>
              </select>
            </label>
            <label>
              {{ $t("adminGuild.leaderboard.top") }}
              <select v-model.number="leaderboardPost.limit">
                <option :value="5">Top 5</option>
                <option :value="10">Top 10</option>
                <option :value="15">Top 15</option>
                <option :value="20">Top 20</option>
              </select>
            </label>
            <div class="switch-field">
              <span>{{ $t("common.enable") }}</span>
              <label class="switch">
                <input v-model="leaderboardPost.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="actions" style="justify-content: flex-start;">
            <UButton color="primary" @click="saveLeaderboardPost">{{ $t("common.save") }}</UButton>
            <UButton color="neutral" variant="outline" @click="deleteLeaderboardPost">{{ $t("common.delete") }}</UButton>
          </div>
        </div>
        <div class="stats" style="margin-bottom: 12px;">
          <div class="stat-card">
            <div class="stat-title">{{ $t("adminGuild.leaderboard.totalDay") }}</div>
            <div class="stat-value">{{ leaderboardSummary.day }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">{{ $t("adminGuild.leaderboard.totalMonth") }}</div>
            <div class="stat-value">{{ leaderboardSummary.month }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">{{ $t("adminGuild.leaderboard.totalYear") }}</div>
            <div class="stat-value">{{ leaderboardSummary.year }}</div>
          </div>
        </div>
        <div v-if="!leaderboard.length" class="muted">{{ $t("common.noData") }}</div>
        <ul class="leaderboard">
          <li v-for="row in leaderboard" :key="row.userId">
            <span>#{{ row.rank }}</span>
            <button class="link" type="button" @click="openLeaderboardDetails(row)">
              {{ leaderboardUsers[row.userId]?.displayName || row.userId }}
            </button>
            <span>{{ row.balance }}</span>
          </li>
        </ul>
        <div v-if="leaderboardTotalPages > 1" class="pagination">
          <UButton color="neutral" variant="outline" :disabled="leaderboardPage <= 1" @click="changeLeaderboardPage(-1)">
            {{ $t("common.prev") }}
          </UButton>
          <span>{{ $t("common.page") }} {{ leaderboardPage }} / {{ leaderboardTotalPages }}</span>
          <UButton
            color="neutral"
            variant="solid"
            :disabled="leaderboardPage >= leaderboardTotalPages"
            @click="changeLeaderboardPage(1)"
          >
            {{ $t("common.next") }}
          </UButton>
        </div>
      </UCard>

      <UCard v-show="activeTab === 'logs'" class="card">
        <div class="card-head">
          <div>
            <h3>{{ logsHeading }}</h3>
            <p class="muted">{{ logsDescription }}</p>
          </div>
          <UButton color="neutral" variant="outline" @click="refreshLogs">{{ $t("common.refresh") }}</UButton>
        </div>
        <div class="inline" style="margin-bottom: 10px;">
          <button
            type="button"
            :class="['tab-pill', logsCategoryTab === 'gains' && 'active']"
            @click="logsCategoryTab = 'gains'"
          >
            {{ $t("adminGuild.logs.tabs.gains") }}
          </button>
          <button
            type="button"
            :class="['tab-pill', logsCategoryTab === 'transactions' && 'active']"
            @click="logsCategoryTab = 'transactions'"
          >
            {{ $t("adminGuild.logs.tabs.transactions") }}
          </button>
          <button
            type="button"
            :class="['tab-pill', logsCategoryTab === 'games' && 'active']"
            @click="logsCategoryTab = 'games'"
          >
            {{ $t("adminGuild.logs.tabs.games") }}
          </button>
          <button
            type="button"
            :class="['tab-pill', logsCategoryTab === 'linked' && 'active']"
            @click="logsCategoryTab = 'linked'"
          >
            {{ $t("adminGuild.logs.tabs.linked") }}
          </button>
        </div>
        <div v-if="logsCategoryTab === 'gains'" class="inline" style="margin-bottom: 10px;">
          <button
            type="button"
            :class="['tab-pill', logsSourceTab === 'all' && 'active']"
            @click="logsSourceTab = 'all'"
          >
            {{ $t("adminGuild.logs.sources.all") }}
          </button>
          <button
            type="button"
            :class="['tab-pill', logsSourceTab === 'discord' && 'active']"
            @click="logsSourceTab = 'discord'"
          >
            {{ $t("adminGuild.logs.sources.discord") }}
          </button>
          <button
            type="button"
            :class="['tab-pill', logsSourceTab === 'twitch' && 'active']"
            @click="logsSourceTab = 'twitch'"
          >
            {{ $t("adminGuild.logs.sources.twitch") }}
          </button>
        </div>
        <div v-if="logsCategoryTab !== 'linked'" class="filters-grid" style="margin-bottom: 12px;">
          <label>
            {{ $t("adminGuild.logs.searchUser") }}
            <input v-model="logsUserSearch" class="search" :placeholder="$t('adminGuild.logs.searchUserPlaceholder')" />
          </label>
          <div class="clear-filter">
            <UButton color="neutral" variant="outline" @click="clearLogUser">
              {{ $t("adminGuild.logs.clearUser") }}
            </UButton>
          </div>
          <div v-if="showLogUserResults" class="user-search-results">
            <div class="muted" style="margin-bottom: 6px;">{{ $t("adminGuild.logs.pickUser") }}</div>
            <div class="user-results">
              <button
                v-for="row in filteredLogUsers"
                :key="row.userId"
                type="button"
                class="user-result"
                @click="selectLogUser(row)"
              >
                <div class="user-result-left">
                  <div class="user-avatar">👤</div>
                  <div>
                    <div class="user-name">
                      {{ row.displayName || row.userId }}
                    </div>
                    <div class="user-id">
                      <span v-if="row.username">@{{ row.username }}</span>
                      <span v-else>{{ $t("adminGuild.logs.idLabel") }} {{ row.userId }}</span>
                    </div>
                  </div>
                </div>
                <div class="user-action">{{ $t("common.select") }}</div>
              </button>
            </div>
          </div>
          <label>
            {{ $t("adminGuild.logs.searchText") }}
            <input v-model="logsSearch" class="search" :placeholder="logsSearchPlaceholder" />
          </label>
          <label>
            {{ $t("adminGuild.logs.dateFrom") }}
            <input v-model="logsDateFrom" type="date" />
          </label>
          <label>
            {{ $t("adminGuild.logs.dateTo") }}
            <input v-model="logsDateTo" type="date" />
          </label>
          <label>
            {{ $t("adminGuild.logs.sortBy") }}
            <select v-model="logsSortKey">
              <option value="date">{{ $t("adminGuild.logs.sort.date") }}</option>
              <option value="amount">{{ $t("adminGuild.logs.sort.amount") }}</option>
              <option value="user">{{ $t("adminGuild.logs.sort.user") }}</option>
              <option v-if="logsCategoryTab === 'gains'" value="source">{{ $t("adminGuild.logs.sort.source") }}</option>
              <option v-else value="type">{{ $t("adminGuild.logs.sort.type") }}</option>
            </select>
          </label>
          <label>
            {{ $t("adminGuild.logs.order") }}
            <select v-model="logsSortDir">
              <option value="desc">{{ $t("adminGuild.logs.orderDesc") }}</option>
              <option value="asc">{{ $t("adminGuild.logs.orderAsc") }}</option>
            </select>
          </label>
          <label>
            {{ $t("common.page") }}
            <select v-model.number="logsLimit">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </label>
        </div>
        <template v-if="logsCategoryTab !== 'linked'">
          <div v-if="!paginatedLogs.length" class="muted">{{ $t("adminGuild.logs.empty") }}</div>
          <div class="logs-table">
            <div class="logs-header">
              <span>{{ $t("adminGuild.logs.columns.date") }}</span>
              <span v-if="logsCategoryTab === 'gains'">{{ $t("adminGuild.logs.columns.source") }}</span>
              <span v-else-if="logsCategoryTab === 'transactions'">{{ $t("adminGuild.logs.columns.type") }}</span>
              <span v-else>{{ $t("adminGuild.logs.columns.game") }}</span>
              <span>{{ $t("adminGuild.logs.columns.user") }}</span>
              <span v-if="logsCategoryTab === 'gains'">{{ $t("adminGuild.logs.columns.gain") }}</span>
              <span v-else-if="logsCategoryTab === 'transactions'">{{ $t("adminGuild.logs.columns.item") }}</span>
              <span v-else>{{ $t("adminGuild.logs.columns.bet") }}</span>
              <span v-if="logsCategoryTab === 'gains'">{{ $t("adminGuild.logs.columns.base") }}</span>
              <span v-else-if="logsCategoryTab === 'transactions'">{{ $t("adminGuild.logs.columns.amount") }}</span>
              <span v-else>{{ $t("adminGuild.logs.columns.gain") }}</span>
              <span v-if="logsCategoryTab === 'gains'">{{ $t("adminGuild.logs.columns.multiplier") }}</span>
              <span v-else-if="logsCategoryTab === 'transactions'">{{ $t("adminGuild.logs.columns.details") }}</span>
              <span v-else>{{ $t("adminGuild.logs.columns.result") }}</span>
            </div>
            <div class="list">
              <div v-for="log in paginatedLogs" :key="log.id" class="list-row log-row">
                <span>{{ formatDateTime(log.created_at) }}</span>
                <template v-if="logsCategoryTab === 'gains'">
                  <span class="source-pill" :class="sourceMeta(log.source).kind">
                    {{ sourceMeta(log.source).icon }} {{ formatGainSource(log.source) }}
                  </span>
                  <span>{{ leaderboardUsers[log.user_discord_id]?.displayName || log.user_discord_id }}</span>
                  <span>{{ formatSignedAmount(log.total_amount) }}</span>
                  <span>{{ formatSignedAmount(log.base_amount) }}</span>
                  <span>{{ formatGainMultiplier(log) }}</span>
                </template>
                <template v-else-if="logsCategoryTab === 'transactions'">
                  <span class="source-pill transaction">
                    🧾 {{ formatTransactionType(log.type) }}
                  </span>
                  <span>{{ leaderboardUsers[log.user_discord_id]?.displayName || log.user_discord_id }}</span>
                  <span>{{ formatTransactionItem(log) }}</span>
                  <span>{{ formatAmount(formatTransactionAmount(log)) }}</span>
                  <span>{{ formatTransactionDetails(log) }}</span>
                </template>
                <template v-else>
                  <span class="source-pill game">🎮 {{ formatGameName(log.type) }}</span>
                  <span>{{ leaderboardUsers[log.user_discord_id]?.displayName || log.user_discord_id }}</span>
                  <span>{{ formatAmount(getGameBet(log)) }}</span>
                  <span>{{ formatAmount(getGamePayout(log)) }}</span>
                  <span>{{ formatGameOutcome(log) }}</span>
                </template>
              </div>
            </div>
          </div>
          <div class="pagination">
            <UButton color="neutral" variant="outline" :disabled="logsPage <= 1" @click="logsPage--">
              {{ $t("common.prev") }}
            </UButton>
            <span>{{ $t("common.page") }} {{ logsPage }} / {{ totalLogPages }}</span>
            <UButton color="neutral" variant="outline" :disabled="logsPage >= totalLogPages" @click="logsPage++">
              {{ $t("common.next") }}
            </UButton>
          </div>
        </template>
        <template v-else>
          <div v-if="linkedUsersLoading" class="muted">{{ $t("common.loading") }}</div>
          <div v-else-if="!linkedTwitchUsers.length" class="muted">{{ $t("adminGuild.logs.noLinkedUsers") }}</div>
          <div v-else class="list linked-list">
            <div class="list-row linked-header">
              <span>{{ $t("adminGuild.logs.linkedColumns.user") }}</span>
              <span>{{ $t("adminGuild.logs.linkedColumns.twitch") }}</span>
              <span>{{ $t("adminGuild.logs.linkedColumns.tier") }}</span>
              <span>{{ $t("adminGuild.logs.linkedColumns.discord") }}</span>
              <span>{{ $t("adminGuild.logs.linkedColumns.actions") }}</span>
            </div>
            <div v-for="user in paginatedLinkedUsers" :key="user.discord_id" class="list-row linked-row">
              <span>{{ leaderboardUsers[user.discord_id]?.displayName || user.username || user.discord_id }}</span>
              <span class="linked-twitch">@{{ user.twitch_login }}</span>
              <span class="linked-tier">
                <span class="pill" :class="tierPillClass(user)">
                  {{ formatLinkedTier(user) }}
                </span>
              </span>
              <span class="muted">{{ user.discord_id }}</span>
              <UButton
                color="error"
                variant="solid"
                :disabled="unlinkingUserId === String(user.discord_id)"
                @click="unlinkTwitchUser(user)"
              >
                {{ $t("adminGuild.logs.unlink") }}
              </UButton>
            </div>
          </div>
          <div v-if="linkedUsersTotalPages > 1" class="pagination">
            <UButton color="neutral" variant="outline" :disabled="linkedUsersPage <= 1" @click="linkedUsersPage--">
              {{ $t("common.prev") }}
            </UButton>
            <span>{{ $t("common.page") }} {{ linkedUsersPage }} / {{ linkedUsersTotalPages }}</span>
            <UButton
              color="neutral"
              variant="solid"
              :disabled="linkedUsersPage >= linkedUsersTotalPages"
              @click="linkedUsersPage++"
            >
              {{ $t("common.next") }}
            </UButton>
          </div>
        </template>
      </UCard>

      <UCard v-show="activeTab === 'communityMessage'" class="card">
        <div class="card-head">
          <div>
            <h3>{{ $t("adminGuild.communityMessage.title") }}</h3>
            <p class="muted">{{ $t("adminGuild.communityMessage.subtitle") }}</p>
          </div>
          <div class="actions">
            <UButton
              color="neutral"
              variant="solid"
              :disabled="communityMessageLoading"
              @click="loadCommunityMessage({ force: true })"
            >
              {{ $t("common.refresh") }}
            </UButton>
            <UButton
              color="error"
              variant="solid"
              :disabled="communityMessageDeleting || !communityMessageMessageId"
              @click="deleteCommunityMessage"
            >
              {{ $t("common.delete") }}
            </UButton>
            <UButton
              color="primary"
              :loading="communityMessageSending"
              :disabled="!communityMessageChannelId || !!communityMessageMessageId"
              @click="sendCommunityMessage"
            >
              {{ communityMessageSending ? $t("common.loading") : $t("adminGuild.communityMessage.send") }}
            </UButton>
          </div>
        </div>

        <div v-if="communityMessageMessageId" class="doc-callout" style="margin-bottom: 12px;">
          {{ $t("adminGuild.communityMessage.alreadySent") }}
        </div>

        <div class="grid">
          <label>
            {{ $t("adminGuild.communityMessage.channel") }}
            <select v-model="communityMessageChannelId">
              <option value="">{{ $t("adminGuild.communityMessage.selectChannel") }}</option>
              <option v-for="channel in channels" :key="channel.id" :value="channel.id">
                {{ channel.name }}
              </option>
            </select>
          </label>
          <div class="switch-field">
            <span>{{ $t("adminGuild.communityMessage.includeShopDiscounts") }}</span>
            <label class="switch">
              <input v-model="communityMessageIncludeShopDiscounts" type="checkbox" />
              <span class="slider"></span>
            </label>
          </div>
          <div class="switch-field">
            <span>{{ $t("adminGuild.communityMessage.includeGameChances") }}</span>
            <label class="switch">
              <input v-model="communityMessageIncludeGameChances" type="checkbox" />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.communityMessage.sectionsTitle") }}</h4>
          <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
            <div v-for="section in communitySectionOptions" :key="section.key" class="switch-field">
              <span>{{ section.label }}</span>
              <label class="switch">
                <input v-model="communityMessageSections" type="checkbox" :value="section.key" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.communityMessage.shopsTitle") }}</h4>
          <p class="muted">{{ $t("adminGuild.communityMessage.shopsHelp") }}</p>
          <div v-if="!shops.length" class="muted">{{ $t("adminGuild.shops.empty") }}</div>
          <div v-else class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
            <div v-for="shop in shops" :key="shop.id" class="switch-field">
              <span>{{ shop.name }}</span>
              <label class="switch">
                <input v-model="communityMessageShopIds" type="checkbox" :value="String(shop.id)" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="muted" style="margin-top: 6px;">
            {{ $t("adminGuild.communityMessage.shopsAllHint") }}
          </div>
        </div>

        <div class="sub-card">
          <div class="card-head" style="margin-bottom: 10px;">
            <h4>{{ $t("adminGuild.communityMessage.previewTitle") }}</h4>
            <UButton color="neutral" variant="outline" :loading="communityMessagePreviewing" @click="previewCommunityMessage">
              {{ $t("adminGuild.communityMessage.preview") }}
            </UButton>
          </div>
          <div class="code-block preview-message" v-html="communityMessagePreviewHtml"></div>
          <div class="muted" style="margin-top: 6px;">
            {{ $t("adminGuild.communityMessage.length", { count: communityMessagePreviewLength }) }}
          </div>
        </div>

        <div v-if="communityMessageStatus" class="muted">{{ communityMessageStatus }}</div>
      </UCard>

      <UCard v-if="!apiTabDisabled" v-show="activeTab === 'api'" class="card">
        <div class="card-head">
          <h3>{{ $t("adminGuild.api.title") }}</h3>
          <span class="muted">{{ $t("adminGuild.api.subtitle") }}</span>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.api.stepsTitle") }}</h4>
          <div class="list">
            <div class="list-row">
              <span>{{ $t("adminGuild.api.step1") }}</span>
            </div>
            <div class="list-row">
              <span>{{ $t("adminGuild.api.step2") }}</span>
            </div>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.api.commandTitle") }}</h4>
          <p class="muted">{{ $t("adminGuild.api.commandHelp") }}</p>
          <div class="list">
            <div class="list-row">
              <span>{{ $t("adminGuild.api.url") }}</span>
              <span>{{ config.public.apiBase }}/api/twitch/add-money</span>
            </div>
            <div class="list-row">
              <span>{{ $t("adminGuild.api.method") }}</span>
              <span>POST</span>
            </div>
            <div class="list-row">
              <span>{{ $t("adminGuild.api.header") }}</span>
              <span>x-api-key: API_SECRET_KEY</span>
            </div>
            <div class="list-row">
              <span>{{ $t("adminGuild.api.body") }}</span>
              <span>{ "guildId": "{{ id }}", "amount": MONTANT, "twitchLogin": "TWITCH_LOGIN" }</span>
            </div>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.api.errorTitle") }}</h4>
          <div class="list">
            <div class="list-row">
              <span>{{ $t("adminGuild.api.errorLabel") }}</span>
              <span>{{ $t("adminGuild.api.errorText") }}</span>
            </div>
          </div>
        </div>
      </UCard>

      <UCard v-show="activeTab === 'twitch'" class="card">
        <div class="card-head">
          <div>
            <h3>{{ $t("adminGuild.twitch.title") }}</h3>
            <p class="muted">{{ $t("adminGuild.twitch.subtitle") }}</p>
          </div>
          <UButton color="primary" @click="saveTwitchAutomation">{{ $t("adminGuild.twitch.saveAutomation") }}</UButton>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.twitch.connectionTitle") }}</h4>
          <div class="list">
            <div class="list-row">
              <span>{{ $t("adminGuild.twitch.account") }}</span>
              <span>
                <strong v-if="twitchStatus.connected">{{ $t("adminGuild.twitch.accountConnected", { login: twitchStatus.login }) }}</strong>
                <span v-else>{{ $t("adminGuild.twitch.accountDisconnected") }}</span>
              </span>
            </div>
            <div class="list-row">
              <span>{{ $t("adminGuild.twitch.live") }}</span>
              <span>
                <strong v-if="twitchStatus.live" style="color:#34d399;">{{ $t("adminGuild.twitch.liveOn") }}</strong>
                <span v-else class="muted">{{ $t("adminGuild.twitch.liveOff") }}</span>
              </span>
            </div>
            <div class="list-row">
              <span>{{ $t("adminGuild.twitch.activityMode") }}</span>
              <span>
                <strong v-if="twitchLiveOnly">{{ $t("adminGuild.twitch.liveOnly") }}</strong>
                <span v-else class="muted">{{ $t("adminGuild.twitch.liveAndOffline") }}</span>
              </span>
            </div>
          </div>
          <div class="actions" style="justify-content: flex-start;">
            <UButton
              v-if="!twitchStatus.connected"
              color="primary"
              :to="twitchConnectUrl"
              external
            >
              {{ $t("adminGuild.twitch.connect") }}
            </UButton>
            <UButton v-else color="neutral" variant="outline" @click="disconnectTwitch">
              {{ $t("adminGuild.twitch.disconnect") }}
            </UButton>
          </div>
          <div class="grid" style="margin-top: 10px;">
            <div class="switch-field">
              <span>{{ $t("adminGuild.twitch.liveOnly") }}</span>
              <label class="switch">
                <input v-model="twitchLiveOnly" type="checkbox" :disabled="!twitchStatus.connected" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="actions" style="justify-content: flex-start;">
              <UButton
                color="neutral"
                variant="solid"
                :disabled="!twitchStatus.connected"
                @click="saveTwitchLiveMode"
              >
                {{ $t("adminGuild.twitch.saveMode") }}
              </UButton>
            </div>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.twitch.automationTitle") }}</h4>
          <p class="muted">
            {{ twitchLiveOnly ? $t("adminGuild.twitch.automationLiveOnly") : $t("adminGuild.twitch.automationAlways") }}
          </p>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("adminGuild.twitch.messagesEnabled") }}</span>
              <label class="switch">
                <input v-model="twitchAutomation.message.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.twitch.minGain") }}
              <input v-model.number="twitchAutomation.message.min_gain" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.twitch.maxGain") }}
              <input v-model.number="twitchAutomation.message.max_gain" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.twitch.everyMessages") }}
              <input v-model.number="twitchAutomation.message.interval" type="number" />
            </label>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.twitch.watchTitle") }}</h4>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("adminGuild.twitch.watchEnabled") }}</span>
              <label class="switch">
                <input v-model="twitchAutomation.watch.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.twitch.minGain") }}
              <input v-model.number="twitchAutomation.watch.min_gain" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.twitch.maxGain") }}
              <input v-model.number="twitchAutomation.watch.max_gain" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.twitch.everyMinutes") }}
              <input v-model.number="twitchAutomation.watch.interval" type="number" />
            </label>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.twitch.subMultipliersTitle") }}</h4>
          <div class="inline" style="justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <p class="muted">{{ $t("adminGuild.twitch.subMultipliersHelp") }}</p>
            <UButton color="neutral" variant="outline" @click="syncTwitchSubs">
              {{ $t("adminGuild.twitch.syncSubs") }}
            </UButton>
          </div>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
            <div class="sub-card" style="margin:0;">
              <div class="item-title">{{ $t("adminGuild.twitch.subPrime") }}</div>
              <label>
                {{ $t("adminGuild.twitch.multiplier") }}
                <input v-model.number="twitchAutomation.multipliers.prime.value" type="number" step="0.1" />
              </label>
              <div class="switch-field compact">
                <span>{{ $t("common.active") }}</span>
                <label class="switch">
                  <input v-model="twitchAutomation.multipliers.prime.enabled" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
            <div class="sub-card" style="margin:0;">
              <div class="item-title">{{ $t("adminGuild.twitch.subT1") }}</div>
              <label>
                {{ $t("adminGuild.twitch.multiplier") }}
                <input v-model.number="twitchAutomation.multipliers.t1.value" type="number" step="0.1" />
              </label>
              <div class="switch-field compact">
                <span>{{ $t("common.active") }}</span>
                <label class="switch">
                  <input v-model="twitchAutomation.multipliers.t1.enabled" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
            <div class="sub-card" style="margin:0;">
              <div class="item-title">{{ $t("adminGuild.twitch.subT2") }}</div>
              <label>
                {{ $t("adminGuild.twitch.multiplier") }}
                <input v-model.number="twitchAutomation.multipliers.t2.value" type="number" step="0.1" />
              </label>
              <div class="switch-field compact">
                <span>{{ $t("common.active") }}</span>
                <label class="switch">
                  <input v-model="twitchAutomation.multipliers.t2.enabled" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
            <div class="sub-card" style="margin:0;">
              <div class="item-title">{{ $t("adminGuild.twitch.subT3") }}</div>
              <label>
                {{ $t("adminGuild.twitch.multiplier") }}
                <input v-model.number="twitchAutomation.multipliers.t3.value" type="number" step="0.1" />
              </label>
              <div class="switch-field compact">
                <span>{{ $t("common.active") }}</span>
                <label class="switch">
                  <input v-model="twitchAutomation.multipliers.t3.enabled" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.twitch.eventsTitle") }}</h4>
          <p class="muted">{{ $t("adminGuild.twitch.eventsHelp") }}</p>
          <div style="display:grid; gap: 12px;">
            <div>
              <div class="item-title" style="margin-bottom:8px;">{{ $t("adminGuild.twitch.eventsSubs") }}</div>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
                <div class="sub-card" style="margin:0;">
                  <div class="item-title">Sub T1</div>
                  <label>
                    {{ $t("adminGuild.twitch.amount") }}
                    <input v-model.number="twitchAutomation.events.sub_t1.amount" type="number" />
                  </label>
                  <div class="switch-field compact">
                    <span>{{ $t("common.active") }}</span>
                    <label class="switch">
                      <input v-model="twitchAutomation.events.sub_t1.enabled" type="checkbox" />
                      <span class="slider"></span>
                    </label>
                  </div>
                </div>
                <div class="sub-card" style="margin:0;">
                  <div class="item-title">Sub T2</div>
                  <label>
                    {{ $t("adminGuild.twitch.amount") }}
                    <input v-model.number="twitchAutomation.events.sub_t2.amount" type="number" />
                  </label>
                  <div class="switch-field compact">
                    <span>{{ $t("common.active") }}</span>
                    <label class="switch">
                      <input v-model="twitchAutomation.events.sub_t2.enabled" type="checkbox" />
                      <span class="slider"></span>
                    </label>
                  </div>
                </div>
                <div class="sub-card" style="margin:0;">
                  <div class="item-title">Sub T3</div>
                  <label>
                    {{ $t("adminGuild.twitch.amount") }}
                    <input v-model.number="twitchAutomation.events.sub_t3.amount" type="number" />
                  </label>
                  <div class="switch-field compact">
                    <span>{{ $t("common.active") }}</span>
                    <label class="switch">
                      <input v-model="twitchAutomation.events.sub_t3.enabled" type="checkbox" />
                      <span class="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div class="item-title" style="margin-bottom:8px;">{{ $t("adminGuild.twitch.eventsSubgifts") }}</div>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
                <div class="sub-card" style="margin:0;">
                  <div class="item-title">Subgift T1</div>
                  <label>
                    {{ $t("adminGuild.twitch.amount") }}
                    <input v-model.number="twitchAutomation.events.subgift_t1.amount" type="number" />
                  </label>
                  <div class="switch-field compact">
                    <span>{{ $t("common.active") }}</span>
                    <label class="switch">
                      <input v-model="twitchAutomation.events.subgift_t1.enabled" type="checkbox" />
                      <span class="slider"></span>
                    </label>
                  </div>
                </div>
                <div class="sub-card" style="margin:0;">
                  <div class="item-title">Subgift T2</div>
                  <label>
                    {{ $t("adminGuild.twitch.amount") }}
                    <input v-model.number="twitchAutomation.events.subgift_t2.amount" type="number" />
                  </label>
                  <div class="switch-field compact">
                    <span>{{ $t("common.active") }}</span>
                    <label class="switch">
                      <input v-model="twitchAutomation.events.subgift_t2.enabled" type="checkbox" />
                      <span class="slider"></span>
                    </label>
                  </div>
                </div>
                <div class="sub-card" style="margin:0;">
                  <div class="item-title">Subgift T3</div>
                  <label>
                    {{ $t("adminGuild.twitch.amount") }}
                    <input v-model.number="twitchAutomation.events.subgift_t3.amount" type="number" />
                  </label>
                  <div class="switch-field compact">
                    <span>{{ $t("common.active") }}</span>
                    <label class="switch">
                      <input v-model="twitchAutomation.events.subgift_t3.enabled" type="checkbox" />
                      <span class="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="sub-card" style="margin:0;">
              <div class="item-title">{{ $t("adminGuild.twitch.eventsBits") }}</div>
              <label>
                {{ $t("adminGuild.twitch.amount") }}
                <input v-model.number="twitchAutomation.events.bits.amount" type="number" />
              </label>
              <div class="switch-field compact">
                <span>{{ $t("common.active") }}</span>
                <label class="switch">
                  <input v-model="twitchAutomation.events.bits.enabled" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="sub-card">
          <div class="card-head" style="margin-bottom: 12px;">
            <h4>{{ $t("adminGuild.twitch.dailyTitle") }}</h4>
            <UButton color="primary" @click="saveTwitchDailySettings">{{ $t("common.save") }}</UButton>
          </div>
          <p class="muted" style="margin-bottom: 10px;">
            {{ $t("adminGuild.twitch.dailyHelp") }}
          </p>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("common.enabled") }}</span>
              <label class="switch">
                <input v-model="twitchDaily.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.twitch.dailyBase") }}
              <input v-model.number="twitchDaily.dailyAmount" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.twitch.dailyBonus7") }}
              <input v-model.number="twitchDaily.streak7" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.twitch.dailyBonus14") }}
              <input v-model.number="twitchDaily.streak14" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.twitch.dailyBonus30") }}
              <input v-model.number="twitchDaily.streak30" type="number" />
            </label>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.twitch.commandTitle") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.twitch.commandHelp") }}
          </p>
          <div class="list">
            <div class="list-row">
              <span><strong>{{ $t("adminGuild.twitch.important") }}</strong></span>
              <span>{{ $t("adminGuild.twitch.commandImportant") }}</span>
            </div>
          </div>
        </div>
      </UCard>

      <UCard v-show="activeTab === 'games'" class="card">
        <div class="card-head">
          <div>
            <h3>{{ $t("adminGuild.games.title") }}</h3>
            <p class="muted">{{ $t("adminGuild.games.subtitle") }}</p>
          </div>
          <UButton color="primary" @click="saveGamesSettings">{{ $t("common.save") }}</UButton>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.games.globalTitle") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.games.globalHelp") }}
          </p>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("adminGuild.games.enableAll") }}</span>
              <label class="switch">
                <input v-model="gamesConfig.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.games.minBet") }}
              <input v-model.number="gamesConfig.minBet" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.maxBet") }}
              <input v-model.number="gamesConfig.maxBet" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.cooldown") }}
              <input v-model.number="gamesConfig.cooldownSeconds" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.houseEdge") }}
              <input v-model.number="gamesConfig.houseEdgePercent" type="number" />
            </label>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.games.commandsTitle") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.games.commandsHelp") }}
          </p>
          <div class="list">
            <div class="list-row"><span>{{ $t("adminGuild.games.coinFlip.title") }}</span><span>/jeux → Coin Flip</span></div>
            <div class="list-row"><span>{{ $t("adminGuild.games.dice.title") }}</span><span>/jeux → Dice</span></div>
            <div class="list-row"><span>{{ $t("adminGuild.games.slot.title") }}</span><span>/jeux → Slot</span></div>
            <div class="list-row"><span>{{ $t("adminGuild.games.roulette.title") }}</span><span>/jeux → Roulette</span></div>
            <div class="list-row"><span>{{ $t("adminGuild.games.higherLower.title") }}</span><span>/jeux → Higher/Lower</span></div>
            <div class="list-row"><span>{{ $t("adminGuild.games.crash.title") }}</span><span>/jeux → Crash</span></div>
            <div class="list-row"><span>{{ $t("adminGuild.games.double.title") }}</span><span>/jeux → Double</span></div>
            <div class="list-row"><span>{{ $t("adminGuild.games.mystery.title") }}</span><span>/jeux → Mystery</span></div>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.games.coinFlip.title") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.games.coinFlip.help") }}
          </p>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("common.enable") }}</span>
              <label class="switch">
                <input v-model="gamesConfig.flip.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.games.winChance") }}
              <input v-model.number="gamesConfig.flip.winChancePercent" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.winMultiplier") }}
              <input v-model.number="gamesConfig.flip.winMultiplier" type="number" />
            </label>
            <div class="switch-field">
              <span>{{ $t("adminGuild.games.jackpotEnabled") }}</span>
              <label class="switch">
                <input v-model="gamesConfig.flip.jackpotEnabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.games.jackpotChance") }}
              <input v-model.number="gamesConfig.flip.jackpotChancePercent" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.jackpotMultiplier") }}
              <input v-model.number="gamesConfig.flip.jackpotMultiplier" type="number" />
            </label>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.games.dice.title") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.games.dice.help") }}
          </p>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("common.enable") }}</span>
              <label class="switch">
                <input v-model="gamesConfig.dice.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.games.dice.sides") }}
              <input v-model.number="gamesConfig.dice.sides" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.winChance") }}
              <input v-model.number="gamesConfig.dice.winChancePercent" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.winMultiplier") }}
              <input v-model.number="gamesConfig.dice.winMultiplier" type="number" />
            </label>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.games.slot.title") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.games.slot.help") }}
          </p>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("common.enable") }}</span>
              <label class="switch">
                <input v-model="gamesConfig.slot.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.games.slot.symbols") }}
              <input v-model="slotSymbolsInput" :placeholder="$t('adminGuild.games.slot.symbolsPlaceholder')" />
            </label>
            <label>
              {{ $t("adminGuild.games.slot.twoKindMultiplier") }}
              <input v-model.number="gamesConfig.slot.twoOfKindMultiplier" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.slot.payouts") }}
              <textarea v-model="slotPayoutsInput" rows="5" :placeholder="$t('adminGuild.games.slot.payoutsPlaceholder')"></textarea>
            </label>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.games.roulette.title") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.games.roulette.help") }}
          </p>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("common.enable") }}</span>
              <label class="switch">
                <input v-model="gamesConfig.roulette.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.games.roulette.red") }}
              <input v-model.number="gamesConfig.roulette.red.chance" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.roulette.redMultiplier") }}
              <input v-model.number="gamesConfig.roulette.red.multiplier" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.roulette.black") }}
              <input v-model.number="gamesConfig.roulette.black.chance" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.roulette.blackMultiplier") }}
              <input v-model.number="gamesConfig.roulette.black.multiplier" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.roulette.green") }}
              <input v-model.number="gamesConfig.roulette.green.chance" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.roulette.greenMultiplier") }}
              <input v-model.number="gamesConfig.roulette.green.multiplier" type="number" />
            </label>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.games.higherLower.title") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.games.higherLower.help") }}
          </p>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("common.enable") }}</span>
              <label class="switch">
                <input v-model="gamesConfig.higherLower.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.games.higherLower.maxNumber") }}
              <input v-model.number="gamesConfig.higherLower.maxNumber" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.winChance") }}
              <input v-model.number="gamesConfig.higherLower.winChancePercent" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.winMultiplier") }}
              <input v-model.number="gamesConfig.higherLower.winMultiplier" type="number" />
            </label>
            <div class="switch-field">
              <span>{{ $t("adminGuild.games.higherLower.streakBonus") }}</span>
              <label class="switch">
                <input v-model="gamesConfig.higherLower.streakBonusEnabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.games.crash.title") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.games.crash.help") }}
          </p>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("common.enable") }}</span>
              <label class="switch">
                <input v-model="gamesConfig.crash.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.games.crash.maxMultiplier") }}
              <input v-model.number="gamesConfig.crash.maxMultiplier" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.crash.crashChance") }}
              <input v-model.number="gamesConfig.crash.crashChancePerTickPercent" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.crash.speed") }}
              <select v-model="gamesConfig.crash.speed">
                <option value="slow">{{ $t("adminGuild.games.crash.speedSlow") }}</option>
                <option value="normal">{{ $t("adminGuild.games.crash.speedNormal") }}</option>
                <option value="fast">{{ $t("adminGuild.games.crash.speedFast") }}</option>
              </select>
            </label>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.games.double.title") }}</h4>
          <p class="muted">{{ $t("adminGuild.games.double.help") }}</p>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("common.enable") }}</span>
              <label class="switch">
                <input v-model="gamesConfig.double.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.games.winChance") }}
              <input v-model.number="gamesConfig.double.winChancePercent" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.games.multiplier") }}
              <input v-model.number="gamesConfig.double.multiplier" type="number" />
            </label>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.games.mystery.title") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.games.mystery.help") }}
          </p>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("common.enable") }}</span>
              <label class="switch">
                <input v-model="gamesConfig.mystery.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.games.mystery.outcomes") }}
              <textarea v-model="mysteryOutcomesInput" rows="6" :placeholder="$t('adminGuild.games.mystery.outcomesPlaceholder')"></textarea>
            </label>
          </div>
        </div>
      </UCard>

      <UCard v-show="activeTab === 'sensitive'" class="card">
        <div class="card-head">
          <h3>{{ $t("adminGuild.sensitive.title") }}</h3>
        </div>
        <div class="sub-card">
          <h4>{{ $t("adminGuild.sensitive.rolesTitle") }}</h4>
          <p class="muted">{{ $t("adminGuild.sensitive.rolesHelp") }}</p>
          <div class="actions" style="justify-content: flex-start;">
            <UButton color="neutral" variant="outline" @click="refreshRoles">{{ $t("adminGuild.sensitive.refreshRoles") }}</UButton>
          </div>
        </div>
        <div class="sub-card">
          <h4>{{ $t("adminGuild.sensitive.resetTitle") }}</h4>
          <p class="muted">{{ $t("adminGuild.sensitive.resetHelp") }}</p>
          <div class="actions" style="justify-content: flex-start;">
            <UButton color="error" variant="solid" @click="resetCoins">{{ $t("adminGuild.sensitive.resetAction") }}</UButton>
          </div>
        </div>
      </UCard>

      <UCard v-show="activeTab === 'shops'" class="card">
        <div class="card-head">
          <div>
            <h3>{{ $t("adminGuild.shops.title") }}</h3>
            <p class="muted">{{ $t("adminGuild.shops.subtitle") }}</p>
          </div>
        </div>

        <div class="grid" style="margin-bottom: 12px;">
          <label>
            {{ $t("adminGuild.shops.name") }}
            <input v-model="newShop.name" :placeholder="$t('adminGuild.shops.namePlaceholder')" />
          </label>
          <label>
            {{ $t("adminGuild.shops.discount") }}
            <input v-model.number="newShop.discount_percent" type="number" />
          </label>
          <label>
            {{ $t("adminGuild.shops.requiredRoles") }}
            <div class="role-picker" @click.stop>
              <div class="role-input" @click="showNewShopRolePicker = true; refreshRoles()">
                <span
                  v-for="role in newShopRoleIds"
                  :key="role"
                  class="chip"
                  @click="removeShopRole(role)"
                  role="button"
                  tabindex="0"
                  @keydown.enter="removeShopRole(role)"
                >
                  {{ roleName(role) }} ×
                </span>
                <input
                  v-model="newShopRoleSearch"
                  class="role-search"
                  :placeholder="$t('adminGuild.shops.searchRole')"
                  @focus="showNewShopRolePicker = true; refreshRoles()"
                />
              </div>
              <div v-if="showNewShopRolePicker" class="role-results role-results-popover">
                <button
                  v-for="role in filteredNewShopRoles"
                  :key="role.id"
                  type="button"
                  class="role-row"
                  @mousedown.prevent
                  @click.stop="addShopRole(role.id)"
                >
                  {{ role.name }}
                </button>
              </div>
            </div>
            <p class="muted" style="margin-top: 6px;">
              {{ $t("adminGuild.shops.rolesHint") }}
            </p>
          </label>
        </div>
        <div class="actions" style="margin-bottom: 12px;">
          <UButton color="primary" @click="createShop">{{ $t("adminGuild.shops.create") }}</UButton>
        </div>

        <div class="shops-grid">
          <div v-if="!shops.length" class="muted">{{ $t("adminGuild.shops.empty") }}</div>
          <div v-for="shop in shops" :key="shop.id" class="shop-card">
            <div class="shop-main">
              <div>
                <div class="item-title">{{ shop.name }}</div>
                <div class="item-sub">{{ $t("adminGuild.shops.discountLabel") }} {{ shop.discount_percent }}%</div>
              </div>
              <label class="switch" :aria-label="$t('adminGuild.shops.enableAria')">
                <input
                  type="checkbox"
                  :checked="shop.enabled"
                  @change="toggleShopEnabled(shop)"
                />
                <span class="slider"></span>
              </label>
            </div>
            <div class="shop-actions">
              <UButton color="neutral" variant="outline" @click="openShopSettings(shop)">{{ $t("common.settings") }}</UButton>
              <UButton color="primary" @click="openShopItems(shop)">{{ $t("adminGuild.shops.items") }}</UButton>
              <UButton color="neutral" variant="outline" @click="deleteShop(shop.id)">{{ $t("common.delete") }}</UButton>
            </div>
          </div>
        </div>
      </UCard>

      <UCard v-show="activeTab === 'inventories'" class="card">
        <div class="card-head">
          <div>
            <h3>{{ $t("adminGuild.inventories.title") }}</h3>
            <p class="muted">{{ $t("adminGuild.inventories.subtitle") }}</p>
          </div>
          <div class="actions">
            <UButton color="neutral" variant="outline" @click="loadInventories({ force: true })">
              {{ $t("common.refresh") }}
            </UButton>
          </div>
        </div>
        <div class="inv-toolbar">
          <input
            v-model="inventorySearch"
            class="search"
            :placeholder="$t('adminGuild.inventories.searchMember')"
          />
          <div class="inv-hint muted">{{ $t("adminGuild.inventories.hint") }}</div>
        </div>

        <div class="inv-layout">
          <div class="inv-members">
            <div v-if="inventoryLoading" class="muted">{{ $t("common.loading") }}</div>
            <div v-else-if="!inventoryUsersSorted.length" class="muted">
              {{ $t("adminGuild.inventories.empty") }}
            </div>
            <div v-else class="inv-members-list">
              <button
                v-for="user in inventoryUsersSorted"
                :key="user.userId"
                type="button"
                :class="['inv-member', inventorySelectedUserId === user.userId && 'active']"
                @click="selectInventoryUser(user.userId)"
              >
                <div class="inv-avatar">
                  <img v-if="inventoryAvatarUrl(user)" :src="inventoryAvatarUrl(user)" alt="" />
                  <span v-else>{{ userInitials(user) }}</span>
                </div>
                <div class="inv-member-info">
                  <div class="inv-member-name">{{ inventoryDisplayName(user) }}</div>
                  <div class="inv-member-meta">{{ $t("adminGuild.inventories.itemsCount", { count: user.totalQuantity }) }}</div>
                </div>
              </button>
            </div>
          </div>

          <div class="inv-items">
            <div v-if="!selectedInventoryUser" class="inv-empty muted">
              {{ $t("adminGuild.inventories.selectUser") }}
            </div>
            <div v-else>
              <div class="inv-items-head">
                <div class="inv-avatar large">
                  <img
                    v-if="inventoryAvatarUrl(selectedInventoryUser)"
                    :src="inventoryAvatarUrl(selectedInventoryUser)"
                    alt=""
                  />
                  <span v-else>{{ userInitials(selectedInventoryUser) }}</span>
                </div>
                <div>
                  <div class="inv-member-name">{{ inventoryDisplayName(selectedInventoryUser) }}</div>
                  <div class="inv-member-meta">
                    {{ $t("adminGuild.inventories.totalItems", { count: selectedInventoryUser.totalQuantity }) }} ·
                    {{ $t("adminGuild.inventories.distinctItems", { count: selectedInventoryUser.items.length }) }}
                  </div>
                </div>
              </div>

              <div class="inv-grid">
                <div
                  v-for="entry in selectedInventoryUser.items"
                  :key="`inv-${selectedInventoryUser.userId}-${entry.itemId}`"
                  class="inv-item"
                >
                  <div class="inv-item-main">
                    <div class="inv-item-icon">
                      <img v-if="entry.image_url" :src="entry.image_url" alt="" />
                      <span v-else>🎒</span>
                    </div>
                    <div class="inv-item-text">
                      <div class="inv-item-name">{{ entry.name }}</div>
                      <div class="inv-item-meta">
                        {{ entry.type }} · x{{ entry.quantity }}
                        <span v-if="entry.hidden" class="pill muted">{{ $t("adminGuild.inventories.hidden") }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="inv-item-actions">
                    <input
                      v-model.number="inventoryRemoveQuantities[inventoryRemoveKey(selectedInventoryUser.userId, entry.itemId)]"
                      type="number"
                      min="1"
                      :max="entry.quantity"
                      class="inv-qty"
                      :placeholder="$t('adminGuild.inventories.qty')"
                    />
                    <UButton
                      color="error"
                      variant="solid"
                      @click="removeInventory(selectedInventoryUser.userId, entry.itemId)"
                    >
                      {{ $t("adminGuild.inventories.remove") }}
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <AchievementsAdminPanel v-show="activeTab === 'achievements'" :guild-id="String(id)" />

      <UCard v-show="activeTab === 'achievementsGiveaway'" class="card">
        <div class="card-head">
          <h3>Giveaway</h3>
        </div>
        <div class="sub-card">
          <h4>Fonctionnalite a venir</h4>
          <p class="muted">
            Cet onglet est reserve au futur module de succes lies aux giveaway.
          </p>
          <p class="muted small">
            Rien n'est configure ici pour le moment.
          </p>
        </div>
      </UCard>

      <BirthdayAdminPanel v-show="activeTab === 'achievementsBirthday'" :guild-id="String(id)" />

      <UCard v-show="activeTab === 'automation'" class="card">
        <div class="card-head">
          <h3>{{ $t("adminGuild.automation.title") }}</h3>
          <UButton color="primary" @click="saveAutomation">{{ $t("common.save") }}</UButton>
        </div>
        <p class="muted" style="margin-bottom: 12px;">
          {{ $t("adminGuild.automation.stackableHelp") }}
        </p>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.automation.messagesTitle") }}</h4>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("common.enabled") }}</span>
              <label class="switch">
                <input v-model="automation.message.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.automation.minGain") }}
              <input v-model.number="automation.message.min_gain" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.automation.maxGain") }}
              <input v-model.number="automation.message.max_gain" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.automation.everyMessages") }}
              <input v-model.number="automation.message.interval" type="number" />
            </label>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.automation.voiceTitle") }}</h4>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("common.enabled") }}</span>
              <label class="switch">
                <input v-model="automation.voice.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <label>
              {{ $t("adminGuild.automation.minGain") }}
              <input v-model.number="automation.voice.min_gain" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.automation.maxGain") }}
              <input v-model.number="automation.voice.max_gain" type="number" />
            </label>
            <label>
              {{ $t("adminGuild.automation.everyMinutes") }}
              <input v-model.number="automation.voice.interval" type="number" />
            </label>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.automation.roleBoosters") }}</h4>
          <div class="inline">
            <select v-model="newRoleBooster.role_id">
              <option value="">{{ $t("adminGuild.automation.selectRole") }}</option>
              <option v-for="role in allRoles" :key="role.id" :value="role.id">{{ role.name }}</option>
            </select>
            <UButton color="neutral" variant="outline" @click="refreshRoles">{{ $t("adminGuild.automation.refreshRoles") }}</UButton>
            <input
              v-model="newRoleBooster.multiplier"
              type="text"
              inputmode="decimal"
              :placeholder="$t('adminGuild.automation.multiplierPlaceholder')"
            />
            <div class="switch-field compact">
              <span>{{ $t("common.active") }}</span>
              <label class="switch">
                <input v-model="newRoleBooster.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="switch-field compact">
              <span>{{ $t("adminGuild.automation.stackable") }}</span>
              <label class="switch">
                <input v-model="newRoleBooster.stackable" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <UButton color="neutral" variant="outline" @click="addRoleBooster">{{ $t("common.add") }}</UButton>
          </div>
          <div class="list">
            <div v-for="(booster, index) in roleBoosters" :key="`${booster.role_id}-${index}`" class="list-row">
              <span>{{ roleName(booster.role_id) }}</span>
              <input
                v-model="booster.multiplier"
                type="text"
                inputmode="decimal"
                class="inline-input"
                :placeholder="$t('adminGuild.automation.multiplierDefault')"
              />
              <div class="switch-field compact">
                <span>{{ $t("common.active") }}</span>
                <label class="switch">
                  <input v-model="booster.enabled" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
              <div class="switch-field compact">
                <span>{{ $t("adminGuild.automation.stackable") }}</span>
                <label class="switch">
                  <input v-model="booster.stackable" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
              <UButton color="neutral" variant="outline" @click="removeRoleBooster(index)">{{ $t("common.delete") }}</UButton>
            </div>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.automation.channelBoosters") }}</h4>
          <div class="inline">
            <select v-model="newChannelBooster.channel_id">
              <option value="">{{ $t("adminGuild.automation.selectChannel") }}</option>
              <option v-for="channel in channels" :key="channel.id" :value="channel.id">
                {{ channel.name }}
              </option>
            </select>
            <label class="inline-label">
              {{ $t("adminGuild.automation.multiplier") }}
              <input
                v-model="newChannelBooster.multiplier"
                type="text"
                inputmode="decimal"
                :placeholder="$t('adminGuild.automation.multiplierPlaceholderChannel')"
              />
            </label>
            <div class="switch-field compact">
              <span>{{ $t("common.active") }}</span>
              <label class="switch">
                <input v-model="newChannelBooster.enabled" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="switch-field compact">
              <span>{{ $t("adminGuild.automation.stackable") }}</span>
              <label class="switch">
                <input v-model="newChannelBooster.stackable" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
            <UButton color="neutral" variant="outline" @click="addChannelBooster">{{ $t("common.add") }}</UButton>
          </div>
          <div class="list">
            <div v-for="(booster, index) in channelBoosters" :key="`${booster.channel_id}-${index}`" class="list-row">
              <span>{{ channelName(booster.channel_id) }}</span>
              <label class="inline-label">
                {{ $t("adminGuild.automation.multiplier") }}
                <input
                  v-model="booster.multiplier"
                  type="text"
                  inputmode="decimal"
                  class="inline-input"
                  :placeholder="$t('adminGuild.automation.multiplierDefault')"
                />
              </label>
              <div class="switch-field compact">
                <span>{{ $t("common.active") }}</span>
                <label class="switch">
                  <input v-model="booster.enabled" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
              <div class="switch-field compact">
                <span>{{ $t("adminGuild.automation.stackable") }}</span>
                <label class="switch">
                  <input v-model="booster.stackable" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
              <UButton color="neutral" variant="outline" @click="removeChannelBooster(index)">{{ $t("common.delete") }}</UButton>
            </div>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.automation.exclusions") }}</h4>
          <div class="inline">
            <select v-model="selectedBlockedRole">
              <option value="">{{ $t("adminGuild.automation.addRole") }}</option>
              <option v-for="role in allRoles" :key="role.id" :value="role.id">{{ role.name }}</option>
            </select>
            <UButton color="neutral" variant="outline" @click="refreshRoles">{{ $t("adminGuild.automation.refreshRoles") }}</UButton>
            <UButton color="neutral" variant="outline" @click="addBlockedRole">{{ $t("common.add") }}</UButton>
          </div>
          <div class="chip-list">
            <span
              v-for="roleId in blockedRoles"
              :key="roleId"
              class="chip"
              role="button"
              tabindex="0"
              @click="removeBlockedRole(roleId)"
              @keydown.enter="removeBlockedRole(roleId)"
            >
              {{ roleName(roleId) }} ×
            </span>
          </div>

          <div class="inline" style="margin-top: 10px;">
            <select v-model="selectedBlockedChannel">
              <option value="">{{ $t("adminGuild.automation.addChannel") }}</option>
              <option v-for="channel in channels" :key="channel.id" :value="channel.id">
                {{ channel.name }}
              </option>
            </select>
            <UButton color="neutral" variant="outline" @click="addBlockedChannel">{{ $t("common.add") }}</UButton>
          </div>
          <div class="chip-list">
            <span
              v-for="channelId in blockedChannels"
              :key="channelId"
              class="chip"
              role="button"
              tabindex="0"
              @click="removeBlockedChannel(channelId)"
              @keydown.enter="removeBlockedChannel(channelId)"
            >
              {{ channelName(channelId) }} ×
            </span>
          </div>
        </div>
      </UCard>

      <div v-if="showTwitchConnectedModal" class="modal">
        <UCard class="modal-card">
          <div class="modal-head">
            <div>
              <h3>{{ $t("adminGuild.twitch.connectedTitle") }}</h3>
              <p class="muted">{{ $t("adminGuild.twitch.connectedAccount", { login: twitchConnectedAccount }) }}</p>
            </div>
            <UButton color="neutral" variant="outline" @click="showTwitchConnectedModal = false">✕</UButton>
          </div>
        <div class="actions" style="justify-content: flex-end;">
          <UButton color="primary" @click="showTwitchConnectedModal = false">{{ $t("common.ok") }}</UButton>
        </div>
      </UCard>
    </div>

    <div v-if="showShopSettingsModal" class="modal">
      <UCard class="modal-card">
        <div class="modal-head">
          <div>
            <h3>{{ $t("adminGuild.shopModal.title") }}</h3>
            <p class="muted">{{ $t("adminGuild.shopModal.subtitle") }}</p>
          </div>
          <UButton color="neutral" variant="outline" @click="showShopSettingsModal = false">✕</UButton>
        </div>
        <div class="grid">
          <label>
            {{ $t("adminGuild.shopModal.name") }}
            <input v-model="shopForm.name" />
          </label>
          <label>
            {{ $t("adminGuild.shopModal.image") }}
            <input v-model="shopForm.image_url" :placeholder="$t('adminGuild.shopModal.imagePlaceholder')" />
          </label>
          <label>
            {{ $t("adminGuild.shopModal.description") }}
            <textarea v-model="shopForm.description" rows="3" :placeholder="$t('adminGuild.shopModal.descriptionPlaceholder')"></textarea>
          </label>
          <label>
            {{ $t("adminGuild.shops.discount") }}
            <input v-model.number="shopForm.discount_percent" type="number" />
          </label>
          <label>
            {{ $t("adminGuild.shops.requiredRoles") }}
            <div class="role-picker" @click.stop>
              <div class="role-input" @click="showShopSettingsRolePicker = true; refreshRoles()">
                <span
                  v-for="role in shopSettingsRoleIds"
                  :key="role"
                  class="chip"
                  @click="removeShopRole(role)"
                  role="button"
                  tabindex="0"
                  @keydown.enter="removeShopRole(role)"
                >
                  {{ roleName(role) }} ×
                </span>
                <input
                  v-model="shopSettingsRoleSearch"
                  class="role-search"
                  :placeholder="$t('adminGuild.shops.searchRole')"
                  @focus="showShopSettingsRolePicker = true; refreshRoles()"
                />
              </div>
              <div v-if="showShopSettingsRolePicker" class="role-results role-results-popover">
                <button
                  v-for="role in filteredShopSettingsRoles"
                  :key="role.id"
                  type="button"
                  class="role-row"
                  @mousedown.prevent
                  @click.stop="addShopRole(role.id)"
                >
                  {{ role.name }}
                </button>
              </div>
            </div>
          </label>
          <div class="switch-field">
            <span>{{ $t("adminGuild.shopModal.status") }}</span>
            <label class="switch">
              <input v-model="shopForm.enabled" type="checkbox" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        <div class="actions">
          <UButton color="neutral" variant="outline" @click="showShopSettingsModal = false">{{ $t("common.close") }}</UButton>
          <UButton color="primary" @click="saveShopSettings">{{ $t("common.save") }}</UButton>
        </div>
      </UCard>
    </div>

    <div v-if="showShopItemsModal" class="modal">
      <UCard class="modal-card">
        <div class="modal-head">
          <div>
            <h3>{{ $t("adminGuild.shopItems.title") }}</h3>
            <p class="muted">{{ selectedShop?.name || $t("adminGuild.shops.fallback") }}</p>
          </div>
          <UButton color="neutral" variant="outline" @click="showShopItemsModal = false">✕</UButton>
        </div>

        <div class="items-grid" style="margin-bottom: 16px;">
          <div v-if="!visibleItems.length" class="muted">{{ $t("adminGuild.shopItems.empty") }}</div>
          <div v-for="item in visibleItems" :key="item.id" class="item-card">
            <div class="item-head">
              <div class="item-icon">
                <img v-if="item.image_url" :src="item.image_url" alt="" />
                <span v-else>📦</span>
              </div>
              <div>
                <div class="item-title">{{ item.name }}</div>
                <div class="item-sub">{{ formatItemType(item.type) }}</div>
              </div>
            </div>
            <div class="item-meta">
              <span class="pill">{{ $t("adminGuild.shopItems.price") }}: {{ item.price }}</span>
              <span v-if="item.stock !== null && item.stock !== undefined" class="pill muted">
                {{ $t("adminGuild.shopItems.stock") }}: {{ item.stock }}
              </span>
              <span v-if="item.discount_percent" class="pill muted">
                {{ $t("adminGuild.shopItems.itemDiscount") }}: -{{ item.discount_percent }}%
              </span>
              <span v-if="item.available_from || item.available_to" class="pill muted">
                {{ formatAvailability(item) }}
              </span>
            </div>
            <div class="muted small">{{ $t("adminGuild.shopItems.idLabel") }} {{ item.id }}</div>
            <div class="card-actions">
              <UButton color="neutral" variant="outline" @click="startEditItem(item)">{{ $t("common.edit") }}</UButton>
              <UButton color="neutral" variant="outline" @click="setItemHidden(item, true)">{{ $t("common.hide") }}</UButton>
              <UButton color="error" variant="solid" @click="deleteItem(item)">{{ $t("common.delete") }}</UButton>
            </div>
          </div>
        </div>

          <div class="trash-card">
          <div class="modal-head" style="margin-bottom: 8px;">
            <div>
              <h4>{{ $t("adminGuild.shopItems.trashTitle") }}</h4>
              <p class="muted">
                {{ $t("adminGuild.shopItems.trashHelp") }}
              </p>
            </div>
          </div>
          <div class="items-grid">
            <div v-if="!trashedItemsCount" class="muted">{{ $t("adminGuild.shopItems.trashEmpty") }}</div>
            <div v-for="item in trashedItemsPage" :key="`trash-${item.id}`" class="item-card item-card--trash">
              <div class="item-head">
                <div class="item-icon">🗑️</div>
                <div>
                  <div class="item-title">{{ item.name }}</div>
                  <div class="item-sub">
                    {{ item.type }} · {{ $t("adminGuild.shopItems.inventoryLabel") }} {{ item.inventory_quantity || 0 }}
                    <span v-if="item.lootbox_entry" class="pill muted">
                      {{ $t("adminGuild.shopItems.lootboxLabel") }} {{ item.parent_lootbox_name }}
                    </span>
                    <span v-else-if="item.lootbox_reward" class="pill muted">{{ $t("adminGuild.shopItems.lootboxReward") }}</span>
                  </div>
                </div>
              </div>
              <div class="muted">{{ $t("adminGuild.shopItems.idLabel") }} {{ item.id }}</div>
              <div class="card-actions">
                <template v-if="item.lootbox_entry">
                  <UButton color="neutral" variant="outline" @click="restoreLootboxEntry(item)">{{ $t("common.restore") }}</UButton>
                  <UButton color="error" variant="solid" @click="deleteLootboxEntry(item)">{{ $t("adminGuild.shopItems.deleteFromLootbox") }}</UButton>
                </template>
                <template v-else>
                  <UButton color="neutral" variant="outline" @click="setItemHidden(item, false)">{{ $t("common.restore") }}</UButton>
                  <UButton color="error" variant="solid" @click="deleteItem(item)">{{ $t("adminGuild.shopItems.deleteEverywhere") }}</UButton>
                </template>
              </div>
            </div>
          </div>
          <div v-if="trashTotalPages > 1" class="pagination" style="margin-top: 12px;">
            <UButton color="neutral" variant="outline" :disabled="trashPage <= 1" @click="trashPage--">
              {{ $t("common.prev") }}
            </UButton>
            <span>{{ $t("common.page") }} {{ trashPage }} / {{ trashTotalPages }}</span>
            <UButton
              color="neutral"
              variant="solid"
              :disabled="trashPage >= trashTotalPages"
              @click="trashPage++"
            >
              {{ $t("common.next") }}
            </UButton>
          </div>
        </div>

        <div class="actions">
          <UButton color="primary" @click="showItemForm = !showItemForm">
            {{ showItemForm ? $t("adminGuild.shopItems.hideForm") : $t("adminGuild.shopItems.addItem") }}
          </UButton>
          <UButton
            v-if="showItemForm && isEditingItem"
            color="error"
            variant="solid"
            @click="deleteItemById(editingItemId, true)"
          >
            {{ $t("adminGuild.shopItems.deleteItem") }}
          </UButton>
        </div>

        <div v-if="showItemForm" class="item-form" style="margin-top: 12px;">
          <div class="form-section">
            <div class="form-section-head">
              <div>
                <h4>{{ $t("adminGuild.shopItems.sections.general") }}</h4>
                <p class="muted">{{ $t("adminGuild.shopItems.sections.generalHelp") }}</p>
              </div>
            </div>
            <div class="grid">
              <label>
                {{ $t("adminGuild.shopItems.shop") }}
                <select v-model="newItem.shopId" disabled>
                  <option v-for="shop in shops" :key="shop.id" :value="String(shop.id)">
                    {{ shop.name }}
                  </option>
                </select>
              </label>
              <label>
                {{ $t("adminGuild.shopItems.itemName") }}
                <input v-model="newItem.name" :placeholder="$t('adminGuild.shopItems.itemNamePlaceholder')" />
              </label>
              <label>
                {{ $t("adminGuild.shopItems.description") }}
                <textarea v-model="newItem.description" rows="3" :placeholder="$t('adminGuild.shopItems.descriptionPlaceholder')"></textarea>
              </label>
              <label>
                {{ $t("adminGuild.shopItems.image") }}
                <input v-model="newItem.image_url" :placeholder="$t('adminGuild.shopItems.imagePlaceholder')" />
              </label>
              <label>
                {{ $t("adminGuild.shopItems.type") }}
                <select v-model="newItem.type">
                  <option value="role">🎭 {{ $t("adminGuild.shopItems.typeRole") }}</option>
                  <option value="temp_role">⏳ {{ $t("adminGuild.shopItems.typeTempRole") }}</option>
                  <option value="inventory">🎒 {{ $t("adminGuild.shopItems.typeInventory") }}</option>
                  <option value="irl">📦 {{ $t("adminGuild.shopItems.typeIrl") }}</option>
                  <option value="lootbox">🎁 {{ $t("adminGuild.shopItems.typeLootbox") }}</option>
                </select>
                <p class="muted" style="margin-top: 6px;">
                  {{ $t("adminGuild.shopItems.typeHelp") }}
                </p>
              </label>
              <label v-if="newItem.type === 'role' || newItem.type === 'temp_role'">
                {{ $t("adminGuild.shopItems.rolesToGive") }}
                <div class="role-picker" @click.stop>
                  <div class="role-input" @click="showItemRolePicker = true; refreshRoles()">
                    <span
                      v-for="role in itemRoleIds"
                      :key="role"
                      class="chip"
                      @click="removeItemRole(role)"
                      role="button"
                      tabindex="0"
                      @keydown.enter="removeItemRole(role)"
                    >
                      {{ roleName(role) }} ×
                    </span>
                    <input
                      v-model="itemRoleSearch"
                      class="role-search"
                      :placeholder="$t('adminGuild.shops.searchRole')"
                      @focus="showItemRolePicker = true; refreshRoles()"
                    />
                  </div>
                  <div v-if="showItemRolePicker" class="role-results role-results-popover">
                    <button
                      v-for="role in filteredItemRoles"
                      :key="role.id"
                      type="button"
                      class="role-row"
                      @mousedown.prevent
                      @click.stop="addItemRole(role.id)"
                    >
                      {{ role.name }}
                    </button>
                  </div>
                </div>
              </label>
              <label v-if="newItem.type === 'temp_role'">
                {{ $t("adminGuild.shopItems.tempRoleDuration") }}
                <input
                  v-model.number="newItem.temp_role_seconds"
                  type="number"
                  min="1"
                  :placeholder="$t('adminGuild.shopItems.tempRoleDurationPlaceholder')"
                />
                <p class="muted" style="margin-top: 6px;">
                  {{ $t("adminGuild.shopItems.tempRoleDurationHelp") }}
                </p>
              </label>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-head">
              <div>
                <h4>{{ $t("adminGuild.shopItems.sections.pricing") }}</h4>
                <p class="muted">{{ $t("adminGuild.shopItems.sections.pricingHelp") }}</p>
              </div>
            </div>
            <div class="grid">
              <label>
                {{ $t("adminGuild.shopItems.price") }}
                <input v-model.number="newItem.price" type="number" />
              </label>
              <label>
                {{ $t("adminGuild.shopItems.stock") }}
                <input v-model="newItem.stock" type="number" />
              </label>
              <label>
                {{ $t("adminGuild.shopItems.itemDiscount") }}
                <input v-model.number="newItem.discount_percent" type="number" />
              </label>
              <label style="grid-column: 1 / -1;">
                {{ $t("adminGuild.shopItems.availability") }}
                <div class="availability-grid">
                  <label class="availability-field">
                    <span class="muted">{{ $t("adminGuild.shopItems.availableFrom") }}</span>
                    <input v-model="newItem.available_from" type="datetime-local" />
                  </label>
                  <label class="availability-field">
                    <span class="muted">{{ $t("adminGuild.shopItems.availableTo") }}</span>
                    <input v-model="newItem.available_to" type="datetime-local" />
                  </label>
                </div>
                <p class="muted" style="margin-top: 6px;">
                  {{ $t("adminGuild.shopItems.availabilityHelp") }}
                </p>
              </label>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-head">
              <div>
                <h4>{{ $t("adminGuild.shopItems.sections.delivery") }}</h4>
                <p class="muted">{{ $t("adminGuild.shopItems.sections.deliveryHelp") }}</p>
              </div>
            </div>
            <div class="grid">
              <div class="switch-field" style="grid-column: 1 / -1;">
                <span>
                  {{
                    newItem.type === 'lootbox'
                      ? $t("adminGuild.shopItems.dmAfterOpen")
                      : $t("adminGuild.shopItems.dmAfterBuy")
                  }}
                </span>
                <label class="switch">
                  <input v-model="newItem.send_dm" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
              <div v-if="newItem.type === 'lootbox'" class="switch-field" style="grid-column: 1 / -1;">
                <span>{{ $t("adminGuild.shopItems.hideLootbox") }}</span>
                <label class="switch">
                  <input v-model="newItem.hidden" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div v-if="newItem.type === 'lootbox'" class="form-section">
            <div class="form-section-head">
              <div>
                <h4>{{ $t("adminGuild.shopItems.lootboxContent") }}</h4>
                <p class="muted">{{ $t("adminGuild.shopItems.lootboxHelp") }}</p>
              </div>
              <div class="inline">
                <UButton
                  color="neutral"
                  variant="solid"
                  :disabled="lootboxEntries.length >= lootboxMaxEntries"
                  @click="addLootboxEntry"
                >
                  {{ $t("adminGuild.shopItems.addLine") }}
                </UButton>
                <span class="muted">{{ $t("adminGuild.shopItems.lootboxCount", { count: lootboxEntries.length, max: lootboxMaxEntries }) }}</span>
              </div>
            </div>
            <div class="lootbox-list">
              <div
                v-for="(entry, index) in lootboxEntries"
                :key="`lootbox-${index}`"
                :class="['lootbox-entry-card', entry.hidden && 'lootbox-entry--hidden']"
              >
                <div class="lootbox-entry-top">
                  <div class="lootbox-entry-title">
                    {{ $t("adminGuild.shopItems.entryLabel", { index: index + 1 }) }}
                  </div>
                  <div class="lootbox-entry-actions">
                    <select v-model="entry.type" @change="onLootboxTypeChange(index)">
                      <option v-for="option in lootboxTypeOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                    <div class="switch-field compact lootbox-visibility">
                      <span>{{ entry.hidden ? $t("common.hidden") : $t("common.visible") }}</span>
                      <label class="switch">
                        <input v-model="entry.hidden" type="checkbox" />
                        <span class="slider"></span>
                      </label>
                    </div>
                    <UButton color="neutral" variant="outline" class="lootbox-remove" @click="removeLootboxEntry(index)">
                      {{ $t("common.delete") }}
                    </UButton>
                  </div>
                </div>
                <div class="lootbox-entry-grid">
                  <label class="lootbox-field">
                    {{ $t("adminGuild.shopItems.itemName") }}
                    <input v-model="entry.name" :placeholder="$t('adminGuild.shopItems.lootboxNamePlaceholder')" />
                  </label>
                  <label class="lootbox-field">
                    {{ $t("adminGuild.shopItems.description") }}
                    <textarea v-model="entry.description" rows="2" :placeholder="$t('adminGuild.shopItems.lootboxDescriptionPlaceholder')"></textarea>
                  </label>
                  <label class="lootbox-field">
                    {{ $t("adminGuild.shopItems.image") }}
                    <input v-model="entry.image_url" :placeholder="$t('adminGuild.shopItems.imagePlaceholder')" />
                  </label>
                  <label class="lootbox-field">
                    {{ $t("adminGuild.shopItems.lootboxChance") }}
                    <input v-model.number="entry.chance" type="number" min="0" step="0.01" :placeholder="$t('adminGuild.shopItems.lootboxChancePlaceholder')" />
                  </label>
                  <label v-if="entry.type === 'temp_role'" class="lootbox-field">
                    {{ $t("adminGuild.shopItems.tempRoleDuration") }}
                    <input
                      v-model.number="entry.duration_seconds"
                      type="number"
                      min="1"
                      :placeholder="$t('adminGuild.shopItems.tempRoleDurationPlaceholder')"
                    />
                  </label>
                  <label v-if="entry.type === 'currency'" class="lootbox-field">
                    {{ $t("adminGuild.shopItems.currencyAmount") }}
                    <input
                      v-model.number="entry.amount"
                      type="number"
                      min="1"
                      :placeholder="$t('adminGuild.shopItems.currencyAmountPlaceholder')"
                    />
                  </label>
                </div>
                <label v-if="entry.type === 'role' || entry.type === 'temp_role'" class="lootbox-field">
                  {{ $t("adminGuild.shopItems.rolesToGive") }}
                  <div class="role-picker" @click.stop>
                    <div class="role-input" @click="openLootboxRolePicker(index)">
                      <span
                        v-for="role in entry.role_ids"
                        :key="role"
                        class="chip"
                        @click="removeLootboxRole(index, role)"
                        role="button"
                        tabindex="0"
                        @keydown.enter="removeLootboxRole(index, role)"
                      >
                        {{ roleName(role) }} ×
                      </span>
                      <input
                        v-model="entry.role_search"
                        class="role-search"
                        :placeholder="$t('adminGuild.shops.searchRole')"
                        @focus="openLootboxRolePicker(index)"
                      />
                    </div>
                    <div
                      v-if="showLootboxRolePickerIndex === index"
                      class="role-results role-results-popover"
                    >
                      <button
                        v-for="role in filteredLootboxRoles(entry)"
                        :key="role.id"
                        type="button"
                        class="role-row"
                        @mousedown.prevent
                        @click.stop="addLootboxRole(index, role.id)"
                      >
                        {{ role.name }}
                      </button>
                    </div>
                  </div>
                </label>
              </div>
            </div>
            <p class="muted" style="margin-top: 6px;">
              {{ $t("adminGuild.shopItems.lootboxTip") }}
            </p>
          </div>
        </div>
        <div class="actions">
          <UButton color="neutral" variant="outline" @click="showShopItemsModal = false">{{ $t("common.close") }}</UButton>
          <UButton color="primary" @click="createItem">
            {{ isEditingItem ? $t("common.save") : $t("common.create") }}
          </UButton>
        </div>
      </UCard>
    </div>

    <div v-if="showLeaderboardModal" class="modal">
      <UCard class="modal-card">
        <div class="modal-head">
          <div>
            <h3>{{ $t("adminGuild.leaderboard.userDetails") }}</h3>
            <p class="muted">
              {{ leaderboardUsers[selectedLeaderboardUser?.userId]?.displayName || selectedLeaderboardUser?.userId }}
            </p>
          </div>
          <UButton color="neutral" variant="outline" @click="showLeaderboardModal = false">✕</UButton>
        </div>

        <div v-if="leaderboardStats" class="grid">
          <div class="stat-card">
            <div class="stat-title">{{ $t("adminGuild.leaderboard.total") }}</div>
            <div class="stat-value">{{ leaderboardStats.total }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">{{ $t("adminGuild.leaderboard.boostBonus") }}</div>
            <div class="stat-value">{{ leaderboardStats.bonusTotal }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">{{ $t("adminGuild.leaderboard.messageGains") }}</div>
            <div class="stat-value">
              {{ leaderboardStats.bySource?.find((s) => s.source === 'message')?.total || 0 }}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-title">{{ $t("adminGuild.leaderboard.voiceGains") }}</div>
            <div class="stat-value">
              {{ leaderboardStats.bySource?.find((s) => s.source === 'voice')?.total || 0 }}
            </div>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.leaderboard.editBalance") }}</h4>
          <div class="inline">
            <select v-model="balanceEdit.mode">
              <option value="set">{{ $t("adminGuild.leaderboard.balanceSet") }}</option>
              <option value="add">{{ $t("adminGuild.leaderboard.balanceAdd") }}</option>
              <option value="remove">{{ $t("adminGuild.leaderboard.balanceRemove") }}</option>
            </select>
            <input v-model.number="balanceEdit.amount" type="number" :placeholder="$t('adminGuild.leaderboard.amount')" />
            <UButton color="primary" :loading="balanceEdit.saving" @click="updateUserBalance">
              {{ $t("common.apply") }}
            </UButton>
          </div>
        </div>

        <div v-if="leaderboardStats" class="sub-card">
          <h4>{{ $t("adminGuild.leaderboard.byDay") }}</h4>
          <div v-if="leaderboardStats.debug?.countAll === 0" class="muted">
            {{ $t("adminGuild.leaderboard.noGainLogs") }}
          </div>
          <div v-else-if="leaderboardStats.debug?.countRange === 0" class="muted">
            {{ $t("adminGuild.leaderboard.noLogsRange") }}
          </div>
          <div class="list">
            <div v-for="row in leaderboardStats.byDay" :key="row.date" class="list-row">
              <span>{{ formatDate(row.date) }}</span>
              <span>{{ row.total }}</span>
            </div>
          </div>
        </div>

        <div v-if="leaderboardStats" class="sub-card">
          <h4>{{ $t("adminGuild.leaderboard.byMonth") }}</h4>
          <div class="list">
            <div v-for="row in leaderboardStats.byMonth" :key="row.month" class="list-row">
              <span>{{ formatMonth(row.month) }}</span>
              <span>{{ row.total }}</span>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <div v-if="showResetModal" class="modal">
      <UCard class="modal-card">
        <div class="modal-head">
          <div>
            <h3>{{ $t("adminGuild.reset.title") }}</h3>
            <p class="muted">{{ $t("adminGuild.reset.subtitle") }}</p>
          </div>
          <UButton color="neutral" variant="outline" @click="showResetModal = false">✕</UButton>
        </div>
        <div class="grid">
          <label>
            {{ $t("adminGuild.reset.confirmLabel") }}
            <input v-model="resetInput" :placeholder="$t('adminGuild.reset.confirmPlaceholder')" />
          </label>
        </div>
        <div v-if="resetStatus" class="muted" style="margin-top: 8px;">{{ resetStatus }}</div>
        <div class="actions" style="justify-content: flex-end;">
          <UButton color="neutral" variant="outline" @click="showResetModal = false">{{ $t("common.cancel") }}</UButton>
          <UButton color="error" variant="solid" :loading="isResetting" @click="confirmResetCoins">
            {{ $t("common.confirm") }}
          </UButton>
        </div>
      </UCard>
    </div>
    <div v-if="showUnsavedModal" class="modal">
      <UCard class="modal-card" style="max-width: 520px;">
        <div class="modal-head">
          <div>
            <h3>{{ $t("adminGuild.unsaved.title") }}</h3>
            <p class="muted">{{ $t("adminGuild.unsaved.subtitle") }}</p>
          </div>
          <UButton color="neutral" variant="outline" @click="showUnsavedModal = false">✕</UButton>
        </div>
        <div class="actions" style="justify-content: space-between;">
          <UButton color="neutral" variant="outline" @click="continueWithoutSaving">{{ $t("adminGuild.unsaved.continue") }}</UButton>
          <UButton color="primary" :loading="isSavingChanges" @click="saveAndContinue">
            {{ isSavingChanges ? $t("adminGuild.unsaved.saving") : $t("adminGuild.unsaved.saveAndContinue") }}
          </UButton>
        </div>
      </UCard>
    </div>

    <div v-if="deleteItemModalOpen" class="modal">
      <UCard class="modal-card" style="max-width: 520px;">
        <h3>{{ $t("adminGuild.deleteItem.title") }}</h3>
        <p class="muted">
          {{ deleteItemTarget?.name || $t("adminGuild.deleteItem.itemFallback") }} · {{ deleteItemTarget?.type || "inventory" }}
        </p>
        <div class="doc-callout" style="margin: 12px 0;">
          <strong>{{ $t("common.hide") }}</strong> = {{ $t("adminGuild.deleteItem.hideHelp") }}.
          <br />
          <strong>{{ $t("adminGuild.deleteItem.deleteEverywhere") }}</strong> = {{ $t("adminGuild.deleteItem.deleteHelp") }}.
        </div>
        <div v-if="deleteItemTarget?.type === 'lootbox'" class="switch-field" style="margin: 12px 0;">
          <span>{{ $t("adminGuild.deleteItem.purgeLootbox") }}</span>
          <label class="switch">
            <input v-model="deletePurgeRewards" type="checkbox" />
            <span class="slider"></span>
          </label>
        </div>
        <div class="actions" style="justify-content: flex-end;">
          <UButton color="neutral" variant="outline" @click="closeDeleteItemModal">{{ $t("common.cancel") }}</UButton>
          <UButton
            v-if="!deleteItemTarget?.hidden"
            color="neutral"
            variant="solid"
            @click="setItemHidden(deleteItemTarget, true); closeDeleteItemModal();"
          >
            {{ $t("adminGuild.deleteItem.hideFromShop") }}
          </UButton>
          <UButton
            v-if="deleteItemTarget?.hidden"
            color="primary"
            @click="setItemHidden(deleteItemTarget, false); closeDeleteItemModal();"
          >
            {{ $t("common.restore") }}
          </UButton>
          <UButton color="error" variant="solid" @click="confirmDeleteItem">{{ $t("adminGuild.deleteItem.deleteEverywhere") }}</UButton>
        </div>
      </UCard>
    </div>
    <div v-if="showSavedModal" class="modal">
      <UCard class="modal-card" style="max-width: 420px;">
        <div class="modal-head">
          <div>
            <h3>{{ $t("common.save") }}</h3>
            <p class="muted">{{ savedMessage }}</p>
          </div>
          <UButton color="neutral" variant="outline" @click="showSavedModal = false">✕</UButton>
        </div>
        <div class="actions" style="justify-content: flex-end;">
          <UButton color="primary" @click="showSavedModal = false">{{ $t("common.ok") }}</UButton>
        </div>
      </UCard>
    </div>
    </div>
    </section>
    <template #fallback>
      <section class="page">
        <div class="card">
          <h3>{{ $t("common.loading") }}</h3>
          <p class="muted">{{ $t("adminGuild.loading") }}</p>
        </div>
      </section>
    </template>
  </ClientOnly>
</template>

<script setup>
const route = useRoute();
const id = route.params.id;
const config = useRuntimeConfig();
const requestUrl = useRequestURL();
const { t, locale } = useI18n();
const guildBan = ref({ banned: false, reason: "" });
const form = reactive({
  name: "",
  emoji: "",
  startBalance: 0,
  maxBalance: 0,
  dailyAmount: 0,
  streak7: 0,
  streak14: 0,
  streak30: 0,
  enabled: true,
  logChannelId: ""
});

const activeTab = ref("economy");
const mobileMenuOpen = ref(false);
const overviewStats = reactive({ members: null, online: null, bots: null });
const showUnsavedModal = ref(false);
const showSavedModal = ref(false);
const savedMessage = ref(t("adminGuild.status.savedMessage"));
const pendingTab = ref(null);
const isDirty = ref(false);
const suppressDirty = ref(true);
const isSavingChanges = ref(false);
const tabDataLoadDepth = ref(0);
const isTabDataHydrating = computed(() => tabDataLoadDepth.value > 0);
let savedTimer = null;
const botLogChannelId = ref("");
const botSettingsLoaded = ref(false);
const apiTabDisabled = ref(false);
const botLanguage = ref("fr");
const botTimezone = ref("");
const browserTimezone = ref("UTC");
const timezoneInput = ref("");
const botLanguageOptions = computed(() => [
  { value: "fr", label: t("language.options.fr") },
  { value: "en", label: t("language.options.en") },
  { value: "es", label: t("language.options.es") }
]);
const timezoneOptions = ref([
  "UTC",
  "Europe/Paris",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Australia/Sydney"
]);
const parseFixedTimeZoneOffset = (timeZone) => {
  const raw = String(timeZone || "").trim();
  if (!raw) return null;
  if (/^(utc|gmt)$/i.test(raw)) return 0;
  const match = raw.match(/^(?:utc|gmt)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return null;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours > 23 || minutes > 59) return null;
  const total = hours * 60 + minutes;
  return match[1] === "-" ? -total : total;
};
const getTimeZoneOffsetMinutes = (timeZone, date = new Date()) => {
  const fixedOffset = parseFixedTimeZoneOffset(timeZone);
  if (fixedOffset !== null) return fixedOffset;
  try {
    const sourceDate = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(sourceDate.getTime())) return 0;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
      .formatToParts(sourceDate)
      .reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
      }, {});
    const utcTime = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    return Math.round((utcTime - sourceDate.getTime()) / 60000);
  } catch {
    return 0;
  }
};
const formatTzOffset = (minutes) => {
  if (!Number.isFinite(minutes)) return "UTC+0";
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const mins = String(abs % 60).padStart(2, "0");
  if (mins === "00") return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${mins}`;
};
const buildTimezoneLabel = (tz) => {
  const offset = formatTzOffset(getTimeZoneOffsetMinutes(tz));
  return `${tz} (${offset})`;
};
const autoTimezoneLabel = computed(() => `${t("adminGuild.bot.timezoneAuto")} (${browserTimezone.value})`);
const timezoneOptionRows = computed(() => {
  return (timezoneOptions.value || []).map((tz) => ({
    value: tz,
    label: buildTimezoneLabel(tz)
  }));
});
const displayTimeZone = computed(() => {
  const tz = String(botTimezone.value || browserTimezone.value || "UTC").trim();
  return tz || "UTC";
});
const formatInDisplayTimeZone = (date, options = {}, formatLocale = locale.value || "fr-FR") => {
  const fixedOffset = parseFixedTimeZoneOffset(displayTimeZone.value);
  if (fixedOffset !== null) {
    const shifted = new Date(date.getTime() + fixedOffset * 60000);
    return new Intl.DateTimeFormat(formatLocale, {
      ...options,
      timeZone: "UTC"
    }).format(shifted);
  }
  return new Intl.DateTimeFormat(formatLocale, {
    ...options,
    timeZone: displayTimeZone.value
  }).format(date);
};
const formatPartsInDisplayTimeZone = (date, options = {}) => {
  const fixedOffset = parseFixedTimeZoneOffset(displayTimeZone.value);
  if (fixedOffset !== null) {
    const shifted = new Date(date.getTime() + fixedOffset * 60000);
    return new Intl.DateTimeFormat("en-GB", {
      ...options,
      timeZone: "UTC"
    }).formatToParts(shifted);
  }
  return new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: displayTimeZone.value
  }).formatToParts(date);
};
const parseDateTimeValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.includes(" ") && !raw.includes("T") ? raw.replace(" ", "T") : raw;
  const hasExplicitZone = /(?:[zZ]|[+\-]\d{2}:\d{2})$/.test(normalized);
  const isDateTimeNoZone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized);
  if (!hasExplicitZone && isDateTimeNoZone) {
    const utcDate = new Date(`${normalized}Z`);
    if (!Number.isNaN(utcDate.getTime())) return utcDate;
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatDateTime = (value, options = {}) => {
  const date = parseDateTimeValue(value);
  if (!date) return t("common.na");
  try {
    return formatInDisplayTimeZone(date, {
      dateStyle: "short",
      timeStyle: "medium",
      ...options
    });
  } catch {
    return date.toLocaleString(locale.value || "fr-FR");
  }
};
const parseDateBoundaryInTimeZone = (dateValue, endOfDay = false) => {
  if (!dateValue) return null;
  const [year, month, day] = String(dateValue).split("-").map(Number);
  if (!year || !month || !day) return null;
  const hour = endOfDay ? 23 : 0;
  const minute = endOfDay ? 59 : 0;
  const second = endOfDay ? 59 : 0;
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getTimeZoneOffsetMinutes(displayTimeZone.value, utcGuess);
  return new Date(utcGuess.getTime() - offset * 60000);
};
const applyTimezoneInput = () => {
  const raw = String(timezoneInput.value || "").trim();
  if (!raw) return;
  const lower = raw.toLowerCase();
  if (lower === "auto" || lower === t("adminGuild.bot.timezoneAuto").toLowerCase()) {
    botTimezone.value = browserTimezone.value;
    timezoneInput.value = autoTimezoneLabel.value;
    return;
  }
  const matchLabel = timezoneOptionRows.value.find((row) => row.label.toLowerCase() === lower);
  if (matchLabel) {
    botTimezone.value = matchLabel.value;
    timezoneInput.value = matchLabel.label;
    return;
  }
  const matchValue = timezoneOptionRows.value.find((row) => row.value.toLowerCase() === lower);
  if (matchValue) {
    botTimezone.value = matchValue.value;
    timezoneInput.value = matchValue.label;
  }
};
const userUiDisabled = ref(false);
const userUiLoaded = ref(false);
const userUiSaving = ref(false);
const inventoryUsers = ref([]);
const inventoryLoading = ref(false);
const inventorySelectedUserId = ref("");
const inventorySearch = ref("");
const inventoryRemoveQuantities = reactive({});
const loadedTabs = reactive({
  economy: false,
  daily: false,
  leaderboard: false,
  shops: false,
  inventories: false,
  automation: false,
  logs: false,
  communityMessage: false,
  twitch: false,
  games: false,
  achievements: false,
  achievementsGiveaway: false,
  achievementsBirthday: false,
  api: false,
  bot: false,
  sensitive: false
});
const settingsLoaded = ref(false);
const channelsLoaded = ref(false);
const rolesLoaded = ref(false);
const emojisLoaded = ref(false);
const botEmojisLoaded = ref(false);
const inviteUrl = computed(() => {
  const clientId = config.public.discordClientId || "CLIENT_ID";
  const permissions = "9";
  const scopes = "bot%20applications.commands";
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}&guild_id=${id}&disable_guild_select=true`;
});

const selectTab = (tab) => {
  if (tab === "api" && apiTabDisabled.value) return;
  if (tab === activeTab.value) return;
  if (isDirty.value) {
    pendingTab.value = tab;
    showUnsavedModal.value = true;
    return;
  }
  activeTab.value = tab;
  mobileMenuOpen.value = false;
  loadTabData(tab);
};
const markSaved = () => {
  isDirty.value = false;
};
const markDirtyIfAllowed = () => {
  if (!suppressDirty.value && !isTabDataHydrating.value) {
    isDirty.value = true;
  }
};
const continueWithoutSaving = () => {
  showUnsavedModal.value = false;
  isDirty.value = false;
  if (pendingTab.value) {
    activeTab.value = pendingTab.value;
    mobileMenuOpen.value = false;
    pendingTab.value = null;
    loadTabData(activeTab.value);
  }
};
const saveCurrentTab = async () => {
  if (activeTab.value === "economy" || activeTab.value === "daily") {
    return await save({ notify: false });
  }
  if (activeTab.value === "automation") {
    return await saveAutomation({ notify: false });
  }
  if (activeTab.value === "twitch") {
    const automationSaved = await saveTwitchAutomation({ notify: false });
    const dailySaved = await saveTwitchDailySettings({ notify: false });
    return automationSaved || dailySaved;
  }
  if (activeTab.value === "games") {
    return await saveGamesSettings({ notify: false });
  }
  if (activeTab.value === "bot") {
    return await saveBotSettings({ notify: false });
  }
  return false;
};
const saveAndContinue = async () => {
  if (!pendingTab.value) {
    showUnsavedModal.value = false;
    return;
  }
  isSavingChanges.value = true;
  const saved = await saveCurrentTab();
  if (saved) markSaved();
  isSavingChanges.value = false;
  showUnsavedModal.value = false;
  activeTab.value = pendingTab.value;
  mobileMenuOpen.value = false;
  pendingTab.value = null;
  if (saved) {
    notifySaved();
  }
};
let leaderboardTimer = null;

const leaderboard = ref([]);
const leaderboardPage = ref(1);
const leaderboardLimit = ref(10);
const leaderboardTotal = ref(0);
const leaderboardTotalPages = computed(() => {
  const total = Number(leaderboardTotal.value || 0);
  const limit = Math.max(1, Number(leaderboardLimit.value || 10));
  return Math.max(1, Math.ceil(total / limit));
});
const leaderboardSummary = reactive({ day: 0, month: 0, year: 0 });
const leaderboardUsers = ref({});
const showLeaderboardModal = ref(false);
const selectedLeaderboardUser = ref(null);
const leaderboardStats = ref(null);
const leaderboardPost = reactive({ channel_id: "", limit: 10, enabled: false });
const leaderboardPostStatus = ref({ status: "none", channelName: "" });
const leaderboardPostError = ref("");
const gainLogs = ref([]);
const transactionLogs = ref([]);
const gameLogs = ref([]);
const twitchStatus = ref({ connected: false, login: "", live: false });
const twitchLiveOnly = ref(true);
const showTwitchConnectedModal = ref(false);
const twitchConnectedAccount = ref("");
const logsCategoryTab = ref("gains");
const logsSourceTab = ref("all");
const linkedTwitchUsers = ref([]);
const linkedUsersLoading = ref(false);
const unlinkingUserId = ref("");
const linkedUsersPage = ref(1);
const linkedUsersPageSize = 20;
const logsFilterUserId = ref("");
const logsLimit = ref(50);
const logsUserSearch = ref("");
const logsSearch = ref("");
const logsDateFrom = ref("");
const logsDateTo = ref("");
const logsSortKey = ref("date");
const logsSortDir = ref("desc");
const logsPage = ref(1);
const showLogUserResults = computed(() => logsUserSearch.value.trim().length >= 3);
const communityMessageChannelId = ref("");
const communityMessageSections = ref(
  ["overview", "gains", "commands", "shops", "inventory", "market", "twitch", "rules", "summary"]
);
const communityMessageShopIds = ref([]);
const communityMessageIncludeGameChances = ref(false);
const communityMessageIncludeShopDiscounts = ref(true);
const communityMessageMessageId = ref(null);
const communityMessagePreview = ref("");
const communityMessagePreviewLength = ref(0);
const communityMessageLoading = ref(false);
const communityMessagePreviewing = ref(false);
const communityMessageSending = ref(false);
const communityMessageDeleting = ref(false);
const communityMessageStatus = ref("");
const communitySectionOptions = computed(() => [
  { key: "overview", label: t("adminGuild.communityMessage.sections.overview") },
  { key: "gains", label: t("adminGuild.communityMessage.sections.gains") },
  { key: "commands", label: t("adminGuild.communityMessage.sections.commands") },
  { key: "shops", label: t("adminGuild.communityMessage.sections.shops") },
  { key: "inventory", label: t("adminGuild.communityMessage.sections.inventory") },
  { key: "market", label: t("adminGuild.communityMessage.sections.market") },
  { key: "twitch", label: t("adminGuild.communityMessage.sections.twitch") },
  { key: "rules", label: t("adminGuild.communityMessage.sections.rules") },
  { key: "summary", label: t("adminGuild.communityMessage.sections.summary") }
]);
const communityMessagePreviewHtml = computed(() => formatCommunityPreview(communityMessagePreview.value));
const logsHeading = computed(() => {
  if (logsCategoryTab.value === "transactions") return t("adminGuild.logs.headings.transactions");
  if (logsCategoryTab.value === "games") return t("adminGuild.logs.headings.games");
  if (logsCategoryTab.value === "linked") return t("adminGuild.logs.headings.linked");
  return t("adminGuild.logs.headings.gains");
});

const linkedTwitchTierMap = computed(() => {
  const map = {};
  (linkedTwitchUsers.value || []).forEach((row) => {
    if (row?.discord_id) {
      map[String(row.discord_id)] = row.twitch_tier || null;
    }
  });
  return map;
});

const linkedUsersTotalPages = computed(() =>
  Math.max(1, Math.ceil((linkedTwitchUsers.value || []).length / linkedUsersPageSize))
);

const paginatedLinkedUsers = computed(() => {
  const page = Math.min(Math.max(1, linkedUsersPage.value), linkedUsersTotalPages.value);
  const start = (page - 1) * linkedUsersPageSize;
  return (linkedTwitchUsers.value || []).slice(start, start + linkedUsersPageSize);
});
const logsDescription = computed(() => {
  if (logsCategoryTab.value === "transactions") {
    return t("adminGuild.logs.descriptions.transactions");
  }
  if (logsCategoryTab.value === "games") {
    return t("adminGuild.logs.descriptions.games");
  }
  if (logsCategoryTab.value === "linked") {
    return t("adminGuild.logs.descriptions.linked");
  }
  return t("adminGuild.logs.descriptions.gains");
});

const logsSearchPlaceholder = computed(() => {
  if (logsCategoryTab.value === "transactions") return t("adminGuild.logs.searchPlaceholders.transactions");
  if (logsCategoryTab.value === "games") return t("adminGuild.logs.searchPlaceholders.games");
  return t("adminGuild.logs.searchPlaceholders.gains");
});
const balanceEdit = reactive({ amount: 0, saving: false, mode: "set" });
const showResetModal = ref(false);
const resetInput = ref("");
const resetStatus = ref("");
const isResetting = ref(false);
const shops = ref([]);
const items = ref([]);
const trashPage = ref(1);
const trashPageSize = 4;
const deleteItemModalOpen = ref(false);
const deleteItemTarget = ref(null);
const deleteItemCloseForm = ref(false);
const deletePurgeRewards = ref(false);
const newShop = reactive({ name: "", discount_percent: 0 });
const newItem = reactive({
  shopId: "",
  name: "",
  type: "inventory",
  price: 0,
  stock: "",
  discount_percent: 0,
  description: "",
  send_dm: false,
  image_url: "",
  hidden: false,
  temp_role_seconds: "",
  available_from: "",
  available_to: ""
});
const showShopSettingsModal = ref(false);
const showShopItemsModal = ref(false);
const showItemForm = ref(false);
const roles = ref([]);
const botRolePosition = ref(null);
const channels = ref([]);
const selectedShop = ref(null);
const isEditingItem = ref(false);
const editingItemId = ref(null);
const showEmojiPicker = ref(false);
const emojiSearch = ref("");
const newShopRoleSearch = ref("");
const shopSettingsRoleSearch = ref("");
const itemRoleSearch = ref("");
const showNewShopRolePicker = ref(false);
const showShopSettingsRolePicker = ref(false);
const showItemRolePicker = ref(false);
const newShopRoleIds = ref([]);
const shopSettingsRoleIds = ref([]);
const itemRoleIds = ref([]);
const lootboxEntries = ref([]);
const lootboxPurgeItemIds = ref([]);
const showLootboxRolePickerIndex = ref(null);
const lootboxMaxEntries = 20;
const lootboxTypeOptions = computed(() => [
  { value: "role", label: `🎭 ${t("adminGuild.shopItems.typeRole")}` },
  { value: "temp_role", label: `⏳ ${t("adminGuild.shopItems.typeTempRole")}` },
  { value: "inventory", label: `🎒 ${t("adminGuild.shopItems.typeInventory")}` },
  { value: "irl", label: `📦 ${t("adminGuild.shopItems.typeIrl")}` },
  { value: "currency", label: `💰 ${t("adminGuild.shopItems.typeCurrency")}` }
]);
const automation = reactive({
  message: { enabled: false, min_gain: 0, max_gain: 0, interval: 0 },
  voice: { enabled: false, min_gain: 0, max_gain: 0, interval: 0 }
});
const twitchAutomation = reactive({
  message: { enabled: false, min_gain: 0, max_gain: 0, interval: 1 },
  watch: { enabled: false, min_gain: 0, max_gain: 0, interval: 5 },
  multipliers: {
    prime: { enabled: false, value: 1 },
    t1: { enabled: false, value: 1 },
    t2: { enabled: false, value: 1 },
    t3: { enabled: false, value: 1 }
  },
  events: {
    sub_t1: { enabled: false, amount: 0 },
    sub_t2: { enabled: false, amount: 0 },
    sub_t3: { enabled: false, amount: 0 },
    subgift_t1: { enabled: false, amount: 0 },
    subgift_t2: { enabled: false, amount: 0 },
    subgift_t3: { enabled: false, amount: 0 },
    bits: { enabled: false, amount: 0 }
  }
});
const twitchDaily = reactive({
  enabled: true,
  dailyAmount: 0,
  streak7: 0,
  streak14: 0,
  streak30: 0
});
const gamesConfig = reactive({
  enabled: true,
  minBet: 10,
  maxBet: 10000,
  cooldownSeconds: 10,
  houseEdgePercent: 5,
  flip: {
    enabled: true,
    winChancePercent: 50,
    winMultiplier: 2,
    jackpotEnabled: true,
    jackpotChancePercent: 1,
    jackpotMultiplier: 10
  },
  dice: { enabled: true, sides: 6, winChancePercent: 16.67, winMultiplier: 5 },
  slot: {
    enabled: true,
    symbols: ["💎", "🍒", "⭐", "🍋"],
    payouts: [
      { combo: "💎💎💎", multiplier: 10 },
      { combo: "🍒🍒🍒", multiplier: 5 },
      { combo: "⭐⭐⭐", multiplier: 3 }
    ],
    twoOfKindMultiplier: 2
  },
  roulette: {
    enabled: true,
    red: { chance: 45, multiplier: 2 },
    black: { chance: 45, multiplier: 2 },
    green: { chance: 10, multiplier: 14 }
  },
  higherLower: { enabled: true, maxNumber: 10, winChancePercent: 50, winMultiplier: 2, streakBonusEnabled: false },
  crash: { enabled: true, maxMultiplier: 20, crashChancePerTickPercent: 2, speed: "normal" },
  double: { enabled: true, winChancePercent: 50, multiplier: 2 },
  mystery: {
    enabled: true,
    outcomes: [
      { multiplier: 0, chance: 20 },
      { multiplier: 0.5, chance: 15 },
      { multiplier: 1, chance: 25 },
      { multiplier: 2, chance: 20 },
      { multiplier: 5, chance: 15 },
      { multiplier: 10, chance: 5 }
    ]
  }
});
const slotSymbolsInput = ref("💎 🍒 ⭐ 🍋");
const slotPayoutsInput = ref("💎💎💎:10\n🍒🍒🍒:5\n⭐⭐⭐:3");
const mysteryOutcomesInput = ref("0:20\n0.5:15\n1:25\n2:20\n5:15\n10:5");
const roleBoosters = ref([]);
const channelBoosters = ref([]);
const blockedRoles = ref([]);
const blockedChannels = ref([]);
const newRoleBooster = reactive({ role_id: "", multiplier: "1", enabled: true, stackable: false });
const newChannelBooster = reactive({ channel_id: "", multiplier: "1", enabled: true, stackable: false });
const selectedBlockedRole = ref("");
const selectedBlockedChannel = ref("");
const guildEmojis = ref([]);
const botEmojis = ref([]);
const emojiTab = ref("standard");
const standardEmojis = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "🤣",
  "😂",
  "🙂",
  "😉",
  "😊",
  "😍",
  "😘",
  "😎",
  "🤩",
  "👍",
  "👎",
  "👏",
  "🔥",
  "✨",
  "💎",
  "💰",
  "✅",
  "❌",
  "⚠️",
  "🎉",
  "🚀",
  "🎯",
  "🎮",
  "🧠",
  "🛒",
  "🎁",
  "📈",
  "📉",
  "⭐",
  "💡",
  "🎵",
  "📌",
  "🧩",
  "🧪"
];
const shopForm = reactive({
  id: "",
  name: "",
  discount_percent: 0,
  enabled: true,
  image_url: "",
  description: ""
});

watch(
  () => newItem.shopId,
  async (value) => {
    await loadItems(value);
  }
);

watch(
  () => activeTab.value,
  async (value) => {
    if ((value === "shops" || value === "automation") && !rolesLoaded.value) {
      await refreshRoles();
    }
  }
);


const loadSettings = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/settings`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const data = await res.json();
  if (data.settings) {
    form.name = data.settings.name || "";
    form.emoji = data.settings.emoji_symbol || "";
    form.startBalance = Number(data.settings.start_balance || 0);
    form.maxBalance = Number(data.settings.max_balance || 0);
    form.dailyAmount = Number(data.settings.daily_amount || 0);
    form.streak7 = Number(data.settings.streak_7_bonus_percent || 0);
    form.streak14 = Number(data.settings.streak_14_bonus_percent || 0);
    form.streak30 = Number(data.settings.streak_30_bonus_percent || 0);
    form.enabled = Boolean(data.settings.enabled);
    form.logChannelId = data.settings.log_channel_id || "";
  }
  settingsLoaded.value = true;
};

const loadGuildStatus = async () => {
  const token = getToken();
  if (!token) return;
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return;
  const data = await res.json();
  guildBan.value.banned = Boolean(data.status?.banned);
  guildBan.value.reason = data.status?.reason || "";
};

const loadBotSettings = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/bot-settings`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  botLogChannelId.value = data.settings?.log_channel_id || "";
  apiTabDisabled.value = Boolean(data.settings?.api_tab_disabled);
  botLanguage.value = data.settings?.bot_language || "fr";
  botTimezone.value = data.settings?.timezone || browserTimezone.value;
  timezoneInput.value = botTimezone.value ? buildTimezoneLabel(botTimezone.value) : autoTimezoneLabel.value;
  botSettingsLoaded.value = true;
  try {
    const userUiRes = await fetch(`${config.public.apiBase}/api/guilds/${id}/user-ui`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (userUiRes.ok) {
      const userUiData = await userUiRes.json();
      userUiDisabled.value = Boolean(userUiData.disabled);
      userUiLoaded.value = true;
    }
  } catch {
    userUiLoaded.value = false;
  }
};

const saveBotSettings = async ({ notify = true } = {}) => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/bot-settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      log_channel_id: botLogChannelId.value || null,
      bot_language: botLanguage.value || "fr",
      timezone: botTimezone.value || browserTimezone.value
    })
  });
  if (!res.ok) return false;
  if (notify) notifySaved();
  return true;
};

const saveUserUiDisabled = async () => {
  if (!userUiLoaded.value) return true;
  userUiSaving.value = true;
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/user-ui`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ disabled: Boolean(userUiDisabled.value) })
  });
  userUiSaving.value = false;
  return res.ok;
};

const onEmojiSelect = (emoji) => {
  form.emoji = emoji;
  showEmojiPicker.value = false;
};

const toggleEmojiPicker = async () => {
  const next = !showEmojiPicker.value;
  showEmojiPicker.value = next;
  if (next) {
    await loadEmojisOnce();
    await loadBotEmojisOnce();
  }
};

const onClickOutside = (event) => {
  const popover = document.querySelector(".emoji-popover");
  const button = document.querySelector(".emoji-field button");
  if (showEmojiPicker.value) {
    if (!popover || (!popover.contains(event.target) && !button?.contains(event.target))) {
      showEmojiPicker.value = false;
    }
  }
  if (!event.target.closest(".role-picker")) {
    showNewShopRolePicker.value = false;
    showShopSettingsRolePicker.value = false;
    showItemRolePicker.value = false;
    showLootboxRolePickerIndex.value = null;
  }
};

const loadEmojis = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/emojis`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  guildEmojis.value = data.emojis || [];
  emojisLoaded.value = true;
};

const loadBotEmojis = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/bot/emojis`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  botEmojis.value = data.emojis || [];
  botEmojisLoaded.value = true;
};

const emojiUrl = (emoji) => {
  if (!emoji?.id) return "";
  return `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}`;
};

const renderEmoji = (emoji) => {
  if (!emoji?.id) return "";
  return `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
};

const renderEmojiPreview = (value) => {
  if (!value) return "";
  const match = String(value).match(/^<a?:(\w+):(\d+)>$/);
  if (match) {
    const id = match[2];
    const animated = String(value).startsWith("<a:");
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
    return `<img class="emoji-preview-img" src="${url}" alt="emoji" />`;
  }
  return value;
};

const filteredEmojis = computed(() => {
  const q = emojiSearch.value.toLowerCase();
  if (!q) return guildEmojis.value;
  return guildEmojis.value.filter((e) => e.name?.toLowerCase().includes(q));
});

const filteredStandardEmojis = computed(() => {
  const q = emojiSearch.value.toLowerCase();
  if (!q) return standardEmojis;
  return standardEmojis.filter((e) => e.includes(q));
});

const filteredCustomEmojis = computed(() => {
  const q = emojiSearch.value.toLowerCase();
  const list = emojiTab.value === "bot" ? botEmojis.value : guildEmojis.value;
  if (!q) return list;
  return list.filter((e) => e.name?.toLowerCase().includes(q));
});

const roleName = (roleId) => {
  const id = String(roleId);
  const match = roles.value.find((role) => String(role.id) === id);
  return match?.name || id;
};

const allRoles = computed(() => roles.value || []);

const assignableRoles = computed(() => {
  return roles.value.filter((role) => {
    if (role.managed) return false;
    if (botRolePosition.value === null || botRolePosition.value === undefined) return true;
    return Number(role.position || 0) < Number(botRolePosition.value || 0);
  });
});

const channelName = (channelId) => {
  const id = String(channelId);
  const match = channels.value.find((channel) => String(channel.id) === id);
  return match?.name || id;
};

const filteredNewShopRoles = computed(() => {
  const q = newShopRoleSearch.value.toLowerCase();
  return allRoles.value.filter((role) => {
    if (newShopRoleIds.value.map(String).includes(String(role.id))) return false;
    if (!q) return true;
    return role.name?.toLowerCase().includes(q);
  });
});

const filteredShopSettingsRoles = computed(() => {
  const q = shopSettingsRoleSearch.value.toLowerCase();
  return allRoles.value.filter((role) => {
    if (shopSettingsRoleIds.value.map(String).includes(String(role.id))) return false;
    if (!q) return true;
    return role.name?.toLowerCase().includes(q);
  });
});

const filteredItemRoles = computed(() => {
  const q = itemRoleSearch.value.toLowerCase();
  return assignableRoles.value.filter((role) => {
    if (itemRoleIds.value.map(String).includes(String(role.id))) return false;
    if (!q) return true;
    return role.name?.toLowerCase().includes(q);
  });
});

const filteredLootboxRoles = (entry) => {
  const q = String(entry?.role_search || "").toLowerCase();
  const selected = Array.isArray(entry?.role_ids) ? entry.role_ids.map(String) : [];
  return assignableRoles.value.filter((role) => {
    if (selected.includes(String(role.id))) return false;
    if (!q) return true;
    return role.name?.toLowerCase().includes(q);
  });
};

const parseEventData = (value) => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value === "object") return value;
  return {};
};

const filteredGainLogs = computed(() => {
  const sourceFilter = String(logsSourceTab.value || "all");
  const search = String(logsSearch.value || "").toLowerCase();
  const from = parseDateBoundaryInTimeZone(logsDateFrom.value, false);
  const to = parseDateBoundaryInTimeZone(logsDateTo.value, true);

  return (gainLogs.value || []).filter((log) => {
    const source = String(log.source || "").toLowerCase();
    const isTwitch = source.startsWith("twitch");
    if (sourceFilter === "twitch" && !isTwitch) return false;
    if (sourceFilter === "discord" && isTwitch) return false;

    if (logsFilterUserId.value && String(log.user_discord_id) !== String(logsFilterUserId.value)) {
      return false;
    }

    if (from || to) {
      const created = parseDateTimeValue(log.created_at);
      if (!created) return true;
      if (from && created < from) return false;
      if (to && created > to) return false;
    }

    if (search) {
      const userName = leaderboardUsers.value[log.user_discord_id]?.displayName || "";
      const haystack = `${source} ${formatGainSource(log.source)} ${userName} ${log.user_discord_id}`
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
});

const filteredTransactionLogs = computed(() => {
  const search = String(logsSearch.value || "").toLowerCase();
  const from = parseDateBoundaryInTimeZone(logsDateFrom.value, false);
  const to = parseDateBoundaryInTimeZone(logsDateTo.value, true);
  const userFilter = logsFilterUserId.value ? String(logsFilterUserId.value) : "";

  return (transactionLogs.value || []).filter((log) => {
    const data = parseEventData(log.data);
    const buyerId = String(log.user_discord_id || "");
    const sellerId = String(data.seller_id || data.sellerId || "");
    const dataBuyerId = String(data.buyer_id || data.buyerId || "");

    if (userFilter && buyerId !== userFilter && sellerId !== userFilter && dataBuyerId !== userFilter) {
      return false;
    }

    if (from || to) {
      const created = parseDateTimeValue(log.created_at);
      if (!created) return true;
      if (from && created < from) return false;
      if (to && created > to) return false;
    }

    if (search) {
      const buyerName = leaderboardUsers.value[buyerId]?.displayName || "";
      const sellerName = sellerId ? leaderboardUsers.value[sellerId]?.displayName || "" : "";
      const itemName = String(data.item_name || data.itemName || "");
      const shopName = String(data.shop_name || data.shopName || "");
      const haystack = `${formatTransactionType(log.type)} ${itemName} ${shopName} ${buyerName} ${sellerName} ${buyerId} ${sellerId}`
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
});

const filteredGameLogs = computed(() => {
  const search = String(logsSearch.value || "").toLowerCase();
  const from = parseDateBoundaryInTimeZone(logsDateFrom.value, false);
  const to = parseDateBoundaryInTimeZone(logsDateTo.value, true);
  const userFilter = logsFilterUserId.value ? String(logsFilterUserId.value) : "";

  return (gameLogs.value || []).filter((log) => {
    const userId = String(log.user_discord_id || "");
    const data = parseEventData(log.data);
    if (userFilter && userId !== userFilter) return false;

    if (from || to) {
      const created = parseDateTimeValue(log.created_at);
      if (!created) return true;
      if (from && created < from) return false;
      if (to && created > to) return false;
    }

    if (search) {
      const userName = leaderboardUsers.value[userId]?.displayName || "";
      const haystack = `${formatGameName(log.type)} ${userName} ${userId} ${data.win ? t("adminGuild.logs.gameWon") : t("adminGuild.logs.gameLost")}`
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
});

const logUserIds = computed(() => {
  const ids = new Set();
  (leaderboard.value || []).forEach((row) => ids.add(String(row.userId)));
  (gainLogs.value || []).forEach((log) => ids.add(String(log.user_discord_id)));
  (transactionLogs.value || []).forEach((log) => {
    ids.add(String(log.user_discord_id));
    const data = parseEventData(log.data);
    if (data.seller_id || data.sellerId) ids.add(String(data.seller_id || data.sellerId));
    if (data.buyer_id || data.buyerId) ids.add(String(data.buyer_id || data.buyerId));
  });
  (gameLogs.value || []).forEach((log) => ids.add(String(log.user_discord_id)));
  return Array.from(ids).filter(Boolean);
});

const logUserList = computed(() => {
  return logUserIds.value
    .map((userId) => {
      const info = leaderboardUsers.value[userId] || {};
      return { userId, displayName: info.displayName || userId, username: info.username || "" };
    })
    .sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)));
});

const filteredLogUsers = computed(() => {
  const q = String(logsUserSearch.value || "").toLowerCase();
  return (logUserList.value || []).filter((row) => {
    const displayName = row.displayName || row.userId;
    const username = row.username || "";
    return (
      !q ||
      String(displayName).toLowerCase().includes(q) ||
      String(username).toLowerCase().includes(q) ||
      String(row.userId).includes(q)
    );
  });
});

const selectLogUser = (row) => {
  logsFilterUserId.value = row.userId;
  const display = row.displayName || row.userId;
  logsUserSearch.value = String(display);
};

const clearLogUser = () => {
  logsFilterUserId.value = "";
  logsUserSearch.value = "";
};

const normalizedSortKey = computed(() => {
  const key = logsSortKey.value;
  if (logsCategoryTab.value === "gains") {
    return key === "type" ? "source" : key;
  }
  return key === "source" ? "type" : key;
});

const sortedGainLogs = computed(() => {
  const list = [...filteredGainLogs.value];
  const dir = logsSortDir.value === "asc" ? 1 : -1;
  const key = normalizedSortKey.value;
  return list.sort((a, b) => {
    if (key === "amount") {
      return (Number(a.total_amount) - Number(b.total_amount)) * dir;
    }
    if (key === "user") {
      const nameA = leaderboardUsers.value[a.user_discord_id]?.displayName || a.user_discord_id;
      const nameB = leaderboardUsers.value[b.user_discord_id]?.displayName || b.user_discord_id;
      return String(nameA).localeCompare(String(nameB)) * dir;
    }
    if (key === "source") {
      return String(a.source || "").localeCompare(String(b.source || "")) * dir;
    }
    return ((parseDateTimeValue(a.created_at)?.getTime() || 0) - (parseDateTimeValue(b.created_at)?.getTime() || 0)) * dir;
  });
});

const sortedTransactionLogs = computed(() => {
  const list = [...filteredTransactionLogs.value];
  const dir = logsSortDir.value === "asc" ? 1 : -1;
  const key = normalizedSortKey.value;
  return list.sort((a, b) => {
    if (key === "amount") {
      return (Number(formatTransactionAmount(a)) - Number(formatTransactionAmount(b))) * dir;
    }
    if (key === "user") {
      const nameA = leaderboardUsers.value[a.user_discord_id]?.displayName || a.user_discord_id;
      const nameB = leaderboardUsers.value[b.user_discord_id]?.displayName || b.user_discord_id;
      return String(nameA).localeCompare(String(nameB)) * dir;
    }
    if (key === "type") {
      return String(formatTransactionType(a.type)).localeCompare(String(formatTransactionType(b.type))) * dir;
    }
    return ((parseDateTimeValue(a.created_at)?.getTime() || 0) - (parseDateTimeValue(b.created_at)?.getTime() || 0)) * dir;
  });
});

const sortedGameLogs = computed(() => {
  const list = [...filteredGameLogs.value];
  const dir = logsSortDir.value === "asc" ? 1 : -1;
  const key = normalizedSortKey.value;
  return list.sort((a, b) => {
    if (key === "amount") {
      return (getGameNet(a) - getGameNet(b)) * dir;
    }
    if (key === "user") {
      const nameA = leaderboardUsers.value[a.user_discord_id]?.displayName || a.user_discord_id;
      const nameB = leaderboardUsers.value[b.user_discord_id]?.displayName || b.user_discord_id;
      return String(nameA).localeCompare(String(nameB)) * dir;
    }
    if (key === "type") {
      return String(formatGameName(a.type)).localeCompare(String(formatGameName(b.type))) * dir;
    }
    return ((parseDateTimeValue(a.created_at)?.getTime() || 0) - (parseDateTimeValue(b.created_at)?.getTime() || 0)) * dir;
  });
});

const currentLogRows = computed(() => {
  if (logsCategoryTab.value === "transactions") return sortedTransactionLogs.value;
  if (logsCategoryTab.value === "games") return sortedGameLogs.value;
  return sortedGainLogs.value;
});

const totalLogPages = computed(() => {
  const size = Number(logsLimit.value || 20);
  return Math.max(1, Math.ceil(currentLogRows.value.length / size));
});

const paginatedLogs = computed(() => {
  const size = Number(logsLimit.value || 20);
  const page = Math.min(Math.max(1, logsPage.value), totalLogPages.value);
  const start = (page - 1) * size;
  return currentLogRows.value.slice(start, start + size);
});

const formatGainSource = (source) => {
  const key = String(source || "");
  if (key === "twitch_message") return t("adminGuild.logs.gainSources.twitchMessage");
  if (key === "twitch_watch") return t("adminGuild.logs.gainSources.twitchWatch");
  if (key === "twitch_sub") return t("adminGuild.logs.gainSources.twitchSub");
  if (key === "twitch_subgift") return t("adminGuild.logs.gainSources.twitchSubgift");
  if (key === "twitch_bits") return t("adminGuild.logs.gainSources.twitchBits");
  if (key === "twitch_daily") return t("adminGuild.logs.gainSources.twitchDaily");
  if (key === "game") return t("adminGuild.logs.gainSources.game");
  if (key === "message") return t("adminGuild.logs.gainSources.discordMessage");
  if (key === "voice") return t("adminGuild.logs.gainSources.discordVoice");
  if (key === "daily") return t("adminGuild.logs.gainSources.daily");
  if (key === "purchase") return t("adminGuild.logs.gainSources.purchase");
  if (key === "achievement") return t("adminGuild.logs.gainSources.achievement");
  return key || t("common.na");
};

const formatSignedAmount = (value) => {
  const number = Number(value || 0);
  const sign = number < 0 ? "-" : "+";
  return `${sign}${Math.abs(number)}`;
};

const parseGainData = (value) => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value === "object") return value;
  return {};
};

const formatGainTier = (tier) => {
  const key = String(tier || "").toLowerCase();
  if (key === "prime") return t("adminGuild.logs.tiers.prime");
  if (key === "t1") return t("adminGuild.logs.tiers.t1");
  if (key === "t2") return t("adminGuild.logs.tiers.t2");
  if (key === "t3") return t("adminGuild.logs.tiers.t3");
  return "";
};

const formatLinkedTier = (user) => {
  if (user?.is_streamer) {
    return t("adminGuild.logs.tiers.streamer");
  }
  const label = formatGainTier(user?.twitch_tier);
  return label || "—";
};

const tierPillClass = (user) => {
  if (user?.is_streamer) return "tier-streamer";
  const key = String(user?.twitch_tier || "").toLowerCase();
  if (key === "prime") return "tier-prime";
  if (key === "t1") return "tier-t1";
  if (key === "t2") return "tier-t2";
  if (key === "t3") return "tier-t3";
  return "tier-none";
};

const formatGainMultiplier = (log) => {
  const multiplier = Number(log?.multiplier || 1);
  const data = parseGainData(log?.data);
  const logUserId = String(log?.user_discord_id || "");
  const linkedTier = linkedTwitchTierMap.value?.[logUserId] || null;
  const tierValue = data?.twitch_tier || linkedTier;
  const tierLabel = formatGainTier(tierValue);
  const base = `x${multiplier.toFixed(2)}`;
  return tierLabel ? `${base} (${tierLabel})` : base;
};

const formatAmount = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString(locale.value || "fr-FR");
};

const formatTransactionType = (type) => {
  const key = String(type || "");
  if (key === "shop_purchase") return t("adminGuild.logs.transactionTypes.shopPurchase");
  if (key === "sale_purchase") return t("adminGuild.logs.transactionTypes.salePurchase");
  if (key === "sale_reclaim") return t("adminGuild.logs.transactionTypes.saleReclaim");
  return key || t("common.na");
};

const formatTransactionItem = (log) => {
  const data = parseEventData(log?.data);
  return data.item_name || data.itemName || t("common.na");
};

const formatTransactionAmount = (log) => {
  const data = parseEventData(log?.data);
  const price = Number(data.price ?? log?.amount ?? 0);
  return price;
};

const formatTransactionDetails = (log) => {
  const data = parseEventData(log?.data);
  if (log?.type === "shop_purchase") {
    const shopName = data.shop_name || data.shopName;
    return shopName ? t("adminGuild.logs.transactionDetails.shop", { shop: shopName }) : t("common.na");
  }
  if (log?.type === "sale_purchase") {
    const sellerId = data.seller_id || data.sellerId;
    if (!sellerId) return t("common.na");
    const sellerName = leaderboardUsers.value[sellerId]?.displayName || sellerId;
    return t("adminGuild.logs.transactionDetails.soldBy", { seller: sellerName });
  }
  if (log?.type === "sale_reclaim") {
    return t("adminGuild.logs.transactionDetails.reclaimed");
  }
  return data.details || t("common.na");
};

const formatGameName = (type) => {
  const key = String(type || "");
  if (key === "flip") return t("adminGuild.games.coinFlip.title");
  if (key === "dice") return t("adminGuild.games.dice.title");
  if (key === "roulette") return t("adminGuild.games.roulette.title");
  if (key === "higherLower") return t("adminGuild.games.higherLower.title");
  if (key === "crash") return t("adminGuild.games.crash.title");
  if (key === "double") return t("adminGuild.games.double.title");
  if (key === "slot") return t("adminGuild.games.slot.title");
  if (key === "mystery") return t("adminGuild.games.mystery.title");
  return key || t("adminGuild.logs.columns.game");
};

const formatItemType = (type) => {
  const key = String(type || "");
  if (key === "role") return t("adminGuild.shopItems.typeRole");
  if (key === "temp_role") return t("adminGuild.shopItems.typeTempRole");
  if (key === "inventory") return t("adminGuild.shopItems.typeInventory");
  if (key === "irl") return t("adminGuild.shopItems.typeIrl");
  if (key === "lootbox") return t("adminGuild.shopItems.typeLootbox");
  if (key === "currency") return t("adminGuild.shopItems.typeCurrency");
  return key || t("common.na");
};

const formatAvailability = (item) => {
  if (!item?.available_from && !item?.available_to) {
    return t("adminGuild.shopItems.availabilityAnytime");
  }
  const fromLabel = t("adminGuild.shopItems.availableFromShort");
  const toLabel = t("adminGuild.shopItems.availableToShort");
  const from = item?.available_from ? formatDateTime(item.available_from) : "";
  const to = item?.available_to ? formatDateTime(item.available_to) : "";
  if (from && to) return `${fromLabel} ${from} • ${toLabel} ${to}`;
  if (from) return `${fromLabel} ${from}`;
  if (to) return `${toLabel} ${to}`;
  return t("adminGuild.shopItems.availabilityAnytime");
};

const getGameBet = (log) => {
  const data = parseEventData(log?.data);
  return Number(data.bet ?? 0);
};

const getGamePayout = (log) => {
  const data = parseEventData(log?.data);
  return Number(data.payout ?? 0);
};

const getGameNet = (log) => {
  const data = parseEventData(log?.data);
  if (log?.amount !== undefined && log?.amount !== null) {
    return Number(log.amount || 0);
  }
  return Number(data.payout || 0) - Number(data.bet || 0);
};

const formatGameOutcome = (log) => {
  const data = parseEventData(log?.data);
  const win = typeof data.win === "boolean" ? data.win : Number(data.payout || 0) > 0;
  const net = getGameNet(log);
  const label = win ? t("adminGuild.logs.gameWon") : t("adminGuild.logs.gameLost");
  if (!net) return label;
  return `${label} (${formatSignedAmount(net)})`;
};

const sourceMeta = (source) => {
  const key = String(source || "");
  if (key.startsWith("twitch")) {
    return { kind: "twitch", icon: "🟣", label: t("adminGuild.logs.sources.twitch") };
  }
  if (key === "achievement") {
    return { kind: "achievement", icon: "🏆", label: t("adminGuild.logs.gainSources.achievement") };
  }
  return { kind: "discord", icon: "🔵", label: t("adminGuild.logs.sources.discord") };
};

const addShopRole = (roleId) => {
  const id = String(roleId);
  if (showShopSettingsModal.value) {
    if (!shopSettingsRoleIds.value.map(String).includes(id)) {
      shopSettingsRoleIds.value = [...shopSettingsRoleIds.value, id];
    }
    showShopSettingsRolePicker.value = true;
  } else if (!newShopRoleIds.value.map(String).includes(id)) {
    newShopRoleIds.value = [...newShopRoleIds.value, id];
    showNewShopRolePicker.value = true;
  }
};

const removeShopRole = (roleId) => {
  const id = String(roleId);
  if (showShopSettingsModal.value) {
    shopSettingsRoleIds.value = shopSettingsRoleIds.value.filter((value) => String(value) !== id);
  } else {
    newShopRoleIds.value = newShopRoleIds.value.filter((value) => String(value) !== id);
  }
};

const addItemRole = (roleId) => {
  const id = String(roleId);
  if (!itemRoleIds.value.map(String).includes(id)) {
    itemRoleIds.value = [...itemRoleIds.value, id];
  }
  showItemRolePicker.value = true;
};

const removeItemRole = (roleId) => {
  const id = String(roleId);
  itemRoleIds.value = itemRoleIds.value.filter((value) => String(value) !== id);
};

const loadLeaderboard = async ({ page = leaderboardPage.value } = {}) => {
  const token = getToken();
  const limit = leaderboardLimit.value;
  const res = await fetch(
    `${config.public.apiBase}/api/economy/leaderboard?guildId=${id}&page=${page}&limit=${limit}&minBalance=1&ts=${Date.now()}`,
    {
      cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`
    }
    }
  );
  const data = await res.json();
  leaderboard.value = data.leaderboard || [];
  leaderboardTotal.value = Number(data.total || 0);
  leaderboardLimit.value = Number(data.limit || limit);
  leaderboardPage.value = Number(data.page || page || 1);
  await resolveLeaderboardUsers();
  await loadLeaderboardSummary();
};

const changeLeaderboardPage = async (delta) => {
  const next = Math.min(
    leaderboardTotalPages.value,
    Math.max(1, Number(leaderboardPage.value || 1) + delta)
  );
  if (next === leaderboardPage.value) return;
  leaderboardPage.value = next;
  await loadLeaderboard({ page: next });
};

const resolveUserIds = async (ids, attempt = 1) => {
  const unique = Array.from(
    new Set(
      (ids || [])
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  );
  const missing = unique.filter((userId) => {
    const entry = leaderboardUsers.value[userId];
    return !entry || !Object.prototype.hasOwnProperty.call(entry, "avatar");
  });
  if (!missing.length) return;
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userIds: missing })
  });
  if (!res.ok) return;
  const data = await res.json();
  const users = data.users || {};
  leaderboardUsers.value = { ...leaderboardUsers.value, ...users };
  if (attempt >= 2) return;
  const unresolved = missing.filter((userId) => {
    const entry = leaderboardUsers.value[userId];
    return !entry || !Object.prototype.hasOwnProperty.call(entry, "avatar");
  });
  if (!unresolved.length) return;
  await new Promise((resolve) => setTimeout(resolve, 300));
  await resolveUserIds(unresolved, attempt + 1);
};

const inventoryDisplayName = (user) => {
  const userId = String(user?.userId || "");
  return (
    leaderboardUsers.value[userId]?.displayName ||
    user?.username ||
    userId ||
    "Utilisateur"
  );
};

const normalizeAvatarUrl = (userId, avatar) => {
  const value = String(avatar || "").trim();
  if (!value) return "";
  if (value.startsWith("http")) return value;
  const ext = value.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${value}.${ext}?size=64`;
};

const inventoryAvatarUrl = (user) => {
  const userId = String(user?.userId || "");
  const info = leaderboardUsers.value[userId] || {};
  const avatar = info.avatar || user?.avatar || "";
  return normalizeAvatarUrl(userId, avatar);
};

const userInitials = (user) => {
  const name = inventoryDisplayName(user);
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const selectInventoryUser = (userId) => {
  inventorySelectedUserId.value = String(userId || "");
};

const inventoryRemoveKey = (userId, itemId) => `${userId}-${itemId}`;

const loadInventories = async ({ force = false } = {}) => {
  if (!force && loadedTabs.inventories) return;
  inventoryLoading.value = true;
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/inventories`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  inventoryUsers.value = data.inventories || [];
  if (!inventoryUsers.value.length) {
    inventorySelectedUserId.value = "";
  } else if (
    !inventoryUsers.value.some((user) => String(user.userId) === String(inventorySelectedUserId.value))
  ) {
    inventorySelectedUserId.value = String(inventoryUsers.value[0].userId);
  }
  const ids = inventoryUsers.value.map((entry) => entry.userId);
  inventoryUsers.value.forEach((entry) => {
    (entry.items || []).forEach((item) => {
      const key = inventoryRemoveKey(entry.userId, item.itemId);
      if (!inventoryRemoveQuantities[key]) inventoryRemoveQuantities[key] = 1;
    });
  });
  await resolveUserIds(ids);
  inventoryLoading.value = false;
  loadedTabs.inventories = true;
};

const removeInventory = async (userId, itemId) => {
  if (!userId || !itemId) return;
  const key = inventoryRemoveKey(userId, itemId);
  const quantity = Math.max(1, Number(inventoryRemoveQuantities[key] || 1));
  if (
    !confirm(
      t("adminGuild.inventories.removeConfirm", { count: quantity })
    )
  ) {
    return;
  }
  const token = getToken();
  const params = new URLSearchParams({ quantity: String(quantity) });
  await fetch(
    `${config.public.apiBase}/api/guilds/${id}/inventory/${userId}/${itemId}?${params.toString()}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  await loadInventories({ force: true });
};

const resolveLeaderboardUsers = async () => {
  const ids = (leaderboard.value || []).map((row) => row.userId);
  await resolveUserIds(ids);
};


const loadLeaderboardSummary = async () => {
  const token = getToken();
  const tzOffset = String(getTimeZoneOffsetMinutes(botTimezone.value || browserTimezone.value));
  const res = await fetch(
    `${config.public.apiBase}/api/economy/summary?guildId=${id}&tzOffset=${tzOffset}&ts=${Date.now()}`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  const data = await res.json();
  leaderboardSummary.day = Number(data.day || 0);
  leaderboardSummary.month = Number(data.month || 0);
  leaderboardSummary.year = Number(data.year || 0);
};

const loadGuildSummary = async () => {
  const token = getToken();
  if (!token) return;
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/summary`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return;
  const data = await res.json();
  overviewStats.members = data.summary?.members ?? null;
  overviewStats.online = data.summary?.online ?? null;
  overviewStats.bots = data.summary?.bots ?? null;
};

const ensureBotPresent = async () => {
  const token = getToken();
  if (!token) return;
  const res = await fetch(`${config.public.apiBase}/api/servers`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return;
  const data = await res.json();
  const servers = data.servers || [];
  const current = servers.find((g) => String(g.id) === String(id));
  if (current && current.botPresent === false) {
    window.location.href = inviteUrl.value;
  }
};

const loadLeaderboardPost = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/leaderboard-post`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const settings = data.settings || {};
  leaderboardPost.channel_id = settings.channel_id || "";
  leaderboardPost.limit = Number(settings.limit || 10);
  leaderboardPost.enabled = settings.enabled !== false;
  await loadLeaderboardPostStatus();
};

const loadLeaderboardPostStatus = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/leaderboard-post/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  leaderboardPostStatus.value = {
    status: data.status || "none",
    channelName: data.channelName || ""
  };
};

const saveLeaderboardPost = async () => {
  const token = getToken();
  leaderboardPostError.value = "";
  if (leaderboardPostStatus.value.status === "none") {
    await fetch(`${config.public.apiBase}/api/guilds/${id}/leaderboard-post`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/leaderboard-post`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      channel_id: leaderboardPost.channel_id,
      limit: leaderboardPost.limit,
      enabled: leaderboardPost.enabled
    })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "leaderboard_already_exists") {
      leaderboardPostError.value = "Un seul leaderboard possible";
    }
    return;
  }
  await fetch(`${config.public.apiBase}/api/guilds/${id}/leaderboard-post/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  await loadLeaderboardPostStatus();
  notifySaved();
};

const deleteLeaderboardPost = async () => {
  const token = getToken();
  await fetch(`${config.public.apiBase}/api/guilds/${id}/leaderboard-post`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  leaderboardPost.channel_id = "";
  leaderboardPost.enabled = false;
  await loadLeaderboardPostStatus();
};

const getLogsFetchLimit = () => {
  const perPage = Math.max(1, Number(logsLimit.value || 50));
  return Math.min(10000, perPage * 100);
};

const applyTimeZoneFromApi = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return;
  const fixedOffset = parseFixedTimeZoneOffset(raw);
  if (fixedOffset !== null) {
    botTimezone.value = raw;
    return;
  }
  try {
    const resolved = new Intl.DateTimeFormat("en-US", { timeZone: raw }).resolvedOptions().timeZone;
    botTimezone.value = resolved || raw;
  } catch {
    // ignore invalid timezone values from API
  }
};

const loadGainLogs = async () => {
  const token = getToken();
  const params = new URLSearchParams({
    guildId: id,
    limit: String(getLogsFetchLimit())
  });
  const res = await fetch(`${config.public.apiBase}/api/economy/gains?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  applyTimeZoneFromApi(data.timeZone);
  gainLogs.value = data.logs || [];
  const ids = (gainLogs.value || []).map((log) => log.user_discord_id);
  await resolveUserIds(ids);
};

const loadTransactionLogs = async () => {
  const token = getToken();
  const params = new URLSearchParams({
    guildId: id,
    limit: String(getLogsFetchLimit())
  });
  const res = await fetch(`${config.public.apiBase}/api/economy/transactions?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  applyTimeZoneFromApi(data.timeZone);
  transactionLogs.value = (data.logs || []).map((row) => ({
    ...row,
    data: parseEventData(row.data)
  }));
  const ids = [];
  transactionLogs.value.forEach((log) => {
    ids.push(log.user_discord_id);
    const payload = parseEventData(log.data);
    if (payload.seller_id || payload.sellerId) ids.push(payload.seller_id || payload.sellerId);
    if (payload.buyer_id || payload.buyerId) ids.push(payload.buyer_id || payload.buyerId);
  });
  await resolveUserIds(ids);
};

const loadGameLogs = async () => {
  const token = getToken();
  const params = new URLSearchParams({
    guildId: id,
    limit: String(getLogsFetchLimit())
  });
  const res = await fetch(`${config.public.apiBase}/api/economy/games?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  applyTimeZoneFromApi(data.timeZone);
  gameLogs.value = (data.logs || []).map((row) => ({
    ...row,
    data: parseEventData(row.data)
  }));
  const ids = (gameLogs.value || []).map((log) => log.user_discord_id);
  await resolveUserIds(ids);
};

const refreshLogs = async () => {
  if (logsCategoryTab.value === "transactions") {
    await loadTransactionLogs();
    return;
  }
  if (logsCategoryTab.value === "games") {
    await loadGameLogs();
    return;
  }
  if (logsCategoryTab.value === "linked") {
    await loadLinkedTwitchUsers();
    return;
  }
  await Promise.allSettled([loadGainLogs(), loadLinkedTwitchUsers()]);
};

const buildCommunityMessagePayload = () => ({
  channel_id: communityMessageChannelId.value || "",
  sections: communityMessageSections.value || [],
  shop_ids: communityMessageShopIds.value || [],
  include_game_chances: Boolean(communityMessageIncludeGameChances.value),
  include_shop_discounts: communityMessageIncludeShopDiscounts.value !== false
});

const loadCommunityMessage = async ({ force = false } = {}) => {
  if (!force && loadedTabs.communityMessage) return;
  communityMessageLoading.value = true;
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/community-message`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    const data = await res.json();
    const settings = data.settings || {};
    communityMessageChannelId.value = settings.channel_id || "";
    const rawSections = Array.isArray(settings.sections) ? settings.sections : [];
    communityMessageSections.value = rawSections.length
      ? rawSections
      : communitySectionOptions.value.map((item) => item.key);
    communityMessageShopIds.value = Array.isArray(settings.shop_ids) ? settings.shop_ids.map(String) : [];
    communityMessageIncludeGameChances.value = Boolean(settings.include_game_chances);
    communityMessageIncludeShopDiscounts.value = settings.include_shop_discounts !== false;
    communityMessageMessageId.value = settings.message_id || null;
  }
  communityMessageLoading.value = false;
  loadedTabs.communityMessage = true;
  scheduleCommunityPreview();
};

const previewCommunityMessage = async () => {
  communityMessagePreviewing.value = true;
  communityMessageStatus.value = "";
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/community-message/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(buildCommunityMessagePayload())
  });
  if (res.ok) {
    const data = await res.json();
    communityMessagePreview.value = data.preview?.content || "";
    communityMessagePreviewLength.value = Number(
      data.preview?.fullLength || data.preview?.length || 0
    );
  } else {
    communityMessageStatus.value = t("adminGuild.communityMessage.previewError");
  }
  communityMessagePreviewing.value = false;
};

let communityPreviewTimer = null;
const scheduleCommunityPreview = () => {
  if (communityPreviewTimer) clearTimeout(communityPreviewTimer);
  communityPreviewTimer = setTimeout(() => {
    previewCommunityMessage();
  }, 250);
};

const sendCommunityMessage = async () => {
  if (!communityMessageChannelId.value) return;
  communityMessageSending.value = true;
  communityMessageStatus.value = "";
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/community-message/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(buildCommunityMessagePayload())
  });
  if (res.ok) {
    const data = await res.json();
    communityMessageMessageId.value = data.messageId || null;
    communityMessageStatus.value = t("adminGuild.communityMessage.sendSuccess");
  } else {
    const data = await res.json().catch(() => ({}));
    if (data.error === "message_already_sent") {
      communityMessageStatus.value = t("adminGuild.communityMessage.alreadySent");
    } else if (data.error === "message_too_long") {
      communityMessageStatus.value = t("adminGuild.communityMessage.tooLong");
    } else {
      communityMessageStatus.value = t("adminGuild.communityMessage.sendError");
    }
  }
  communityMessageSending.value = false;
};

const deleteCommunityMessage = async () => {
  if (!communityMessageMessageId.value) return;
  communityMessageDeleting.value = true;
  communityMessageStatus.value = "";
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/community-message`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    communityMessageMessageId.value = null;
    communityMessageStatus.value = t("adminGuild.communityMessage.deleteSuccess");
  } else {
    communityMessageStatus.value = t("adminGuild.communityMessage.deleteError");
  }
  communityMessageDeleting.value = false;
};

watch(
  [
    communityMessageSections,
    communityMessageShopIds,
    communityMessageIncludeGameChances,
    communityMessageIncludeShopDiscounts
  ],
  () => {
    scheduleCommunityPreview();
  },
  { deep: true }
);

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const emojiMap = {
  money_with_wings: "💸",
  bank: "🏦",
  envelope: "✉️",
  microphone: "🎤",
  gift: "🎁",
  tada: "🎉",
  gem: "💎",
  no_entry_sign: "🚫",
  moneybag: "💰",
  shopping_bags: "🛍️",
  point_right: "👉",
  arrow_right: "➡️",
  repeat: "🔁",
  twitch: "🟣",
  warning: "⚠️",
  sparkles: "✨",
  video_game: "🎮",
  arrows_counterclockwise: "🔄",
  Utilityligne: "━━━━━━━━━━━━━━━━━━━━"
};

const replaceEmojiShortcodes = (text) =>
  text.replace(/:([a-zA-Z0-9_]+):/g, (match, key) => emojiMap[key] || match);

const formatCommunityPreview = (raw) => {
  const fallback = t("adminGuild.communityMessage.previewEmpty");
  const content = String(raw || "").trim() || fallback;
  const safe = escapeHtml(content);
  const withEmoji = replaceEmojiShortcodes(safe);
  const withDiscordEmoji = withEmoji
    .replace(/&lt;a:([a-zA-Z0-9_]+):(\d+)&gt;/g, (_m, name, id) => {
      return `<img class="inline-emoji" alt="${name}" src="https://cdn.discordapp.com/emojis/${id}.gif" />`;
    })
    .replace(/&lt;:([a-zA-Z0-9_]+):(\d+)&gt;/g, (_m, name, id) => {
      return `<img class="inline-emoji" alt="${name}" src="https://cdn.discordapp.com/emojis/${id}.png" />`;
    });
  const withRoles = withDiscordEmoji.replace(/&lt;@&amp;(\d+)&gt;/g, (_m, id) => {
    const name = roleName ? roleName(id) : `role ${id}`;
    return `<span class="role-pill">@${escapeHtml(name)}</span>`;
  });
  const withLinks = withRoles
    .replace(/&lt;(https?:\/\/[^&]+)&gt;/g, (_m, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    })
    .replace(/(https?:\/\/[^\s<]+)/g, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  const withMarkdown = withLinks
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
  return withMarkdown.replace(/\n/g, "<br>");
};

const loadLinkedTwitchUsers = async () => {
  const token = getToken();
  linkedUsersLoading.value = true;
  try {
    const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/twitch/linked-users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      linkedTwitchUsers.value = [];
      return;
    }
    const data = await res.json();
    linkedTwitchUsers.value = data.users || [];
    linkedUsersPage.value = 1;
    const ids = (linkedTwitchUsers.value || []).map((row) => row.discord_id).filter(Boolean);
    await resolveUserIds(ids);
  } catch {
    linkedTwitchUsers.value = [];
  } finally {
    linkedUsersLoading.value = false;
  }
};

const unlinkTwitchUser = async (user) => {
  if (!user?.discord_id) return;
  const confirm = window.confirm(t("adminGuild.twitch.unlinkConfirm"));
  if (!confirm) return;
  const token = getToken();
  unlinkingUserId.value = String(user.discord_id);
  const res = await fetch(
    `${config.public.apiBase}/api/guilds/${id}/twitch/linked-users/${user.discord_id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  unlinkingUserId.value = "";
  if (!res.ok) return;
  await loadLinkedTwitchUsers();
};

const openLeaderboardDetails = async (row) => {
  selectedLeaderboardUser.value = row;
  showLeaderboardModal.value = true;
  await loadLeaderboardUserStats();
};

const loadLeaderboardUserStats = async () => {
  if (!selectedLeaderboardUser.value) return;
  const token = getToken();
  const tzOffset = String(getTimeZoneOffsetMinutes(botTimezone.value || browserTimezone.value));
  const params = new URLSearchParams({
    guildId: id,
    userId: selectedLeaderboardUser.value.userId,
    tzOffset
  });
  const res = await fetch(`${config.public.apiBase}/api/economy/user-stats?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  leaderboardStats.value = data.stats || null;
};

const updateUserBalance = async () => {
  if (!selectedLeaderboardUser.value) return;
  balanceEdit.saving = true;
  const amount = Number(balanceEdit.amount || 0);
  const targetUser =
    leaderboardUsers[selectedLeaderboardUser.value.userId]?.displayName || selectedLeaderboardUser.value.userId;
  const actionLabel =
    balanceEdit.mode === "set"
      ? t("adminGuild.leaderboard.balanceVerbSet")
      : balanceEdit.mode === "add"
        ? t("adminGuild.leaderboard.balanceVerbAdd")
        : t("adminGuild.leaderboard.balanceVerbRemove");
  const confirmMessage = t("adminGuild.leaderboard.balanceConfirm", {
    action: actionLabel,
    amount,
    user: targetUser
  });
  if (!window.confirm(confirmMessage)) {
    balanceEdit.saving = false;
    return;
  }
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/economy/user-balance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      guildId: id,
      userId: selectedLeaderboardUser.value.userId,
      amount,
      mode: balanceEdit.mode
    })
  });
  if (handleUnauthorized(res)) {
    balanceEdit.saving = false;
    return;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(data?.error || t("adminGuild.leaderboard.balanceError"));
    balanceEdit.saving = false;
    return;
  }
  balanceEdit.saving = false;
  await loadLeaderboard();
  await loadGainLogs();
  await loadLeaderboardUserStats();
  const successLabel =
    balanceEdit.mode === "set"
      ? t("adminGuild.leaderboard.balanceSuccessSet")
      : balanceEdit.mode === "add"
        ? t("adminGuild.leaderboard.balanceSuccessAdd")
        : t("adminGuild.leaderboard.balanceSuccessRemove");
  notifySaved(t("adminGuild.leaderboard.balanceSuccess", { amount, action: successLabel, user: targetUser }));
};

const resetCoins = async () => {
  showResetModal.value = true;
  resetInput.value = "";
  resetStatus.value = "";
};

const confirmResetCoins = async () => {
  if (resetInput.value !== "YES") {
    resetStatus.value = "Tape YES pour confirmer.";
    return;
  }
  isResetting.value = true;
  resetStatus.value = "";
  const token = getToken();
  await fetch(`${config.public.apiBase}/api/economy/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ guildId: id })
  });
  isResetting.value = false;
  resetStatus.value = t("adminGuild.reset.success");
  setTimeout(() => {
    window.location.reload();
  }, 1000);
};

const formatDate = (value) => {
  if (!value) return "";
  const date = parseDateTimeValue(value);
  if (!date) return "";
  try {
    return formatInDisplayTimeZone(date, {
      dateStyle: "short"
    });
  } catch {
    return date.toLocaleDateString(locale.value || "fr-FR");
  }
};

const formatMonth = (value) => {
  if (!value) return "";
  const [year, month] = String(value).split("-");
  if (!year || !month) return value;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

const toDateTimeLocal = (value) => {
  if (!value) return "";
  const date = parseDateTimeValue(value);
  if (!date) return "";
  try {
    const parts = formatPartsInDisplayTimeZone(date, {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
      .reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
      }, {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  } catch {
    const pad = (num) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  }
};

const loadShops = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/shops`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  shops.value = data.shops || [];
  if (!newItem.shopId && shops.value.length) {
    newItem.shopId = String(shops.value[0].id);
  }
};

const loadRoles = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/roles`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  roles.value = data.roles || [];
  botRolePosition.value = data.botRolePosition ?? null;
  rolesLoaded.value = true;
};

const refreshRoles = async () => {
  await loadRoles();
};

const loadChannels = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/channels`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  channels.value = data.channels || [];
  channelsLoaded.value = true;
};

const loadAutomation = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/economy/automation`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const configData = data.config || {};
  automation.message = {
    enabled: Boolean(configData.rules?.message?.enabled),
    min_gain: Number(configData.rules?.message?.min_gain || 0),
    max_gain: Number(configData.rules?.message?.max_gain || 0),
    interval: Number(configData.rules?.message?.interval || 0)
  };
  automation.voice = {
    enabled: Boolean(configData.rules?.voice?.enabled),
    min_gain: Number(configData.rules?.voice?.min_gain || 0),
    max_gain: Number(configData.rules?.voice?.max_gain || 0),
    interval: Number(configData.rules?.voice?.interval || 0)
  };
  roleBoosters.value = (configData.roleBoosters || []).map((b) => ({
    ...b,
    enabled: normalizeBooleanInput(b.enabled, true),
    stackable: normalizeBooleanInput(b.stackable, false)
  }));
  channelBoosters.value = (configData.channelBoosters || []).map((b) => ({
    ...b,
    enabled: normalizeBooleanInput(b.enabled, true),
    stackable: normalizeBooleanInput(b.stackable, false)
  }));
  blockedRoles.value = configData.blockedRoles || [];
  blockedChannels.value = configData.blockedChannels || [];
};

const loadTwitchAutomation = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/twitch/automation`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const configData = data.config || {};
  twitchAutomation.message = {
    enabled: Boolean(configData.rules?.message?.enabled),
    min_gain: Number(configData.rules?.message?.min_gain || 0),
    max_gain: Number(configData.rules?.message?.max_gain || 0),
    interval: Number(configData.rules?.message?.interval || 1)
  };
  twitchAutomation.watch = {
    enabled: Boolean(configData.rules?.watch?.enabled),
    min_gain: Number(configData.rules?.watch?.min_gain || 0),
    max_gain: Number(configData.rules?.watch?.max_gain || 0),
    interval: Number(configData.rules?.watch?.interval || 5)
  };
  twitchAutomation.multipliers = {
    prime: {
      enabled: Boolean(configData.multipliers?.prime?.enabled),
      value: Number(configData.multipliers?.prime?.value || 1)
    },
    t1: {
      enabled: Boolean(configData.multipliers?.t1?.enabled),
      value: Number(configData.multipliers?.t1?.value || 1)
    },
    t2: {
      enabled: Boolean(configData.multipliers?.t2?.enabled),
      value: Number(configData.multipliers?.t2?.value || 1)
    },
    t3: {
      enabled: Boolean(configData.multipliers?.t3?.enabled),
      value: Number(configData.multipliers?.t3?.value || 1)
    }
  };
  twitchAutomation.events = {
    sub_t1: {
      enabled: Boolean(configData.events?.sub_t1?.enabled),
      amount: Number(configData.events?.sub_t1?.amount || 0)
    },
    sub_t2: {
      enabled: Boolean(configData.events?.sub_t2?.enabled),
      amount: Number(configData.events?.sub_t2?.amount || 0)
    },
    sub_t3: {
      enabled: Boolean(configData.events?.sub_t3?.enabled),
      amount: Number(configData.events?.sub_t3?.amount || 0)
    },
    subgift_t1: {
      enabled: Boolean(configData.events?.subgift_t1?.enabled),
      amount: Number(configData.events?.subgift_t1?.amount || 0)
    },
    subgift_t2: {
      enabled: Boolean(configData.events?.subgift_t2?.enabled),
      amount: Number(configData.events?.subgift_t2?.amount || 0)
    },
    subgift_t3: {
      enabled: Boolean(configData.events?.subgift_t3?.enabled),
      amount: Number(configData.events?.subgift_t3?.amount || 0)
    },
    bits: {
      enabled: Boolean(configData.events?.bits?.enabled),
      amount: Number(configData.events?.bits?.amount || 0)
    }
  };
};

const loadTwitchDailySettings = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/twitch/daily-settings`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const settings = data.settings || {};
  twitchDaily.enabled = settings.enabled !== false;
  twitchDaily.dailyAmount = Number(settings.daily_amount || 0);
  twitchDaily.streak7 = Number(settings.streak_7_bonus_percent || 0);
  twitchDaily.streak14 = Number(settings.streak_14_bonus_percent || 0);
  twitchDaily.streak30 = Number(settings.streak_30_bonus_percent || 0);
};

const parsePayouts = (input) => {
  return String(input || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [comboRaw, multRaw] = line.split(/[:=]/);
      const combo = String(comboRaw || "").trim();
      const multiplier = Number(String(multRaw || "").replace("x", "").trim());
      if (!combo || !Number.isFinite(multiplier)) return null;
      return { combo, multiplier };
    })
    .filter(Boolean);
};

const parseOutcomes = (input) => {
  return String(input || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [multRaw, chanceRaw] = line.split(/[:=]/);
      const multiplier = Number(String(multRaw || "").replace("x", "").trim());
      const chance = Number(String(chanceRaw || "").replace("%", "").trim());
      if (!Number.isFinite(multiplier) || !Number.isFinite(chance)) return null;
      return { multiplier, chance };
    })
    .filter(Boolean);
};

const loadGamesSettings = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/games/settings`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (handleUnauthorized(res)) return;
  const data = await res.json();
  const settings = data.settings || {};
  gamesConfig.enabled = settings.enabled !== false;
  gamesConfig.minBet = Number(settings.minBet ?? 10);
  gamesConfig.maxBet = Number(settings.maxBet ?? 10000);
  gamesConfig.cooldownSeconds = Number(settings.cooldownSeconds ?? 10);
  gamesConfig.houseEdgePercent = Number(settings.houseEdgePercent ?? 5);

  gamesConfig.flip = { ...gamesConfig.flip, ...(settings.flip || {}) };
  gamesConfig.dice = { ...gamesConfig.dice, ...(settings.dice || {}) };
  gamesConfig.slot = { ...gamesConfig.slot, ...(settings.slot || {}) };
  gamesConfig.roulette = { ...gamesConfig.roulette, ...(settings.roulette || {}) };
  gamesConfig.higherLower = { ...gamesConfig.higherLower, ...(settings.higherLower || {}) };
  gamesConfig.crash = { ...gamesConfig.crash, ...(settings.crash || {}) };
  gamesConfig.double = { ...gamesConfig.double, ...(settings.double || {}) };
  gamesConfig.mystery = { ...gamesConfig.mystery, ...(settings.mystery || {}) };

  slotSymbolsInput.value = (gamesConfig.slot.symbols || []).join(" ");
  slotPayoutsInput.value = (gamesConfig.slot.payouts || [])
    .map((row) => `${row.combo}:${row.multiplier}`)
    .join("\n");
  mysteryOutcomesInput.value = (gamesConfig.mystery.outcomes || [])
    .map((row) => `${row.multiplier}:${row.chance}`)
    .join("\n");
};

const loadTwitchStatus = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/twitch/status`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (handleUnauthorized(res)) return;
  const data = await res.json();
  twitchStatus.value = {
    connected: Boolean(data.connected),
    login: data.login || "",
    live: Boolean(data.live)
  };
  twitchLiveOnly.value = data.live_only !== false;
};

const disconnectTwitch = async () => {
  const token = getToken();
  await fetch(`${config.public.apiBase}/api/guilds/${id}/twitch/disconnect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  await loadTwitchStatus();
};

const saveTwitchLiveMode = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/twitch/live-mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ live_only: Boolean(twitchLiveOnly.value) })
  });
  if (!res.ok) return;
  await loadTwitchStatus();
  notifySaved();
};

const saveAutomation = async ({ notify = true } = {}) => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/economy/automation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      rules: automation,
      roleBoosters: roleBoosters.value,
      channelBoosters: channelBoosters.value,
      blockedRoles: blockedRoles.value,
      blockedChannels: blockedChannels.value
    })
  });
  if (!res.ok) return false;
  await loadAutomation();
  markSaved();
  if (notify) notifySaved();
  return true;
};

const saveTwitchAutomation = async ({ notify = true } = {}) => {
  const token = getToken();
  const payload = {
    rules: {
      message: {
        enabled: Boolean(twitchAutomation.message.enabled),
        min_gain: Number(twitchAutomation.message.min_gain || 0),
        max_gain: Number(twitchAutomation.message.max_gain || 0),
        interval: Number(twitchAutomation.message.interval || 0)
      },
      watch: {
        enabled: Boolean(twitchAutomation.watch.enabled),
        min_gain: Number(twitchAutomation.watch.min_gain || 0),
        max_gain: Number(twitchAutomation.watch.max_gain || 0),
        interval: Number(twitchAutomation.watch.interval || 0)
      }
    },
    multipliers: {
      prime: {
        enabled: Boolean(twitchAutomation.multipliers?.prime?.enabled),
        value: Number(twitchAutomation.multipliers?.prime?.value || 1)
      },
      t1: {
        enabled: Boolean(twitchAutomation.multipliers?.t1?.enabled),
        value: Number(twitchAutomation.multipliers?.t1?.value || 1)
      },
      t2: {
        enabled: Boolean(twitchAutomation.multipliers?.t2?.enabled),
        value: Number(twitchAutomation.multipliers?.t2?.value || 1)
      },
      t3: {
        enabled: Boolean(twitchAutomation.multipliers?.t3?.enabled),
        value: Number(twitchAutomation.multipliers?.t3?.value || 1)
      }
    },
    events: {
      sub_t1: {
        enabled: Boolean(twitchAutomation.events?.sub_t1?.enabled),
        amount: Number(twitchAutomation.events?.sub_t1?.amount || 0)
      },
      sub_t2: {
        enabled: Boolean(twitchAutomation.events?.sub_t2?.enabled),
        amount: Number(twitchAutomation.events?.sub_t2?.amount || 0)
      },
      sub_t3: {
        enabled: Boolean(twitchAutomation.events?.sub_t3?.enabled),
        amount: Number(twitchAutomation.events?.sub_t3?.amount || 0)
      },
      subgift_t1: {
        enabled: Boolean(twitchAutomation.events?.subgift_t1?.enabled),
        amount: Number(twitchAutomation.events?.subgift_t1?.amount || 0)
      },
      subgift_t2: {
        enabled: Boolean(twitchAutomation.events?.subgift_t2?.enabled),
        amount: Number(twitchAutomation.events?.subgift_t2?.amount || 0)
      },
      subgift_t3: {
        enabled: Boolean(twitchAutomation.events?.subgift_t3?.enabled),
        amount: Number(twitchAutomation.events?.subgift_t3?.amount || 0)
      },
      bits: {
        enabled: Boolean(twitchAutomation.events?.bits?.enabled),
        amount: Number(twitchAutomation.events?.bits?.amount || 0)
      }
    }
  };
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/twitch/automation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (!res.ok) return false;
  await loadTwitchAutomation();
  markSaved();
  if (notify) notifySaved();
  return true;
};

const saveTwitchDailySettings = async ({ notify = true } = {}) => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/twitch/daily-settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      enabled: twitchDaily.enabled,
      dailyAmount: twitchDaily.dailyAmount,
      streak7: twitchDaily.streak7,
      streak14: twitchDaily.streak14,
      streak30: twitchDaily.streak30
    })
  });
  if (!res.ok) return false;
  await loadTwitchDailySettings();
  markSaved();
  if (notify) notifySaved();
  return true;
};

const saveGamesSettings = async ({ notify = true } = {}) => {
  const token = getToken();
  const symbols = String(slotSymbolsInput.value || "")
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean);
  const payouts = parsePayouts(slotPayoutsInput.value);
  const outcomes = parseOutcomes(mysteryOutcomesInput.value);

  const payload = {
    ...gamesConfig,
    slot: {
      ...gamesConfig.slot,
      symbols,
      payouts
    },
    mystery: {
      ...gamesConfig.mystery,
      outcomes
    }
  };

  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/games/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (handleUnauthorized(res)) return;
  if (!res.ok) return false;
  await loadGamesSettings();
  markSaved();
  if (notify) notifySaved();
  return true;
};

const normalizeMultiplierInput = (value, fallback = 1) => {
  if (value === undefined || value === null || value === "") return fallback;
  const raw = String(value).trim().replace(/^x/i, "").replace(",", ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const normalizeBooleanInput = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (raw === "true" || raw === "1" || raw === "yes" || raw === "on") return true;
    if (raw === "false" || raw === "0" || raw === "no" || raw === "off" || raw === "") return false;
  }
  return Boolean(value);
};

const addRoleBooster = () => {
  if (!newRoleBooster.role_id) return;
  roleBoosters.value.push({
    role_id: newRoleBooster.role_id,
    multiplier: normalizeMultiplierInput(newRoleBooster.multiplier, 1),
    enabled: newRoleBooster.enabled !== false,
    stackable: newRoleBooster.stackable === true
  });
  newRoleBooster.role_id = "";
  newRoleBooster.multiplier = "1";
  newRoleBooster.enabled = true;
  newRoleBooster.stackable = false;
};

const removeRoleBooster = (index) => {
  roleBoosters.value.splice(index, 1);
};

const addChannelBooster = () => {
  if (!newChannelBooster.channel_id) return;
  channelBoosters.value.push({
    channel_id: newChannelBooster.channel_id,
    multiplier: normalizeMultiplierInput(newChannelBooster.multiplier, 1),
    enabled: newChannelBooster.enabled !== false,
    stackable: newChannelBooster.stackable === true
  });
  newChannelBooster.channel_id = "";
  newChannelBooster.multiplier = "1";
  newChannelBooster.enabled = true;
  newChannelBooster.stackable = false;
};

const removeChannelBooster = (index) => {
  channelBoosters.value.splice(index, 1);
};

const addBlockedRole = () => {
  if (!selectedBlockedRole.value) return;
  const id = String(selectedBlockedRole.value);
  if (!blockedRoles.value.map(String).includes(id)) {
    blockedRoles.value.push(id);
  }
  selectedBlockedRole.value = "";
};

const removeBlockedRole = (roleId) => {
  const id = String(roleId);
  blockedRoles.value = blockedRoles.value.filter((value) => String(value) !== id);
};

const addBlockedChannel = () => {
  if (!selectedBlockedChannel.value) return;
  const id = String(selectedBlockedChannel.value);
  if (!blockedChannels.value.map(String).includes(id)) {
    blockedChannels.value.push(id);
  }
  selectedBlockedChannel.value = "";
};

const removeBlockedChannel = (channelId) => {
  const id = String(channelId);
  blockedChannels.value = blockedChannels.value.filter((value) => String(value) !== id);
};

const loadItems = async (shopId) => {
  if (!shopId) {
    items.value = [];
    return;
  }
  const token = getToken();
  const res = await fetch(
    `${config.public.apiBase}/api/shops/${shopId}/items?includeHidden=1&withInventory=1&includeUnavailable=1`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  const data = await res.json();
  items.value = data.items || [];
  trashPage.value = 1;
};

const visibleItems = computed(() =>
  items.value.filter((item) => !item.hidden)
);

const lootboxEntryVisibility = computed(() => {
  const map = new Map();
  (items.value || []).forEach((item) => {
    if (item?.type !== "lootbox") return;
    let data = item.data || null;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        data = null;
      }
    }
    const dataObj = data && typeof data === "object" ? data : {};
    const rawEntries = Array.isArray(dataObj.lootbox)
      ? dataObj.lootbox
      : Array.isArray(dataObj.lootbox_items)
      ? dataObj.lootbox_items
      : Array.isArray(dataObj.rewards)
      ? dataObj.rewards
      : [];
    rawEntries.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const entryId = entry.item_id ?? entry.itemId ?? null;
      if (!entryId) return;
      const key = String(entryId);
      const current = map.get(key) || { hasVisible: false, hasHidden: false };
      if (entry.hidden) {
        current.hasHidden = true;
      } else {
        current.hasVisible = true;
      }
      map.set(key, current);
    });
  });
  return map;
});

const getLootboxEntriesFromItem = (item) => {
  let data = item?.data || null;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }
  const dataObj = data && typeof data === "object" ? data : {};
  const rawEntries = Array.isArray(dataObj.lootbox)
    ? dataObj.lootbox
    : Array.isArray(dataObj.lootbox_items)
    ? dataObj.lootbox_items
    : Array.isArray(dataObj.rewards)
    ? dataObj.rewards
    : [];
  return normalizeLootboxEntries(rawEntries);
};

const hiddenShopItems = computed(() =>
  items.value.filter((item) => {
    if (!item.hidden) return false;
    const info = lootboxEntryVisibility.value.get(String(item.id));
    if (!info) return true;
    return !info.hasVisible;
  })
);

const lootboxHiddenEntries = computed(() => {
  const hiddenItemIds = new Set(hiddenShopItems.value.map((item) => String(item.id)));
  const inventoryMap = new Map(
    (items.value || []).map((item) => [String(item.id), Number(item.inventory_quantity || 0)])
  );
  const list = [];
  (items.value || []).forEach((item) => {
    if (item?.type !== "lootbox") return;
    const entries = getLootboxEntriesFromItem(item);
    entries.forEach((entry, index) => {
      if (!entry?.hidden) return;
      const entryItemId = entry.item_id ? String(entry.item_id) : "";
      if (entryItemId && hiddenItemIds.has(entryItemId)) return;
      list.push({
        id: `lootbox-${item.id}-${index}`,
        name: entry.name || t("adminGuild.shopItems.rewardFallback", { index: index + 1 }),
        type: entry.type || "inventory",
        inventory_quantity: entryItemId ? inventoryMap.get(entryItemId) || 0 : 0,
        lootbox_entry: true,
        lootbox_id: item.id,
        entry_index: index,
        entry_item_id: entryItemId,
        parent_lootbox_name: item.name || "Lootbox"
      });
    });
  });
  return list;
});

const trashedItemsCount = computed(
  () => hiddenShopItems.value.length + lootboxHiddenEntries.value.length
);

const trashTotalPages = computed(() =>
  Math.max(1, Math.ceil(trashedItemsCount.value / trashPageSize))
);

const trashedItemsPage = computed(() => {
  const list = [...hiddenShopItems.value, ...lootboxHiddenEntries.value];
  const start = (trashPage.value - 1) * trashPageSize;
  return list.slice(start, start + trashPageSize);
});

const inventoryUsersSorted = computed(() => {
  const list = Array.isArray(inventoryUsers.value) ? [...inventoryUsers.value] : [];
  const search = inventorySearch.value.trim().toLowerCase();
  const filtered = search
    ? list.filter((user) => {
        const name = inventoryDisplayName(user).toLowerCase();
        const username = String(user.username || "").toLowerCase();
        const idValue = String(user.userId || "").toLowerCase();
        return name.includes(search) || username.includes(search) || idValue.includes(search);
      })
    : list;
  filtered.sort((a, b) => {
    const nameA = inventoryDisplayName(a).toLowerCase();
    const nameB = inventoryDisplayName(b).toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
  return filtered;
});

const selectedInventoryUser = computed(() =>
  inventoryUsers.value.find((user) => String(user.userId) === String(inventorySelectedUserId.value)) || null
);

const openShopSettings = (shop) => {
  selectedShop.value = shop;
  shopForm.id = shop.id;
  shopForm.name = shop.name || "";
  shopSettingsRoleSearch.value = "";
  showShopSettingsRolePicker.value = false;
  const rawRoleIds = shop.required_role_ids || shop.required_role_id || [];
  if (Array.isArray(rawRoleIds)) {
    shopSettingsRoleIds.value = rawRoleIds.map(String);
  } else if (typeof rawRoleIds === "string" && rawRoleIds.trim()) {
    try {
      shopSettingsRoleIds.value = (JSON.parse(rawRoleIds) || []).map(String);
    } catch {
      shopSettingsRoleIds.value = rawRoleIds ? [String(rawRoleIds)] : [];
    }
  } else {
    shopSettingsRoleIds.value = [];
  }
  shopForm.discount_percent = Number(shop.discount_percent || 0);
  shopForm.enabled = shop.enabled !== false;
  shopForm.image_url = shop.image_url || "";
  shopForm.description = shop.description || "";
  showShopSettingsModal.value = true;
};

const saveShopSettings = async () => {
  const token = getToken();
  await fetch(`${config.public.apiBase}/api/guilds/${id}/shops/${shopForm.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: shopForm.name,
      required_role_ids: shopSettingsRoleIds.value,
      discount_percent: shopForm.discount_percent,
      enabled: shopForm.enabled,
      image_url: shopForm.image_url,
      description: shopForm.description
    })
  });
  showShopSettingsModal.value = false;
  await loadShops();
};

const openShopItems = async (shop) => {
  selectedShop.value = shop;
  newItem.shopId = String(shop.id);
  newItem.hidden = false;
  newItem.available_from = "";
  newItem.available_to = "";
  showShopItemsModal.value = true;
  showItemForm.value = false;
  isEditingItem.value = false;
  editingItemId.value = null;
  await loadItems(shop.id);
};

const openLootboxRolePicker = (index) => {
  showLootboxRolePickerIndex.value = index;
  const entry = lootboxEntries.value[index];
  if (entry) entry.role_search = "";
  refreshRoles();
};

const addLootboxRole = (index, roleId) => {
  const entry = lootboxEntries.value[index];
  if (!entry) return;
  const id = String(roleId);
  const current = Array.isArray(entry.role_ids) ? entry.role_ids.map(String) : [];
  if (!current.includes(id)) {
    entry.role_ids = [...current, id];
  }
  showLootboxRolePickerIndex.value = index;
};

const removeLootboxRole = (index, roleId) => {
  const entry = lootboxEntries.value[index];
  if (!entry) return;
  const id = String(roleId);
  const current = Array.isArray(entry.role_ids) ? entry.role_ids : [];
  entry.role_ids = current.filter((value) => String(value) !== id);
};

const normalizeLootboxEntries = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry) return null;
      const type = entry.type || "inventory";
      const itemId = entry.item_id ?? entry.itemId ?? entry.id ?? "";
      const match = itemId
        ? (items.value || []).find((item) => String(item.id) === String(itemId))
        : null;
      let matchData = match?.data || null;
      if (typeof matchData === "string") {
        try {
          matchData = JSON.parse(matchData);
        } catch {
          matchData = null;
        }
      }
      let entryData = entry?.data || null;
      if (typeof entryData === "string") {
        try {
          entryData = JSON.parse(entryData);
        } catch {
          entryData = null;
        }
      }
      const name =
        entry.name ||
        entry.title ||
        match?.name ||
        (itemId ? `Article #${itemId}` : "");
      const description = entry.description || match?.description || "";
      const imageUrl = entry.image_url || match?.image_url || "";
      const chanceValue = entry.chance ?? entry.probability ?? entry.weight ?? "";
      const amountValue =
        entry.amount ?? entry.value ?? entry.reward ?? entryData?.amount ?? entryData?.value ?? "";
      const roleIds = Array.isArray(entryData?.role_ids)
        ? entryData.role_ids
        : entryData?.role_id
        ? [entryData.role_id]
        : Array.isArray(entry?.role_ids)
        ? entry.role_ids
        : entry?.role_id
        ? [entry.role_id]
        : Array.isArray(matchData?.role_ids)
        ? matchData.role_ids
        : matchData?.role_id
        ? [matchData.role_id]
        : [];
      const durationSeconds =
        entryData?.duration_seconds ??
        entryData?.role_duration_seconds ??
        entry?.duration_seconds ??
        entry?.role_duration_seconds ??
        "";
      return {
        type,
        name: String(name || ""),
        description: String(description || ""),
        image_url: String(imageUrl || ""),
        chance: chanceValue === "" || chanceValue === null ? "" : Number(chanceValue),
        hidden: Boolean(entry?.hidden ?? entry?.disabled ?? false),
        role_ids: roleIds.map(String),
        amount: amountValue === "" || amountValue === null ? "" : Number(amountValue || 0),
        duration_seconds:
          durationSeconds === "" || durationSeconds === null ? "" : Number(durationSeconds || 0),
        item_id: entry.item_id ?? entry.itemId ?? "",
        role_search: ""
      };
    })
    .filter(Boolean)
    .slice(0, lootboxMaxEntries);
};

const addLootboxEntry = () => {
  if (lootboxEntries.value.length >= lootboxMaxEntries) return;
  lootboxEntries.value = [
    ...lootboxEntries.value,
    {
      type: "inventory",
      name: "",
      description: "",
      image_url: "",
      chance: "",
      role_ids: [],
      duration_seconds: "",
      amount: "",
      item_id: "",
      hidden: false,
      role_search: ""
    }
  ];
};

const removeLootboxEntry = (index) => {
  const entry = lootboxEntries.value[index];
  if (entry?.type === "inventory" && entry?.item_id) {
    const confirmPurge = confirm(t("adminGuild.shopItems.confirmPurge"));
    if (confirmPurge) {
      const nextId = Number(entry.item_id);
      if (Number.isFinite(nextId)) {
        const current = new Set(lootboxPurgeItemIds.value.map((value) => Number(value)));
        current.add(nextId);
        lootboxPurgeItemIds.value = Array.from(current);
      }
    }
  }
  lootboxEntries.value = lootboxEntries.value.filter((_, i) => i !== index);
  if (showLootboxRolePickerIndex.value === index) {
    showLootboxRolePickerIndex.value = null;
  }
};

const onLootboxTypeChange = (index) => {
  const entry = lootboxEntries.value[index];
  if (entry && !Array.isArray(entry.role_ids)) {
    entry.role_ids = [];
  }
  if (entry && typeof entry.role_search !== "string") {
    entry.role_search = "";
  }
  if (showLootboxRolePickerIndex.value === index) {
    showLootboxRolePickerIndex.value = null;
  }
};

const serializeLootboxEntries = (entries = []) => {
  return (entries || [])
    .map((entry) => {
      if (!entry) return null;
      const type = entry.type || "inventory";
      const name = String(entry.name || "").trim();
      const description = String(entry.description || "").trim();
      const imageUrl = String(entry.image_url || "").trim();
      const chanceValue = entry.chance === "" || entry.chance === null || Number.isNaN(Number(entry.chance))
        ? null
        : Number(entry.chance);
      const roleIds = Array.isArray(entry.role_ids) ? entry.role_ids.map(String).filter(Boolean) : [];
      return {
        type,
        name,
        description,
        image_url: imageUrl || null,
        chance: chanceValue,
        hidden: entry.hidden ? true : false,
        item_id: entry.item_id ? Number(entry.item_id) : undefined,
        amount:
          type === "currency" && entry.amount
            ? Number(entry.amount)
            : entry.amount === 0
            ? 0
            : undefined,
        data:
          type === "role" || type === "temp_role"
            ? {
                role_ids: roleIds,
                role_id: roleIds[0] || "",
                duration_seconds:
                  type === "temp_role" && entry.duration_seconds
                    ? Number(entry.duration_seconds)
                    : undefined
              }
            : null
      };
    })
    .filter(Boolean)
    .slice(0, lootboxMaxEntries);
};

const buildLootboxPayload = () => serializeLootboxEntries(lootboxEntries.value);

const startEditItem = (item) => {
  newItem.shopId = String(item.shop_id || newItem.shopId);
  newItem.name = item.name || "";
  newItem.type = item.type || "inventory";
  newItem.price = Number(item.price || 0);
  newItem.stock = item.stock === null || item.stock === undefined ? "" : Number(item.stock);
  newItem.discount_percent = Number(item.discount_percent || 0);
  newItem.description = item.description || "";
  newItem.send_dm = Boolean(item.send_dm);
  newItem.image_url = item.image_url || "";
  newItem.hidden = Boolean(item.hidden);
  newItem.available_from = toDateTimeLocal(item.available_from);
  newItem.available_to = toDateTimeLocal(item.available_to);
  let data = item.data || null;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }
  itemRoleIds.value = [];
  lootboxEntries.value = [];
  lootboxPurgeItemIds.value = [];
  showLootboxRolePickerIndex.value = null;
  if (newItem.type === "role" || newItem.type === "temp_role") {
    if (Array.isArray(data?.role_ids)) {
      itemRoleIds.value = data.role_ids.map(String);
    } else if (data?.role_id) {
      itemRoleIds.value = [String(data.role_id)];
    }
    newItem.temp_role_seconds =
      newItem.type === "temp_role" ? Number(data?.duration_seconds || data?.role_duration_seconds || 0) || "" : "";
  }
  if (newItem.type === "lootbox") {
    const rawLootbox = Array.isArray(data?.lootbox)
      ? data.lootbox
      : Array.isArray(data?.lootbox_items)
      ? data.lootbox_items
      : Array.isArray(data?.rewards)
      ? data.rewards
      : [];
    lootboxEntries.value = normalizeLootboxEntries(rawLootbox);
  }
  showItemForm.value = true;
  isEditingItem.value = true;
  editingItemId.value = item.id;
};

const toggleShopEnabled = async (shop) => {
  const token = getToken();
  await fetch(`${config.public.apiBase}/api/guilds/${id}/shops/${shop.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ enabled: !shop.enabled })
  });
  await loadShops();
};

const createShop = async () => {
  const token = getToken();
  if (!newShop.name?.trim()) return;
  await fetch(`${config.public.apiBase}/api/guilds/${id}/shops`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: newShop.name,
      discount_percent: newShop.discount_percent,
      required_role_ids: newShopRoleIds.value
    })
  });
  newShop.name = "";
  newShop.discount_percent = 0;
  newShopRoleIds.value = [];
  newShopRoleSearch.value = "";
  showNewShopRolePicker.value = false;
  await loadShops();
};

const deleteShop = async (shopId) => {
  const token = getToken();
  await fetch(`${config.public.apiBase}/api/guilds/${id}/shops/${shopId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  await loadShops();
};

const createItem = async () => {
  const token = getToken();
  if ((newItem.type === "role" || newItem.type === "temp_role") && !itemRoleIds.value.length) {
    alert(t("adminGuild.shopItems.errors.roleRequired"));
    return;
  }
  if (newItem.type === "temp_role") {
    const seconds = Number(newItem.temp_role_seconds || 0);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      alert(t("adminGuild.shopItems.errors.tempRoleDurationRequired"));
      return;
    }
  }
  const lootboxData = newItem.type === "lootbox" ? buildLootboxPayload() : [];
  if (newItem.type === "lootbox") {
    if (!lootboxEntries.value.length || !lootboxData.length) {
      alert(t("adminGuild.shopItems.errors.lootboxEmpty"));
      return;
    }
    const missingNameIndex = lootboxEntries.value.findIndex(
      (entry) => !String(entry?.name || "").trim()
    );
    if (missingNameIndex >= 0) {
      alert(t("adminGuild.shopItems.errors.lootboxMissingName", { line: missingNameIndex + 1 }));
      return;
    }
    const missingRoleIndex = lootboxEntries.value.findIndex(
      (entry) =>
        (entry?.type === "role" || entry?.type === "temp_role") &&
        (!Array.isArray(entry?.role_ids) || !entry.role_ids.length)
    );
    if (missingRoleIndex >= 0) {
      alert(t("adminGuild.shopItems.errors.lootboxMissingRole", { line: missingRoleIndex + 1 }));
      return;
    }
    const missingDurationIndex = lootboxEntries.value.findIndex(
      (entry) =>
        entry?.type === "temp_role" &&
        (!entry?.duration_seconds || Number(entry.duration_seconds || 0) <= 0)
    );
    if (missingDurationIndex >= 0) {
      alert(
        t("adminGuild.shopItems.errors.lootboxMissingTempDuration", {
          line: missingDurationIndex + 1
        })
      );
      return;
    }
    const missingAmountIndex = lootboxEntries.value.findIndex(
      (entry) => entry?.type === "currency" && (!entry?.amount || Number(entry.amount || 0) <= 0)
    );
    if (missingAmountIndex >= 0) {
      alert(
        t("adminGuild.shopItems.errors.lootboxMissingAmount", {
          line: missingAmountIndex + 1
        })
      );
      return;
    }
  }
  const payload = {
    ...newItem,
    data:
      newItem.type === "role" || newItem.type === "temp_role"
        ? {
            role_ids: itemRoleIds.value,
            role_id: itemRoleIds.value[0] || "",
            duration_seconds:
              newItem.type === "temp_role" && newItem.temp_role_seconds
                ? Number(newItem.temp_role_seconds)
                : undefined
          }
        : newItem.type === "lootbox"
        ? { lootbox: lootboxData }
        : null
  };
  if (isEditingItem.value && newItem.type === "lootbox" && lootboxPurgeItemIds.value.length) {
    payload.purge_item_ids = lootboxPurgeItemIds.value;
  }
  if (isEditingItem.value && editingItemId.value) {
    await fetch(`${config.public.apiBase}/api/shops/${newItem.shopId}/items/${editingItemId.value}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
  } else {
    await fetch(`${config.public.apiBase}/api/shops/${newItem.shopId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
  }
  newItem.name = "";
  itemRoleIds.value = [];
  lootboxEntries.value = [];
  lootboxPurgeItemIds.value = [];
  showLootboxRolePickerIndex.value = null;
  newItem.description = "";
  newItem.price = 0;
  newItem.stock = "";
  newItem.discount_percent = 0;
  newItem.send_dm = false;
  newItem.image_url = "";
  newItem.hidden = false;
  newItem.temp_role_seconds = "";
  newItem.available_from = "";
  newItem.available_to = "";
  isEditingItem.value = false;
  editingItemId.value = null;
  await loadItems(newItem.shopId);
  showItemForm.value = false;
};

const openDeleteItemModal = (item, { closeForm = false } = {}) => {
  if (!item?.id) return;
  deleteItemTarget.value = item;
  deleteItemCloseForm.value = closeForm;
  deletePurgeRewards.value = item.type === "lootbox";
  deleteItemModalOpen.value = true;
};

const closeDeleteItemModal = () => {
  deleteItemModalOpen.value = false;
  deleteItemTarget.value = null;
  deleteItemCloseForm.value = false;
  deletePurgeRewards.value = false;
};

const setItemHidden = async (item, hidden) => {
  if (!item?.id) return;
  const token = getToken();
  await fetch(`${config.public.apiBase}/api/shops/${item.shop_id || newItem.shopId}/items/${item.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ hidden })
  });
  await loadItems(newItem.shopId);
};

const confirmDeleteItem = async () => {
  const item = deleteItemTarget.value;
  if (!item?.id) return;
  const token = getToken();
  const params = new URLSearchParams();
  if (item.type === "lootbox" && deletePurgeRewards.value) {
    params.set("purgeRewards", "1");
  }
  const query = params.toString();
  await fetch(
    `${config.public.apiBase}/api/shops/${item.shop_id || newItem.shopId}/items/${item.id}${query ? `?${query}` : ""}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  if (deleteItemCloseForm.value) {
    showItemForm.value = false;
    isEditingItem.value = false;
    editingItemId.value = null;
  }
  closeDeleteItemModal();
  await loadItems(newItem.shopId);
};

const deleteItemById = (itemId, closeForm = false) => {
  if (!itemId) return;
  const item = (items.value || []).find((entry) => String(entry.id) === String(itemId)) || {
    id: itemId,
    name: newItem.name || t("adminGuild.deleteItem.itemFallback"),
    type: newItem.type || "inventory",
    shop_id: newItem.shopId,
    hidden: false
  };
  openDeleteItemModal(item, { closeForm });
};

const deleteItem = async (item) => {
  if (!item?.id) return;
  if (!newItem.shopId) newItem.shopId = String(item.shop_id || "");
  openDeleteItemModal(item);
};

const saveLootboxEntriesForItem = async (lootboxItem, entries, purgeItemIds = []) => {
  if (!lootboxItem?.id) return;
  const token = getToken();
  const payload = {
    data: { lootbox: serializeLootboxEntries(entries) }
  };
  if (Array.isArray(purgeItemIds) && purgeItemIds.length) {
    payload.purge_item_ids = purgeItemIds;
  }
  await fetch(
    `${config.public.apiBase}/api/shops/${lootboxItem.shop_id || newItem.shopId}/items/${lootboxItem.id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }
  );
  await loadItems(newItem.shopId);
};

const restoreLootboxEntry = async (trashEntry) => {
  const lootboxItem = (items.value || []).find(
    (item) => String(item.id) === String(trashEntry?.lootbox_id)
  );
  if (!lootboxItem) return;
  const entries = getLootboxEntriesFromItem(lootboxItem);
  const entry = entries[trashEntry.entry_index];
  if (!entry) return;
  entry.hidden = false;
  await saveLootboxEntriesForItem(lootboxItem, entries);
};

const deleteLootboxEntry = async (trashEntry) => {
  const lootboxItem = (items.value || []).find(
    (item) => String(item.id) === String(trashEntry?.lootbox_id)
  );
  if (!lootboxItem) return;
  const entries = getLootboxEntriesFromItem(lootboxItem);
  const entry = entries[trashEntry.entry_index];
  if (!entry) return;
  const purgeItemIds = [];
  if (entry?.type === "inventory" && entry?.item_id) {
    const confirmPurge = confirm(t("adminGuild.shopItems.confirmPurge"));
    if (confirmPurge) {
      const nextId = Number(entry.item_id);
      if (Number.isFinite(nextId)) purgeItemIds.push(nextId);
    }
  }
  entries.splice(trashEntry.entry_index, 1);
  await saveLootboxEntriesForItem(lootboxItem, entries, purgeItemIds);
};

const save = async ({ notify = true } = {}) => {
  const token = getToken();
  const payload = {
    ...form,
    logChannelId: form.logChannelId || null
  };
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) return false;
  let botOk = true;
  if (botSettingsLoaded.value) {
    botOk = await saveBotSettings({ notify: false });
  }
  if (!botOk) return false;
  const uiOk = await saveUserUiDisabled();
  if (!uiOk) return false;
  markSaved();
  if (notify) notifySaved();
  return true;
};

const { getToken, login } = useAuth();

const handleUnauthorized = (res) => {
  if (res.status === 401) {
    login();
    return true;
  }
  return false;
};

const notifySaved = (message = t("adminGuild.status.savedMessage")) => {
  savedMessage.value = message;
  showSavedModal.value = true;
  if (savedTimer) clearTimeout(savedTimer);
  savedTimer = setTimeout(() => {
    showSavedModal.value = false;
  }, 2000);
};

const loadSettingsOnce = async () => {
  if (settingsLoaded.value) return;
  await loadSettings();
};

const loadChannelsOnce = async () => {
  if (channelsLoaded.value) return;
  await loadChannels();
};

const loadRolesOnce = async () => {
  if (rolesLoaded.value) return;
  await loadRoles();
};

const loadEmojisOnce = async () => {
  if (emojisLoaded.value) return;
  await loadEmojis();
};

const loadBotEmojisOnce = async () => {
  if (botEmojisLoaded.value) return;
  await loadBotEmojis();
};

const loadBotSettingsOnce = async () => {
  if (botSettingsLoaded.value) return;
  await loadBotSettings();
};

const loadTabData = async (tab, { force = false } = {}) => {
  if (!force && loadedTabs[tab]) return;
  tabDataLoadDepth.value += 1;
  try {
    if (tab === "economy" || tab === "daily") {
      await loadSettingsOnce();
      await loadBotSettingsOnce();
      await loadGuildSummary();
      await loadChannelsOnce();
      loadedTabs.economy = true;
      loadedTabs.daily = true;
      return;
    }
    if (tab === "leaderboard") {
      await loadChannelsOnce();
      await loadLeaderboard();
      await loadLeaderboardPost();
      loadedTabs.leaderboard = true;
      return;
    }
    if (tab === "shops") {
      await loadShops();
      await loadRolesOnce();
      await loadEmojisOnce();
      await loadBotEmojisOnce();
      loadedTabs.shops = true;
      return;
    }
    if (tab === "inventories") {
      await loadInventories({ force: true });
      return;
    }
    if (tab === "automation") {
      await loadAutomation();
      await loadRolesOnce();
      await loadChannelsOnce();
      loadedTabs.automation = true;
      return;
    }
    if (tab === "logs") {
      await loadChannelsOnce();
      await refreshLogs();
      loadedTabs.logs = true;
      return;
    }
    if (tab === "communityMessage") {
      await loadChannelsOnce();
      await loadShops();
      await loadCommunityMessage({ force: true });
      loadedTabs.communityMessage = true;
      return;
    }
    if (tab === "twitch") {
      await loadTwitchAutomation();
      await loadTwitchDailySettings();
      await loadTwitchStatus();
      loadedTabs.twitch = true;
      return;
    }
    if (tab === "games") {
      await loadGamesSettings();
      loadedTabs.games = true;
      return;
    }
    if (tab === "bot") {
      await loadBotSettingsOnce();
      await loadChannelsOnce();
      loadedTabs.bot = true;
      return;
    }
    loadedTabs[tab] = true;
  } finally {
    tabDataLoadDepth.value = Math.max(0, tabDataLoadDepth.value - 1);
  }
};

const syncTwitchSubs = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/twitch/subs-sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return;
  await loadLinkedTwitchUsers();
  notifySaved(t("adminGuild.twitch.syncSubsDone"));
};

const twitchConnectUrl = computed(() => {
  const base = config.public.apiBase || "";
  const origin =
    config.public.baseUrl ||
    (process.client ? window.location.origin : requestUrl.origin);
  const redirect = `${origin}${route.path}?tab=twitch&twitch_connected=1`;
  return `${base}/auth/twitch/login?guildId=${id}&redirect=${encodeURIComponent(redirect)}`;
});

const refreshLeaderboard = async () => {
  await loadTabData("leaderboard", { force: true });
};

onMounted(async () => {
  if (typeof Intl !== "undefined") {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolved) browserTimezone.value = resolved;
    if (typeof Intl.supportedValuesOf === "function") {
      const all = Intl.supportedValuesOf("timeZone");
      const unique = Array.from(new Set(all)).sort((a, b) => a.localeCompare(b));
      if (!unique.includes("UTC")) unique.unshift("UTC");
      timezoneOptions.value = unique;
    }
  }
  timezoneInput.value = autoTimezoneLabel.value;
  suppressDirty.value = true;
  if (route.query?.tab) {
    activeTab.value = String(route.query.tab);
  }
  await loadGuildStatus();
  if (guildBan.value.banned) {
    suppressDirty.value = false;
    return;
  }
  await ensureBotPresent();
  await loadBotSettingsOnce();
  if (apiTabDisabled.value && activeTab.value === "api") {
    activeTab.value = "economy";
    if (process.client) {
      const cleanUrl = `${window.location.origin}${route.path}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }
  await loadTabData(activeTab.value);
  suppressDirty.value = false;
  if (String(route.query?.twitch_connected || "") === "1") {
    activeTab.value = "twitch";
    await loadTabData("twitch", { force: true });
    twitchConnectedAccount.value = twitchStatus.value.login || "";
    showTwitchConnectedModal.value = true;
    if (process.client) {
      const cleanUrl = `${window.location.origin}${route.path}?tab=twitch`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }
  document.addEventListener("click", onClickOutside);
});

watch(form, () => {
  markDirtyIfAllowed();
}, { deep: true });

watch(automation, () => {
  markDirtyIfAllowed();
}, { deep: true });

watch(roleBoosters, () => {
  markDirtyIfAllowed();
}, { deep: true });

watch(channelBoosters, () => {
  markDirtyIfAllowed();
}, { deep: true });

watch(twitchAutomation, () => {
  markDirtyIfAllowed();
}, { deep: true });

watch(twitchDaily, () => {
  markDirtyIfAllowed();
}, { deep: true });

watch(gamesConfig, () => {
  markDirtyIfAllowed();
}, { deep: true });

watch(botLogChannelId, () => {
  markDirtyIfAllowed();
});

watch(botLanguage, () => {
  markDirtyIfAllowed();
});

watch(botTimezone, () => {
  markDirtyIfAllowed();
});
watch(
  () => botTimezone.value,
  (value) => {
    if (!value) {
      timezoneInput.value = autoTimezoneLabel.value;
      return;
    }
    const row = timezoneOptionRows.value.find((item) => item.value === value);
    timezoneInput.value = row ? row.label : buildTimezoneLabel(value);
  }
);

watch(userUiDisabled, () => {
  markDirtyIfAllowed();
});

watch(
  () => logsCategoryTab.value,
  async (value) => {
    logsPage.value = 1;
    if (value === "gains") {
      await loadGainLogs();
      if (logsSortKey.value === "type") logsSortKey.value = "source";
      return;
    }
    if (logsSortKey.value === "source") logsSortKey.value = "type";
    if (value === "transactions") {
      await loadTransactionLogs();
    } else if (value === "games") {
      await loadGameLogs();
    } else if (value === "linked") {
      await loadLinkedTwitchUsers();
    }
  }
);
watch([logsLimit, logsSortKey, logsSortDir, logsDateFrom, logsDateTo, logsSearch, logsFilterUserId], () => {
  logsPage.value = 1;
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onClickOutside);
  if (leaderboardTimer) {
    clearInterval(leaderboardTimer);
    leaderboardTimer = null;
  }
});
</script>

<style scoped>
/* OLD STYLES (deprecated)
.page {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 16px;
}
.section-nav {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  height: fit-content;
  position: sticky;
  top: 20px;
}
.section-title {
  font-weight: 700;
  margin-bottom: 12px;
}
.nav-item {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: #e5e7eb;
  cursor: pointer;
  padding: 20px 24px 32px;
}
  background: radial-gradient(circle at 10% 10%, rgba(124, 58, 237, 0.22), transparent 45%),
    radial-gradient(circle at 85% 15%, rgba(34, 211, 238, 0.16), transparent 42%),
    radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.12), transparent 40%),
    #0b1120;
    radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.12), transparent 40%),
 :global(.main) {
  max-width: 1400px;
  width: 100%;
}
    #0b1120;
  border-color: var(--border);
  background: var(--surface-2);
}
.section-content {
  background: var(--surface);
  border: 1px solid var(--border);
  gap: 16px;
}
.hero {
  display: flex;
  justify-content: space-between;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  align-items: center;
  padding: 18px 22px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(37, 99, 235, 0.1));
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(37, 99, 235, 0.25));
  border: 1px solid var(--border-strong);
  margin-bottom: 16px;
}
.hero-title {
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.85), rgba(12, 18, 30, 0.85));
  border: 1px solid rgba(124, 58, 237, 0.28);
  color: var(--text-muted);
  margin-top: 4px;
}
  transition: 0.2s ease;
.hero-actions {
  display: flex;
  border-color: rgba(124, 58, 237, 0.6);
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(37, 99, 235, 0.2));
.ghost {
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--border-strong);
  gap: 18px;
  color: #e5e7eb;
}
.danger {
  box-shadow: 0 10px 24px rgba(239, 68, 68, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 28px rgba(239, 68, 68, 0.3);
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    padding: 16px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(37, 99, 235, 0.18));
  border: 1px solid rgba(124, 58, 237, 0.35);
  padding: 14px 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  border-radius: 14px;
@media (max-width: 640px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .hero-actions {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.stat-title {
  color: var(--text-muted);
  font-size: 12px;
}
.stat-value {
  font-size: 18px;
  font-weight: 700;
  margin-top: 6px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  padding: 20px;
}
.sub-card {
  margin-top: 16px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  background: var(--surface-2);
  border: 1px solid rgba(124, 58, 237, 0.2);
  box-shadow: inset 0 0 0 1px var(--border);
  margin: 0 0 12px;
  font-size: 14px;
  background: rgba(10, 15, 28, 0.9);
  border: 1px solid var(--border);
  display: flex;
  flex-wrap: wrap;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.35);
  gap: 10px;
  align-items: center;
}
.list {
  margin-top: 12px;
  border: 1px solid rgba(124, 58, 237, 0.18);
  background: var(--surface-2);
}
.list-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background: var(--surface-2);
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--surface-2);
}
.card-head {
  display: flex;
  justify-content: space-between;
  background: rgba(2, 6, 23, 0.6);
  margin-bottom: 12px;
}
.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
}
.card-actions button {
  white-space: nowrap;
}
.item-card .card-actions {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
}
.item-card .card-actions button {
  width: 100%;
}
.card-actions button {
  white-space: nowrap;
}
.item-card .card-actions {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
}
.item-card .card-actions button {
  width: 100%;
}
  background: rgba(2, 6, 23, 0.6);
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.tab {
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.6);
  background: var(--surface-2);
  color: #e5e7eb;
  cursor: pointer;
}
.tab.active {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  border-color: transparent;
}
.primary {
  padding: 10px 16px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  color: white;
  font-weight: 600;
}
.danger {
  padding: 10px 16px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: white;
  font-weight: 600;
}
.actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  background: rgba(148, 163, 184, 0.2);
  border: 1px solid var(--border);
  display: flex;
}
.emoji-preview {
  font-size: 14px;
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
  line-height: 1;
}
.emoji-preview-img {
  width: 12px;
  height: 12px;
  display: block;
  object-fit: contain;
}
.emoji-popover.floating {
  background: linear-gradient(135deg, #7c3aed, #22d3ee);
  z-index: 30;
  width: 320px;
}
.emoji-field {
  position: relative;
  background: var(--surface-2);
  border: 1px solid rgba(124, 58, 237, 0.18);
  margin-top: 10px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  padding: 12px;
}
  background: var(--surface-2);
  border: 1px solid rgba(99, 102, 241, 0.2);
  gap: 8px;
  margin-bottom: 10px;
}
.tab-pill {
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  color: #e5e7eb;
  cursor: pointer;
}
.tab-pill.active {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  border-color: transparent;
}
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
  gap: 8px;
  max-height: 240px;
  overflow: auto;
  margin-top: 10px;
}
.emoji-item {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.2);
  display: grid;
  place-items: center;
}
.emoji-item img {
  width: 20px;
  height: 20px;
}
.role-picker {
  position: relative;
}
.role-input {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.2);
  min-height: 42px;
  align-items: center;
}
.role-search {
  flex: 1;
  min-width: 140px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: #e5e7eb;
  outline: none;
}
.role-search::placeholder {
  color: var(--text-muted);
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(124, 58, 237, 0.25);
  color: #e5e7eb;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}
.role-results {
  max-height: 140px;
  overflow: auto;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.2);
}
.role-results-popover {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 60;
}
.role-row {
  width: 100%;
  padding: 8px 10px;
  text-align: left;
  border: none;
  background: transparent;
  color: #e5e7eb;
  cursor: pointer;
}
.role-row:hover {
  background: var(--surface-2);
}
label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.2);
  color: #e5e7eb;
}
.role-input .role-search {
  width: auto;
  padding: 4px 6px;
  border: none;
  background: transparent;
  flex: 1;
  min-width: 120px;
}
textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.2);
  color: #e5e7eb;
  resize: vertical;
}
select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.2);
  color: #e5e7eb;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--text-muted) 50%),
    linear-gradient(135deg, var(--text-muted) 50%, transparent 50%);
  background-position: calc(100% - 18px) 55%, calc(100% - 12px) 55%;
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}
select option {
  background-color: #0b1220;
  color: #e5e7eb;
}
select option:checked,
select option:hover {
  background-color: #1f2937;
}
.toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}
.leaderboard {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  gap: 8px;
}
.leaderboard li {
  display: grid;
  grid-template-columns: 40px 1fr 80px;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--surface-2);
}
.link {
  background: transparent;
  border: none;
  color: #e5e7eb;
  text-align: left;
  padding: 0;
  cursor: pointer;
}
.link:hover {
  color: #a78bfa;
}
.shop-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin: 12px 0 16px;
}
.filters {
  display: grid;
  grid-template-columns: 1fr 200px 200px;
  gap: 10px;
  margin-bottom: 16px;
}
.search {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.2);
  color: #e5e7eb;
}
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.shops-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}
.shop-card {
  padding: 16px;
  border-radius: 16px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.shop-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: rgba(148, 163, 184, 0.25);
  border: 1px solid var(--border);
  transition: 0.2s ease;
  border-radius: 999px;
}
.slider::before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  top: 2px;
  background: white;
  transition: 0.2s ease;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}
.switch input:checked + .slider {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  border-color: transparent;
}
.switch input:checked + .slider::before {
  transform: translateX(24px);
}
.shop-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.item-card {
  padding: 16px;
  border-radius: 16px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: 1px solid rgba(148, 163, 184, 0.3);
}
.pill.muted {
  color: var(--text-soft);
  background: rgba(148, 163, 184, 0.15);
}
.item-card--trash {
  border-style: dashed;
  background: var(--surface-2);
}
.trash-card {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px dashed rgba(148, 163, 184, 0.2);
}
.inventory-panel {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  margin-top: 12px;
}
.inventory-sidebar {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: var(--surface-2);
  padding: 12px;
  display: grid;
  gap: 12px;
  min-height: 520px;
}
.inventory-users {
  display: grid;
  gap: 8px;
  max-height: 520px;
  overflow: auto;
}
.inventory-user-row {
  width: 100%;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: 12px;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  text-align: left;
  color: inherit;
  cursor: pointer;
}
.inventory-user-row.active {
  border-color: rgba(59, 130, 246, 0.6);
  background: rgba(30, 64, 175, 0.2);
}
.inventory-user-info {
  display: grid;
  gap: 2px;
}
.inventory-user-info,
.inventory-item .item-head > div {
  min-width: 0;
}
.inventory-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.2);
  display: grid;
  place-items: center;
  overflow: hidden;
  font-weight: 700;
}
.inventory-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.inventory-avatar.large {
  width: 56px;
  height: 56px;
  border-radius: 16px;
}
.inventory-user-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inventory-user-meta {
  color: var(--text-muted);
  font-size: 12px;
}
.inventory-detail {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: var(--surface-2);
  padding: 16px;
  min-height: 520px;
  min-width: 0;
}
.inventory-detail-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
}
.inventory-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  align-items: stretch;
}
.inventory-item {
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.15);
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}
.inventory-item .item-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.inventory-item .item-icon {
  width: 48px;
  height: 48px;
  overflow: hidden;
}
.inventory-item .item-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inventory-item .card-actions {
  margin-top: auto;
}
@media (max-width: 900px) {
  .inventory-panel {
    grid-template-columns: 1fr;
  }
  .inventory-users {
    max-height: unset;
  }
}
.item-head {
  display: flex;
  gap: 10px;
  align-items: center;
}
.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(99, 102, 241, 0.2);
}
.item-title {
  font-weight: 600;
}
.item-sub {
  color: var(--text-muted);
  font-size: 12px;
}
.item-price {
  font-size: 18px;
  font-weight: 700;
}
.inventory-panel {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.inventory-sidebar {
  background: var(--surface-2);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 16px;
  padding: 14px;
  min-height: 420px;
}
.inventory-users {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  max-height: 520px;
  overflow: auto;
}
.inventory-user-row {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: var(--surface-2);
  color: #e5e7eb;
  text-align: left;
  cursor: pointer;
}
.inventory-user-row:hover {
  border-color: rgba(124, 58, 237, 0.35);
  background: rgba(124, 58, 237, 0.12);
}
.inventory-user-row.active {
  border-color: rgba(124, 58, 237, 0.55);
  background: rgba(124, 58, 237, 0.2);
}
.inventory-user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.inventory-avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(99, 102, 241, 0.2);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
}
.inventory-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  display: block;
}
.inventory-avatar.large {
  width: 52px;
  height: 52px;
  font-size: 18px;
}
.inventory-user-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inventory-user-meta {
  color: var(--text-muted);
  font-size: 12px;
}
.inventory-detail {
  background: var(--surface-2);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 16px;
  padding: 16px;
  min-height: 420px;
  min-width: 0;
}
.inventory-detail-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.inventory-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.inventory-item {
  background: rgba(2, 6, 23, 0.45);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 140px;
  overflow: hidden;
}
.inventory-item .item-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(99, 102, 241, 0.18);
}
.inventory-item .item-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
  display: block;
}
.inventory-item .item-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inventory-item .item-sub {
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inventory-item .item-head > div {
  min-width: 0;
}
.inventory-item .card-actions {
  margin-top: auto;
  justify-content: flex-end;
}
.doc-callout {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.25);
  color: var(--text);
  font-size: 12px;
  line-height: 1.4;
}
.modal {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.7);
  display: grid;
  place-items: center;
  padding: 24px 16px;
  overflow: auto;
  z-index: 40;
}
.modal-card {
  width: min(980px, 94vw);
  max-height: 90vh;
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 18px;
  padding: 20px;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
@media (max-width: 900px) {
  .page {
    grid-template-columns: 1fr;
  }
  .filters {
    grid-template-columns: 1fr;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
.muted {
  color: var(--text-muted);
}
*/
.page {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 20px;
  padding: 20px;
  min-height: 100vh;
  background: radial-gradient(circle at top, rgba(124, 58, 237, 0.18), transparent 45%),
    radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.12), transparent 40%),
    #0b1120;
}
.section-nav {
  background: linear-gradient(180deg, var(--surface), var(--surface-2));
  border: 1px solid rgba(124, 58, 237, 0.25);
  border-radius: 16px;
  padding: 18px;
  height: fit-content;
  position: sticky;
  top: 20px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(124, 58, 237, 0.12);
  backdrop-filter: blur(12px);
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.section-title {
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--text);
}
.section-links {
  display: flex;
  flex-direction: column;
  margin-top: 12px;
}
.nav-group {
  font-size: 11px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 8px 4px 6px;
}
.nav-divider {
  height: 1px;
  background: rgba(148, 163, 184, 0.15);
  margin: 10px 0;
}
.section-toggle {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  color: #e5e7eb;
  cursor: pointer;
}
.burger {
  position: relative;
  width: 18px;
  height: 2px;
  background: currentColor;
  display: inline-block;
  border-radius: 999px;
}
.burger::before,
.burger::after {
  content: "";
  position: absolute;
  left: 0;
  width: 18px;
  height: 2px;
  background: currentColor;
  border-radius: 999px;
  transition: transform 0.2s ease, top 0.2s ease, opacity 0.2s ease;
}
.burger::before {
  top: -6px;
}
.burger::after {
  top: 6px;
}
.burger.open {
  background: transparent;
}
.burger.open::before {
  top: 0;
  transform: rotate(45deg);
}
.burger.open::after {
  top: 0;
  transform: rotate(-45deg);
}
.nav-item {
  width: 100%;
  text-align: left;
  padding: 10px 12px 10px 28px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: var(--surface-2);
  color: #e5e7eb;
  cursor: pointer;
  margin-bottom: 8px;
  transition: 0.2s ease;
  position: relative;
  font-weight: 600;
}
.nav-item::before {
  content: "";
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.5);
}
.nav-item:hover {
  background: rgba(124, 58, 237, 0.16);
  border-color: rgba(124, 58, 237, 0.25);
}
.nav-item.active {
  border-color: rgba(124, 58, 237, 0.6);
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(37, 99, 235, 0.25));
}
.nav-item.active::before {
  background: linear-gradient(135deg, #a78bfa, #60a5fa);
}
.nav-item.economy.active {
  border-color: rgba(59, 130, 246, 0.6);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.25));
}
.nav-item.economy.active::before {
  background: linear-gradient(135deg, #60a5fa, #93c5fd);
}
.nav-item.daily.active {
  border-color: rgba(251, 191, 36, 0.6);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.28), rgba(245, 158, 11, 0.25));
}
.nav-item.daily.active::before {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
}
.nav-item.shops.active {
  border-color: rgba(34, 197, 94, 0.6);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.28), rgba(16, 185, 129, 0.25));
}
.nav-item.shops.active::before {
  background: linear-gradient(135deg, #22c55e, #34d399);
}
.nav-item.inventories.active {
  border-color: rgba(14, 165, 233, 0.6);
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.3), rgba(56, 189, 248, 0.2));
}
.nav-item.inventories.active::before {
  background: linear-gradient(135deg, #38bdf8, #0ea5e9);
}
.nav-item.automation.active {
  border-color: rgba(34, 211, 238, 0.6);
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.28), rgba(59, 130, 246, 0.2));
}
.nav-item.automation.active::before {
  background: linear-gradient(135deg, #22d3ee, #60a5fa);
}
.nav-item.nav-leaderboard.active {
  border-color: rgba(236, 72, 153, 0.6);
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.28), rgba(168, 85, 247, 0.25));
}
.nav-item.nav-leaderboard.active::before {
  background: linear-gradient(135deg, #ec4899, #a855f7);
}
.nav-item.logs.active {
  border-color: rgba(148, 163, 184, 0.6);
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.25), rgba(100, 116, 139, 0.2));
}
.nav-item.logs.active::before {
  background: linear-gradient(135deg, var(--text-muted), var(--text-soft));
}
.nav-item.twitch.active {
  border-color: rgba(168, 85, 247, 0.6);
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(124, 58, 237, 0.25));
}
.nav-item.twitch.active::before {
  background: linear-gradient(135deg, #a855f7, #7c3aed);
}
.nav-item.games.active {
  border-color: rgba(52, 211, 153, 0.6);
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.28), rgba(16, 185, 129, 0.25));
}
.nav-item.games.active::before {
  background: linear-gradient(135deg, #34d399, #10b981);
}
.nav-item.achievements.active {
  border-color: rgba(59, 130, 246, 0.6);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.25));
}
.nav-item.achievements.active::before {
  background: linear-gradient(135deg, #60a5fa, #93c5fd);
}
.nav-item.achievements-giveaway.active {
  border-color: rgba(236, 72, 153, 0.64);
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.28), rgba(217, 70, 239, 0.22));
}
.nav-item.achievements-giveaway.active::before {
  background: linear-gradient(135deg, #ec4899, #d946ef);
}
.nav-item.achievements-birthday.active {
  border-color: rgba(251, 191, 36, 0.64);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(249, 115, 22, 0.24));
}
.nav-item.achievements-birthday.active::before {
  background: linear-gradient(135deg, #fbbf24, #f97316);
}
.nav-item.api.active {
  border-color: rgba(249, 115, 22, 0.6);
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.28), rgba(234, 88, 12, 0.25));
}
.nav-item.api.active::before {
  background: linear-gradient(135deg, #f97316, #ea580c);
}
.nav-item.sensitive.active {
  border-color: rgba(239, 68, 68, 0.6);
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.28), rgba(185, 28, 28, 0.25));
}
.nav-item.sensitive.active::before {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
}
.section-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(37, 99, 235, 0.2));
  border: 1px solid rgba(124, 58, 237, 0.45);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
}
.section-content.theme-economy .hero {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(37, 99, 235, 0.25));
  border-color: rgba(59, 130, 246, 0.45);
}
.section-content.theme-daily .hero {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.35), rgba(245, 158, 11, 0.25));
  border-color: rgba(251, 191, 36, 0.45);
}
.section-content.theme-shops .hero {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.35), rgba(16, 185, 129, 0.25));
  border-color: rgba(34, 197, 94, 0.45);
}
.section-content.theme-automation .hero {
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.35), rgba(59, 130, 246, 0.25));
  border-color: rgba(34, 211, 238, 0.45);
}
.section-content.theme-leaderboard .hero {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.35), rgba(168, 85, 247, 0.25));
  border-color: rgba(236, 72, 153, 0.45);
}
.section-content.theme-logs .hero {
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.3), rgba(100, 116, 139, 0.2));
  border-color: rgba(148, 163, 184, 0.45);
}
.section-content.theme-twitch .hero {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.35), rgba(124, 58, 237, 0.25));
  border-color: rgba(168, 85, 247, 0.45);
}
.section-content.theme-games .hero {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.35), rgba(16, 185, 129, 0.25));
  border-color: rgba(52, 211, 153, 0.45);
}
.section-content.theme-api .hero {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.35), rgba(234, 88, 12, 0.25));
  border-color: rgba(249, 115, 22, 0.45);
}
.section-content.theme-sensitive .hero {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(185, 28, 28, 0.25));
  border-color: rgba(239, 68, 68, 0.45);
}
.hero-title {
  font-size: 22px;
  font-weight: 700;
  color: #f8fafc;
}
.hero-sub {
  color: var(--text-muted);
  margin-top: 4px;
}
.hero-actions {
  display: flex;
  gap: 8px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.stat-tile {
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid rgba(124, 58, 237, 0.15);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-tile span {
  color: var(--text-muted);
  font-size: 12px;
}
.stat-tile strong {
  font-size: 18px;
  color: #f8fafc;
}
.stat-card {
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid rgba(124, 58, 237, 0.2);
  box-shadow: inset 0 0 0 1px var(--border);
}
.stat-title {
  color: var(--text-muted);
  font-size: 12px;
}
.stat-value {
  font-size: 18px;
  font-weight: 700;
  margin-top: 6px;
  color: #f8fafc;
}
.card {
  background: linear-gradient(180deg, rgba(14, 22, 38, 0.96), rgba(10, 16, 28, 0.9));
  border: 1px solid rgba(124, 58, 237, 0.18);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.32);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.section-content.theme-economy .card {
  border-color: rgba(59, 130, 246, 0.2);
}
.section-content.theme-daily .card {
  border-color: rgba(251, 191, 36, 0.2);
}
.section-content.theme-shops .card {
  border-color: rgba(34, 197, 94, 0.2);
}
.section-content.theme-automation .card {
  border-color: rgba(34, 211, 238, 0.2);
}
.section-content.theme-leaderboard .card {
  border-color: rgba(236, 72, 153, 0.2);
}
.section-content.theme-logs .card {
  border-color: rgba(148, 163, 184, 0.2);
}
.section-content.theme-twitch .card {
  border-color: rgba(168, 85, 247, 0.2);
}
.section-content.theme-games .card {
  border-color: rgba(52, 211, 153, 0.2);
}
.section-content.theme-api .card {
  border-color: rgba(249, 115, 22, 0.2);
}
.section-content.theme-sensitive .card {
  border-color: rgba(239, 68, 68, 0.2);
}
.linked-list .linked-header {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(148, 163, 184, 0.9);
  background: var(--surface-2);
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 700;
  display: grid;
  grid-template-columns: 2fr 1.3fr 0.8fr 1.4fr 0.8fr;
  align-items: center;
}

.linked-list .linked-row {
  display: grid;
  grid-template-columns: 2fr 1.3fr 0.8fr 1.4fr 0.8fr;
  align-items: center;
  gap: 12px;
}

.linked-twitch {
  font-weight: 600;
}

.linked-tier .pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.linked-tier .tier-streamer {
  background: rgba(59, 130, 246, 0.18);
  color: #93c5fd;
}

.linked-tier .tier-prime {
  background: rgba(139, 92, 246, 0.18);
  color: #c4b5fd;
}

.linked-tier .tier-t1 {
  background: rgba(34, 197, 94, 0.18);
  color: #86efac;
}

.linked-tier .tier-t2 {
  background: rgba(251, 191, 36, 0.18);
  color: #fde68a;
}

.linked-tier .tier-t3 {
  background: rgba(244, 63, 94, 0.18);
  color: #fda4af;
}

.linked-tier .tier-none {
  background: rgba(148, 163, 184, 0.2);
  color: var(--text-soft);
}
.card:hover {
  transform: translateY(-2px);
  border-color: rgba(124, 58, 237, 0.35);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
}
@media (max-width: 900px) {
  .page {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  .section-nav {
    position: static;
    width: 100%;
  }
  .section-title {
    margin-bottom: 0;
  }
  .section-toggle {
    display: inline-flex;
  }
  .section-links {
    display: none;
    margin-top: 12px;
  }
  .section-nav.open .section-links {
    display: flex;
  }
}
.sub-card {
  margin-top: 16px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(124, 58, 237, 0.18);
  background: var(--surface-2);
}
.sub-card h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--text);
}
.inline {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.list {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}
.list-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--surface-2);
}
.lootbox-entry {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}
.lootbox-entry-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.lootbox-entry-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
.lootbox-entry-head select {
  flex: 1;
  min-width: 220px;
}
.lootbox-entry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
.lootbox-field {
  display: grid;
  gap: 6px;
}
.lootbox-visibility {
  min-width: 140px;
}
.lootbox-entry--hidden {
  opacity: 0.6;
}
.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.filters-grid input,
.filters-grid .search {
  color: #f8fafc;
  background: rgba(2, 6, 23, 0.7);
}
.filters-grid input::placeholder,
.filters-grid .search::placeholder {
  color: var(--text-soft);
}
.clear-filter {
  display: flex;
  align-items: flex-end;
}
.user-search-results {
  grid-column: 1 / -1;
  max-width: 360px;
  width: 100%;
  margin-top: -6px;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid rgba(124, 58, 237, 0.25);
  background: var(--surface);
}
.user-results {
  display: grid;
  gap: 6px;
}
.user-result {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 10px;
  background: rgba(2, 6, 23, 0.4);
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  transition: 0.2s ease;
}
.user-result:hover {
  border-color: rgba(124, 58, 237, 0.35);
  background: rgba(124, 58, 237, 0.12);
}
.user-result-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgba(124, 58, 237, 0.2);
  display: grid;
  place-items: center;
  font-size: 14px;
}
.user-name {
  font-weight: 600;
  font-size: 13px;
  color: #f8fafc;
}
.user-id {
  font-size: 11px;
  color: #f8fafc;
  opacity: 0.85;
}
.user-action {
  font-size: 11px;
  color: #c4b5fd;
}
.inline-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text);
  font-size: 12px;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
  color: var(--text-muted);
  font-size: 12px;
}
.logs-table {
  display: grid;
  gap: 8px;
}
.logs-header {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1.2fr 0.7fr 0.7fr 0.8fr;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
  padding: 0 6px;
}
.log-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1.2fr 0.7fr 0.7fr 0.8fr;
  gap: 10px;
  align-items: center;
}
.source-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--border);
  width: fit-content;
}
.source-pill.twitch {
  background: rgba(168, 85, 247, 0.2);
  color: #e9d5ff;
}
.source-pill.discord {
  background: rgba(59, 130, 246, 0.2);
  color: #bfdbfe;
}
.source-pill.achievement {
  background: rgba(250, 204, 21, 0.2);
  color: #fef08a;
}
.source-pill.transaction {
  background: rgba(16, 185, 129, 0.2);
  color: #a7f3d0;
}
.source-pill.game {
  background: rgba(249, 115, 22, 0.2);
  color: #fed7aa;
}
@media (max-width: 900px) {
  .logs-header {
    display: none;
  }
  .log-row {
    grid-template-columns: 1fr;
  }
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
}
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.tab {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  color: #e5e7eb;
  cursor: pointer;
  transition: 0.2s ease;
}
.tab:hover {
  border-color: rgba(124, 58, 237, 0.35);
  background: rgba(124, 58, 237, 0.12);
}
.tab.active {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  border-color: transparent;
}
.actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.emoji-field {
  position: relative;
  display: flex;
}
.emoji-preview {
  font-size: 14px;
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
  line-height: 1;
}
.emoji-preview-img {
  width: 12px;
  height: 12px;
  display: block;
  object-fit: contain;
}
.emoji-popover.floating {
  position: absolute;
  z-index: 30;
  width: 320px;
}
.emoji-popover {
  margin-top: 10px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  padding: 12px;
}
.emoji-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.tab-pill {
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  color: #e5e7eb;
  cursor: pointer;
}
.tab-pill.active {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  border-color: transparent;
}
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
  gap: 8px;
  max-height: 240px;
  overflow: auto;
  margin-top: 10px;
}
.emoji-item {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.2);
  display: grid;
  place-items: center;
}
.emoji-item img {
  width: 20px;
  height: 20px;
}
.role-picker {
  position: relative;
}
.role-input {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.2);
  min-height: 42px;
  align-items: center;
}
.role-search {
  flex: 1;
  min-width: 140px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: #e5e7eb;
  outline: none;
}
.role-search::placeholder {
  color: var(--text-muted);
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(124, 58, 237, 0.25);
  color: #e5e7eb;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.role-results {
  max-height: 140px;
  overflow: auto;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: rgba(0, 0, 0, 0.2);
}
.role-results-popover {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 60;
}
.role-row {
  width: 100%;
  padding: 8px 10px;
  text-align: left;
  border: none;
  background: transparent;
  color: #e5e7eb;
  cursor: pointer;
}
.role-row:hover {
  background: var(--surface-2);
}
label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--text);
  font-size: 13px;
}
input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(2, 6, 23, 0.6);
  color: #e5e7eb;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.inline-input {
  width: 110px;
  padding: 8px 10px;
  border-radius: 10px;
}
.role-input .role-search {
  width: auto;
  padding: 4px 6px;
  border: none;
  background: transparent;
  flex: 1;
  min-width: 120px;
}
textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(2, 6, 23, 0.6);
  color: #e5e7eb;
  resize: vertical;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(2, 6, 23, 0.6);
  color: #e5e7eb;
  appearance: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background-image: linear-gradient(45deg, transparent 50%, var(--text-muted) 50%),
    linear-gradient(135deg, var(--text-muted) 50%, transparent 50%);
  background-position: calc(100% - 18px) 55%, calc(100% - 12px) 55%;
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}
input:focus,
textarea:focus,
select:focus,
.search:focus {
  outline: none;
  border-color: rgba(124, 58, 237, 0.55);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
}
select option {
  background-color: #0b1220;
  color: #e5e7eb;
}
select option:checked,
select option:hover {
  background-color: #1f2937;
}
.switch-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(2, 6, 23, 0.35);
}
.switch-field span {
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
}
.switch-field.compact {
  padding: 6px 10px;
}
.leaderboard {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  gap: 8px;
}
.leaderboard li {
  display: grid;
  grid-template-columns: 40px 1fr 80px;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--surface-2);
}
.link {
  background: transparent;
  border: none;
  color: #e5e7eb;
  text-align: left;
  padding: 0;
  cursor: pointer;
}
.link:hover {
  color: #a78bfa;
}
.shop-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin: 12px 0 16px;
}
.filters {
  display: grid;
  grid-template-columns: 1fr 200px 200px;
  gap: 10px;
  margin-bottom: 16px;
}
.search {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(2, 6, 23, 0.6);
  color: #e5e7eb;
}
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.shops-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}
.shop-card {
  padding: 16px;
  border-radius: 16px;
  background: var(--surface-2);
  border: 1px solid rgba(124, 58, 237, 0.18);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.shop-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: rgba(148, 163, 184, 0.2);
  border: 1px solid var(--border);
  transition: 0.2s ease;
  border-radius: 999px;
}
.slider::before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  top: 2px;
  background: white;
  transition: 0.2s ease;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}
.switch input:checked + .slider {
  background: linear-gradient(135deg, #7c3aed, #22d3ee);
  border-color: transparent;
}
.switch input:checked + .slider::before {
  transform: translateX(24px);
}
.shop-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.item-card {
  padding: 16px;
  border-radius: 16px;
  background: var(--surface-2);
  border: 1px solid rgba(99, 102, 241, 0.2);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.item-head {
  display: flex;
  gap: 10px;
  align-items: center;
}
.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(99, 102, 241, 0.2);
}
.item-title {
  font-weight: 600;
}
.item-sub {
  color: var(--text-muted);
  font-size: 12px;
}
.item-price {
  font-size: 18px;
  font-weight: 700;
}
.modal {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.7);
  display: grid;
  place-items: center;
  padding: 24px 16px;
  overflow: auto;
  z-index: 40;
}
.modal-card {
  width: min(980px, 94vw);
  max-height: 90vh;
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 18px;
  padding: 20px;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.inv-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
.inv-hint {
  font-size: 12px;
}
.inv-layout {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.inv-members {
  background: var(--surface-2);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 16px;
  padding: 12px;
  min-height: 420px;
}
.inv-members-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  max-height: 520px;
  overflow: auto;
}
.inv-member {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: var(--surface-2);
  color: #e5e7eb;
  text-align: left;
  cursor: pointer;
}
.inv-member:hover {
  border-color: rgba(124, 58, 237, 0.35);
  background: rgba(124, 58, 237, 0.12);
}
.inv-member.active {
  border-color: rgba(124, 58, 237, 0.55);
  background: rgba(124, 58, 237, 0.2);
}
.inv-avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(99, 102, 241, 0.2);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}
.inv-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  display: block;
}
.inv-avatar.large {
  width: 48px;
  height: 48px;
  font-size: 16px;
}
.inv-member-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.inv-member-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inv-member-meta {
  color: var(--text-muted);
  font-size: 12px;
}
.inv-items {
  background: var(--surface-2);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 16px;
  padding: 16px;
  min-height: 420px;
  min-width: 0;
}
.inv-items-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.inv-empty {
  padding: 12px 0;
}
.inv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.inv-item {
  background: rgba(2, 6, 23, 0.5);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 120px;
}
.inv-item-main {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}
.inv-item-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(99, 102, 241, 0.18);
  flex-shrink: 0;
}
.inv-item-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
  display: block;
}
.inv-item-text {
  min-width: 0;
}
.inv-item-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inv-item-meta {
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inv-item-action {
  margin-top: auto;
  align-self: flex-end;
}
.inv-item-actions {
  margin-top: auto;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
}
.inv-qty {
  width: 80px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: rgba(2, 6, 23, 0.6);
  color: #e5e7eb;
}
@media (max-width: 900px) {
  .page {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  .filters {
    grid-template-columns: 1fr;
  }
  .grid {
    grid-template-columns: 1fr;
  }
  .inventory-panel {
    grid-template-columns: 1fr;
  }
  .inventory-sidebar {
    min-height: auto;
  }
  .inventory-users {
    max-height: 260px;
  }
  .inv-layout {
    grid-template-columns: 1fr;
  }
  .inv-members {
    min-height: auto;
  }
  .inv-members-list {
    max-height: 240px;
  }
}
.muted {
  color: var(--text-muted);
}
.ban-card {
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.4);
  color: #fecaca;
  grid-column: 1 / -1;
}
.preview-message {
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: "gg sans", "Segoe UI", system-ui, -apple-system, sans-serif;
  font-size: 14px;
}
.preview-message strong {
  font-weight: 700;
}
.preview-message u {
  text-decoration: underline;
}
.preview-message code {
  padding: 2px 4px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.35);
  border: 1px solid rgba(148, 163, 184, 0.25);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
}
.preview-message a {
  color: #60a5fa;
  text-decoration: underline;
}
.inline-emoji {
  width: 18px;
  height: 18px;
  vertical-align: text-bottom;
}
.role-pill {
  display: inline-block;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.18);
  border: 1px solid rgba(99, 102, 241, 0.4);
  color: #c7d2fe;
  font-size: 11px;
}
.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 6px;
}
.item-card .item-icon img {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  object-fit: cover;
}
.item-card .item-icon span {
  font-size: 20px;
}
.small {
  font-size: 12px;
}
.item-form {
  display: grid;
  gap: 14px;
}
.form-section {
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 14px;
  padding: 14px;
}
.form-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.form-section-head h4 {
  margin: 0;
}
.lootbox-list {
  display: grid;
  gap: 10px;
}
.lootbox-entry-card {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  padding: 12px;
  background: var(--surface-2);
}
.lootbox-entry-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.lootbox-entry-title {
  font-weight: 600;
}
.lootbox-entry-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.availability-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-top: 6px;
}
.availability-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
/* Servers-style visual refresh */
.page {
  position: relative;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
  min-height: 100vh;
  background: transparent;
}
.section-nav {
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 14px;
  background: linear-gradient(180deg, rgba(8, 12, 20, 0.88), rgba(15, 23, 42, 0.76));
  box-shadow: var(--shadow);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  top: 14px;
}
.section-head {
  margin-bottom: 6px;
}
.section-title {
  margin: 0;
  letter-spacing: 0.02em;
}
.section-links {
  gap: 2px;
}
.nav-group {
  margin: 12px 6px 7px;
}
.nav-divider {
  margin: 8px 0;
  background: rgba(148, 163, 184, 0.2);
}
.nav-item {
  margin-bottom: 6px;
  padding: 10px 12px 10px 30px;
  border-color: transparent;
  background: rgba(15, 23, 42, 0.45);
  color: var(--text);
}
.nav-item::before {
  background: rgba(148, 163, 184, 0.65);
}
.nav-item:hover {
  border-color: var(--border-strong);
  background: var(--accent-soft);
}
.nav-item.active {
  color: #eff6ff;
  border-color: rgba(59, 130, 246, 0.45);
}
.section-content {
  display: grid;
  gap: 14px;
  align-content: start;
}
.hero {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(59, 130, 246, 0.35);
  background:
    radial-gradient(circle at 92% 6%, rgba(59, 130, 246, 0.2), transparent 38%),
    linear-gradient(145deg, rgba(8, 12, 20, 0.9), rgba(15, 23, 42, 0.74));
  padding: 18px;
  box-shadow: 0 16px 32px rgba(2, 6, 23, 0.34);
  align-items: flex-start;
  gap: 14px;
}
.section-content.theme-economy .hero {
  border-color: rgba(59, 130, 246, 0.38);
}
.section-content.theme-daily .hero {
  border-color: rgba(245, 158, 11, 0.36);
}
.section-content.theme-shops .hero {
  border-color: rgba(34, 197, 94, 0.36);
}
.section-content.theme-automation .hero {
  border-color: rgba(34, 211, 238, 0.36);
}
.section-content.theme-leaderboard .hero {
  border-color: rgba(236, 72, 153, 0.36);
}
.section-content.theme-logs .hero {
  border-color: rgba(148, 163, 184, 0.34);
}
.section-content.theme-twitch .hero {
  border-color: rgba(168, 85, 247, 0.38);
}
.section-content.theme-games .hero {
  border-color: rgba(52, 211, 153, 0.36);
}
.section-content.theme-api .hero {
  border-color: rgba(249, 115, 22, 0.36);
}
.section-content.theme-sensitive .hero {
  border-color: rgba(239, 68, 68, 0.38);
}
.hero-info,
.hero-actions {
  position: relative;
  z-index: 1;
}
.hero-kicker {
  display: inline-flex;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  color: #93c5fd;
  margin-bottom: 6px;
}
.hero-title {
  font-size: clamp(20px, 2.2vw, 26px);
}
.hero-sub {
  color: var(--text-soft);
  margin-top: 6px;
  max-width: 760px;
}
.hero-badges {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #dbeafe;
  border: 1px solid rgba(59, 130, 246, 0.38);
  background: rgba(59, 130, 246, 0.15);
}
.hero-badge-id {
  color: var(--text-soft);
  border-color: rgba(148, 163, 184, 0.35);
  background: rgba(148, 163, 184, 0.14);
}
.hero-badge.ok {
  border-color: rgba(34, 197, 94, 0.42);
  background: rgba(34, 197, 94, 0.16);
  color: #bbf7d0;
}
.hero-badge.ko {
  border-color: rgba(239, 68, 68, 0.42);
  background: rgba(239, 68, 68, 0.14);
  color: #fecaca;
}
.hero-actions {
  gap: 10px;
}
.card {
  border-radius: 18px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(8, 12, 20, 0.92), rgba(10, 16, 28, 0.86));
  box-shadow: 0 12px 26px rgba(2, 6, 23, 0.26);
  padding: 18px;
}
.card:hover {
  transform: translateY(-1px);
  border-color: var(--border-strong);
  box-shadow: 0 18px 34px rgba(2, 6, 23, 0.3);
}
.sub-card,
.shop-card,
.item-card,
.inventory-sidebar,
.inventory-detail,
.inventory-item,
.inv-members,
.inv-items,
.inv-item,
.logs-table,
.list-row,
.form-section,
.lootbox-entry-card,
.user-search-results {
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface-2);
}
.card-head {
  margin-bottom: 14px;
  padding-bottom: 12px;
}
.linked-list .linked-header {
  border: 1px solid var(--border);
  background: rgba(148, 163, 184, 0.12);
}
.linked-list .linked-row {
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  padding: 10px 12px;
}
.search,
input,
textarea,
select {
  border-color: var(--border);
  background: rgba(8, 12, 20, 0.72);
}
.role-input,
.role-results,
.emoji-popover,
.switch-field,
.doc-callout {
  border-color: var(--border);
  background: rgba(15, 23, 42, 0.6);
}
input:focus,
textarea:focus,
select:focus,
.search:focus {
  border-color: rgba(59, 130, 246, 0.55);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}
.tab,
.tab-pill {
  border-color: var(--border);
  background: var(--surface-2);
}
.tab:hover,
.tab-pill:hover {
  border-color: var(--border-strong);
}
.tab.active,
.tab-pill.active {
  background: rgba(59, 130, 246, 0.18);
  border-color: rgba(59, 130, 246, 0.44);
  color: #dbeafe;
}
.modal {
  background: rgba(2, 6, 23, 0.76);
}
.modal-card {
  border-radius: 20px;
  border-color: var(--border-strong);
  box-shadow: 0 24px 60px rgba(2, 6, 23, 0.45);
}
@media (max-width: 1080px) {
  .page {
    grid-template-columns: 1fr;
    padding: 14px;
  }
  .section-nav {
    position: static;
    top: auto;
  }
  .section-toggle {
    display: inline-flex;
  }
  .section-links {
    display: none;
  }
  .section-nav.open .section-links {
    display: flex;
  }
  .hero {
    flex-direction: column;
  }
  .hero-actions {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .hero-actions {
    grid-template-columns: 1fr;
  }
  .grid,
  .filters,
  .shops-grid,
  .items-grid,
  .inv-grid {
    grid-template-columns: 1fr;
  }
}
/* Tab content polish */
.card-head {
  align-items: flex-start;
  gap: 12px;
}
.card-head h3 {
  margin: 0;
  font-size: clamp(18px, 1.8vw, 22px);
  line-height: 1.25;
  letter-spacing: 0.01em;
}
.card-head h3::before {
  content: "";
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 8px;
  border-radius: 999px;
  vertical-align: middle;
  background: #60a5fa;
}
.section-content.theme-daily .card-head h3::before {
  background: #f59e0b;
}
.section-content.theme-shops .card-head h3::before {
  background: #22c55e;
}
.section-content.theme-automation .card-head h3::before {
  background: #22d3ee;
}
.section-content.theme-leaderboard .card-head h3::before {
  background: #ec4899;
}
.section-content.theme-logs .card-head h3::before {
  background: #94a3b8;
}
.section-content.theme-twitch .card-head h3::before {
  background: #a855f7;
}
.section-content.theme-games .card-head h3::before {
  background: #34d399;
}
.section-content.theme-api .card-head h3::before {
  background: #f97316;
}
.section-content.theme-sensitive .card-head h3::before {
  background: #ef4444;
}
.sub-card {
  border-color: rgba(148, 163, 184, 0.24);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.46));
}
.sub-card h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.sub-card h4::before {
  content: "";
  width: 18px;
  height: 2px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.75);
}
.stats-grid {
  gap: 10px;
}
.stat-tile {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(8, 12, 20, 0.5);
}
.stat-tile strong {
  font-size: 20px;
}
.stats {
  gap: 10px;
}
.stat-card {
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.55);
}
.grid {
  gap: 12px;
}
.grid > label,
.filters-grid > label {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(8, 12, 20, 0.42);
}
.filters-grid {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(8, 12, 20, 0.45);
}
.switch-field {
  border-color: rgba(148, 163, 184, 0.28);
  background: rgba(8, 12, 20, 0.52);
}
.switch-field:hover {
  border-color: var(--border-strong);
}
.tabs,
.inline {
  gap: 8px;
}
.tab,
.tab-pill {
  font-weight: 700;
}
.list {
  gap: 10px;
}
.list-row {
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(8, 12, 20, 0.42);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
.list-row:hover {
  border-color: var(--border-strong);
  background: rgba(37, 99, 235, 0.1);
}
.leaderboard {
  gap: 10px;
}
.leaderboard li {
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(8, 12, 20, 0.48);
  border-radius: 12px;
  padding: 10px 12px;
  align-items: center;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.leaderboard li:hover {
  border-color: var(--border-strong);
  transform: translateY(-1px);
}
.logs-table {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(8, 12, 20, 0.4);
}
.logs-header {
  padding: 10px 12px;
  background: rgba(148, 163, 184, 0.12);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}
.log-row {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: transparent;
}
.log-row:last-child {
  border-bottom: none;
}
.linked-list .linked-row {
  transition: border-color 0.2s ease;
}
.linked-list .linked-row:hover {
  border-color: var(--border-strong);
}
.source-pill {
  border: 1px solid rgba(148, 163, 184, 0.24);
}
.pagination {
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(8, 12, 20, 0.4);
}
.shops-grid,
.items-grid {
  gap: 14px;
}
.shop-card,
.item-card {
  border-color: rgba(148, 163, 184, 0.22);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.42));
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.shop-card:hover,
.item-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-1px);
}
.card-actions {
  gap: 8px;
}
.inventory-panel,
.inv-layout {
  gap: 14px;
}
.inventory-sidebar,
.inventory-detail,
.inv-members,
.inv-items {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.45);
}
.inventory-user-row,
.inv-member {
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(8, 12, 20, 0.44);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
.inventory-user-row:hover,
.inv-member:hover {
  border-color: var(--border-strong);
}
.inventory-item,
.inv-item {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(8, 12, 20, 0.45);
}
.form-section {
  border-color: rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.45);
}
.form-section-head {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}
.lootbox-entry-card {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(8, 12, 20, 0.44);
}
.actions {
  margin-top: 14px;
  gap: 10px;
}
.actions :global(.u-button),
.card-actions :global(.u-button) {
  font-weight: 700;
}
:global(body.theme-light) .sub-card {
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  border-color: rgba(148, 163, 184, 0.28);
}
:global(body.theme-light) .stat-tile,
:global(body.theme-light) .stat-card {
  background: #ffffff;
  border-color: rgba(148, 163, 184, 0.26);
}
:global(body.theme-light) .grid > label,
:global(body.theme-light) .filters-grid > label,
:global(body.theme-light) .filters-grid {
  background: #ffffff;
  border-color: rgba(148, 163, 184, 0.3);
}
:global(body.theme-light) .switch-field {
  background: #ffffff;
  border-color: rgba(148, 163, 184, 0.32);
}
:global(body.theme-light) .list-row,
:global(body.theme-light) .leaderboard li,
:global(body.theme-light) .logs-table,
:global(body.theme-light) .linked-list .linked-header,
:global(body.theme-light) .linked-list .linked-row,
:global(body.theme-light) .shop-card,
:global(body.theme-light) .item-card,
:global(body.theme-light) .inventory-sidebar,
:global(body.theme-light) .inventory-detail,
:global(body.theme-light) .inventory-item,
:global(body.theme-light) .inv-members,
:global(body.theme-light) .inv-items,
:global(body.theme-light) .inv-item,
:global(body.theme-light) .form-section,
:global(body.theme-light) .lootbox-entry-card,
:global(body.theme-light) .pagination {
  background: #ffffff;
  border-color: rgba(148, 163, 184, 0.28);
}
:global(body.theme-light) .logs-header {
  background: rgba(148, 163, 184, 0.14);
  border-bottom-color: rgba(148, 163, 184, 0.24);
}
:global(body.theme-light) .log-row {
  border-bottom-color: rgba(148, 163, 184, 0.16);
}
:global(body.theme-light) .source-pill {
  border-color: rgba(148, 163, 184, 0.32);
}
:global(body.theme-light) .source-pill.achievement {
  background: rgba(250, 204, 21, 0.2);
  border-color: rgba(202, 138, 4, 0.35);
  color: #92400e;
}
:global(body.theme-light) .section-content,
:global(body.theme-light) .section-nav {
  background: #f8fafc;
  color: var(--text);
}
:global(body.theme-light) .page {
  background: transparent;
  color: var(--text);
}
:global(body.theme-light) .hero,
:global(body.theme-light) .card,
:global(body.theme-light) .sub-card,
:global(body.theme-light) .modal-card,
:global(body.theme-light) .trash-card,
:global(body.theme-light) .shop-card,
:global(body.theme-light) .item-card,
:global(body.theme-light) .inv-member,
:global(body.theme-light) .inv-item,
:global(body.theme-light) .stat-card,
:global(body.theme-light) .logs-table,
:global(body.theme-light) .list-row,
:global(body.theme-light) .lootbox-entry-card {
  background: #ffffff;
  border-color: rgba(148, 163, 184, 0.25);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}
:global(body.theme-light) .hero-kicker {
  color: #1d4ed8;
}
:global(body.theme-light) .hero-badge {
  color: #1e3a8a;
  border-color: rgba(37, 99, 235, 0.35);
  background: rgba(37, 99, 235, 0.12);
}
:global(body.theme-light) .hero-badge-id {
  color: #334155;
  border-color: rgba(148, 163, 184, 0.45);
  background: rgba(148, 163, 184, 0.14);
}
:global(body.theme-light) .hero-badge.ok {
  color: #166534;
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.15);
}
:global(body.theme-light) .hero-badge.ko {
  color: #991b1b;
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.12);
}
:global(body.theme-light) .nav-item {
  background: #f8fafc;
  border-color: rgba(148, 163, 184, 0.22);
  color: #0f172a;
}
:global(body.theme-light) .nav-item.active {
  background: rgba(37, 99, 235, 0.14);
  border-color: rgba(37, 99, 235, 0.35);
  color: #1e3a8a;
}
:global(body.theme-light) .tab-pill,
:global(body.theme-light) .source-pill {
  background: #eef2ff;
  border-color: rgba(148, 163, 184, 0.25);
  color: var(--text);
}
:global(body.theme-light) .tab {
  background: #eef2ff;
  border-color: rgba(148, 163, 184, 0.25);
  color: var(--text);
}
:global(body.theme-light) .tab-pill.active {
  background: rgba(99, 102, 241, 0.18);
  color: var(--text);
}
:global(body.theme-light) .tab.active {
  background: rgba(59, 130, 246, 0.16);
  border-color: rgba(59, 130, 246, 0.36);
  color: #1e3a8a;
}
:global(body.theme-light) .muted,
:global(body.theme-light) .item-sub,
:global(body.theme-light) .inv-member-meta,
:global(body.theme-light) .inv-item-meta,
:global(body.theme-light) .stat-title {
  color: var(--text-muted);
}
:global(body.theme-light) input,
:global(body.theme-light) select,
:global(body.theme-light) textarea,
:global(body.theme-light) .search {
  background: #ffffff;
  border-color: rgba(148, 163, 184, 0.3);
  color: var(--text);
}
:global(body.theme-light) input::placeholder,
:global(body.theme-light) textarea::placeholder {
  color: var(--text-muted);
}
:global(body.theme-light) .emoji-popover,
:global(body.theme-light) .role-results,
:global(body.theme-light) .user-search-results,
:global(body.theme-light) .locale-menu {
  background: #ffffff;
  border-color: rgba(148, 163, 184, 0.25);
  color: var(--text);
}
:global(body.theme-light) .role-input,
:global(body.theme-light) .switch-field,
:global(body.theme-light) .doc-callout {
  background: #ffffff;
  border-color: rgba(148, 163, 184, 0.3);
}
:global(body.theme-light) .logs-header {
  color: var(--text-soft);
}
:global(body.theme-light) .section-nav {
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
}
/* Color boost pass (tab-aware accents) */
.section-content {
  --tab-rgb: 59 130 246;
  --tab-soft-rgb: 147 197 253;
}
.section-content.theme-daily {
  --tab-rgb: 245 158 11;
  --tab-soft-rgb: 252 211 77;
}
.section-content.theme-shops {
  --tab-rgb: 34 197 94;
  --tab-soft-rgb: 134 239 172;
}
.section-content.theme-automation {
  --tab-rgb: 34 211 238;
  --tab-soft-rgb: 125 211 252;
}
.section-content.theme-leaderboard {
  --tab-rgb: 236 72 153;
  --tab-soft-rgb: 249 168 212;
}
.section-content.theme-logs {
  --tab-rgb: 148 163 184;
  --tab-soft-rgb: 203 213 225;
}
.section-content.theme-twitch {
  --tab-rgb: 168 85 247;
  --tab-soft-rgb: 216 180 254;
}
.section-content.theme-games {
  --tab-rgb: 52 211 153;
  --tab-soft-rgb: 167 243 208;
}
.section-content.theme-achievements {
  --tab-rgb: 59 130 246;
  --tab-soft-rgb: 147 197 253;
}
.section-content.theme-achievementsGiveaway {
  --tab-rgb: 236 72 153;
  --tab-soft-rgb: 249 168 212;
}
.section-content.theme-achievementsBirthday {
  --tab-rgb: 251 191 36;
  --tab-soft-rgb: 253 230 138;
}
.section-content.theme-api {
  --tab-rgb: 249 115 22;
  --tab-soft-rgb: 253 186 116;
}
.section-content.theme-sensitive {
  --tab-rgb: 239 68 68;
  --tab-soft-rgb: 252 165 165;
}
.section-content .hero-kicker {
  color: rgb(var(--tab-soft-rgb));
}
.section-content .hero-badge {
  border-color: rgb(var(--tab-rgb) / 0.46);
  background: rgb(var(--tab-rgb) / 0.24);
}
.section-content .hero-badge-id {
  border-color: rgb(var(--tab-soft-rgb) / 0.5);
  background: rgb(var(--tab-soft-rgb) / 0.2);
}
.section-content .card {
  border-color: rgb(var(--tab-rgb) / 0.42);
  background:
    radial-gradient(circle at 100% 0%, rgb(var(--tab-rgb) / 0.22), transparent 44%),
    linear-gradient(180deg, rgba(8, 12, 20, 0.94), rgba(10, 16, 28, 0.88));
  box-shadow:
    0 14px 30px rgba(2, 6, 23, 0.32),
    inset 0 0 0 1px rgb(var(--tab-rgb) / 0.12);
}
.section-content .card:hover {
  border-color: rgb(var(--tab-rgb) / 0.64);
  box-shadow:
    0 20px 38px rgba(2, 6, 23, 0.36),
    inset 0 0 0 1px rgb(var(--tab-rgb) / 0.2);
}
.section-content :is(.sub-card, .shop-card, .item-card, .inventory-sidebar, .inventory-detail, .inventory-item, .inv-members, .inv-items, .inv-item, .logs-table, .list-row, .form-section, .lootbox-entry-card, .user-search-results, .pagination) {
  border-color: rgb(var(--tab-rgb) / 0.34);
  background: linear-gradient(180deg, rgb(var(--tab-rgb) / 0.16), rgba(15, 23, 42, 0.56));
  box-shadow: inset 0 0 0 1px rgb(var(--tab-soft-rgb) / 0.08);
}
.section-content .card-head h3::before {
  background: rgb(var(--tab-soft-rgb));
}
.section-content :is(.grid > label, .filters-grid > label, .filters-grid) {
  border-color: rgb(var(--tab-rgb) / 0.34);
  background: linear-gradient(180deg, rgb(var(--tab-rgb) / 0.12), rgba(8, 12, 20, 0.5));
}
.section-content :is(input, select, textarea, .search) {
  border-color: rgb(var(--tab-rgb) / 0.36);
  background: rgba(8, 12, 20, 0.74);
}
.section-content :is(input:focus, select:focus, textarea:focus, .search:focus) {
  border-color: rgb(var(--tab-rgb) / 0.64);
  box-shadow: 0 0 0 3px rgb(var(--tab-rgb) / 0.22);
}
.section-content .switch-field {
  border-color: rgb(var(--tab-rgb) / 0.42);
  background: linear-gradient(135deg, rgb(var(--tab-rgb) / 0.24), rgba(8, 12, 20, 0.64));
}
.section-content .switch .slider {
  background: rgb(var(--tab-rgb) / 0.2);
  border-color: rgb(var(--tab-rgb) / 0.4);
}
.section-content .switch input:checked + .slider {
  background: linear-gradient(135deg, rgb(var(--tab-rgb) / 0.96), rgb(var(--tab-soft-rgb) / 0.86));
  border-color: transparent;
}
.section-content :is(.tab, .tab-pill) {
  border-color: rgb(var(--tab-rgb) / 0.38);
  background: rgb(var(--tab-rgb) / 0.16);
}
.section-content :is(.tab:hover, .tab-pill:hover) {
  border-color: rgb(var(--tab-rgb) / 0.56);
  background: rgb(var(--tab-rgb) / 0.24);
}
.section-content :is(.tab.active, .tab-pill.active) {
  border-color: rgb(var(--tab-rgb) / 0.72);
  background: linear-gradient(135deg, rgb(var(--tab-rgb) / 0.42), rgb(var(--tab-soft-rgb) / 0.24));
  color: #f8fafc;
  box-shadow: 0 8px 16px rgb(var(--tab-rgb) / 0.26);
}
.section-content :is(.list-row, .leaderboard li, .linked-list .linked-row, .inventory-user-row, .inv-member) {
  border-color: rgb(var(--tab-rgb) / 0.3);
  background: linear-gradient(180deg, rgb(var(--tab-rgb) / 0.14), rgba(8, 12, 20, 0.46));
}
.section-content :is(.list-row:hover, .leaderboard li:hover, .linked-list .linked-row:hover, .inventory-user-row:hover, .inv-member:hover) {
  border-color: rgb(var(--tab-rgb) / 0.58);
  background: linear-gradient(180deg, rgb(var(--tab-rgb) / 0.24), rgba(8, 12, 20, 0.52));
}
.section-content :is(.logs-table, .linked-list .linked-header) {
  border-color: rgb(var(--tab-rgb) / 0.36);
}
.section-content :is(.logs-header, .linked-list .linked-header) {
  background: rgb(var(--tab-rgb) / 0.22);
}
.section-content .log-row {
  border-bottom-color: rgb(var(--tab-rgb) / 0.22);
}
.section-content .source-pill {
  border-color: rgb(var(--tab-rgb) / 0.42);
}
:global(body.theme-light) .section-content .card {
  border-color: rgb(var(--tab-rgb) / 0.48);
  background:
    radial-gradient(circle at 100% 0%, rgb(var(--tab-rgb) / 0.15), transparent 44%),
    linear-gradient(180deg, #ffffff, rgb(var(--tab-rgb) / 0.08));
  box-shadow:
    0 10px 22px rgba(15, 23, 42, 0.08),
    inset 0 0 0 1px rgb(var(--tab-rgb) / 0.08);
}
:global(body.theme-light) .section-content :is(.sub-card, .shop-card, .item-card, .inventory-sidebar, .inventory-detail, .inventory-item, .inv-members, .inv-items, .inv-item, .logs-table, .list-row, .form-section, .lootbox-entry-card, .user-search-results, .pagination, .grid > label, .filters-grid > label, .filters-grid, .switch-field, .linked-list .linked-header, .linked-list .linked-row) {
  background: linear-gradient(180deg, rgb(var(--tab-rgb) / 0.12), #ffffff);
  border-color: rgb(var(--tab-rgb) / 0.34);
}
:global(body.theme-light) .section-content :is(input, select, textarea, .search) {
  border-color: rgb(var(--tab-rgb) / 0.4);
  background: #ffffff;
}
:global(body.theme-light) .section-content :is(.tab, .tab-pill) {
  background: rgb(var(--tab-rgb) / 0.14);
  border-color: rgb(var(--tab-rgb) / 0.36);
  color: #0f172a;
}
:global(body.theme-light) .section-content :is(.tab.active, .tab-pill.active) {
  background: linear-gradient(135deg, rgb(var(--tab-rgb) / 0.28), rgb(var(--tab-soft-rgb) / 0.22));
  border-color: rgb(var(--tab-rgb) / 0.5);
  color: #0f172a;
  box-shadow: 0 8px 14px rgb(var(--tab-rgb) / 0.18);
}
:global(body.theme-light) .section-content .switch .slider {
  background: rgb(var(--tab-rgb) / 0.16);
  border-color: rgb(var(--tab-rgb) / 0.34);
}
:global(body.theme-light) .section-content .switch input:checked + .slider {
  background: linear-gradient(135deg, rgb(var(--tab-rgb) / 0.88), rgb(var(--tab-soft-rgb) / 0.86));
}
</style>

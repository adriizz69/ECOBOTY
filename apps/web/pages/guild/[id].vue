<template>
  <ClientOnly>
    <section class="page">
      <aside v-if="!guildBan?.banned" class="section-nav" :class="{ open: mobileMenuOpen }">
      <div class="section-head">
        <div class="section-brand">
          <img src="/logo.png" alt="EcoBoty" class="section-logo" />
          <div>
            <div class="section-title">EcoBoty</div>
            <p class="section-sub">{{ guildDisplayName }}</p>
          </div>
        </div>
        <button
          class="section-toggle"
          type="button"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <UIcon name="i-lucide-menu" class="size-5" />
          <span class="toggle-text">{{ $t("adminGuild.sidebar.menu") }}</span>
        </button>
      </div>
      <div class="section-nav-scroll">
      <div class="section-links">
          <NuxtLink to="/servers" class="nav-item nav-link nav-back">
            <UIcon name="i-lucide-arrow-left" class="nav-ico" />
            <span>{{ $t("nav.servers") }}</span>
          </NuxtLink>
          <div class="nav-divider"></div>
          <div class="nav-group">{{ $t("adminGuild.sidebar.groups.economy") }}</div>
          <button :class="['nav-item', 'tab-economy', activeTab === 'economy' && 'active']" @click="selectTab('economy')">
          <UIcon name="i-lucide-layout-dashboard" class="nav-ico" />
          <span>{{ $t("adminGuild.sidebar.items.overview") }}</span>
        </button>
          <button :class="['nav-item', 'tab-daily', activeTab === 'daily' && 'active']" @click="selectTab('daily')">
          <UIcon name="i-lucide-calendar-check" class="nav-ico" />
          <span>{{ $t("adminGuild.sidebar.items.daily") }}</span>
        </button>
          <button :class="['nav-item', 'tab-shops', activeTab === 'shops' && 'active']" @click="selectTab('shops')">
          <UIcon name="i-lucide-store" class="nav-ico" />
          <span>{{ $t("adminGuild.sidebar.items.shops") }}</span>
          <UIcon v-if="showNavPremiumCrown('shops')" name="i-lucide-crown" class="nav-premium-crown" />
        </button>
          <button :class="['nav-item', 'tab-user-shops', activeTab === 'userShops' && 'active']" @click="selectTab('userShops')">
          <UIcon name="i-lucide-shopping-bag" class="nav-ico" />
          <span>{{ $t("adminGuild.sidebar.items.userShops") }}</span>
          <UIcon v-if="showNavPremiumCrown('userShops')" name="i-lucide-crown" class="nav-premium-crown" />
        </button>
          <button
            :class="['nav-item', 'tab-inventories', activeTab === 'inventories' && 'active']"
            @click="selectTab('inventories')"
          >
          <UIcon name="i-lucide-package" class="nav-ico" />
          <span>{{ $t("adminGuild.sidebar.items.inventories") }}</span>
          <UIcon v-if="showNavPremiumCrown('inventories')" name="i-lucide-crown" class="nav-premium-crown" />
        </button>
          <button
            :class="['nav-item', 'tab-automation', activeTab === 'automation' && 'active']"
            @click="selectTab('automation')"
          >
          <UIcon name="i-lucide-timer" class="nav-ico" />
          <span>{{ $t("adminGuild.sidebar.items.automation") }}</span>
          <UIcon v-if="showNavPremiumCrown('automation')" name="i-lucide-crown" class="nav-premium-crown" />
        </button>
          <div class="nav-divider"></div>
          <div class="nav-group">{{ $t("adminGuild.sidebar.groups.community") }}</div>
          <button
            :class="['nav-item', 'tab-leaderboard', activeTab === 'leaderboard' && 'active']"
            @click="selectTab('leaderboard')"
          >
          <UIcon name="i-lucide-trophy" class="nav-ico" />
          <span>{{ $t("adminGuild.sidebar.items.leaderboard") }}</span>
        </button>
          <button :class="['nav-item', 'tab-logs', activeTab === 'logs' && 'active']" @click="selectTab('logs')">
          <UIcon name="i-lucide-scroll-text" class="nav-ico" />
          <span>{{ $t("adminGuild.sidebar.items.logs") }}</span>
        </button>
          <button
            :class="['nav-item', 'tab-message', activeTab === 'communityMessage' && 'active']"
            @click="selectTab('communityMessage')"
          >
            <UIcon name="i-lucide-mail" class="nav-ico" />
            <span>{{ $t("adminGuild.sidebar.items.communityMessage") }}</span>
            <UIcon v-if="showNavPremiumCrown('communityMessage')" name="i-lucide-crown" class="nav-premium-crown" />
          </button>
          <div class="nav-divider"></div>
          <div class="nav-group">{{ $t("adminGuild.sidebar.groups.integrations") }}</div>
          <button
            :class="['nav-item', 'tab-twitch', activeTab === 'twitch' && 'active']"
            @click="selectTab('twitch')"
          >
          <UIcon name="i-lucide-radio" class="nav-ico" />
          <span>{{ $t("adminGuild.sidebar.items.twitch") }}</span>
          <UIcon v-if="showNavPremiumCrown('twitch')" name="i-lucide-crown" class="nav-premium-crown" />
        </button>
          <button
            :class="['nav-item', 'tab-games', activeTab === 'games' && 'active']"
            @click="selectTab('games')"
          >
          <UIcon name="i-lucide-gamepad-2" class="nav-ico" />
          <span>{{ $t("adminGuild.sidebar.items.games") }}</span>
          <UIcon v-if="showNavPremiumCrown('games')" name="i-lucide-crown" class="nav-premium-crown" />
        </button>
          <button
            :class="['nav-item', 'tab-achievements', activeTab === 'achievements' && 'active']"
            @click="selectTab('achievements')"
          >
          <UIcon name="i-lucide-medal" class="nav-ico" />
          <span>Succès</span>
          <UIcon v-if="showNavPremiumCrown('achievements')" name="i-lucide-crown" class="nav-premium-crown" />
        </button>
          <button
            :class="['nav-item', 'tab-birthday', activeTab === 'achievementsBirthday' && 'active']"
            @click="selectTab('achievementsBirthday')"
          >
            <UIcon name="i-lucide-cake" class="nav-ico" />
            <span>Anniversaire</span>
          </button>
          <div class="nav-divider"></div>
          <div class="nav-group">{{ $t("adminGuild.sidebar.groups.system") }}</div>
          <button :class="['nav-item', 'tab-bot', activeTab === 'bot' && 'active']" @click="selectTab('bot')">
            <UIcon name="i-lucide-bot" class="nav-ico" />
            <span>{{ $t("adminGuild.sidebar.items.bot") }}</span>
          </button>
          <button :class="['nav-item', 'tab-sensitive', activeTab === 'sensitive' && 'active']" @click="selectTab('sensitive')">
          <UIcon name="i-lucide-shield-alert" class="nav-ico" />
          <span>{{ $t("adminGuild.sidebar.items.sensitive") }}</span>
        </button>
          <button :class="['nav-item', 'tab-billing', activeTab === 'billing' && 'active']" @click="selectTab('billing')">
            <UIcon name="i-lucide-credit-card" class="nav-ico" />
            <span>{{ $t("adminGuild.sidebar.items.billing") }}</span>
          </button>
          <div class="nav-divider"></div>
          <div class="nav-group">Aide</div>
          <NuxtLink to="/documentation" class="nav-item nav-link tab-docs">
            <UIcon name="i-lucide-book-open" class="nav-ico" />
            <span>{{ $t("nav.documentation") }}</span>
          </NuxtLink>
          <NuxtLink to="/mentions-legales" class="nav-item nav-link tab-legal">
            <UIcon name="i-lucide-scale" class="nav-ico" />
            <span>{{ $t("landing.legal") }}</span>
          </NuxtLink>
          <NuxtLink to="/conditions" class="nav-item nav-link tab-terms">
            <UIcon name="i-lucide-file-text" class="nav-ico" />
            <span>{{ $t("landing.legalDocs") }}</span>
          </NuxtLink>
      </div>
      </div>
      <div class="section-account">
        <NuxtLink to="/compte" class="account-chip account-chip-link">
          <div
            class="account-avatar"
            :style="guildMeAvatarUrl ? { backgroundImage: `url(${guildMeAvatarUrl})` } : {}"
          >
            <UIcon v-if="!guildMeAvatarUrl" name="i-lucide-user" class="size-4" />
          </div>
          <div class="account-meta">
            <div class="account-name">{{ guildMe?.username || $t("common.loading") }}</div>
            <div class="account-sub">Discord</div>
          </div>
        </NuxtLink>

        <div class="guild-server-switcher">
          <span class="guild-server-label">{{ $t("adminGuild.sidebar.activeServer") }}</span>
          <ClientOnly>
            <USelectMenu
              v-if="guildServerOptions.length > 0"
              v-model="selectedGuildServerId"
              :items="guildServerOptions"
              label-key="label"
              value-key="value"
              :search-input="{ placeholder: $t('server.searchPlaceholder') }"
              size="sm"
              class="guild-server-select"
            />
            <UButton v-else color="neutral" variant="soft" size="sm" block to="/servers">
              {{ $t("nav.servers") }}
            </UButton>
          </ClientOnly>
        </div>

        <button
          class="premium-focus"
          :class="{ 'is-premium': guildBilling?.isPremium }"
          type="button"
          @click="selectTab('billing')"
        >
          <div class="premium-focus-copy">
            <div class="premium-focus-label">{{ $t("billing.statusLabel") }}</div>
            <div class="premium-focus-title">
              {{ guildBilling?.isPremium ? $t("billing.status.premium") : $t("billing.status.free") }}
            </div>
          </div>
          <UIcon
            v-if="isGuildPremium"
            name="i-lucide-badge-check"
            class="premium-focus-icon is-ok"
          />
          <UIcon
            v-else
            name="i-lucide-crown"
            class="premium-focus-icon is-crown"
          />
        </button>
        <ClientOnly>
          <USelectMenu
            v-model="selectedLocale"
            :items="localeOptions"
            label-key="label"
            value-key="value"
            :searchable="false"
            :popper="{ placement: 'top-start' }"
            size="sm"
            class="guild-locale-select"
          >
            <template #default>
              <div class="locale-selected">
                <img :src="selectedLocaleItem?.flag" :alt="selectedLocaleItem?.label" class="locale-flag" />
                <span>{{ selectedLocaleItem?.label }}</span>
              </div>
            </template>
            <template #item-leading="{ item }">
              <img :src="item.flag" :alt="item.label" class="locale-flag" />
            </template>
          </USelectMenu>
        </ClientOnly>
      </div>
    </aside>

      <div v-if="guildBan?.banned" class="card ban-card">
        <h3>{{ $t("adminGuild.ban.title") }}</h3>
        <p class="muted">{{ $t("adminGuild.ban.subtitle") }}</p>
        <p v-if="guildBan?.reason" class="muted">{{ $t("adminGuild.ban.reason") }} {{ guildBan?.reason }}</p>
      </div>
      <div v-if="!guildBan?.banned" class="section-content" :class="`theme-${activeTab}`">
      <div class="hero eb-fade-up">
        <div class="hero-info">
          <span class="eb-kicker">{{ guildDisplayName }}</span>
          <div class="hero-title">{{ adminTabLabel || $t("adminGuild.hero.title") }}</div>
          <div class="hero-sub">{{ $t("adminGuild.hero.subtitle") }}</div>
          <div class="hero-badges">
            <span class="hero-badge">ID {{ route.params.id }}</span>
            <span class="hero-badge" :class="form.enabled ? 'ok' : 'ko'">
              {{ form.enabled ? $t("adminGuild.status.enabled") : $t("adminGuild.status.disabled") }}
            </span>
            <span class="hero-badge accent">{{ adminTabLabel }}</span>
            <span v-if="guildBilling?.isPremium" class="hero-badge ok">{{ $t("billing.status.premium") }}</span>
            <span v-else class="hero-badge ko">{{ $t("billing.status.free") }}</span>
          </div>
        </div>
        <div class="hero-actions">
          <UButton color="neutral" variant="soft" size="sm" to="/servers" icon="i-lucide-arrow-left">
            Serveurs
          </UButton>
          <UButton
            :color="form.enabled ? 'primary' : 'neutral'"
            variant="soft"
            size="sm"
            icon="i-lucide-activity"
          >
            {{ form.enabled ? $t("adminGuild.status.enabled") : $t("adminGuild.status.disabled") }}
          </UButton>
        </div>
      </div>

      <UCard
        v-show="activeTab === 'economy'"
        class="card"
        :class="{ 'card-emoji-open': showEmojiPicker }"
      >
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
        <div class="grid form-grid">
          <label class="field">
            <span class="field-label">{{ $t("adminGuild.economy.currencyName") }}</span>
            <input v-model="form.name" :placeholder="$t('adminGuild.economy.currencyPlaceholder')" />
          </label>
          <div class="field">
            <span class="field-label">{{ $t("adminGuild.economy.currencySymbol") }}</span>
            <div class="emoji-field">
              <button
                type="button"
                class="emoji-pick-btn"
                @click.stop.prevent="toggleEmojiPicker"
              >
                <span class="emoji-preview" v-html="renderEmojiPreview(form.emoji || '💰')"></span>
                <span>{{ $t("adminGuild.economy.pickEmoji") }}</span>
              </button>
              <div v-if="showEmojiPicker" class="emoji-popover" @click.stop>
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
            </div>
          </div>
          <label class="field">
            <span class="field-label">{{ $t("adminGuild.economy.startBalance") }}</span>
            <input v-model.number="form.startBalance" type="number" />
          </label>
          <label class="field">
            <span class="field-label">{{ $t("adminGuild.economy.maxBalance") }}</span>
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
            <EbSelect
              v-model="form.logChannelId"
              :items="toSelectItems(channels, { emptyLabel: $t('common.disabled') })"
            />
          </label>
        </div>
        <div class="sub-card">
          <h4>{{ $t("adminGuild.userUi.title") }}</h4>
          <p class="muted">
            {{ $t("adminGuild.userUi.help") }}
          </p>
          <div class="switch-field">
            <span>{{ $t("adminGuild.userUi.enabledLabel") }}</span>
            <label class="switch">
              <input v-model="userUiEnabled" type="checkbox" :disabled="userUiSaving" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </UCard>

      <div v-show="activeTab === 'billing'">
        <GuildBillingPanel :guild-id="String(route.params.id || '')" />
      </div>

      <UCard v-show="activeTab === 'bot'" class="card">
        <div class="card-head">
          <h3>{{ $t("adminGuild.bot.title") }}</h3>
          <UButton color="primary" @click="saveBotSettings">{{ $t("common.save") }}</UButton>
        </div>
        <div class="grid">
          <label>
            {{ $t("adminGuild.bot.language") }}
            <EbSelect v-model="botLanguage" :items="botLanguageOptions" :searchable="false" />
          </label>
          <label>
            {{ $t("adminGuild.bot.timezone") }}
            <EbSelect
              v-model="botTimezone"
              :items="timezoneSelectItems"
              :searchable="true"
              :placeholder="$t('adminGuild.bot.timezonePlaceholder')"
            />
            <p class="muted" style="margin-top:6px;">
              {{ $t("adminGuild.bot.timezoneSelected", { zone: currentTimezoneLabel }) }}
            </p>
            <p class="muted" style="margin-top:4px;">
              {{ $t("adminGuild.bot.timezoneHelp") }}
            </p>
          </label>
          <label>
            {{ $t("adminGuild.bot.sensitiveCommandsRole") }}
            <EbSelect
              v-model="sensitiveCommandsRoleId"
              :items="toSelectItems(assignableRoles, { emptyLabel: $t('adminGuild.bot.sensitiveCommandsRoleNone') })"
            />
            <p class="muted" style="margin-top:6px;">
              {{ $t("adminGuild.bot.sensitiveCommandsRoleHelp") }}
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
            <EbSelect
              v-model="botLogChannelId"
              :items="toSelectItems(channels, { emptyLabel: $t('common.disabled') })"
            />
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
        <div class="grid daily-base-grid">
          <label>
            {{ $t("adminGuild.daily.base") }}
            <input v-model.number="form.dailyAmount" type="number" />
          </label>
        </div>

        <BillingPremiumGate
          :locked="!hasBillingFeature('economy_daily_bonus')"
          feature-key="economy_daily_bonus"
          :benefits="dailyGateUnlockItems"
          class="daily-bonus-gate"
        >
          <div class="grid daily-bonus-preview">
            <label>
              {{ $t("adminGuild.daily.bonus7") }}
              <input
                v-model.number="form.streak7"
                type="number"
                :disabled="!hasBillingFeature('economy_daily_bonus')"
              />
            </label>
            <label>
              {{ $t("adminGuild.daily.bonus14") }}
              <input
                v-model.number="form.streak14"
                type="number"
                :disabled="!hasBillingFeature('economy_daily_bonus')"
              />
            </label>
            <label>
              {{ $t("adminGuild.daily.bonus30") }}
              <input
                v-model.number="form.streak30"
                type="number"
                :disabled="!hasBillingFeature('economy_daily_bonus')"
              />
            </label>
          </div>
        </BillingPremiumGate>
      </UCard>

      <UCard v-show="activeTab === 'leaderboard'" class="card">
        <div class="card-head">
          <h3>{{ $t("adminGuild.leaderboard.title") }}</h3>
          <div class="actions-inline">
            <UButton color="primary" variant="solid" @click="openMassBalanceModal">
              {{ $t("adminGuild.leaderboard.bulkAddAction") }}
            </UButton>
            <UButton color="neutral" variant="outline" @click="refreshLeaderboard">{{ $t("common.refresh") }}</UButton>
          </div>
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
              <EbSelect
                v-model="leaderboardPost.channel_id"
                :items="toSelectItems(channels, { emptyLabel: $t('adminGuild.leaderboard.selectChannel') })"
              />
            </label>
            <label>
              {{ $t("adminGuild.leaderboard.top") }}
              <EbSelect v-model="leaderboardPost.limit" number :items="leaderboardLimitItems" :searchable="false" />
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
        <div class="leaderboard-search-row">
          <label class="inline-label">{{ $t("adminGuild.leaderboard.searchLabel") }}</label>
          <div class="inline">
            <input
              v-model.trim="leaderboardSearch"
              class="search leaderboard-search-input"
              :placeholder="$t('adminGuild.leaderboard.searchPlaceholder')"
              @input="queueLeaderboardSearch"
            />
            <UButton
              v-if="leaderboardSearch"
              color="neutral"
              variant="outline"
              size="xs"
              @click="clearLeaderboardSearch"
            >
              {{ $t("adminGuild.leaderboard.searchReset") }}
            </UButton>
          </div>
        </div>
        <div v-if="!leaderboard.length" class="muted">{{ $t("common.noData") }}</div>
        <ul class="leaderboard">
          <li v-for="row in leaderboard" :key="row.userId">
            <span>#{{ row.rank }}</span>
            <button class="link" type="button" @click="openLeaderboardDetails(row)">
              {{ leaderboardDisplayName(row) }}
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
            <p class="muted logs-retention-line">
              {{
                $t("adminGuild.logs.retentionNote", {
                  days: billingLimits.logs_history_days ?? 15
                })
              }}
            </p>
          </div>
          <UButton color="neutral" variant="outline" @click="refreshLogs">{{ $t("common.refresh") }}</UButton>
        </div>

        <div v-if="!isGuildPremium" class="premium-inline-upsell">
          <div class="premium-inline-upsell-copy">
            <div class="premium-inline-upsell-kicker">{{ $t("billing.gate.kicker") }}</div>
            <h4 class="premium-inline-upsell-title">{{ $t("adminGuild.logs.premiumUpsellTitle") }}</h4>
            <p class="muted premium-inline-upsell-text">
              {{
                $t("adminGuild.logs.premiumUpsellDescription", {
                  freeDays: billingLimits.logs_history_days ?? 15,
                  premiumDays: premiumLogsHistoryDays
                })
              }}
            </p>
          </div>
          <div class="premium-inline-upsell-actions">
            <UButton color="primary" icon="i-lucide-crown" @click="selectTab('billing')">
              {{ $t("adminGuild.logs.premiumUpsellCta") }}
            </UButton>
            <UButton color="neutral" variant="outline" icon="i-lucide-sparkles" @click="openPremiumUpsell('community_logs_extended')">
              {{ $t("billing.gate.viewPricing") }}
            </UButton>
          </div>
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
            :class="['tab-pill', logsCategoryTab === 'leaves' && 'active']"
            @click="logsCategoryTab = 'leaves'"
          >
            {{ $t("adminGuild.logs.tabs.leaves") }}
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
            <EbSelect v-model="logsSortKey" :items="logsSortItems" :searchable="false" />
          </label>
          <label>
            {{ $t("adminGuild.logs.order") }}
            <EbSelect v-model="logsSortDir" :items="logsOrderItems" :searchable="false" />
          </label>
          <label>
            {{ $t("common.page") }}
            <EbSelect v-model="logsLimit" number :items="logsLimitItems" :searchable="false" />
          </label>
        </div>
        <template v-if="logsCategoryTab !== 'linked'">
          <div v-if="!paginatedLogs.length" class="muted">{{ $t("adminGuild.logs.empty") }}</div>
          <div class="logs-table">
            <div class="logs-header" :class="`logs-grid logs-grid--${logsCategoryTab}`">
              <span class="col-date">{{ $t("adminGuild.logs.columns.date") }}</span>
              <span v-if="logsCategoryTab === 'gains'" class="col-source">{{ $t("adminGuild.logs.columns.source") }}</span>
              <span v-else-if="logsCategoryTab === 'transactions'" class="col-source">{{ $t("adminGuild.logs.columns.type") }}</span>
              <span v-else-if="logsCategoryTab === 'leaves'" class="col-source">{{ $t("adminGuild.logs.columns.balance") }}</span>
              <span v-else class="col-source">{{ $t("adminGuild.logs.columns.game") }}</span>
              <span class="col-user">{{ $t("adminGuild.logs.columns.user") }}</span>
              <span v-if="logsCategoryTab === 'gains'" class="col-num">{{ $t("adminGuild.logs.columns.gain") }}</span>
              <span v-else-if="logsCategoryTab === 'transactions'" class="col-item">{{ $t("adminGuild.logs.columns.item") }}</span>
              <span v-else-if="logsCategoryTab === 'leaves'" class="col-item">{{ $t("adminGuild.logs.columns.inventory") }}</span>
              <span v-else class="col-num">{{ $t("adminGuild.logs.columns.bet") }}</span>
              <span v-if="logsCategoryTab === 'gains'" class="col-num">{{ $t("adminGuild.logs.columns.base") }}</span>
              <span v-else-if="logsCategoryTab === 'transactions'" class="col-num">{{ $t("adminGuild.logs.columns.amount") }}</span>
              <span v-else-if="logsCategoryTab === 'leaves'" class="col-num">{{ $t("adminGuild.logs.columns.inventoryQty") }}</span>
              <span v-else class="col-num">{{ $t("adminGuild.logs.columns.gain") }}</span>
              <span v-if="logsCategoryTab === 'gains'" class="col-mult">{{ $t("adminGuild.logs.columns.multiplier") }}</span>
              <span v-else-if="logsCategoryTab === 'transactions'" class="col-details">{{ $t("adminGuild.logs.columns.details") }}</span>
              <span v-else-if="logsCategoryTab === 'leaves'" class="col-details">{{ $t("adminGuild.logs.columns.details") }}</span>
              <span v-else class="col-details">{{ $t("adminGuild.logs.columns.result") }}</span>
            </div>
            <div class="logs-body">
              <div
                v-for="log in paginatedLogs"
                :key="log.id"
                class="log-row"
                :class="`logs-grid logs-grid--${logsCategoryTab}`"
              >
                <span class="col-date">{{ formatDateTime(log.created_at) }}</span>
                <template v-if="logsCategoryTab === 'gains'">
                  <span class="col-source">
                    <span class="source-pill" :class="sourceMeta(log.source).kind">
                      {{ sourceMeta(log.source).icon }} {{ formatGainSource(log.source) }}
                    </span>
                  </span>
                  <span class="col-user">{{ leaderboardUsers[log.user_discord_id]?.displayName || log.user_discord_id }}</span>
                  <span class="col-num">{{ formatSignedAmount(log.total_amount) }}</span>
                  <span class="col-num">{{ formatSignedAmount(log.base_amount) }}</span>
                  <span class="col-mult">{{ formatGainMultiplier(log) }}</span>
                </template>
                <template v-else-if="logsCategoryTab === 'transactions'">
                  <span class="col-source">
                    <span class="source-pill transaction">
                      🧾 {{ formatTransactionType(log.type) }}
                    </span>
                  </span>
                  <span class="col-user">{{ leaderboardUsers[log.user_discord_id]?.displayName || log.user_discord_id }}</span>
                  <span class="col-item">{{ formatTransactionItem(log) }}</span>
                  <span class="col-num">{{ formatAmount(formatTransactionAmount(log)) }}</span>
                  <span class="col-details">{{ formatTransactionDetails(log) }}</span>
                </template>
                <template v-else-if="logsCategoryTab === 'leaves'">
                  <span class="col-source">
                    <span class="source-pill leave">🚪 {{ formatAmount(getLeaveBalance(log)) }}</span>
                  </span>
                  <span class="col-user">{{ formatLeaveUserName(log) }}</span>
                  <span class="col-item">{{ formatLeaveInventorySummary(log) }}</span>
                  <span class="col-num">{{ getLeaveInventoryQty(log) }}</span>
                  <span class="col-details leave-details">{{ formatLeaveInventoryDetails(log) }}</span>
                </template>
                <template v-else>
                  <span class="col-source">
                    <span class="source-pill game">🎮 {{ formatGameName(log.type) }}</span>
                  </span>
                  <span class="col-user">{{ leaderboardUsers[log.user_discord_id]?.displayName || log.user_discord_id }}</span>
                  <span class="col-num">{{ formatAmount(getGameBet(log)) }}</span>
                  <span class="col-num">{{ formatAmount(getGamePayout(log)) }}</span>
                  <span class="col-details">{{ formatGameOutcome(log) }}</span>
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
          <div v-else class="linked-list">
            <div class="linked-header logs-grid logs-grid--linked">
              <span class="col-user">{{ $t("adminGuild.logs.linkedColumns.user") }}</span>
              <span class="col-twitch">{{ $t("adminGuild.logs.linkedColumns.twitch") }}</span>
              <span class="col-tier">{{ $t("adminGuild.logs.linkedColumns.tier") }}</span>
              <span class="col-discord">{{ $t("adminGuild.logs.linkedColumns.discord") }}</span>
              <span class="col-actions">{{ $t("adminGuild.logs.linkedColumns.actions") }}</span>
            </div>
            <div
              v-for="user in paginatedLinkedUsers"
              :key="user.discord_id"
              class="linked-row logs-grid logs-grid--linked"
            >
              <span class="col-user">{{ leaderboardUsers[user.discord_id]?.displayName || user.username || user.discord_id }}</span>
              <span class="col-twitch linked-twitch">@{{ user.twitch_login }}</span>
              <span class="col-tier linked-tier">
                <span class="pill" :class="tierPillClass(user)">
                  {{ formatLinkedTier(user) }}
                </span>
              </span>
              <span class="col-discord muted">{{ user.discord_id }}</span>
              <span class="col-actions">
                <UButton
                  color="error"
                  variant="solid"
                  size="xs"
                  :disabled="unlinkingUserId === String(user.discord_id)"
                  @click="unlinkTwitchUser(user)"
                >
                  {{ $t("adminGuild.logs.unlink") }}
                </UButton>
              </span>
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
            <UButton
              color="primary"
              variant="outline"
              :loading="communityMessageUpdating"
              :disabled="!communityMessageChannelId || !communityMessageMessageId || communityMessageUpdating"
              @click="updateCommunityMessage"
            >
              {{ communityMessageUpdating ? $t("common.loading") : $t("adminGuild.communityMessage.update") }}
            </UButton>
          </div>
        </div>

        <div v-if="communityMessageMessageId" class="doc-callout" style="margin-bottom: 12px;">
          {{ $t("adminGuild.communityMessage.alreadySent", { count: communityMessageMessageIds.length || 1 }) }}
        </div>

        <div class="grid">
          <label>
            {{ $t("adminGuild.communityMessage.channel") }}
            <EbSelect
              v-model="communityMessageChannelId"
              :items="toSelectItems(channels, { emptyLabel: $t('adminGuild.communityMessage.selectChannel') })"
            />
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
          <BillingPremiumGate
            v-if="!hasBillingFeature('community_message_sections')"
            locked
            feature-key="community_message_sections"
            :benefits="communityGateUnlockItems"
          >
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
              <div v-for="section in communitySectionOptions" :key="section.key" class="switch-field">
                <span>{{ section.label }}</span>
                <label class="switch">
                  <input v-model="communityMessageSections" type="checkbox" :value="section.key" disabled />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </BillingPremiumGate>
          <div
            v-else
            class="grid"
            style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));"
          >
            <div v-for="section in communitySectionOptions" :key="`edit-${section.key}`" class="switch-field">
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
          <DiscordMessagePreview
            :html="communityMessagePreviewHtml"
            :empty-text="$t('adminGuild.communityMessage.previewEmpty')"
            author="EcoBoty"
            avatar-url="/logo.png"
          />
          <div class="muted" style="margin-top: 6px;">
            {{ $t("adminGuild.communityMessage.length", { count: communityMessagePreviewLength }) }}
          </div>
        </div>

        <div v-if="communityMessageStatus" class="muted">{{ communityMessageStatus }}</div>
      </UCard>

      <div v-show="activeTab === 'twitch'">
      <UCard class="card">
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

        <BillingPremiumGate
          :locked="!hasBillingFeature('twitch_module')"
          feature-key="twitch_module"
          :benefits="twitchGateUnlockItems"
        >
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
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
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
          <div style="display:grid; gap: 20px;">
            <div>
              <div class="item-title" style="margin-bottom:8px;">{{ $t("adminGuild.twitch.eventsSubs") }}</div>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
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
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
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
            <h4>{{ $t("adminGuild.twitch.promoTitle") }}</h4>
            <UButton
              color="primary"
              :disabled="!twitchStatus.connected"
              @click="saveTwitchPromoSettings"
            >
              {{ $t("common.save") }}
            </UButton>
          </div>
          <p class="muted" style="margin-bottom: 10px;">
            {{ $t("adminGuild.twitch.promoHelp") }}
          </p>
          <div class="grid">
            <div class="switch-field">
              <span>{{ $t("adminGuild.twitch.promoEnabled") }}</span>
              <label class="switch">
                <input v-model="twitchPromo.enabled" type="checkbox" :disabled="!twitchStatus.connected" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="switch-field">
              <span>{{ $t("adminGuild.twitch.promoOnFollow") }}</span>
              <label class="switch">
                <input v-model="twitchPromo.onFollow" type="checkbox" :disabled="!twitchStatus.connected || !twitchPromo.enabled" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="switch-field">
              <span>{{ $t("adminGuild.twitch.promoOnFirstMessage") }}</span>
              <label class="switch">
                <input v-model="twitchPromo.onFirstMessage" type="checkbox" :disabled="!twitchStatus.connected || !twitchPromo.enabled" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="switch-field">
              <span>{{ $t("adminGuild.twitch.promoRemindUnlinked") }}</span>
              <label class="switch">
                <input v-model="twitchPromo.remindUnlinked" type="checkbox" :disabled="!twitchStatus.connected || !twitchPromo.enabled" />
                <span class="slider"></span>
              </label>
            </div>
            <label style="grid-column: 1 / -1;">
              {{ $t("adminGuild.twitch.promoDiscordUrl") }}
              <div class="inline" style="flex-wrap: wrap; gap: 8px; align-items: center;">
                <input
                  v-model="twitchPromo.discordUrl"
                  type="url"
                  :placeholder="$t('adminGuild.twitch.promoDiscordUrlPlaceholder')"
                  :disabled="!twitchStatus.connected || !twitchPromo.enabled"
                  style="flex: 1; min-width: 220px;"
                />
                <UButton
                  size="sm"
                  color="neutral"
                  variant="outline"
                  :loading="generatingDiscordInvite"
                  :disabled="!twitchStatus.connected || !twitchPromo.enabled"
                  @click="generateDiscordInvite"
                >
                  {{ $t("adminGuild.twitch.promoDiscordGenerate") }}
                </UButton>
              </div>
              <p class="muted" style="margin-top: 6px; font-size: 0.85rem;">
                {{ $t("adminGuild.twitch.promoDiscordGenerateHelp") }}
              </p>
            </label>
            <label style="grid-column: 1 / -1;">
              {{ $t("adminGuild.twitch.promoTemplate") }}
              <textarea
                v-model="twitchPromo.template"
                rows="4"
                :disabled="!twitchStatus.connected || !twitchPromo.enabled"
                style="width:100%;resize:vertical;min-height:96px;"
              />
            </label>
          </div>
          <div class="inline" style="flex-wrap: wrap; gap: 8px; margin-top: 10px;">
            <span class="muted">{{ $t("adminGuild.twitch.promoPlaceholders") }}</span>
            <UButton
              v-for="item in twitchPromoPlaceholders"
              :key="item.tag"
              size="xs"
              color="neutral"
              variant="soft"
              :title="item.label"
              :disabled="!twitchStatus.connected || !twitchPromo.enabled"
              @click="insertTwitchPromoTag(item.tag)"
            >
              {{ item.tag }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              :disabled="!twitchStatus.connected || !twitchPromo.enabled"
              @click="resetTwitchPromoTemplate"
            >
              {{ $t("adminGuild.twitch.promoResetTemplate") }}
            </UButton>
          </div>
          <ul class="muted" style="margin: 8px 0 0; padding-left: 18px; font-size: 0.85rem;">
            <li v-for="item in twitchPromoPlaceholders" :key="`hint-${item.tag}`">
              <strong>{{ item.tag }}</strong> — {{ item.label }}
            </li>
          </ul>
          <p class="muted" style="margin-top: 8px;">
            {{ $t("adminGuild.twitch.promoPreviewLabel") }}
            <strong>{{ twitchPromoPreview }}</strong>
          </p>
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
        </BillingPremiumGate>
      </UCard>
      </div>

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
            <template v-if="hasBillingFeature('games_advanced_modes')">
              <div class="list-row"><span>{{ $t("adminGuild.games.dice.title") }}</span><span>/jeux → Dice</span></div>
              <div class="list-row"><span>{{ $t("adminGuild.games.slot.title") }}</span><span>/jeux → Slot</span></div>
              <div class="list-row"><span>{{ $t("adminGuild.games.roulette.title") }}</span><span>/jeux → Roulette</span></div>
              <div class="list-row"><span>{{ $t("adminGuild.games.higherLower.title") }}</span><span>/jeux → Higher/Lower</span></div>
              <div class="list-row"><span>{{ $t("adminGuild.games.crash.title") }}</span><span>/jeux → Crash</span></div>
              <div class="list-row"><span>{{ $t("adminGuild.games.double.title") }}</span><span>/jeux → Double</span></div>
              <div class="list-row"><span>{{ $t("adminGuild.games.mystery.title") }}</span><span>/jeux → Mystery</span></div>
            </template>
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

        <BillingPremiumGate
          :locked="!hasBillingFeature('games_advanced_modes')"
          feature-key="games_advanced_modes"
          :benefits="gamesGateUnlockItems"
        >
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
              <EbSelect v-model="gamesConfig.crash.speed" :items="crashSpeedItems" :searchable="false" />
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
        </BillingPremiumGate>
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

      <UCard v-show="activeTab === 'userShops'" class="card">
        <BillingPremiumGate
          :locked="!hasBillingFeature('economy_user_shops')"
          feature-key="economy_user_shops"
          :benefits="userShopsGateUnlockItems"
        >
        <div class="card-head">
          <div>
            <h3>{{ $t("adminGuild.userShops.title") }}</h3>
            <p class="muted">{{ $t("adminGuild.userShops.subtitle") }}</p>
          </div>
          <div class="actions">
            <UButton color="neutral" variant="outline" @click="loadAdminUserShops">
              {{ $t("common.refresh") }}
            </UButton>
            <UButton color="primary" :loading="userShopsSaving" @click="saveUserShopsSettings">
              {{ $t("adminGuild.userShops.save") }}
            </UButton>
          </div>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.userShops.settingsTitle") }}</h4>
          <p class="muted">{{ $t("adminGuild.userShops.enabledHelp") }}</p>
          <div class="switch-field">
            <span>{{ $t("adminGuild.userShops.enabled") }}</span>
            <label class="switch" :aria-label="$t('adminGuild.userShops.enabled')">
              <input v-model="userShopsSettings.enabled" type="checkbox" />
              <span class="slider"></span>
            </label>
          </div>
          <p v-if="userShopsStatus" class="muted" style="margin-top: 10px;">{{ userShopsStatus }}</p>
        </div>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.userShops.allowedTypes") }}</h4>
          <p class="muted">{{ $t("adminGuild.userShops.lootboxNote") }}</p>
          <div class="inline" style="gap: 8px; flex-wrap: wrap; margin-top: 10px;">
            <button
              v-for="typeKey in userShopTypeOptions"
              :key="typeKey"
              type="button"
              :class="['tab-pill', userShopsSettings.allowedTypes.includes(typeKey) && 'active']"
              @click="toggleUserShopAllowedType(typeKey, !userShopsSettings.allowedTypes.includes(typeKey))"
            >
              {{ userShopTypeLabel(typeKey) }}
            </button>
          </div>
        </div>

        <div class="sub-card">
          <div class="card-head" style="margin-bottom: 12px;">
            <div>
              <h4>{{ $t("adminGuild.userShops.listTitle") }}</h4>
              <p class="muted">{{ $t("adminGuild.userShops.listHelp") }}</p>
            </div>
            <span class="pill muted">{{ adminUserShops.length }}</span>
          </div>

          <div v-if="!adminUserShops.length" class="muted">{{ $t("adminGuild.userShops.empty") }}</div>
          <div v-else class="shops-grid">
            <div v-for="shop in adminUserShops" :key="shop.id" class="shop-card">
              <div class="shop-main">
                <div class="user-shop-owner">
                  <DiscordAvatar
                    :user-id="shop.owner_discord_id"
                    :avatar="leaderboardUsers[shop.owner_discord_id]?.avatar"
                    :alt="userShopOwnerName(shop)"
                    :size="42"
                    class="user-shop-avatar"
                  />
                  <div>
                    <div class="item-title">{{ shop.name }}</div>
                    <div class="item-sub">
                      {{ $t("adminGuild.userShops.owner") }} · {{ userShopOwnerName(shop) }}
                    </div>
                    <div class="muted small" style="margin-top: 4px;">
                      {{
                        $t("adminGuild.userShops.itemsCount", {
                          count: (shop.items || []).length
                        })
                      }}
                      <span v-if="shop.enabled === false" class="pill danger" style="margin-left: 6px;">
                        {{ $t("adminGuild.userShops.disabledBadge") }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="(shop.items || []).length" class="user-shop-items">
                <div v-for="item in shop.items" :key="item.id" class="user-shop-item-row">
                  <div>
                    <div class="item-title" style="font-size: 0.95rem;">{{ item.name }}</div>
                    <div class="item-sub">
                      {{ userShopTypeLabel(item.type) }} · {{ formatAmount(item.price) }}
                      <span v-if="item.stock !== null && item.stock !== undefined">
                        · {{ $t("adminGuild.userShops.stock", { count: item.stock }) }}
                      </span>
                    </div>
                  </div>
                  <UButton
                    color="error"
                    variant="outline"
                    size="xs"
                    @click="requestDeleteAdminUserShopItem(shop, item)"
                  >
                    {{ $t("adminGuild.userShops.deleteItem") }}
                  </UButton>
                </div>
              </div>
              <div v-else class="muted small">{{ $t("adminGuild.userShops.noItems") }}</div>

              <div class="shop-actions">
                <UButton color="error" variant="outline" @click="requestDeleteAdminUserShop(shop)">
                  {{ $t("adminGuild.userShops.deleteShop") }}
                </UButton>
              </div>
            </div>
          </div>
        </div>
        </BillingPremiumGate>
      </UCard>

      <UCard v-show="activeTab === 'shops'" class="card">
        <div class="card-head">
          <div>
            <h3>{{ $t("adminGuild.shops.title") }}</h3>
            <p class="muted">{{ $t("adminGuild.shops.subtitle") }}</p>
            <div class="shop-limit-row">
              <span class="shop-limit-pill">
                {{
                  $t("adminGuild.shops.limitsShops", {
                    current: shopsLimitCurrent,
                    max: shopsLimitMax
                  })
                }}
              </span>
              <span v-if="!isGuildPremium" class="shop-limit-hint muted">
                {{ $t("adminGuild.shops.limitsShopsPremiumHint", { max: premiumShopsLimitMax }) }}
              </span>
            </div>
          </div>
          <div class="actions">
            <UButton
              v-if="!isGuildPremium"
              color="neutral"
              variant="outline"
              icon="i-lucide-crown"
              @click="openPremiumUpsell('economy_multi_shops')"
            >
              {{ $t("adminGuild.shops.premiumCta") }}
            </UButton>
            <UButton color="primary" @click="openCreateShopModal">{{ $t("adminGuild.shops.create") }}</UButton>
          </div>
        </div>

        <div v-if="!isGuildPremium" class="premium-inline-upsell premium-inline-upsell--compact">
          <div class="premium-inline-upsell-copy">
            <p class="muted premium-inline-upsell-text">{{ $t("adminGuild.shops.premiumCallout") }}</p>
          </div>
          <UButton color="primary" size="sm" icon="i-lucide-zap" @click="selectTab('billing')">
            {{ $t("billing.gate.ctaBilling") }}
          </UButton>
        </div>

        <div
          v-if="lockedPremiumContent && !isGuildPremium"
          class="doc-callout"
          style="margin-bottom: 12px;"
        >
          {{ $t("billing.gate.features.premium_restore_content.description") }}
        </div>

        <div class="shops-grid">
          <div v-if="!activeShops.length && !lockedShops.length" class="shops-empty-state">
            <div class="shops-empty-icon" aria-hidden="true">🛍️</div>
            <h4>{{ $t("adminGuild.shops.emptyFirstTitle") }}</h4>
            <p class="muted">{{ $t("adminGuild.shops.emptyFirstHelp") }}</p>
            <p class="muted shops-empty-limits">
              {{
                $t("adminGuild.shops.emptyFirstLimits", {
                  shopsCurrent: shopsLimitCurrent,
                  shopsMax: shopsLimitMax,
                  itemsMax: shopItemsLimitMax
                })
              }}
            </p>
            <div class="shops-empty-actions">
              <UButton color="primary" icon="i-lucide-plus" @click="openCreateShopModal">
                {{ $t("adminGuild.shops.create") }}
              </UButton>
              <UButton
                v-if="!isGuildPremium"
                color="neutral"
                variant="outline"
                icon="i-lucide-crown"
                @click="openPremiumUpsell('economy_multi_shops')"
              >
                {{ $t("adminGuild.shops.premiumCta") }}
              </UButton>
            </div>
          </div>
          <div v-for="shop in activeShops" :key="shop.id" class="shop-card">
            <div class="shop-main">
              <div>
                <div class="item-title">{{ shop.name }}</div>
                <div class="item-sub">
                  {{ $t("adminGuild.shops.discountLabel") }} {{ shop.discount_percent }}%
                </div>
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

        <BillingPremiumGate
          v-if="lockedShops.length"
          locked
          feature-key="premium_restore_content"
          :benefits="lockedShopUnlockItems.length ? lockedShopUnlockItems : undefined"
          class="locked-shops-gate"
        >
          <div class="shops-grid">
            <div v-for="shop in lockedShops" :key="`locked-${shop.id}`" class="shop-card">
              <div class="shop-main">
                <div>
                  <div class="item-title">{{ shop.name }}</div>
                  <div class="item-sub">
                    {{ $t("adminGuild.shops.discountLabel") }} {{ shop.discount_percent }}%
                  </div>
                </div>
                <label class="switch" :aria-label="$t('adminGuild.shops.enableAria')">
                  <input type="checkbox" :checked="shop.enabled" disabled />
                  <span class="slider"></span>
                </label>
              </div>
              <div class="shop-actions">
                <UButton color="neutral" variant="outline" disabled>{{ $t("common.settings") }}</UButton>
                <UButton color="primary" disabled>{{ $t("adminGuild.shops.items") }}</UButton>
              </div>
            </div>
          </div>
        </BillingPremiumGate>
      </UCard>

      <div v-show="activeTab === 'inventories'">
        <InventoriesAdminPanel :guild-id="String(route.params.id || '')" :active="activeTab === 'inventories'" />
      </div>

      <div v-show="activeTab === 'achievements'">
        <AchievementsAdminPanel
          :key="achievementsPanelKey"
          :guild-id="String(route.params.id || '')"
          :is-premium="isGuildPremium"
          :unique-max="Number(billingLimits.achievements_max ?? 5)"
          :tiers-max="Number(billingLimits.achievement_tiers_max ?? 1)"
          :tiers-enabled="hasBillingFeature('achievements_tiers')"
          @premium-upsell="openPremiumUpsell"
        />
      </div>

      <div v-show="activeTab === 'achievementsBirthday'">
        <BirthdayAdminPanel :guild-id="String(route.params.id || '')" />
      </div>

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

        <BillingPremiumGate
          :locked="!hasBillingFeature('economy_automation_advanced')"
          feature-key="economy_automation_advanced"
          :benefits="automationGateUnlockItems"
        >
        <div class="sub-card">
          <h4>{{ $t("adminGuild.automation.roleBoosters") }}</h4>
          <div class="inline">
            <EbSelect
              v-model="newRoleBooster.role_id"
              :items="toSelectItems(allRoles, { emptyLabel: $t('adminGuild.automation.selectRole') })"
              style="min-width: 200px; flex: 1 1 200px;"
            />
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
            <EbSelect
              v-model="newChannelBooster.channel_id"
              :items="toSelectItems(channels, { emptyLabel: $t('adminGuild.automation.selectChannel') })"
              style="min-width: 200px; flex: 1 1 200px;"
            />
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
        </BillingPremiumGate>

        <div class="sub-card">
          <h4>{{ $t("adminGuild.automation.exclusions") }}</h4>
          <div class="inline">
            <EbSelect
              v-model="selectedBlockedRole"
              :items="toSelectItems(allRoles, { emptyLabel: $t('adminGuild.automation.addRole') })"
              style="min-width: 200px; flex: 1 1 200px;"
            />
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
            <EbSelect
              v-model="selectedBlockedChannel"
              :items="toSelectItems(channels, { emptyLabel: $t('adminGuild.automation.addChannel') })"
              style="min-width: 200px; flex: 1 1 200px;"
            />
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

    <div v-if="showCreateShopModal" class="modal">
      <UCard class="modal-card">
        <div class="modal-head">
          <div>
            <h3>{{ $t("adminGuild.shops.createModalTitle") }}</h3>
            <p class="muted">{{ $t("adminGuild.shops.createModalSubtitle") }}</p>
          </div>
          <UButton color="neutral" variant="outline" @click="closeCreateShopModal">✕</UButton>
        </div>
        <div class="grid">
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
          <label>
            {{ $t("adminGuild.shops.requiredRolesMode") }}
            <EbSelect
              v-model="newShop.required_roles_mode"
              :items="requiredRolesModeItems"
              :disabled="!newShopRoleIds.length"
              :searchable="false"
            />
            <p class="muted" style="margin-top: 6px;">
              {{
                newShopRoleIds.length
                  ? $t("adminGuild.shops.requiredRolesModeHint")
                  : $t("adminGuild.shops.requiredRolesModeDisabledHint")
              }}
            </p>
          </label>
        </div>
        <div class="actions">
          <UButton color="neutral" variant="outline" @click="closeCreateShopModal">{{ $t("common.close") }}</UButton>
          <UButton color="primary" @click="handleCreateShopAction">{{ $t("adminGuild.shops.create") }}</UButton>
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
          <label>
            {{ $t("adminGuild.shops.requiredRolesMode") }}
            <EbSelect
              v-model="shopForm.required_roles_mode"
              :items="requiredRolesModeItems"
              :disabled="!shopSettingsRoleIds.length"
              :searchable="false"
            />
            <p class="muted" style="margin-top: 6px;">
              {{
                shopSettingsRoleIds.length
                  ? $t("adminGuild.shops.requiredRolesModeHint")
                  : $t("adminGuild.shops.requiredRolesModeDisabledHint")
              }}
            </p>
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
            <div class="shop-limit-row" style="margin-top: 8px;">
              <span class="shop-limit-pill">
                {{
                  $t("adminGuild.shops.limitsItems", {
                    current: shopItemsLimitCurrent,
                    max: shopItemsLimitMax
                  })
                }}
              </span>
            </div>
          </div>
          <UButton color="neutral" variant="outline" @click="showShopItemsModal = false">✕</UButton>
        </div>

        <div v-if="!isGuildPremium" class="premium-inline-upsell premium-inline-upsell--compact">
          <div class="premium-inline-upsell-copy">
            <p class="muted premium-inline-upsell-text">{{ $t("adminGuild.shopItems.premiumItemsHint") }}</p>
          </div>
          <UButton color="primary" size="sm" icon="i-lucide-crown" @click="openPremiumUpsell('economy_lootbox')">
            {{ $t("adminGuild.shops.premiumCta") }}
          </UButton>
        </div>

        <div class="items-grid" style="margin-bottom: 16px;">
          <div v-if="!visibleItems.length && !lockedVisibleItems.length" class="muted">{{ $t("adminGuild.shopItems.empty") }}</div>
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

        <BillingPremiumGate
          v-if="lockedVisibleItems.length"
          locked
          feature-key="premium_restore_content"
          :benefits="lockedItemUnlockItems.length ? lockedItemUnlockItems : undefined"
          class="locked-items-gate"
        >
          <div class="items-grid" style="margin-bottom: 16px;">
            <div v-for="item in lockedVisibleItems" :key="`locked-item-${item.id}`" class="item-card">
              <div class="item-head">
                <div class="item-icon"><span>📦</span></div>
                <div>
                  <div class="item-title">{{ item.name }}</div>
                  <div class="item-sub">{{ formatItemType(item.type) }}</div>
                </div>
              </div>
              <div class="item-meta">
                <span class="pill">{{ $t("adminGuild.shopItems.price") }}: {{ item.price }}</span>
              </div>
            </div>
          </div>
        </BillingPremiumGate>

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
          <UButton color="primary" @click="toggleShopItemForm">
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
                <EbSelect v-model="newItem.shopId" :items="shopSelectItems" disabled :searchable="false" />
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
                <EbSelect v-model="newItem.type" :items="shopItemTypeItems" :searchable="false" />
                <p class="muted" style="margin-top: 6px;">
                  {{ $t("adminGuild.shopItems.typeHelp") }}
                </p>
                <p v-if="!hasBillingFeature('economy_lootbox')" class="muted" style="margin-top: 6px;">
                  {{ $t("adminGuild.shopItems.lootboxPremiumHint") }}
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
                    <input
                      v-model="newItem.available_from"
                      type="datetime-local"
                      :min="shopAvailabilityMin"
                      :max="shopAvailabilityMax"
                    />
                  </label>
                  <label class="availability-field">
                    <span class="muted">{{ $t("adminGuild.shopItems.availableTo") }}</span>
                    <input
                      v-model="newItem.available_to"
                      type="datetime-local"
                      :min="shopAvailabilityMin"
                      :max="shopAvailabilityMax"
                    />
                  </label>
                </div>
                <p class="muted" style="margin-top: 6px;">
                  {{ $t("adminGuild.shopItems.availabilityHelp") }}
                  {{ $t("adminGuild.shopItems.availabilityRangeHelp") }}
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

          <BillingPremiumGate
            v-if="newItem.type === 'lootbox' && !hasBillingFeature('economy_lootbox')"
            locked
            feature-key="economy_lootbox"
            :benefits="lootboxGateUnlockItems"
          >
            <div class="form-section">
              <div class="form-section-head">
                <div>
                  <h4>{{ $t("adminGuild.shopItems.lootboxContent") }}</h4>
                  <p class="muted">{{ $t("adminGuild.shopItems.lootboxHelp") }}</p>
                </div>
              </div>
            </div>
          </BillingPremiumGate>
          <div v-else-if="newItem.type === 'lootbox'" class="form-section">
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
                    <EbSelect
                      v-model="entry.type"
                      :items="lootboxTypeOptions"
                      :searchable="false"
                      @change="onLootboxTypeChange(index)"
                    />
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
            <div class="stat-title">{{ $t("adminGuild.leaderboard.currentBalance") }}</div>
            <div class="stat-value">{{ selectedLeaderboardUser?.balance ?? 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">{{ $t("adminGuild.leaderboard.periodGains") }}</div>
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
            <EbSelect
              v-model="balanceEdit.mode"
              :items="balanceModeItems"
              :searchable="false"
              style="min-width: 160px;"
            />
            <input v-model.number="balanceEdit.amount" type="number" :placeholder="$t('adminGuild.leaderboard.amount')" />
            <UButton color="primary" :loading="balanceEdit.saving" @click="updateUserBalance">
              {{ $t("common.apply") }}
            </UButton>
          </div>
        </div>

        <div v-if="leaderboardStats" class="sub-card leaderboard-collapse">
          <button
            type="button"
            class="leaderboard-collapse-toggle"
            :aria-expanded="leaderboardDayDetailsOpen"
            @click="leaderboardDayDetailsOpen = !leaderboardDayDetailsOpen"
          >
            <span>{{ $t("adminGuild.leaderboard.byDay") }}</span>
            <UIcon
              v-if="leaderboardDayDetailsOpen"
              name="i-lucide-chevron-up"
              class="leaderboard-collapse-icon"
            />
            <UIcon
              v-else
              name="i-lucide-chevron-down"
              class="leaderboard-collapse-icon"
            />
          </button>
          <div v-show="leaderboardDayDetailsOpen" class="leaderboard-collapse-body">
            <div v-if="leaderboardStats.debug?.countAll === 0" class="muted">
              {{ $t("adminGuild.leaderboard.noGainLogs") }}
            </div>
            <div v-else-if="leaderboardStats.debug?.countRange === 0" class="muted">
              {{ $t("adminGuild.leaderboard.noLogsRange") }}
            </div>
            <div v-else-if="!(leaderboardStats.byDay || []).length" class="muted">
              {{ $t("adminGuild.leaderboard.noLogsRange") }}
            </div>
            <div v-else class="list">
              <div v-for="row in leaderboardStats.byDay" :key="row.date" class="list-row">
                <span>{{ formatDate(row.date) }}</span>
                <span>{{ row.total }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="leaderboardStats" class="sub-card leaderboard-collapse">
          <button
            type="button"
            class="leaderboard-collapse-toggle"
            :aria-expanded="leaderboardMonthDetailsOpen"
            @click="leaderboardMonthDetailsOpen = !leaderboardMonthDetailsOpen"
          >
            <span>{{ $t("adminGuild.leaderboard.byMonth") }}</span>
            <UIcon
              v-if="leaderboardMonthDetailsOpen"
              name="i-lucide-chevron-up"
              class="leaderboard-collapse-icon"
            />
            <UIcon
              v-else
              name="i-lucide-chevron-down"
              class="leaderboard-collapse-icon"
            />
          </button>
          <div v-show="leaderboardMonthDetailsOpen" class="leaderboard-collapse-body">
            <div v-if="!(leaderboardStats.byMonth || []).length" class="muted">
              {{ $t("adminGuild.leaderboard.noLogsRange") }}
            </div>
            <div v-else class="list">
              <div v-for="row in leaderboardStats.byMonth" :key="row.month" class="list-row">
                <span>{{ formatMonth(row.month) }}</span>
                <span>{{ row.total }}</span>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <div v-if="showMassBalanceModal" class="modal">
      <UCard class="modal-card" style="max-width: 560px;">
        <div class="modal-head">
          <div>
            <h3>{{ $t("adminGuild.leaderboard.bulkAddTitle") }}</h3>
            <p class="muted">{{ $t("adminGuild.leaderboard.bulkAddHelp") }}</p>
          </div>
          <UButton color="neutral" variant="outline" :disabled="massBalanceSaving" @click="showMassBalanceModal = false">✕</UButton>
        </div>
        <div class="grid">
          <label>
            {{ $t("adminGuild.leaderboard.bulkAddAmount") }}
            <input v-model.number="massBalanceAmount" type="number" min="1" step="1" :placeholder="$t('adminGuild.leaderboard.amount')" />
          </label>
          <label>
            {{ $t("adminGuild.leaderboard.bulkAddConfirmLabel") }}
            <input v-model.trim="massBalanceConfirmText" :placeholder="$t('adminGuild.leaderboard.bulkAddConfirmPlaceholder')" />
            <span class="muted small">{{ $t("adminGuild.leaderboard.bulkAddConfirmHint") }}</span>
          </label>
        </div>
        <div v-if="massBalanceStatus" class="muted" style="margin-top: 8px;">
          {{ massBalanceStatus }}
        </div>
        <div v-if="massBalanceSaving || massBalanceProgress > 0" class="mass-sync-box">
          <div class="mass-sync-row">
            <strong>{{ massBalancePhase || $t("adminGuild.leaderboard.bulkAddWorking") }}</strong>
            <span class="mass-sync-percent">{{ Math.round(massBalanceProgress) }}%</span>
          </div>
          <div
            class="mass-sync-track"
            role="progressbar"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="Math.round(massBalanceProgress)"
          >
            <div class="mass-sync-fill" :style="{ width: `${massBalanceProgress}%` }" />
          </div>
          <div v-if="massBalanceTotalMembers > 0" class="muted small">
            {{ $t("adminGuild.leaderboard.bulkAddSyncCount", { done: massBalanceSyncedMembers, total: massBalanceTotalMembers }) }}
          </div>
        </div>
        <div class="actions" style="justify-content: flex-end;">
          <UButton color="neutral" variant="outline" :disabled="massBalanceSaving" @click="showMassBalanceModal = false">
            {{ $t("common.cancel") }}
          </UButton>
          <UButton color="primary" variant="solid" :loading="massBalanceSaving" @click="confirmMassBalanceAdd">
            {{ $t("common.confirm") }}
          </UButton>
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
    <BillingPremiumGate v-model:open="premiumUpsellOpen" modal-only :feature-key="premiumUpsellFeatureKey" />

    <UModal
      v-model:open="userShopDeleteModalOpen"
      :title="userShopDeleteModalTitle"
      :description="userShopDeleteModalDescription"
    >
      <template #body>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="userShopDeleteModalOpen = false">
            {{ $t("common.cancel") }}
          </UButton>
          <UButton color="error" :loading="userShopDeleteLoading" @click="confirmDeleteAdminUserShop">
            {{ $t("adminGuild.userShops.deleteConfirmAction") }}
          </UButton>
        </div>
      </template>
    </UModal>
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
definePageMeta({
  key: (route) => `guild-${String(route.params.id || "")}`
});

const route = useRoute();
const router = useRouter();
const id = route.params.id;
const config = useRuntimeConfig();
const requestUrl = useRequestURL();
const { t, locale, setLocale } = useI18n();
const { getToken, login } = useAuth();
const guildMe = ref(null);
const managedGuildServers = ref([]);
const localeOptions = [
  { value: "fr", label: "Français", flag: "/flags/fr.svg" },
  { value: "en", label: "English", flag: "/flags/gb.svg" },
  { value: "es", label: "Español", flag: "/flags/es.svg" }
];
const selectedLocale = computed({
  get: () => locale.value,
  set: (value) => {
    if (!value) return;
    if (value !== locale.value) setLocale(value);
  }
});
const selectedLocaleItem = computed(
  () => localeOptions.find((item) => item.value === selectedLocale.value) || localeOptions[0]
);
const guildMeAvatarUrl = computed(() => {
  if (!guildMe.value?.discord_id || !guildMe.value?.avatar) return "";
  return `https://cdn.discordapp.com/avatars/${guildMe.value.discord_id}/${guildMe.value.avatar}.png`;
});

const loadManagedGuildServers = async () => {
  const token = getToken();
  if (!token) {
    managedGuildServers.value = [];
    return;
  }
  try {
    const res = await fetch(`${config.public.apiBase}/api/servers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      managedGuildServers.value = [];
      return;
    }
    const data = await res.json();
    managedGuildServers.value = (Array.isArray(data.servers) ? data.servers : [])
      .filter((server) => server?.botPresent && !server?.banned);
  } catch {
    managedGuildServers.value = [];
  }
};

const guildServerOptions = computed(() =>
  managedGuildServers.value.map((server) => {
    const isPremium = Boolean(server.billing?.isPremium);
    const planLabel = isPremium ? t("billing.status.premium") : t("billing.status.free");
    return {
      value: String(server.id),
      label: `${String(server.name || server.id)} · ${planLabel}`
    };
  })
);

const selectedGuildServerId = computed({
  get: () => String(route.params.id || ""),
  set: (nextId) => {
    const guildId = String(nextId || "").trim();
    if (!guildId || guildId === String(route.params.id || "")) return;
    const tab = activeTab.value ? `?tab=${encodeURIComponent(activeTab.value)}` : "";
    router.push(`/guild/${guildId}${tab}`);
  }
});
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

const FREE_BILLING_FALLBACK = Object.freeze({
  isPremium: false,
  planKey: "free",
  features: {
    economy_multi_shops: false,
    economy_marketplace: false,
    economy_inventory_advanced: false,
    economy_automation_advanced: false,
    economy_daily_bonus: false,
    economy_user_shops: false,
    economy_lootbox: false,
    community_leaderboard_advanced: false,
    community_logs_extended: false,
    community_message_sections: false,
    twitch_module: false,
    twitch_message_gains: true,
    games_advanced_modes: false,
    achievements_tiers: true,
    birthday_module: true,
    birthday_role_announcements: true,
    support_priority: true
  },
  limits: {
    shops_max: 1,
    shop_items_max: 6,
    achievements_max: 5,
    achievement_tiers_max: 1,
    logs_pages_max: 3,
    logs_history_days: 15,
    twitch_events_rules_max: 0,
    games_modes_max: 1
  },
  subscription: null
});
const guildBilling = ref({ ...FREE_BILLING_FALLBACK });
const billingFeatures = computed(() => guildBilling.value?.features || FREE_BILLING_FALLBACK.features);
const isGuildPremium = computed(() => Boolean(guildBilling.value?.isPremium));
const PREMIUM_NAV_TABS = Object.freeze([
  "logs",
  "shops",
  "userShops",
  "inventories",
  "automation",
  "communityMessage",
  "twitch",
  "games",
  "achievements"
]);
const showNavPremiumCrown = (tab) => !isGuildPremium.value && PREMIUM_NAV_TABS.includes(tab);
const billingLimits = computed(() => guildBilling.value?.limits || FREE_BILLING_FALLBACK.limits);
const shopsLimitMax = computed(() => Number(billingLimits.value.shops_max ?? 1));
const shopsLimitCurrent = computed(() => activeShops.value.length);
const premiumShopsLimitMax = computed(() => (isGuildPremium.value ? shopsLimitMax.value : 10));
const shopItemsLimitMax = computed(() => Number(billingLimits.value.shop_items_max ?? 6));
const shopItemsLimitCurrent = computed(() => visibleItems.value.length);
const premiumLogsHistoryDays = computed(() =>
  isGuildPremium.value ? Number(billingLimits.value.logs_history_days ?? 365) : 365
);
const billingReady = computed(() => guildBilling.value != null);
/** Fail-closed: without billing data, Premium features stay locked. */
const hasBillingFeature = (key) => Boolean(billingFeatures.value[key]);
const dailyGateUnlockItems = computed(() => [
  t("adminGuild.daily.bonus7"),
  t("adminGuild.daily.bonus14"),
  t("adminGuild.daily.bonus30")
]);
const gamesGateUnlockItems = computed(() => [
  t("adminGuild.games.dice.title"),
  t("adminGuild.games.slot.title"),
  t("adminGuild.games.roulette.title"),
  t("adminGuild.games.higherLower.title"),
  t("adminGuild.games.crash.title"),
  t("adminGuild.games.double.title"),
  t("adminGuild.games.mystery.title")
]);
const twitchGateUnlockItems = computed(() => [
  t("adminGuild.twitch.watchTitle"),
  t("adminGuild.twitch.subMultipliersTitle"),
  t("adminGuild.twitch.eventsTitle"),
  t("adminGuild.twitch.promoTitle"),
  t("adminGuild.twitch.dailyTitle"),
  t("adminGuild.twitch.commandTitle")
]);
const automationGateUnlockItems = computed(() => [
  t("adminGuild.automation.roleBoosters"),
  t("adminGuild.automation.channelBoosters")
]);
const userShopsGateUnlockItems = computed(() => [
  t("adminGuild.userShops.settingsTitle"),
  t("adminGuild.userShops.allowedTypes"),
  t("adminGuild.userShops.listTitle")
]);
const communityGateUnlockItems = computed(() =>
  communitySectionOptions.value.map((section) => section.label)
);
const premiumUpsellOpen = ref(false);
const premiumUpsellFeatureKey = ref("");
const openPremiumUpsell = (featureKey = "") => {
  premiumUpsellFeatureKey.value = String(featureKey || "");
  premiumUpsellOpen.value = true;
};
const cleanupPending = ref(null);
const lockedPremiumContent = ref(null);
const achievementsPanelKey = ref(0);

const loadGuildBilling = async () => {
  const guildId = String(route.params.id || "");
  if (!guildId) {
    guildBilling.value = { ...FREE_BILLING_FALLBACK };
    return;
  }
  try {
    const token = await getToken();
    const res = await fetch(`${config.public.apiBase}/api/guilds/${guildId}/billing`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      guildBilling.value = { ...FREE_BILLING_FALLBACK };
      return;
    }
    guildBilling.value = await res.json();
  } catch {
    guildBilling.value = { ...FREE_BILLING_FALLBACK };
  }
};

const syncGuildBillingAfterCheckout = async () => {
  if (route.query?.billing !== "success") return;
  const guildId = String(route.params.id || "");
  if (!guildId) return;
  try {
    const token = await getToken();
    const res = await fetch(`${config.public.apiBase}/api/guilds/${guildId}/billing/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data?.billing) {
      guildBilling.value = data.billing;
    }
  } catch {
    // loadGuildBilling still runs afterward
  }
};

const loadBillingCleanup = async () => {
  const guildId = String(route.params.id || "");
  if (!guildId) return;
  try {
    const token = await getToken();
    const res = await fetch(`${config.public.apiBase}/api/guilds/${guildId}/billing/cleanup`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    lockedPremiumContent.value = data.lockedContent || null;
    cleanupPending.value = null;
  } catch {
    lockedPremiumContent.value = null;
    cleanupPending.value = null;
  }
};

const activeShops = computed(() => (shops.value || []).filter((shop) => !shop.premium_locked));
const lockedShops = computed(() => (shops.value || []).filter((shop) => shop.premium_locked));
const lockedShopUnlockItems = computed(() => lockedShops.value.map((shop) => shop.name).filter(Boolean));

const GUILD_TABS = Object.freeze([
  "economy",
  "daily",
  "shops",
  "userShops",
  "inventories",
  "automation",
  "leaderboard",
  "logs",
  "communityMessage",
  "twitch",
  "games",
  "achievements",
  "achievementsBirthday",
  "bot",
  "sensitive",
  "billing"
]);
const normalizeGuildTab = (value, fallback = "economy") => {
  const tab = String(value || "").trim();
  return GUILD_TABS.includes(tab) ? tab : fallback;
};
const activeTab = ref(normalizeGuildTab(route.query?.tab, "economy"));
const syncTabQuery = (tab) => {
  const nextTab = normalizeGuildTab(tab, "economy");
  if (String(route.query?.tab || "") === nextTab) return;
  const query = { ...route.query, tab: nextTab };
  router.replace({ path: route.path, query });
};
const mobileMenuOpen = ref(false);
const adminTabLabel = computed(() => {
  const map = {
    economy: t("adminGuild.sidebar.items.overview"),
    daily: t("adminGuild.sidebar.items.daily"),
    leaderboard: t("adminGuild.sidebar.items.leaderboard"),
    shops: t("adminGuild.sidebar.items.shops"),
    userShops: t("adminGuild.sidebar.items.userShops"),
    inventories: t("adminGuild.sidebar.items.inventories"),
    automation: t("adminGuild.sidebar.items.automation"),
    logs: t("adminGuild.sidebar.items.logs"),
    communityMessage: t("adminGuild.sidebar.items.communityMessage"),
    twitch: t("adminGuild.sidebar.items.twitch"),
    games: t("adminGuild.sidebar.items.games"),
    achievements: "Succès",
    achievementsBirthday: "Anniversaire",
    bot: t("adminGuild.sidebar.items.bot"),
    sensitive: t("adminGuild.sidebar.items.sensitive"),
    billing: t("adminGuild.sidebar.items.billing")
  };
  return map[activeTab.value] || "Administration serveur";
});
const guildDisplayName = computed(() => {
  const value = String(form.name || id || "").trim();
  return value || "Serveur";
});
useHead(() => ({
  title: `${adminTabLabel.value} - ${guildDisplayName.value}`
}));
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
const botLanguage = ref("fr");
const botTimezone = ref("");
const sensitiveCommandsRoleId = ref("");
const browserTimezone = ref("UTC");
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
const timezoneSelectItems = computed(() => {
  const browser = String(browserTimezone.value || "UTC");
  const auto = { value: browser, label: autoTimezoneLabel.value };
  const rest = timezoneOptionRows.value.filter((row) => row.value !== browser);
  return [auto, ...rest];
});
const currentTimezoneLabel = computed(() => {
  const value = String(botTimezone.value || browserTimezone.value || "UTC");
  const row = timezoneSelectItems.value.find((item) => item.value === value);
  return row?.label || buildTimezoneLabel(value);
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
const userUiDisabled = ref(false);
const userUiEnabled = computed({
  get: () => !userUiDisabled.value,
  set: (value) => {
    userUiDisabled.value = !Boolean(value);
  }
});
const userUiLoaded = ref(false);
const userUiSaving = ref(false);
const loadedTabs = reactive({
  economy: false,
  daily: false,
  leaderboard: false,
  shops: false,
  userShops: false,
  inventories: false,
  automation: false,
  logs: false,
  communityMessage: false,
  twitch: false,
  games: false,
  achievements: false,
  achievementsBirthday: false,
  bot: false,
  sensitive: false
});
const userShopTypeOptions = ["inventory", "irl"];
const userShopsSettings = reactive({
  enabled: false,
  allowedTypes: ["inventory", "irl"]
});
const adminUserShops = ref([]);
const userShopsSaving = ref(false);
const userShopsStatus = ref("");
const userShopDeleteModalOpen = ref(false);
const userShopDeleteLoading = ref(false);
const userShopDeletePending = ref(null);

const userShopDeleteModalTitle = computed(() => {
  if (userShopDeletePending.value?.kind === "item") {
    return t("adminGuild.userShops.deleteItemConfirmTitle");
  }
  return t("adminGuild.userShops.deleteShopConfirmTitle");
});

const userShopDeleteModalDescription = computed(() => {
  const pending = userShopDeletePending.value;
  if (!pending) return "";
  if (pending.kind === "item") {
    return t("adminGuild.userShops.deleteItemConfirmText", {
      item: pending.item?.name || t("common.na"),
      shop: pending.shop?.name || t("common.na"),
      owner: userShopOwnerName(pending.shop)
    });
  }
  return t("adminGuild.userShops.deleteShopConfirmText", {
    shop: pending.shop?.name || t("common.na"),
    owner: userShopOwnerName(pending.shop),
    count: (pending.shop?.items || []).length
  });
});
const userShopTypeLabel = (typeKey) => {
  if (typeKey === "inventory") return t("adminGuild.userShops.typeInventory");
  if (typeKey === "irl") return t("adminGuild.userShops.typeIrl");
  return typeKey;
};
const userShopOwnerName = (shop) => {
  const ownerId = String(shop?.owner_discord_id || "");
  return leaderboardUsers.value[ownerId]?.displayName || ownerId || t("common.na");
};
const toggleUserShopAllowedType = (typeKey, checked) => {
  const set = new Set(userShopsSettings.allowedTypes || []);
  if (checked) set.add(typeKey);
  else set.delete(typeKey);
  const next = userShopTypeOptions.filter((key) => set.has(key));
  userShopsSettings.allowedTypes = next.length ? next : ["inventory"];
};
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
  if (tab === activeTab.value) return;
  if (isDirty.value) {
    pendingTab.value = tab;
    showUnsavedModal.value = true;
    return;
  }
  activeTab.value = tab;
  syncTabQuery(tab);
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
    syncTabQuery(pendingTab.value);
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
    const promoSaved = await saveTwitchPromoSettings({ notify: false });
    return automationSaved || dailySaved || promoSaved;
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
  syncTabQuery(pendingTab.value);
  mobileMenuOpen.value = false;
  pendingTab.value = null;
  loadTabData(activeTab.value);
  if (saved) {
    notifySaved();
  }
};
let leaderboardTimer = null;
let leaderboardSearchTimer = null;
let massBalanceProgressTimer = null;

const leaderboard = ref([]);
const leaderboardPage = ref(1);
const leaderboardLimit = ref(10);
const leaderboardTotal = ref(0);
const leaderboardSearch = ref("");
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
const leaderboardDayDetailsOpen = ref(false);
const leaderboardMonthDetailsOpen = ref(false);
const leaderboardPost = reactive({ channel_id: "", limit: 10, enabled: false });
const leaderboardPostStatus = ref({ status: "none", channelName: "" });
const leaderboardPostError = ref("");
const gainLogs = ref([]);
const transactionLogs = ref([]);
const gameLogs = ref([]);
const leaveLogs = ref([]);
const twitchStatus = ref({ connected: false, login: "", live: false });
const generatingDiscordInvite = ref(false);
const twitchLiveOnly = ref(true);
const twitchPromo = reactive({
  enabled: false,
  template: "",
  discordUrl: "",
  onFollow: true,
  onFirstMessage: true,
  remindUnlinked: true,
  defaultTemplate: "",
  placeholders: [
    { tag: "{user}", label: "Pseudo Twitch de la personne concernée (login, pas Discord)" },
    { tag: "{pseudo}", label: "Identique à {user}" },
    { tag: "{discord}", label: "Lien d’invitation Discord" },
    { tag: "{invite}", label: "Identique à {discord}" },
    { tag: "{currency}", label: "Nom de la monnaie du serveur" },
    { tag: "{money}", label: "Identique à {currency}" },
    { tag: "{link}", label: "Lien court de liaison Discord ↔ Twitch" },
    { tag: "{channel}", label: "Pseudo de la chaîne Twitch connectée" }
  ]
});
const twitchPromoPlaceholders = computed(() => {
  const rows = Array.isArray(twitchPromo.placeholders) ? twitchPromo.placeholders : [];
  if (!rows.length) {
    return [
      { tag: "{user}", label: "Pseudo Twitch de la personne concernée (login, pas Discord)" },
      { tag: "{pseudo}", label: "Identique à {user}" },
      { tag: "{discord}", label: "Lien d’invitation Discord" },
      { tag: "{invite}", label: "Identique à {discord}" },
      { tag: "{currency}", label: "Nom de la monnaie du serveur" },
      { tag: "{money}", label: "Identique à {currency}" },
      { tag: "{link}", label: "Lien court de liaison Discord ↔ Twitch" },
      { tag: "{channel}", label: "Pseudo de la chaîne Twitch connectée" }
    ];
  }
  return rows.map((row) => {
    if (typeof row === "string") return { tag: row, label: row };
    return {
      tag: String(row?.tag || ""),
      label: String(row?.label || row?.tag || "")
    };
  }).filter((row) => row.tag);
});
const shopAvailabilityMin = computed(() => formatDateTimeLocalBound(new Date()));
const shopAvailabilityMax = computed(() => {
  const max = new Date();
  max.setFullYear(max.getFullYear() + 5);
  return formatDateTimeLocalBound(max);
});

const formatDateTimeLocalBound = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseShopAvailabilityInput = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  if (year < 2000 || year > 2100) return null;
  return date;
};

const validateShopAvailabilityDates = () => {
  const fromRaw = String(newItem.available_from || "").trim();
  const toRaw = String(newItem.available_to || "").trim();
  if (!fromRaw && !toRaw) return true;

  const minDate = new Date(shopAvailabilityMin.value);
  const maxDate = new Date(shopAvailabilityMax.value);
  const fromDate = fromRaw ? parseShopAvailabilityInput(fromRaw) : null;
  const toDate = toRaw ? parseShopAvailabilityInput(toRaw) : null;

  if (fromRaw && !fromDate) {
    alert(t("adminGuild.shopItems.errors.availabilityInvalid"));
    return false;
  }
  if (toRaw && !toDate) {
    alert(t("adminGuild.shopItems.errors.availabilityInvalid"));
    return false;
  }
  if (fromDate && fromDate < minDate) {
    alert(t("adminGuild.shopItems.errors.availabilityFromPast"));
    return false;
  }
  if (toDate && toDate < minDate) {
    alert(t("adminGuild.shopItems.errors.availabilityToPast"));
    return false;
  }
  if (fromDate && fromDate > maxDate) {
    alert(t("adminGuild.shopItems.errors.availabilityTooFar"));
    return false;
  }
  if (toDate && toDate > maxDate) {
    alert(t("adminGuild.shopItems.errors.availabilityTooFar"));
    return false;
  }
  if (fromDate && toDate && fromDate > toDate) {
    alert(t("adminGuild.shopItems.errors.availabilityRangeInvalid"));
    return false;
  }
  return true;
};

const generateDiscordInvite = async () => {
  generatingDiscordInvite.value = true;
  try {
    const token = getToken();
    const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/discord-invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (await handleActionFailure(res, {
      genericMessage: t("adminGuild.twitch.promoDiscordGenerateError")
    })) return;
    const data = await res.json();
    if (data?.invite?.url) {
      twitchPromo.discordUrl = String(data.invite.url);
    }
  } finally {
    generatingDiscordInvite.value = false;
  }
};

const twitchPromoPreview = computed(() => {
  const currency = String(form.name || "Economy");
  const login = String(twitchStatus.value.login || "channel");
  const user = "Viewer";
  const discord = String(twitchPromo.discordUrl || "https://discord.gg/votre-serveur").trim();
  const siteBase = String(config.public.baseUrl || config.public.apiBase || "https://ecoboty.eu").replace(/\/$/, "");
  const link = `${siteBase}/l/${id}/${String(user).toLowerCase()}`;
  let text = String(twitchPromo.template || twitchPromo.defaultTemplate || "");
  const vars = {
    user,
    pseudo: user,
    discord,
    invite: discord,
    currency,
    money: currency,
    link,
    channel: login
  };
  Object.entries(vars).forEach(([name, value]) => {
    text = text.replace(new RegExp(`\\{${name}\\}`, "gi"), String(value));
  });
  return text || "—";
});
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
const communityMessageMessageIds = ref([]);
const communityMessagePreview = ref("");
const communityMessagePreviewLength = ref(0);
const communityMessageLoading = ref(false);
const communityMessagePreviewing = ref(false);
const communityMessageSending = ref(false);
const communityMessageUpdating = ref(false);
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
  if (logsCategoryTab.value === "leaves") return t("adminGuild.logs.headings.leaves");
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
  if (logsCategoryTab.value === "leaves") {
    return t("adminGuild.logs.descriptions.leaves");
  }
  if (logsCategoryTab.value === "linked") {
    return t("adminGuild.logs.descriptions.linked");
  }
  return t("adminGuild.logs.descriptions.gains");
});

const logsSearchPlaceholder = computed(() => {
  if (logsCategoryTab.value === "transactions") return t("adminGuild.logs.searchPlaceholders.transactions");
  if (logsCategoryTab.value === "games") return t("adminGuild.logs.searchPlaceholders.games");
  if (logsCategoryTab.value === "leaves") return t("adminGuild.logs.searchPlaceholders.leaves");
  return t("adminGuild.logs.searchPlaceholders.gains");
});
const balanceEdit = reactive({ amount: 0, saving: false, mode: "set" });
const showMassBalanceModal = ref(false);
const massBalanceAmount = ref(0);
const massBalanceConfirmText = ref("");
const massBalanceStatus = ref("");
const massBalanceSaving = ref(false);
const massBalanceProgress = ref(0);
const massBalancePhase = ref("");
const massBalanceSyncedMembers = ref(0);
const massBalanceTotalMembers = ref(0);
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
const newShop = reactive({ name: "", discount_percent: 0, required_roles_mode: "all" });
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
const showCreateShopModal = ref(false);
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
  required_roles_mode: "all",
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

watch(
  () => newShopRoleIds.value.length,
  (count) => {
    if (!count) newShop.required_roles_mode = "all";
  }
);

watch(
  () => shopSettingsRoleIds.value.length,
  (count) => {
    if (!count) shopForm.required_roles_mode = "all";
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
  botLanguage.value = data.settings?.bot_language || "fr";
  botTimezone.value = data.settings?.timezone || browserTimezone.value;
  sensitiveCommandsRoleId.value = data.settings?.sensitive_commands_role_id || "";
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
      timezone: botTimezone.value || browserTimezone.value,
      sensitive_commands_role_id: sensitiveCommandsRoleId.value || null
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
  const field = event.target?.closest?.(".emoji-field");
  if (showEmojiPicker.value && !field) {
    showEmojiPicker.value = false;
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

const toSelectItems = (rows = [], { valueKey = "id", labelKey = "name", emptyLabel, emptyValue = "" } = {}) => {
  const items = [];
  if (emptyLabel != null) items.push({ label: emptyLabel, value: emptyValue });
  for (const row of rows) {
    items.push({
      label: String(row?.[labelKey] ?? ""),
      value: String(row?.[valueKey] ?? "")
    });
  }
  return items;
};

const logsSortItems = computed(() => {
  const items = [
    { label: t("adminGuild.logs.sort.date"), value: "date" },
    { label: t("adminGuild.logs.sort.amount"), value: "amount" },
    { label: t("adminGuild.logs.sort.user"), value: "user" }
  ];
  if (logsCategoryTab.value === "gains") {
    items.push({ label: t("adminGuild.logs.sort.source"), value: "source" });
  } else {
    items.push({ label: t("adminGuild.logs.sort.type"), value: "type" });
  }
  return items;
});

const logsOrderItems = computed(() => [
  { label: t("adminGuild.logs.orderDesc"), value: "desc" },
  { label: t("adminGuild.logs.orderAsc"), value: "asc" }
]);

const logsLimitItems = [
  { label: "20", value: 20 },
  { label: "50", value: 50 },
  { label: "100", value: 100 }
];

const leaderboardLimitItems = [
  { label: "Top 5", value: 5 },
  { label: "Top 10", value: 10 },
  { label: "Top 15", value: 15 },
  { label: "Top 20", value: 20 }
];

const crashSpeedItems = computed(() => [
  { label: t("adminGuild.games.crash.speedSlow"), value: "slow" },
  { label: t("adminGuild.games.crash.speedNormal"), value: "normal" },
  { label: t("adminGuild.games.crash.speedFast"), value: "fast" }
]);

const requiredRolesModeItems = computed(() => [
  { label: t("adminGuild.shops.requiredRolesModeAll"), value: "all" },
  { label: t("adminGuild.shops.requiredRolesModeAny"), value: "any" }
]);

const shopItemTypeItems = computed(() => {
  const items = [
    { label: `🎭 ${t("adminGuild.shopItems.typeRole")}`, value: "role" },
    { label: `⏳ ${t("adminGuild.shopItems.typeTempRole")}`, value: "temp_role" },
    { label: `🎒 ${t("adminGuild.shopItems.typeInventory")}`, value: "inventory" },
    { label: `📦 ${t("adminGuild.shopItems.typeIrl")}`, value: "irl" }
  ];
  if (hasBillingFeature("economy_lootbox")) {
    items.push({ label: `🎁 ${t("adminGuild.shopItems.typeLootbox")}`, value: "lootbox" });
  }
  return items;
});
const lootboxGateUnlockItems = computed(() => [
  t("adminGuild.shopItems.typeLootbox"),
  t("billing.gate.features.economy_lootbox.benefits.0")
].filter(Boolean));

const balanceModeItems = computed(() => [
  { label: t("adminGuild.leaderboard.balanceSet"), value: "set" },
  { label: t("adminGuild.leaderboard.balanceAdd"), value: "add" },
  { label: t("adminGuild.leaderboard.balanceRemove"), value: "remove" }
]);

const shopSelectItems = computed(() =>
  (shops.value || []).map((shop) => ({ label: shop.name, value: String(shop.id) }))
);

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

const filteredLeaveLogs = computed(() => {
  const search = String(logsSearch.value || "").toLowerCase();
  const from = parseDateBoundaryInTimeZone(logsDateFrom.value, false);
  const to = parseDateBoundaryInTimeZone(logsDateTo.value, true);
  const userFilter = logsFilterUserId.value ? String(logsFilterUserId.value) : "";

  return (leaveLogs.value || []).filter((log) => {
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
      const userName = formatLeaveUserName(log);
      const inventoryNames = Array.isArray(data.inventory)
        ? data.inventory.map((row) => String(row?.name || "")).join(" ")
        : "";
      const haystack = `${userName} ${userId} ${inventoryNames} ${getLeaveBalance(log)}`.toLowerCase();
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
  (leaveLogs.value || []).forEach((log) => ids.add(String(log.user_discord_id)));
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

const sortedLeaveLogs = computed(() => {
  const list = [...filteredLeaveLogs.value];
  const dir = logsSortDir.value === "asc" ? 1 : -1;
  const key = normalizedSortKey.value;
  return list.sort((a, b) => {
    if (key === "amount") {
      return (getLeaveBalance(a) - getLeaveBalance(b)) * dir;
    }
    if (key === "user") {
      return String(formatLeaveUserName(a)).localeCompare(String(formatLeaveUserName(b))) * dir;
    }
    return ((parseDateTimeValue(a.created_at)?.getTime() || 0) - (parseDateTimeValue(b.created_at)?.getTime() || 0)) * dir;
  });
});

const currentLogRows = computed(() => {
  if (logsCategoryTab.value === "transactions") return sortedTransactionLogs.value;
  if (logsCategoryTab.value === "games") return sortedGameLogs.value;
  if (logsCategoryTab.value === "leaves") return sortedLeaveLogs.value;
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

const getLeaveData = (log) => parseEventData(log?.data);

const getLeaveBalance = (log) => {
  const data = getLeaveData(log);
  const fromData = Number(data.balance);
  if (Number.isFinite(fromData)) return fromData;
  return Number(log?.amount || 0);
};

const getLeaveInventoryQty = (log) => {
  const data = getLeaveData(log);
  const qty = Number(data.inventoryTotalQty);
  if (Number.isFinite(qty)) return qty;
  const inventory = Array.isArray(data.inventory) ? data.inventory : [];
  return inventory.reduce((sum, row) => sum + Number(row?.quantity || 0), 0);
};

const formatLeaveUserName = (log) => {
  const userId = String(log?.user_discord_id || "");
  const data = getLeaveData(log);
  return (
    leaderboardUsers.value[userId]?.displayName ||
    data.displayName ||
    data.username ||
    userId ||
    t("common.na")
  );
};

const formatLeaveInventorySummary = (log) => {
  const data = getLeaveData(log);
  const types = Number(data.inventoryItemCount);
  const qty = getLeaveInventoryQty(log);
  if (Number.isFinite(types) && types >= 0) {
    return t("adminGuild.logs.leaveInventorySummary", { qty, types });
  }
  const inventory = Array.isArray(data.inventory) ? data.inventory : [];
  return t("adminGuild.logs.leaveInventorySummary", { qty, types: inventory.length });
};

const formatLeaveInventoryDetails = (log) => {
  const data = getLeaveData(log);
  const inventory = Array.isArray(data.inventory) ? data.inventory : [];
  if (!inventory.length) return t("adminGuild.logs.leaveInventoryEmpty");
  const preview = inventory
    .slice(0, 4)
    .map((row) => `${row?.name || "?"} ×${Number(row?.quantity || 0)}`)
    .join(", ");
  if (inventory.length > 4) {
    return `${preview} (+${inventory.length - 4})`;
  }
  return preview;
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
  } else if (showCreateShopModal.value) {
    if (!newShopRoleIds.value.map(String).includes(id)) {
      newShopRoleIds.value = [...newShopRoleIds.value, id];
    }
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
  const search = String(leaderboardSearch.value || "").trim();
  const params = new URLSearchParams({
    guildId: String(id),
    page: String(page),
    limit: String(limit),
    minBalance: "1",
    ts: String(Date.now())
  });
  if (search) {
    params.set("search", search);
  }
  const res = await fetch(
    `${config.public.apiBase}/api/economy/leaderboard?${params.toString()}`,
    {
      cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`
    }
    }
  );
  if (handleUnauthorized(res)) return;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    leaderboard.value = [];
    leaderboardTotal.value = 0;
    leaderboardPage.value = 1;
    return;
  }
  leaderboard.value = data.leaderboard || [];
  leaderboardTotal.value = Number(data.total || 0);
  leaderboardLimit.value = Number(data.limit || limit);
  leaderboardPage.value = Number(data.page || page || 1);
  seedLeaderboardUsersFromRows(leaderboard.value);
  await resolveLeaderboardUsers();
  await loadLeaderboardSummary();
};

const queueLeaderboardSearch = () => {
  if (leaderboardSearchTimer) {
    clearTimeout(leaderboardSearchTimer);
    leaderboardSearchTimer = null;
  }
  leaderboardSearchTimer = setTimeout(async () => {
    leaderboardPage.value = 1;
    await loadLeaderboard({ page: 1 });
    leaderboardSearchTimer = null;
  }, 260);
};

const clearLeaderboardSearch = async () => {
  if (!leaderboardSearch.value) return;
  if (leaderboardSearchTimer) {
    clearTimeout(leaderboardSearchTimer);
    leaderboardSearchTimer = null;
  }
  leaderboardSearch.value = "";
  leaderboardPage.value = 1;
  await loadLeaderboard({ page: 1 });
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
        .filter((value) => /^\d{5,22}$/.test(value))
    )
  );
  const missing = unique.filter((userId) => {
    const entry = leaderboardUsers.value[userId];
    if (!entry) return true;
    if (entry.resolved === true || entry.notFound === true) return false;
    return true;
  });
  if (!missing.length) return;

  const token = getToken();
  // Small chunks reduce Discord pressure when many tabs resolve at once.
  const chunkSize = 8;
  const chunks = [];
  for (let i = 0; i < missing.length; i += chunkSize) {
    chunks.push(missing.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userIds: chunk })
    });
    if (!res.ok) continue;
    const data = await res.json().catch(() => ({}));
    const users = data.users || {};
    const normalized = {};
    for (const userId of chunk) {
      const profile = users[userId] || users[String(userId)] || null;
      const key = String(userId);
      const previous = leaderboardUsers.value[key] || {};
      const displayName = String(
        profile?.displayName || profile?.username || previous.displayName || key
      ).trim();
      const username = String(profile?.username || previous.username || "").trim();
      const notFound = Boolean(profile?.notFound);
      const ok = Boolean(profile?.ok) || (displayName && displayName !== key && !/^\d{16,22}$/.test(displayName));
      const retryable = profile?.source === "retry" || (!ok && !notFound && Boolean(profile));
      normalized[key] = {
        displayName: displayName || key,
        username,
        avatar: profile?.avatar || previous.avatar || "",
        notFound,
        resolved: ok || notFound || (attempt >= 4 && !retryable),
        source: profile?.source || previous.source || ""
      };
    }
    leaderboardUsers.value = { ...leaderboardUsers.value, ...normalized };
  }

  if (attempt >= 4) return;
  const unresolved = missing.filter((userId) => {
    const entry = leaderboardUsers.value[userId];
    return !entry || (entry.resolved !== true && entry.notFound !== true);
  });
  if (!unresolved.length) return;
  await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  await resolveUserIds(unresolved, attempt + 1);
};

const seedLeaderboardUsersFromRows = (rows) => {
  const seed = {};
  for (const row of rows || []) {
    const userId = String(row?.userId || "").trim();
    if (!userId) continue;
    const existing = leaderboardUsers.value[userId];
    if (existing?.resolved === true || existing?.notFound === true) continue;
    const username = String(row?.username || existing?.username || "").trim();
    const rawDisplay = String(row?.displayName || username || "").trim();
    const usableName =
      rawDisplay && rawDisplay !== userId && !/^\d{16,22}$/.test(rawDisplay) ? rawDisplay : "";
    seed[userId] = {
      displayName: usableName || existing?.displayName || userId,
      username: username && username !== userId ? username : existing?.username || "",
      avatar: existing?.avatar || row?.avatar || "",
      resolved: Boolean(usableName),
      notFound: false,
      source: usableName ? "db" : "pending"
    };
  }
  if (Object.keys(seed).length) {
    leaderboardUsers.value = { ...leaderboardUsers.value, ...seed };
  }
};

const leaderboardDisplayName = (row) => {
  const userId = String(row?.userId || "").trim();
  return (
    leaderboardUsers.value[userId]?.displayName ||
    row?.displayName ||
    row?.username ||
    userId ||
    t("common.na")
  );
};

const resolveLeaderboardUsers = async () => {
  const ids = (leaderboard.value || []).map((row) => String(row.userId || "").trim()).filter(Boolean);
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
  if (handleUnauthorized(res)) return;
  if (!res.ok) return;
  const data = await parseJsonSafe(res, {});
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
  if (handleUnauthorized(res)) return;
  if (!res.ok) return;
  const data = await parseJsonSafe(res, {});
  leaderboardPostStatus.value = {
    status: data.status || "none",
    channelName: data.channelName || ""
  };
};

const saveLeaderboardPost = async () => {
  const token = getToken();
  leaderboardPostError.value = "";
  if (leaderboardPostStatus.value.status === "none") {
    const deleteRes = await fetch(`${config.public.apiBase}/api/guilds/${id}/leaderboard-post`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (await handleActionFailure(deleteRes, {
      genericMessage: "Impossible de supprimer l'ancien classement."
    })) return;
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
  if (handleUnauthorized(res)) return;
  if (!res.ok) {
    const data = await parseJsonSafe(res, {});
    if (data.error === "leaderboard_already_exists") {
      leaderboardPostError.value = "Un seul leaderboard possible";
    } else {
      leaderboardPostError.value = "Impossible de sauvegarder ce classement.";
    }
    return;
  }
  const sendRes = await fetch(`${config.public.apiBase}/api/guilds/${id}/leaderboard-post/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (await handleActionFailure(sendRes, {
    genericMessage: "Impossible d'envoyer le message de classement."
  })) return;
  await loadLeaderboardPostStatus();
  notifySaved();
};

const deleteLeaderboardPost = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/leaderboard-post`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (await handleActionFailure(res, {
    genericMessage: "Impossible de supprimer le classement."
  })) return;
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

const loadLeaveLogs = async () => {
  const token = getToken();
  const params = new URLSearchParams({
    guildId: id,
    limit: String(getLogsFetchLimit())
  });
  const res = await fetch(`${config.public.apiBase}/api/economy/leaves?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  applyTimeZoneFromApi(data.timeZone);
  leaveLogs.value = (data.logs || []).map((row) => ({
    ...row,
    data: parseEventData(row.data)
  }));
  // Prefer snapshot names from leave payload for users who already left.
  const snapshotUsers = {};
  leaveLogs.value.forEach((log) => {
    const userId = String(log.user_discord_id || "");
    const payload = parseEventData(log.data);
    if (!userId || !payload.displayName) return;
    if (leaderboardUsers.value[userId]?.displayName) return;
    snapshotUsers[userId] = {
      displayName: String(payload.displayName),
      username: String(payload.username || ""),
      avatar: leaderboardUsers.value[userId]?.avatar || ""
    };
  });
  if (Object.keys(snapshotUsers).length) {
    leaderboardUsers.value = { ...leaderboardUsers.value, ...snapshotUsers };
  }
  const ids = (leaveLogs.value || []).map((log) => log.user_discord_id);
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
  if (logsCategoryTab.value === "leaves") {
    await loadLeaveLogs();
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
  if (handleUnauthorized(res)) {
    communityMessageLoading.value = false;
    return;
  }
  if (res.ok) {
    const data = await parseJsonSafe(res, {});
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
    communityMessageMessageIds.value = Array.isArray(settings.message_ids)
      ? settings.message_ids.map(String).filter(Boolean)
      : settings.message_id
        ? [String(settings.message_id)]
        : [];
  }
  communityMessageLoading.value = false;
  loadedTabs.communityMessage = true;
  scheduleCommunityPreview();
};

const previewCommunityMessage = async () => {
  communityMessagePreviewing.value = true;
  communityMessageStatus.value = "";
  await loadRolesOnce();
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/community-message/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(buildCommunityMessagePayload())
  });
  if (handleUnauthorized(res)) {
    communityMessagePreviewing.value = false;
    return;
  }
  if (res.ok) {
    const data = await parseJsonSafe(res, {});
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
  if (handleUnauthorized(res)) {
    communityMessageSending.value = false;
    return;
  }
  if (res.ok) {
    const data = await parseJsonSafe(res, {});
    communityMessageMessageId.value = data.messageId || null;
    communityMessageMessageIds.value = Array.isArray(data.messageIds)
      ? data.messageIds.map(String).filter(Boolean)
      : data.messageId
        ? [String(data.messageId)]
        : [];
    communityMessageStatus.value = t("adminGuild.communityMessage.sendSuccess");
  } else {
    const data = await parseJsonSafe(res, {});
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

const updateCommunityMessage = async () => {
  if (!communityMessageChannelId.value || !communityMessageMessageId.value) return;
  communityMessageUpdating.value = true;
  communityMessageStatus.value = "";
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/community-message/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(buildCommunityMessagePayload())
  });
  if (handleUnauthorized(res)) {
    communityMessageUpdating.value = false;
    return;
  }
  if (res.ok) {
    const data = await parseJsonSafe(res, {});
    if (data.messageId) communityMessageMessageId.value = data.messageId;
    communityMessageMessageIds.value = Array.isArray(data.messageIds)
      ? data.messageIds.map(String).filter(Boolean)
      : data.messageId
        ? [String(data.messageId)]
        : communityMessageMessageIds.value;
    communityMessageStatus.value = t("adminGuild.communityMessage.updateSuccess");
  } else {
    const data = await parseJsonSafe(res, {});
    if (data.error === "message_too_long") {
      communityMessageStatus.value = t("adminGuild.communityMessage.tooLong");
    } else {
      communityMessageStatus.value = t("adminGuild.communityMessage.updateError");
    }
  }
  communityMessageUpdating.value = false;
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
  if (handleUnauthorized(res)) {
    communityMessageDeleting.value = false;
    return;
  }
  if (res.ok) {
    communityMessageMessageId.value = null;
    communityMessageMessageIds.value = [];
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

watch(
  () => [billingReady.value, billingFeatures.value.community_message_sections],
  ([ready, enabled]) => {
    if (!ready || enabled) return;
    communityMessageSections.value = communitySectionOptions.value.map((section) => section.key);
  },
  { immediate: true }
);

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

const formatCommunityPreview = (raw) => {
  const fallback = t("adminGuild.communityMessage.previewEmpty");
  const content = String(raw || "").trim();
  if (!content) return "";
  return renderDiscordMarkdown(content, {
    roleName,
    channelName,
    emojiMap
  }) || fallback;
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
  leaderboardDayDetailsOpen.value = false;
  leaderboardMonthDetailsOpen.value = false;
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

const openMassBalanceModal = () => {
  showMassBalanceModal.value = true;
  massBalanceAmount.value = 0;
  massBalanceConfirmText.value = "";
  massBalanceStatus.value = "";
  massBalanceProgress.value = 0;
  massBalancePhase.value = "";
  massBalanceSyncedMembers.value = 0;
  massBalanceTotalMembers.value = 0;
};

const stopMassBalanceProgress = () => {
  if (massBalanceProgressTimer) {
    clearInterval(massBalanceProgressTimer);
    massBalanceProgressTimer = null;
  }
};

const startMassBalanceProgress = () => {
  stopMassBalanceProgress();
  massBalanceProgress.value = Math.max(8, massBalanceProgress.value);
  massBalanceProgressTimer = setInterval(() => {
    if (massBalanceProgress.value >= 82) return;
    const step = massBalanceProgress.value < 40 ? 7 : 3;
    massBalanceProgress.value = Math.min(82, massBalanceProgress.value + step);
  }, 220);
};

const confirmMassBalanceAdd = async () => {
  const amount = Number(massBalanceAmount.value || 0);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    massBalanceStatus.value = t("adminGuild.leaderboard.bulkAddInvalidAmount");
    return;
  }
  if (String(massBalanceConfirmText.value || "").trim().toUpperCase() !== "YES") {
    massBalanceStatus.value = t("adminGuild.leaderboard.bulkAddConfirmHint");
    return;
  }
  massBalanceSaving.value = true;
  massBalanceProgress.value = 10;
  massBalancePhase.value = t("adminGuild.leaderboard.bulkAddPhaseApply");
  massBalanceStatus.value = t("adminGuild.leaderboard.bulkAddWorking");
  massBalanceSyncedMembers.value = 0;
  massBalanceTotalMembers.value = 0;
  startMassBalanceProgress();

  const token = getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300000);

  try {
    const res = await fetch(`${config.public.apiBase}/api/economy/all-balances/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        guildId: id,
        amount
      }),
      signal: controller.signal
    });
    if (handleUnauthorized(res)) {
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || t("adminGuild.leaderboard.bulkAddError"));
    }

    const synced = Number(data?.affected || 0);
    massBalanceSyncedMembers.value = synced;
    massBalanceTotalMembers.value = synced;
    massBalancePhase.value = t("adminGuild.leaderboard.bulkAddPhaseRefresh");
    massBalanceStatus.value = t("adminGuild.leaderboard.bulkAddSyncCount", {
      done: synced,
      total: synced
    });
    massBalanceProgress.value = Math.max(massBalanceProgress.value, 86);

    const refreshTasks = [loadLeaderboard(), loadLeaderboardSummary(), loadGainLogs()];
    if (showLeaderboardModal.value && selectedLeaderboardUser.value) {
      refreshTasks.push(loadLeaderboardUserStats());
    }
    const refreshResults = await Promise.allSettled(refreshTasks);
    const refreshFailed = refreshResults.some((result) => result.status === "rejected");

    massBalancePhase.value = t("adminGuild.leaderboard.bulkAddPhaseDone");
    massBalanceStatus.value = refreshFailed
      ? t("adminGuild.leaderboard.bulkAddRefreshWarning")
      : t("adminGuild.leaderboard.bulkAddSyncCount", {
          done: synced,
          total: synced
        });
    massBalanceProgress.value = 100;

    await new Promise((resolve) => setTimeout(resolve, 350));
    showMassBalanceModal.value = false;
    notifySaved(
      refreshFailed
        ? t("adminGuild.leaderboard.bulkAddSuccessRefreshWarning", {
            amount: Number(data?.amount || amount),
            members: synced,
            total: Number(data?.totalAdded || 0)
          })
        : t("adminGuild.leaderboard.bulkAddSuccess", {
            amount: Number(data?.amount || amount),
            members: synced,
            total: Number(data?.totalAdded || 0)
          })
    );
  } catch (error) {
    massBalanceStatus.value = error?.name === "AbortError"
      ? t("adminGuild.leaderboard.bulkAddTimeout")
      : error?.message === "Failed to fetch"
        ? t("adminGuild.leaderboard.bulkAddNetworkError")
        : error?.message || t("adminGuild.leaderboard.bulkAddError");
  } finally {
    clearTimeout(timeout);
    stopMassBalanceProgress();
    massBalanceSaving.value = false;
  }
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
  if (handleUnauthorized(res)) return;
  if (!res.ok) {
    shops.value = [];
    return;
  }
  const data = await parseJsonSafe(res, {});
  shops.value = data.shops || [];
  if (!newItem.shopId && shops.value.length) {
    newItem.shopId = String(shops.value[0].id);
  }
};

const loadAdminUserShops = async () => {
  const token = getToken();
  const [settingsRes, listRes] = await Promise.all([
    fetch(`${config.public.apiBase}/api/guilds/${id}/user-shops/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch(`${config.public.apiBase}/api/guilds/${id}/user-shops`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  ]);
  if (handleUnauthorized(settingsRes) || handleUnauthorized(listRes)) return;
  const settingsData = settingsRes.ok ? await parseJsonSafe(settingsRes, {}) : {};
  const listData = listRes.ok ? await parseJsonSafe(listRes, {}) : {};
  userShopsSettings.enabled = Boolean(settingsData.settings?.enabled);
  userShopsSettings.allowedTypes = Array.isArray(settingsData.settings?.allowedTypes)
    ? settingsData.settings.allowedTypes.filter((entry) => userShopTypeOptions.includes(entry))
    : ["inventory", "irl"];
  if (!userShopsSettings.allowedTypes.length) userShopsSettings.allowedTypes = ["inventory", "irl"];
  adminUserShops.value = listData.shops || [];
  const ownerIds = adminUserShops.value.map((shop) => shop.owner_discord_id).filter(Boolean);
  await resolveUserIds(ownerIds);
};

const saveUserShopsSettings = async () => {
  userShopsSaving.value = true;
  userShopsStatus.value = "";
  try {
    const token = getToken();
    const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/user-shops/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        enabled: Boolean(userShopsSettings.enabled),
        allowedTypes: userShopsSettings.allowedTypes
      })
    });
    if (handleUnauthorized(res)) return;
    if (!res.ok) {
      userShopsStatus.value = t("adminGuild.userShops.saveError");
      return;
    }
    const data = await parseJsonSafe(res, {});
    userShopsSettings.enabled = Boolean(data.settings?.enabled);
    userShopsSettings.allowedTypes = Array.isArray(data.settings?.allowedTypes)
      ? data.settings.allowedTypes
      : ["inventory"];
    userShopsStatus.value = t("adminGuild.userShops.saved");
    await loadAdminUserShops();
  } finally {
    userShopsSaving.value = false;
  }
};

const requestDeleteAdminUserShop = (shop) => {
  if (!shop?.id) return;
  userShopDeletePending.value = { kind: "shop", shop };
  userShopDeleteModalOpen.value = true;
};

const requestDeleteAdminUserShopItem = (shop, item) => {
  if (!shop?.id || !item?.id) return;
  userShopDeletePending.value = { kind: "item", shop, item };
  userShopDeleteModalOpen.value = true;
};

const confirmDeleteAdminUserShop = async () => {
  const pending = userShopDeletePending.value;
  if (!pending?.shop?.id) return;
  userShopDeleteLoading.value = true;
  try {
    if (pending.kind === "item" && pending.item?.id) {
      await deleteAdminUserShopItem(pending.shop, pending.item);
    } else {
      await deleteAdminUserShop(pending.shop);
    }
    userShopDeleteModalOpen.value = false;
    userShopDeletePending.value = null;
  } finally {
    userShopDeleteLoading.value = false;
  }
};

const deleteAdminUserShop = async (shop) => {
  if (!shop?.id) return;
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/user-shops/${shop.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (handleUnauthorized(res)) return;
  if (res.ok) await loadAdminUserShops();
};

const deleteAdminUserShopItem = async (shop, item) => {
  if (!shop?.id || !item?.id) return;
  const token = getToken();
  const res = await fetch(
    `${config.public.apiBase}/api/guilds/${id}/user-shops/${shop.id}/items/${item.id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  if (handleUnauthorized(res)) return;
  if (res.ok) await loadAdminUserShops();
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
  if (handleUnauthorized(res)) return;
  if (!res.ok) return;
  const data = await parseJsonSafe(res, {});
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
  if (handleUnauthorized(res)) return;
  if (!res.ok) return;
  const data = await parseJsonSafe(res, {});
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
  if (handleUnauthorized(res)) return;
  if (!res.ok) return;
  const data = await parseJsonSafe(res, {});
  const settings = data.settings || {};
  twitchDaily.enabled = settings.enabled !== false;
  twitchDaily.dailyAmount = Number(settings.daily_amount || 0);
  twitchDaily.streak7 = Number(settings.streak_7_bonus_percent || 0);
  twitchDaily.streak14 = Number(settings.streak_14_bonus_percent || 0);
  twitchDaily.streak30 = Number(settings.streak_30_bonus_percent || 0);
};

const loadTwitchPromoSettings = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/twitch/promo`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (handleUnauthorized(res)) return;
  if (!res.ok) return;
  const data = await parseJsonSafe(res, {});
  const settings = data.settings || {};
  twitchPromo.enabled = Boolean(settings.enabled);
  twitchPromo.template = String(settings.template || settings.defaultTemplate || "");
  twitchPromo.discordUrl = String(settings.discordUrl || "");
  twitchPromo.onFollow = settings.onFollow !== false;
  twitchPromo.onFirstMessage = settings.onFirstMessage !== false;
  twitchPromo.remindUnlinked = settings.remindUnlinked !== false;
  twitchPromo.defaultTemplate = String(settings.defaultTemplate || "");
  twitchPromo.placeholders = Array.isArray(settings.placeholders)
    ? settings.placeholders
    : twitchPromo.placeholders;
};

const insertTwitchPromoTag = (tag) => {
  const value = String(tag || "");
  if (!value) return;
  twitchPromo.template = `${String(twitchPromo.template || "").trimEnd()} ${value}`.trim();
};

const resetTwitchPromoTemplate = () => {
  twitchPromo.template = String(twitchPromo.defaultTemplate || "");
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
  if (!res.ok) return;
  const data = await parseJsonSafe(res, {});
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
  if (!res.ok) return;
  const data = await parseJsonSafe(res, {});
  twitchStatus.value = {
    connected: Boolean(data.connected),
    login: data.login || "",
    live: Boolean(data.live)
  };
  twitchLiveOnly.value = data.live_only !== false;
};

const disconnectTwitch = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/twitch/disconnect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (await handleActionFailure(res, {
    genericMessage: "Impossible de deconnecter Twitch."
  })) return;
  await loadTwitchStatus();
};

const saveTwitchLiveMode = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/twitch/live-mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ live_only: Boolean(twitchLiveOnly.value) })
  });
  if (await handleActionFailure(res, {
    genericMessage: "Impossible d'enregistrer le mode Twitch."
  })) return;
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
  if (await handleActionFailure(res, {
    genericMessage: "Impossible d'enregistrer l'automatisation."
  })) return false;
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
  if (await handleActionFailure(res, {
    genericMessage: "Impossible d'enregistrer la configuration Twitch."
  })) return false;
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
  if (await handleActionFailure(res, {
    genericMessage: "Impossible d'enregistrer le daily Twitch."
  })) return false;
  await loadTwitchDailySettings();
  markSaved();
  if (notify) notifySaved();
  return true;
};

const saveTwitchPromoSettings = async ({ notify = true } = {}) => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/twitch/promo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      enabled: Boolean(twitchPromo.enabled),
      template: String(twitchPromo.template || ""),
      discordUrl: String(twitchPromo.discordUrl || ""),
      onFollow: Boolean(twitchPromo.onFollow),
      onFirstMessage: Boolean(twitchPromo.onFirstMessage),
      remindUnlinked: Boolean(twitchPromo.remindUnlinked)
    })
  });
  if (await handleActionFailure(res, {
    genericMessage: "Impossible d'enregistrer le message promo Twitch."
  })) return false;
  await loadTwitchPromoSettings();
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
  if (handleUnauthorized(res)) return false;
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
  if (handleUnauthorized(res)) return;
  if (!res.ok) {
    items.value = [];
    return;
  }
  const data = await parseJsonSafe(res, {});
  items.value = data.items || [];
  trashPage.value = 1;
};

const visibleItems = computed(() =>
  items.value.filter((item) => !item.hidden && !item.premium_locked)
);
const lockedVisibleItems = computed(() =>
  items.value.filter((item) => !item.hidden && item.premium_locked)
);
const lockedItemUnlockItems = computed(() =>
  lockedVisibleItems.value.map((item) => item.name).filter(Boolean)
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
  const rawRoleMode = String(shop.required_roles_mode || "").trim().toLowerCase();
  shopForm.required_roles_mode = rawRoleMode === "any" ? "any" : "all";
  shopForm.discount_percent = Number(shop.discount_percent || 0);
  shopForm.enabled = shop.enabled !== false;
  shopForm.image_url = shop.image_url || "";
  shopForm.description = shop.description || "";
  showShopSettingsModal.value = true;
};

const saveShopSettings = async () => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/shops/${shopForm.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: shopForm.name,
      required_role_ids: shopSettingsRoleIds.value,
      required_roles_mode: shopForm.required_roles_mode,
      discount_percent: shopForm.discount_percent,
      enabled: shopForm.enabled,
      image_url: shopForm.image_url,
      description: shopForm.description
    })
  });
  if (await handleActionFailure(res, {
    genericMessage: "Impossible d'enregistrer les parametres de boutique."
  })) return;
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
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/shops/${shop.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ enabled: !shop.enabled })
  });
  if (await handleActionFailure(res, {
    genericMessage: "Impossible de modifier l'etat de la boutique."
  })) return;
  await loadShops();
};

const createShop = async () => {
  const token = getToken();
  if (!newShop.name?.trim()) return false;
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/shops`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: newShop.name,
      discount_percent: newShop.discount_percent,
      required_role_ids: newShopRoleIds.value,
      required_roles_mode: newShop.required_roles_mode
    })
  });
  if (await handleActionFailure(res, {
    genericMessage: "Impossible de creer la boutique."
  })) return false;
  newShop.name = "";
  newShop.discount_percent = 0;
  newShop.required_roles_mode = "all";
  newShopRoleIds.value = [];
  newShopRoleSearch.value = "";
  showNewShopRolePicker.value = false;
  await loadShops();
  return true;
};

const resetCreateShopForm = () => {
  newShop.name = "";
  newShop.discount_percent = 0;
  newShop.required_roles_mode = "all";
  newShopRoleIds.value = [];
  newShopRoleSearch.value = "";
  showNewShopRolePicker.value = false;
};

const openCreateShopModal = () => {
  const shopsMax = Number(billingLimits.value.shops_max ?? 1);
  if (Number.isFinite(shopsMax) && shops.value.length >= shopsMax) {
    openPremiumUpsell();
    return;
  }
  resetCreateShopForm();
  showCreateShopModal.value = true;
  refreshRoles();
};

const toggleShopItemForm = () => {
  if (!showItemForm.value && !isEditingItem.value) {
    const itemsMax = Number(billingLimits.value.shop_items_max ?? 6);
    if (Number.isFinite(itemsMax) && visibleItems.value.length >= itemsMax) {
      openPremiumUpsell();
      return;
    }
  }
  showItemForm.value = !showItemForm.value;
};

const closeCreateShopModal = () => {
  showCreateShopModal.value = false;
  showNewShopRolePicker.value = false;
};

const handleCreateShopAction = async () => {
  const created = await createShop();
  if (created) closeCreateShopModal();
};

const deleteShop = async (shopId) => {
  const token = getToken();
  const res = await fetch(`${config.public.apiBase}/api/guilds/${id}/shops/${shopId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (await handleActionFailure(res, {
    genericMessage: "Impossible de supprimer la boutique."
  })) return;
  await loadShops();
};

const createItem = async () => {
  const token = getToken();
  if (!validateShopAvailabilityDates()) return;
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
  let res;
  if (isEditingItem.value && editingItemId.value) {
    res = await fetch(`${config.public.apiBase}/api/shops/${newItem.shopId}/items/${editingItemId.value}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
  } else {
    res = await fetch(`${config.public.apiBase}/api/shops/${newItem.shopId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
  }
  if (await handleActionFailure(res, {
    genericMessage: "Impossible d'enregistrer cet article."
  })) return;
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
  const res = await fetch(`${config.public.apiBase}/api/shops/${item.shop_id || newItem.shopId}/items/${item.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ hidden })
  });
  if (await handleActionFailure(res, {
    genericMessage: "Impossible de modifier la visibilite de l'article."
  })) return;
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
  const res = await fetch(
    `${config.public.apiBase}/api/shops/${item.shop_id || newItem.shopId}/items/${item.id}${query ? `?${query}` : ""}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  if (await handleActionFailure(res, {
    genericMessage: "Impossible de supprimer cet article."
  })) return;
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
  const res = await fetch(
    `${config.public.apiBase}/api/shops/${lootboxItem.shop_id || newItem.shopId}/items/${lootboxItem.id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }
  );
  if (await handleActionFailure(res, {
    genericMessage: "Impossible d'enregistrer cette lootbox."
  })) return;
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

const handleUnauthorized = (res) => {
  if (res.status === 401) {
    login();
    return true;
  }
  return false;
};

const parseJsonSafe = async (res, fallback = {}) => {
  if (!res || typeof res.json !== "function") return fallback;
  try {
    return await res.json();
  } catch {
    return fallback;
  }
};

const loadGuildMe = async () => {
  try {
    const token = getToken();
    if (!token) {
      guildMe.value = null;
      return;
    }
    const res = await fetch(`${config.public.apiBase}/api/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      guildMe.value = null;
      return;
    }
    const data = await parseJsonSafe(res, {});
    guildMe.value = data.user || data || null;
  } catch {
    guildMe.value = null;
  }
};

const handleActionFailure = async (res, { genericMessage = "Action impossible." } = {}) => {
  if (handleUnauthorized(res)) return true;
  if (res.ok) return false;
  if (!genericMessage) return true;
  const data = await parseJsonSafe(res.clone(), {});
  const errorMessage = String(data?.error || "").trim();
  alert(errorMessage ? `${genericMessage} (${errorMessage})` : genericMessage);
  return true;
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
    if (tab === "userShops") {
      await loadAdminUserShops();
      loadedTabs.userShops = true;
      return;
    }
    if (tab === "inventories") {
      loadedTabs.inventories = true;
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
      await loadTwitchPromoSettings();
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
      await loadRolesOnce();
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
  if (!botTimezone.value) {
    botTimezone.value = browserTimezone.value;
  }
  suppressDirty.value = true;
  await loadGuildMe();
  await loadManagedGuildServers();
  activeTab.value = normalizeGuildTab(route.query?.tab, "economy");
  syncTabQuery(activeTab.value);
  await loadGuildStatus();
  await syncGuildBillingAfterCheckout();
  await loadGuildBilling();
  await loadBillingCleanup();
  if (guildBan.value.banned) {
    suppressDirty.value = false;
    return;
  }
  await ensureBotPresent();
  await loadBotSettingsOnce();
  await loadTabData(activeTab.value);
  suppressDirty.value = false;
  if (String(route.query?.twitch_connected || "") === "1") {
    activeTab.value = "twitch";
    syncTabQuery("twitch");
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

watch(twitchPromo, () => {
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
    } else if (value === "leaves") {
      await loadLeaveLogs();
    } else if (value === "linked") {
      await loadLinkedTwitchUsers();
    }
  }
);
watch(
  () => route.params.id,
  async (nextId, prevId) => {
    const guildId = String(nextId || "");
    const previousId = String(prevId || "");
    if (!guildId || guildId === previousId) return;

    guildBilling.value = { ...FREE_BILLING_FALLBACK };
    await loadManagedGuildServers();
    await loadGuildStatus();
    await syncGuildBillingAfterCheckout();
    await loadGuildBilling();
    await loadBillingCleanup();

    if (guildBan.value.banned) return;
    await ensureBotPresent();
    await loadTabData(activeTab.value, { force: true });
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
  if (leaderboardSearchTimer) {
    clearTimeout(leaderboardSearchTimer);
    leaderboardSearchTimer = null;
  }
  stopMassBalanceProgress();
});
</script>

<style scoped>
/* EcoBoty guild dashboard — clear, colorful, fluid */

.page {
  display: grid;
  grid-template-columns: minmax(248px, 280px) minmax(0, 1fr);
  gap: 22px;
  align-items: start;
  padding: 22px 22px 48px;
  min-height: 100vh;
  box-sizing: border-box;
}

/* ——— Sidebar ——— */
.section-nav {
  position: sticky;
  top: 88px;
  background: linear-gradient(180deg, rgba(45, 212, 160, 0.06), transparent 28%), var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow: var(--shadow);
  padding: 16px 12px;
  max-height: calc(100vh - 110px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(14px);
}

.section-nav-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  margin: 0 -4px;
  padding: 0 4px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  padding: 2px 8px 14px;
  border-bottom: 1px solid var(--border);
}

.section-brand {
  min-width: 0;
}

.section-title {
  font-family: var(--font-display);
  font-weight: 750;
  font-size: 1.08rem;
  letter-spacing: -0.03em;
  color: var(--text);
}

.section-sub {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.section-toggle {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  cursor: pointer;
}

.section-links {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.section-account {
  flex-shrink: 0;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  display: grid;
  gap: 10px;
}

.guild-server-switcher {
  display: grid;
  gap: 6px;
}

.guild-server-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.guild-server-select {
  width: 100%;
}

.account-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.account-chip-link {
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
  padding: 6px 8px;
  margin: -6px -8px;
  transition: background 0.2s ease, color 0.2s ease;
}
.account-chip-link:hover {
  background: rgba(59, 130, 246, 0.08);
}
.account-chip-link:hover .account-name {
  color: var(--accent);
}
.account-chip-button {
  width: 100%;
  text-align: left;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.account-avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(45, 212, 160, 0.15) center / cover no-repeat;
  display: grid;
  place-items: center;
  color: var(--accent);
  flex-shrink: 0;
}

.account-meta {
  min-width: 0;
}

.account-name {
  font-weight: 700;
  font-size: 0.92rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.premium-focus.is-premium {
  border-color: rgba(45, 212, 160, 0.35);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.88), rgba(45, 212, 160, 0.18), rgba(124, 58, 237, 0.18));
}

.premium-focus:not(.is-premium) {
  border-color: rgba(148, 163, 184, 0.28);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(51, 65, 85, 0.35));
}

.premium-focus {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(45, 212, 160, 0.2);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.88), rgba(45, 212, 160, 0.18), rgba(124, 58, 237, 0.18));
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.premium-focus-copy {
  display: grid;
  gap: 3px;
}

.premium-focus-label {
  font-size: 0.68rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #99f6e4;
}

.premium-focus-title {
  font-size: 0.95rem;
  font-weight: 800;
}

.premium-focus-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.premium-focus-icon.is-crown {
  color: #facc15;
  filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.45));
}
.premium-focus-icon.is-ok {
  color: #99f6e4;
}

.guild-locale-select {
  width: 100%;
}

.locale-selected {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.locale-flag {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  object-fit: cover;
}

.nav-group {
  margin: 12px 8px 6px;
  font-size: 0.66rem;
  font-weight: 750;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0.85;
}

.nav-divider {
  height: 1px;
  margin: 10px 8px;
  background: linear-gradient(90deg, transparent, var(--border), transparent);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  text-align: left;
  padding: 10px 11px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-soft);
  font-size: 0.92rem;
  font-weight: 550;
  cursor: pointer;
  transition:
    background 0.22s var(--ease),
    border-color 0.22s var(--ease),
    color 0.22s var(--ease),
    transform 0.22s var(--ease),
    box-shadow 0.22s var(--ease);
}

.nav-item .nav-ico {
  width: 28px;
  height: 28px;
  padding: 6px;
  border-radius: 9px;
  flex-shrink: 0;
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-muted);
  transition: background 0.22s var(--ease), color 0.22s var(--ease);
}

.nav-premium-crown {
  margin-left: auto;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: #facc15;
  filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.5));
}

.nav-item.active .nav-premium-crown,
.nav-item:hover .nav-premium-crown {
  color: #facc15;
}

.nav-item:hover {
  background: var(--accent-soft);
  color: var(--text);
  transform: translateX(2px);
}

.nav-item:hover .nav-ico {
  background: rgba(45, 212, 160, 0.18);
  color: var(--accent);
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(45, 212, 160, 0.22), rgba(56, 189, 248, 0.08));
  border-color: rgba(45, 212, 160, 0.38);
  color: var(--text);
  box-shadow: 0 8px 20px rgba(45, 212, 160, 0.12);
}

.nav-item.active .nav-ico {
  background: linear-gradient(135deg, var(--accent), #38bdf8);
  color: #04120c;
}

.nav-item.nav-link {
  text-decoration: none;
  color: inherit;
}

.nav-item.nav-back {
  margin-bottom: 2px;
  border-color: rgba(56, 189, 248, 0.28);
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(45, 212, 160, 0.08));
  color: var(--text);
  font-weight: 650;
}

.nav-item.nav-back .nav-ico {
  background: rgba(56, 189, 248, 0.22);
  color: #38bdf8;
}

.nav-item.nav-back:hover {
  border-color: rgba(56, 189, 248, 0.45);
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(45, 212, 160, 0.12));
}

/* ——— Content ——— */
.section-content {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  padding: 22px 24px;
  border-radius: 22px;
  border: 1px solid rgba(45, 212, 160, 0.22);
  background:
    radial-gradient(720px 260px at 0% 0%, rgba(45, 212, 160, 0.2), transparent 55%),
    radial-gradient(520px 220px at 100% 0%, rgba(56, 189, 248, 0.14), transparent 50%),
    radial-gradient(400px 180px at 70% 100%, rgba(251, 191, 36, 0.06), transparent 50%),
    var(--surface);
  box-shadow: var(--shadow);
}

.hero-info {
  min-width: 0;
}

.hero-title {
  margin-top: 8px;
  font-family: var(--font-display);
  font-size: clamp(1.45rem, 2.2vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  color: var(--text);
  line-height: 1.15;
}

.hero-sub {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 0.98rem;
  max-width: 54ch;
  line-height: 1.5;
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-soft);
  font-size: 0.78rem;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.hero-badge.ok {
  border-color: rgba(45, 212, 160, 0.4);
  background: rgba(45, 212, 160, 0.14);
  color: var(--accent);
}

.hero-badge.ko {
  border-color: rgba(248, 113, 113, 0.4);
  background: rgba(248, 113, 113, 0.12);
  color: var(--danger);
}

.hero-badge.accent {
  border-color: rgba(56, 189, 248, 0.35);
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
}

.ban-card {
  padding: 24px;
}

/* ——— Cards / panels ——— */
.card,
:deep(.card) {
  border-radius: 20px !important;
  border: 1px solid var(--border) !important;
  background: var(--surface) !important;
  box-shadow: var(--shadow);
  overflow: hidden;
  animation: guildPanelIn 0.38s var(--ease) both;
}

.card.card-emoji-open,
:deep(.card.card-emoji-open),
.card.card-emoji-open :deep([data-slot="root"]),
.card.card-emoji-open :deep([data-slot="body"]) {
  overflow: visible !important;
}

@keyframes guildPanelIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card,
  :deep(.card),
  .nav-item {
    animation: none !important;
    transition: none !important;
  }
}

.card :deep([data-slot="body"]),
.card :deep(.p-4),
.card :deep(.p-6) {
  display: flex !important;
  flex-direction: column !important;
  gap: 40px !important;
  padding: 28px 30px !important;
}

.card :deep([data-slot="body"]) > .sub-card,
.card :deep([data-slot="body"]) > .grid,
.card :deep([data-slot="body"]) > .form-grid,
.card :deep([data-slot="body"]) > .form-section,
.card :deep(.p-4) > .sub-card,
.card :deep(.p-4) > .grid,
.card :deep(.p-4) > .form-grid,
.card :deep(.p-6) > .sub-card,
.card :deep(.p-6) > .grid,
.card :deep(.p-6) > .form-grid {
  margin-top: 0 !important;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 0;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.card-head h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 750;
  letter-spacing: -0.025em;
}

.card-actions,
.actions,
.actions-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.sub-card,
.form-section,
.shop-card,
.item-card,
.stat-card,
.stat-tile,
.inventory-sidebar,
.inventory-detail,
.doc-callout,
.mass-sync-box {
  margin-top: 18px;
  padding: 18px 20px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(45, 212, 160, 0.05), transparent 40%), var(--surface-2);
  transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease), transform 0.2s var(--ease);
}

.sub-card:first-child,
.form-section:first-child {
  margin-top: 0;
}

.leaderboard-collapse {
  padding-top: 14px;
  padding-bottom: 14px;
}

.leaderboard-collapse-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: -0.02em;
  text-align: left;
  cursor: pointer;
}

.leaderboard-collapse-toggle:hover {
  color: var(--accent);
}

.leaderboard-collapse-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--text-muted);
}

.leaderboard-collapse-body {
  margin-top: 12px;
}

.sub-card h4,
.form-section-head,
.item-title,
.lootbox-entry-title {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: -0.02em;
}

.muted,
.inv-hint,
.item-sub,
.item-meta,
.grid,
.filters-grid,
.availability-grid,
.lootbox-entry-grid,
.stats-grid,
.stats,
.shops-grid,
.items-grid,
.inv-grid {
  display: grid;
  gap: var(--form-grid-gap, 24px);
}

.grid,
.filters-grid,
.availability-grid,
.lootbox-entry-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.stats-grid,
.stats {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  margin-bottom: 12px;
}

.shops-grid,
.items-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  margin-top: 16px;
}

.stat-tile,
.stat-card {
  margin-top: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
  border-color: rgba(45, 212, 160, 0.22);
  background:
    linear-gradient(135deg, rgba(45, 212, 160, 0.12), rgba(56, 189, 248, 0.05)),
    var(--surface-2);
}

.stat-tile::before,
.stat-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--accent), #38bdf8);
  border-radius: 3px 0 0 3px;
}

.stat-tile:nth-child(2)::before,
.stat-card:nth-child(2)::before {
  background: linear-gradient(180deg, #38bdf8, #818cf8);
}

.stat-tile:nth-child(3)::before,
.stat-card:nth-child(3)::before {
  background: linear-gradient(180deg, #fbbf24, #fb923c);
}

.stat-tile span,
.stat-title {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding-left: 6px;
}

.stat-tile strong,
.stat-value {
  font-family: var(--font-display);
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--text);
  padding-left: 6px;
  letter-spacing: -0.03em;
}

label {
  display: flex;
  flex-direction: column;
  gap: var(--form-label-gap, 8px);
  font-size: 0.86rem;
  font-weight: 650;
  color: var(--text-soft);
  line-height: 1.35;
}

.page :is(input, select, textarea),
.search,
.inline-input,
.role-input {
  width: 100%;
  padding: 11px 13px;
  border-radius: 12px;
  border: 1px solid var(--border-strong);
  background: var(--bg-elevated);
  color: var(--text);
  font: inherit;
  outline: none;
  transition: border-color 0.18s var(--ease), box-shadow 0.18s var(--ease), background 0.18s var(--ease);
}

.page :deep(.eb-select),
.page :deep(.eb-select [data-slot="base"]) {
  width: 100%;
  min-height: 42px;
  border-radius: 12px;
}

.page :is(input, select, textarea):focus,
.search:focus,
.inline-input:focus,
.role-input:focus {
  border-color: rgba(45, 212, 160, 0.6);
  box-shadow: 0 0 0 4px var(--accent-soft);
  background: var(--surface);
}

.page textarea {
  min-height: 96px;
  resize: vertical;
}

.inline,
.leaderboard-search-row,
.inline-label {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.inline-label {
  font-size: 0.86rem;
  font-weight: 650;
  color: var(--text-soft);
}

.leaderboard-search-input {
  min-width: min(320px, 100%);
}

/* ——— Tabs / chips / pills ——— */
.emoji-tabs,
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tab,
.tab-pill,
.chip,
.pill,
.source-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 13px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-soft);
  font-size: 0.82rem;
  font-weight: 650;
  cursor: pointer;
  transition: background 0.18s var(--ease), border-color 0.18s var(--ease), color 0.18s var(--ease), transform 0.18s var(--ease);
}

.tab:hover,
.tab-pill:hover,
.chip:hover {
  transform: translateY(-1px);
  border-color: rgba(45, 212, 160, 0.3);
}

.tab.active,
.tab-pill.active,
.chip.active {
  background: linear-gradient(135deg, rgba(45, 212, 160, 0.22), rgba(56, 189, 248, 0.12));
  border-color: rgba(45, 212, 160, 0.45);
  color: var(--accent);
  box-shadow: 0 6px 14px rgba(45, 212, 160, 0.12);
}

.source-pill {
  cursor: default;
}

.source-pill.transaction {
  border-color: rgba(56, 189, 248, 0.35);
  color: #7dd3fc;
  background: rgba(56, 189, 248, 0.1);
}

.source-pill.leave {
  border-color: rgba(248, 113, 113, 0.35);
  color: #fca5a5;
  background: rgba(248, 113, 113, 0.1);
}

.pill.danger {
  cursor: default;
  border-color: rgba(248, 113, 113, 0.35);
  color: #fca5a5;
  background: rgba(248, 113, 113, 0.1);
}

.pill.muted {
  cursor: default;
}

.leave-details {
  opacity: 0.85;
  font-size: 0.86rem;
}

.source-pill.game {
  border-color: rgba(251, 191, 36, 0.35);
  color: #fcd34d;
  background: rgba(251, 191, 36, 0.1);
}

/* ——— Switch ——— */
.switch-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 11px 13px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.02);
  transition: border-color 0.18s var(--ease), background 0.18s var(--ease);
}

.switch-field:hover {
  border-color: rgba(45, 212, 160, 0.28);
  background: rgba(45, 212, 160, 0.04);
}

.switch-field.compact {
  padding: 8px 10px;
}

.switch-field > span,
.switch-field > label:not(.switch) {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 550;
  color: var(--text-soft);
}

.switch {
  position: relative;
  display: inline-flex;
  width: 46px;
  height: 28px;
  flex-shrink: 0;
  cursor: pointer;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.switch .slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: rgba(148, 163, 184, 0.2);
  transition: 0.22s var(--ease);
}

.switch .slider::before {
  content: "";
  position: absolute;
  width: 20px;
  height: 20px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: #fff;
  transition: 0.22s var(--ease);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
}

.switch input:checked + .slider {
  background: linear-gradient(135deg, var(--accent), #38bdf8);
  border-color: transparent;
}

.switch input:checked + .slider::before {
  transform: translateX(18px);
}

/* ——— Lists / tables ——— */
.list,
.logs-table,
.leaderboard,
.linked-list,
.user-search-results,
.user-results,
.role-results,
.role-results-popover {
  margin-top: 10px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-2);
  overflow: hidden;
}

.list-row,
.log-row,
.linked-row,
.linked-header,
.logs-header,
.role-row,
.user-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s var(--ease);
}

.logs-header,
.linked-header,
.log-row,
.linked-row {
  display: grid;
  justify-content: initial;
  flex-wrap: nowrap;
  gap: 12px;
  align-items: center;
}

.logs-body {
  display: flex;
  flex-direction: column;
}

.logs-grid--gains,
.logs-grid--games {
  grid-template-columns:
    minmax(132px, 0.95fr)
    minmax(150px, 1.2fr)
    minmax(110px, 1fr)
    minmax(72px, 0.55fr)
    minmax(72px, 0.55fr)
    minmax(100px, 0.85fr);
}

.logs-grid--transactions,
.logs-grid--leaves {
  grid-template-columns:
    minmax(132px, 0.9fr)
    minmax(140px, 1.1fr)
    minmax(110px, 1fr)
    minmax(120px, 1.1fr)
    minmax(72px, 0.55fr)
    minmax(140px, 1.2fr);
}

.logs-grid--linked {
  grid-template-columns:
    minmax(120px, 1.1fr)
    minmax(120px, 1.1fr)
    minmax(90px, 0.7fr)
    minmax(150px, 1.3fr)
    minmax(88px, 0.55fr);
}

.logs-header > span,
.linked-header > span,
.log-row > span,
.linked-row > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-date,
.col-source,
.col-user,
.col-item,
.col-details,
.col-twitch,
.col-discord {
  text-align: left;
  justify-self: start;
}

.col-num,
.col-mult,
.col-actions {
  text-align: right;
  justify-self: end;
}

.col-tier {
  text-align: center;
  justify-self: center;
}

.col-actions {
  display: flex;
  justify-content: flex-end;
}

.logs-header .col-num,
.logs-header .col-mult,
.logs-header .col-actions,
.linked-header .col-actions {
  text-align: right;
  justify-self: end;
}

.logs-header .col-tier,
.linked-header .col-tier {
  text-align: center;
  justify-self: center;
}

.log-row .col-source,
.linked-row .col-tier {
  overflow: visible;
}

@media (max-width: 900px) {
  .logs-table,
  .linked-list {
    overflow-x: auto;
  }

  .logs-header,
  .linked-header,
  .log-row,
  .linked-row {
    min-width: 720px;
  }
}

.list-row:hover,
.log-row:hover,
.linked-row:hover {
  background: rgba(45, 212, 160, 0.04);
}

.list-row:last-child,
.log-row:last-child,
.linked-row:last-child,
.user-result:last-child {
  border-bottom: none;
}

.logs-header,
.linked-header {
  background: linear-gradient(90deg, rgba(45, 212, 160, 0.1), rgba(56, 189, 248, 0.06));
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.leaderboard {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
}

.leaderboard li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s var(--ease);
}

.leaderboard li:hover {
  background: rgba(45, 212, 160, 0.05);
}

.leaderboard li:last-child {
  border-bottom: none;
}

.link {
  background: none;
  border: none;
  color: var(--accent);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  padding: 0;
}

.link:hover {
  text-decoration: underline;
}

.pagination {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
  margin-top: 14px;
}

.user-result {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
}

.user-result:hover {
  background: var(--accent-soft);
}

.user-result-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.user-avatar,
.inv-avatar {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(45, 212, 160, 0.2), rgba(56, 189, 248, 0.15));
  color: var(--accent);
  flex-shrink: 0;
}

.user-name,
.inv-member-name {
  font-weight: 650;
}

.user-id,
.inv-member-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.user-action {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--accent);
}

.clear-filter {
  display: flex;
  align-items: flex-end;
}

/* ——— Shops / items ——— */
.shop-card,
.item-card {
  margin-top: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 140px;
}

.shop-card:hover,
.item-card:hover {
  border-color: rgba(45, 212, 160, 0.4);
  box-shadow: 0 12px 28px rgba(45, 212, 160, 0.1);
  transform: translateY(-2px);
}

.shop-main,
.item-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-icon,
.inv-item-icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(45, 212, 160, 0.2), rgba(56, 189, 248, 0.14));
  color: var(--accent);
  flex-shrink: 0;
}

.shop-actions,
.item-card .card-actions,
.inv-item-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
  margin-top: auto;
}

.user-shop-owner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.user-shop-avatar {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  flex-shrink: 0;
}

.user-shop-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.user-shop-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.35);
}

.item-card--trash,
.trash-card {
  border-color: rgba(248, 113, 113, 0.3);
  background: rgba(248, 113, 113, 0.07);
}

.item-form,
.form-section {
  margin-top: 14px;
}

.availability-field,
.lootbox-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lootbox-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lootbox-entry-card {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
}

.lootbox-entry--hidden {
  opacity: 0.55;
}

.lootbox-entry-top,
.lootbox-entry-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.lootbox-remove {
  color: var(--danger);
}

.lootbox-visibility {
  margin: 0;
}

/* ——— Inventories ——— */
.inv-layout,
.inventory-panel {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.inv-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.inv-members,
.inv-items,
.inventory-sidebar,
.inventory-detail {
  margin-top: 0;
  min-height: 360px;
}

.inv-members-list,
.inventory-users {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  max-height: 520px;
  overflow: auto;
}

.inv-member,
.inventory-user-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 11px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: background 0.18s var(--ease), border-color 0.18s var(--ease);
}

.inv-member:hover,
.inventory-user-row:hover {
  background: var(--accent-soft);
}

.inv-member.active,
.inventory-user-row.active {
  border-color: rgba(45, 212, 160, 0.42);
  background: linear-gradient(135deg, rgba(45, 212, 160, 0.16), rgba(56, 189, 248, 0.08));
}

.inv-member-info,
.inventory-user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.inv-items-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.inv-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--text-muted);
}

.inv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  transition: border-color 0.18s var(--ease);
}

.inv-item:hover {
  border-color: rgba(45, 212, 160, 0.3);
}

.inv-item-main,
.inv-item-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.inv-item-name {
  font-weight: 650;
}

.inv-item-meta,
.inv-qty {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* ——— Emoji picker ——— */
.field {
  display: flex;
  flex-direction: column;
  gap: var(--form-label-gap, 8px);
}

.field-label {
  display: block;
  font-size: 0.86rem;
  font-weight: 650;
  color: var(--text-soft);
  line-height: 1.45;
  padding-bottom: 0;
}

.emoji-field {
  position: relative;
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  z-index: 5;
}

.emoji-pick-btn {
  width: 100%;
  min-height: 42px;
  height: 42px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  border-radius: 12px;
  border: 1px solid var(--border-strong);
  background: var(--bg-elevated);
  color: var(--text);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 550;
  cursor: pointer;
  transition: border-color 0.18s var(--ease), box-shadow 0.18s var(--ease);
}

.emoji-pick-btn:hover {
  border-color: rgba(45, 212, 160, 0.45);
}

.emoji-pick-btn:focus {
  outline: none;
  border-color: rgba(45, 212, 160, 0.6);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.emoji-preview {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: none;
  background: transparent;
  font-size: 1.05rem;
  line-height: 1;
  flex-shrink: 0;
  pointer-events: none;
}

.emoji-preview :deep(.emoji-preview-img),
.emoji-preview-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  display: block;
  pointer-events: none;
}

.emoji-popover {
  position: absolute;
  z-index: 60;
  top: calc(100% + 8px);
  left: 0;
  width: min(360px, 90vw);
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  box-shadow: var(--shadow);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
  margin-top: 10px;
  max-height: 220px;
  overflow: auto;
}

.emoji-item {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 1.15rem;
  transition: background 0.15s var(--ease);
}

.emoji-item:hover {
  background: var(--accent-soft);
  border-color: rgba(45, 212, 160, 0.3);
}

/* ——— Roles ——— */
.role-picker,
.role-search {
  position: relative;
}

.role-results,
.role-results-popover {
  position: absolute;
  z-index: 30;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  max-height: 220px;
  overflow: auto;
}

/* ——— Modals ——— */
.modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(2, 6, 12, 0.72);
  backdrop-filter: blur(8px);
  animation: guildPanelIn 0.25s var(--ease) both;
}

.modal-card {
  width: min(720px, 100%);
  max-height: min(88vh, 900px);
  overflow: auto;
  border-radius: 20px !important;
  border: 1px solid rgba(45, 212, 160, 0.22) !important;
  background: var(--surface) !important;
  box-shadow: var(--shadow);
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 14px;
}

.modal-head h3 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 750;
}

/* ——— Misc ——— */
.code-block,
.preview-message {
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.25);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.mass-sync-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mass-sync-track {
  flex: 1;
  height: 9px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  overflow: hidden;
}

.mass-sync-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-2), var(--accent), #38bdf8);
  border-radius: inherit;
  transition: width 0.3s var(--ease);
}

.mass-sync-percent {
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}

.small,
.compact {
  font-size: 0.85rem;
}

.large {
  font-size: 1.05rem;
}

.doc-callout {
  border-color: rgba(56, 189, 248, 0.3);
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(45, 212, 160, 0.06));
}

.logs-retention-line {
  margin-top: 4px;
}

.premium-inline-upsell {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(250, 204, 21, 0.28);
  background: linear-gradient(135deg, rgba(250, 204, 21, 0.12), rgba(45, 212, 160, 0.08));
}

.premium-inline-upsell--compact {
  padding: 12px 14px;
}

.premium-inline-upsell-copy {
  min-width: 0;
  flex: 1 1 280px;
}

.premium-inline-upsell-kicker {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ca8a04;
  font-weight: 700;
  margin-bottom: 4px;
}

.premium-inline-upsell-title {
  margin: 0 0 6px;
  font-size: 1rem;
}

.premium-inline-upsell-text {
  margin: 0;
  line-height: 1.45;
}

.premium-inline-upsell-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.shop-limit-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.shop-limit-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 650;
  border: 1px solid rgba(45, 212, 160, 0.28);
  background: rgba(45, 212, 160, 0.1);
}

.shop-limit-hint {
  font-size: 0.82rem;
}

.shops-empty-state {
  grid-column: 1 / -1;
  display: grid;
  gap: 10px;
  justify-items: start;
  padding: 22px 18px;
  border-radius: 16px;
  border: 1px dashed rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.18);
}

.shops-empty-icon {
  font-size: 1.8rem;
}

.shops-empty-state h4 {
  margin: 0;
  font-size: 1.05rem;
}

.shops-empty-limits {
  font-size: 0.9rem;
}

.shops-empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.locked-shops-gate,
.locked-items-gate {
  width: 100%;
  margin-top: 12px;
}

.daily-bonus-gate {
  width: 100%;
  margin-top: 8px;
}

.daily-base-grid {
  grid-template-columns: minmax(180px, 280px);
}

.daily-bonus-preview {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.linked-twitch {
  font-weight: 650;
  color: #a78bfa;
}

.linked-tier .pill {
  cursor: default;
}

.section-content[class*="theme-"] {
  --tab-rgb: 45 212 160;
  --tab-soft-rgb: 26 168 122;
}

/* ——— Responsive ——— */
@media (max-width: 980px) {
  .page {
    grid-template-columns: 1fr;
  }

  .section-nav {
    position: relative;
    top: 0;
    max-height: none;
    overflow: visible;
  }

  .section-toggle {
    display: inline-flex;
  }

  .section-links {
    display: none;
    margin-top: 10px;
  }

  .section-nav.open .section-links {
    display: flex;
  }

  .inv-layout,
  .inventory-panel {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-direction: column;
  }

  .hero-actions {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .card-head {
    flex-direction: column;
    align-items: stretch;
  }

  .emoji-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

:global(body.theme-light) .section-nav,
:global(body.theme-light) .hero,
:global(body.theme-light) .card,
:global(html.light) .section-nav,
:global(html.light) .hero,
:global(html.light) .card {
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

:global(body.theme-light) .hero-badge.accent,
:global(html.light) .hero-badge.accent {
  color: #0284c7;
  background: rgba(14, 165, 233, 0.1);
}

:global(body.theme-light) .nav-item.active .nav-ico,
:global(html.light) .nav-item.active .nav-ico {
  color: #fff;
}

:global(body.theme-light) .code-block,
:global(body.theme-light) .preview-message,
:global(html.light) .code-block,
:global(html.light) .preview-message {
  background: rgba(15, 23, 42, 0.04);
}

/* Tab color tokens — distinct by purpose */
.tab-economy { --tab-c: 45 212 160; }
.tab-daily { --tab-c: 56 189 248; }
.tab-shops { --tab-c: 251 146 60; }
.tab-user-shops { --tab-c: 251 113 133; }
.tab-inventories { --tab-c: 45 212 196; }
.tab-automation { --tab-c: 129 140 248; }
.tab-leaderboard { --tab-c: 250 204 21; }
.tab-logs { --tab-c: 148 163 184; }
.tab-message { --tab-c: 244 114 182; }
.tab-twitch { --tab-c: 168 85 247; }
.tab-games { --tab-c: 132 204 22; }
.tab-achievements { --tab-c: 251 191 36; }
.tab-birthday { --tab-c: 251 113 133; }
.tab-bot { --tab-c: 34 211 238; }
.tab-sensitive { --tab-c: 248 113 113; }
.tab-billing { --tab-c: 250 204 21; }
.tab-docs { --tab-c: 96 165 250; }
.tab-legal { --tab-c: 251 191 36; }
.tab-terms { --tab-c: 167 139 250; }

.section-brand {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}

.section-logo {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 8px 18px rgba(45, 212, 160, 0.25);
}

.page {
  display: grid;
  grid-template-columns: minmax(260px, 292px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
  padding: 22px 22px 48px;
  min-height: 100vh;
  box-sizing: border-box;
}

.section-nav {
  position: sticky;
  top: 20px;
  background: linear-gradient(180deg, rgba(45, 212, 160, 0.08), transparent 32%), var(--surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  box-shadow: var(--shadow);
  padding: 18px 14px;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(14px);
}

.section-nav-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  margin: 0 -4px;
  padding: 0 4px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
  padding: 4px 8px 16px;
  border-bottom: 1px solid var(--border);
}

.section-title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: -0.03em;
  color: var(--text);
}

.section-sub {
  margin: 3px 0 0;
  font-size: 0.78rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.section-links {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.nav-group {
  margin: 14px 8px 6px;
  font-size: 0.66rem;
  font-weight: 750;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.nav-divider {
  height: 1px;
  margin: 10px 8px;
  background: linear-gradient(90deg, transparent, var(--border), transparent);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  text-align: left;
  padding: 11px 12px;
  border-radius: 14px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-soft);
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.22s var(--ease),
    border-color 0.22s var(--ease),
    color 0.22s var(--ease),
    transform 0.22s var(--ease),
    box-shadow 0.22s var(--ease);
}

.nav-item .nav-ico {
  width: 30px;
  height: 30px;
  padding: 6px;
  border-radius: 10px;
  flex-shrink: 0;
  background: rgb(var(--tab-c, 148 163 184) / 0.16);
  color: rgb(var(--tab-c, 148 163 184));
  transition: background 0.22s var(--ease), color 0.22s var(--ease), transform 0.22s var(--ease);
}

.nav-premium-crown {
  margin-left: auto;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: #facc15 !important;
  filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.5));
}

.nav-item:hover {
  background: rgb(var(--tab-c, 45 212 160) / 0.12);
  color: var(--text);
  transform: translateX(3px);
  border-color: rgb(var(--tab-c, 45 212 160) / 0.22);
}

.nav-item:hover .nav-ico {
  transform: scale(1.06);
  background: rgb(var(--tab-c, 45 212 160) / 0.24);
}

.nav-item.active {
  background: linear-gradient(135deg, rgb(var(--tab-c) / 0.28), rgb(var(--tab-c) / 0.08));
  border-color: rgb(var(--tab-c) / 0.5);
  color: var(--text);
  box-shadow: 0 10px 22px rgb(var(--tab-c) / 0.18);
}

.nav-item.active .nav-ico {
  background: rgb(var(--tab-c));
  color: #061018;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
  --panel-c: 45 212 160;
}

.section-content.theme-economy { --panel-c: 45 212 160; }
.section-content.theme-daily { --panel-c: 56 189 248; }
.section-content.theme-shops { --panel-c: 251 146 60; }
.section-content.theme-userShops { --panel-c: 251 113 133; }
.section-content.theme-inventories { --panel-c: 45 212 196; }
.section-content.theme-automation { --panel-c: 129 140 248; }
.section-content.theme-leaderboard { --panel-c: 250 204 21; }
.section-content.theme-logs { --panel-c: 148 163 184; }
.section-content.theme-communityMessage { --panel-c: 244 114 182; }
.section-content.theme-twitch { --panel-c: 168 85 247; }
.section-content.theme-games { --panel-c: 132 204 22; }
.section-content.theme-achievements { --panel-c: 251 191 36; }
.section-content.theme-achievementsBirthday { --panel-c: 251 113 133; }
.section-content.theme-bot { --panel-c: 34 211 238; }
.section-content.theme-sensitive { --panel-c: 248 113 113; }
.section-content.theme-billing { --panel-c: 250 204 21; }

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 26px 28px;
  border-radius: 24px;
  border: 1px solid rgb(var(--panel-c) / 0.35);
  background:
    radial-gradient(720px 260px at 0% 0%, rgb(var(--panel-c) / 0.24), transparent 55%),
    radial-gradient(520px 220px at 100% 0%, rgba(56, 189, 248, 0.12), transparent 50%),
    var(--surface);
  box-shadow: var(--shadow);
}

.card,
:deep(.card) {
  border-radius: 22px !important;
  border: 1px solid rgb(var(--panel-c) / 0.22) !important;
  background: var(--surface) !important;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.card :deep([data-slot="body"]),
.card :deep(.p-4),
.card :deep(.p-6) {
  display: flex !important;
  flex-direction: column !important;
  gap: 40px !important;
  padding: 28px 30px !important;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 0;
  flex-wrap: wrap;
  padding-bottom: 16px;
  border-bottom: 1px solid rgb(var(--panel-c) / 0.18);
}

.sub-card,
.form-section,
.shop-card,
.item-card,
.stat-card,
.stat-tile,
.inventory-sidebar,
.inventory-detail,
.doc-callout,
.mass-sync-box {
  margin-top: 16px;
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid rgb(var(--panel-c) / 0.18);
  background: linear-gradient(180deg, rgb(var(--panel-c) / 0.08), transparent 42%), var(--surface-2);
}

.stat-tile::before,
.stat-card::before {
  background: rgb(var(--panel-c));
}

.grid,
.filters-grid,
.availability-grid,
.lootbox-entry-grid,
.stats-grid,
.stats,
.shops-grid,
.items-grid,
.inv-grid {
  gap: 16px;
}

/* Responsive last — overrides desktop layout above */
@media (max-width: 980px) {
  .page {
    grid-template-columns: 1fr;
    padding: 14px 12px 36px;
    gap: 14px;
  }

  .section-nav {
    position: relative;
    top: 0;
    max-height: none;
    overflow: visible;
    padding: 12px;
    z-index: 40;
  }

  .section-toggle {
    display: inline-flex;
    min-height: 44px;
    min-width: 44px;
    padding: 10px 14px;
  }

  .section-nav-scroll,
  .section-account {
    display: none;
  }

  .section-nav.open .section-nav-scroll {
    display: block;
    margin-top: 10px;
    max-height: min(55vh, 420px);
  }

  .section-nav.open .section-account {
    display: grid;
  }

  .inv-layout,
  .inventory-panel {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-direction: column;
    padding: 18px 16px;
  }

  .hero-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .hero-actions :deep(button),
  .hero-actions :deep(a) {
    flex: 1 1 auto;
  }

  .card :deep([data-slot="body"]),
  .card :deep(.p-4),
  .card :deep(.p-6) {
    gap: 20px !important;
    padding: 16px !important;
  }

  .grid,
  .filters-grid,
  .availability-grid,
  .lootbox-entry-grid,
  .stats-grid,
  .stats,
  .shops-grid,
  .items-grid,
  .inv-grid {
    grid-template-columns: 1fr !important;
    gap: 12px;
  }

  .modal {
    padding: 12px;
    align-items: flex-end;
  }

  .modal-card {
    width: 100%;
    max-height: min(92vh, 900px);
    border-radius: 18px 18px 12px 12px !important;
  }
}

@media (max-width: 640px) {
  .page {
    padding: 10px 8px 28px;
  }

  .card-head {
    flex-direction: column;
    align-items: stretch;
  }

  .emoji-grid {
    grid-template-columns: repeat(6, 1fr);
  }

  .section-sub {
    max-width: 140px;
  }

  .hero-title {
    font-size: 1.25rem;
  }

  .sub-card,
  .form-section,
  .shop-card,
  .item-card {
    padding: 14px;
  }
}

</style>



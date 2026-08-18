<template>
  <UCard class="games-lounge" :ui="{ header: 'flex flex-wrap items-start justify-between gap-3 p-4 sm:px-6', body: 'space-y-4 p-4 sm:p-6' }">
    <template #header>
      <div class="lounge-copy">
        <h3 class="lounge-title">{{ $t("userGuild.games.title") }}</h3>
        <p class="lounge-help">{{ $t("userGuild.games.help") }}</p>
      </div>
      <UButton
        color="neutral"
        variant="soft"
        size="sm"
        :icon="muted ? 'i-lucide-volume-x' : 'i-lucide-volume-2'"
        :label="muted ? $t('userGuild.games.unmute') : $t('userGuild.games.mute')"
        @click="toggleMute"
      />
    </template>

    <UAlert color="neutral" variant="subtle" :title="$t('userGuild.games.virtualNotice')" icon="i-lucide-info" />
    <section v-if="payoutRanking.length > 1" class="payout-rank">
      <h4>{{ $t("userGuild.games.bestPayoutTitle") }}</h4>
      <p>{{ $t("userGuild.games.bestPayoutHelp", { bet: payoutRanking[0].maxBet }) }}</p>
      <ol>
        <li v-for="(game, index) in payoutRanking.slice(0, 3)" :key="game.id">
          <strong>{{ index + 1 }}. {{ game.label }}</strong>
          <span>
            {{ $t("userGuild.games.maxPayoutValue", { payout: game.maxPayout }) }}
            · {{ formatMult(game.maxMultiplier) }}
            ({{ $t(`userGuild.games.payoutReason.${game.maxReason}`) }})
          </span>
        </li>
      </ol>
      <p class="payout-rank-note">{{ $t("userGuild.games.bestPayoutNote") }}</p>
    </section>
    <p v-if="loading" class="lounge-empty">{{ $t("common.loading") }}</p>
    <p v-else-if="!games.length" class="lounge-empty">{{ $t("userGuild.games.empty") }}</p>
    <div v-else class="lounge-grid">
      <button
        v-for="game in games"
        :key="game.id"
        type="button"
        class="lounge-card"
        @click="openGame(game)"
      >
        <div class="lounge-cover" :style="{ backgroundImage: `url(${coverOf(game.id)})` }">
          <span class="lounge-emoji" aria-hidden="true">{{ iconOf(game.id) }}</span>
        </div>
        <div class="lounge-body">
          <div class="lounge-name-row">
            <strong class="lounge-name">{{ game.label }}</strong>
            <UBadge v-if="game.jackpot" color="warning" variant="subtle" size="sm">
              {{ $t("userGuild.games.jackpotBadge", { multiplier: formatMult(game.jackpot.multiplier) }) }}
            </UBadge>
            <UBadge v-if="games.length > 1 && game.id === topPayoutId" color="primary" variant="subtle" size="sm">
              {{ $t("userGuild.games.topPayout") }}
            </UBadge>
          </div>
          <p class="lounge-desc">{{ descOf(game.id) }}</p>
          <p v-if="game.jackpot" class="lounge-jackpot">
            {{ $t("userGuild.games.jackpotCard", {
              chance: chancePct(game.jackpot.chance),
              jpMult: formatMult(game.jackpot.multiplier),
              winMult: formatMult(game.jackpot.winMult)
            }) }}
          </p>
          <p class="lounge-max">
            {{ $t("userGuild.games.maxPayout") }}
            · {{ $t("userGuild.games.maxPayoutValue", { payout: game.maxPayout }) }}
            ({{ formatMult(game.maxMultiplier) }}, {{ $t(`userGuild.games.payoutReason.${game.maxReason}`) }})
          </p>
        </div>
        <div class="lounge-foot">
          <span class="lounge-range">
            {{ game.minBet }}–{{ game.maxBet }}
            <img v-if="resolvedCurrencyIconUrl" :src="resolvedCurrencyIconUrl" class="currency-icon" alt="" />
            <span v-else>{{ currencyTextFallback }}</span>
          </span>
          <span class="lounge-cta">{{ $t("userGuild.games.play") }}</span>
        </div>
      </button>
    </div>
  </UCard>

  <UModal
    v-model:open="arenaOpen"
    :title="active?.label"
    :description="activeRules.goal"
    :dismissible="!playing"
    :close="!playing"
    scrollable
    :ui="{
      content: 'sm:max-w-2xl',
      header: 'items-start pr-12 p-4 sm:px-6',
      description: 'text-pretty max-w-prose',
      body: 'space-y-4 p-4 sm:p-6',
      footer: 'justify-between gap-3 p-4 sm:px-6'
    }"
  >
    <template #body>
      <div v-if="active" class="arena">
        <section class="rules-box" aria-labelledby="game-rules-title">
          <div class="rules-head">
            <UIcon name="i-lucide-scroll-text" class="size-5" />
            <h4 id="game-rules-title">{{ $t("userGuild.games.rules.title") }}</h4>
          </div>
          <ol class="rules-steps">
            <li v-for="(step, index) in activeRules.steps" :key="index">{{ step }}</li>
          </ol>
          <div v-if="activeRules.rows.length" class="rules-facts">
            <div v-for="(row, index) in activeRules.rows" :key="`${row.label}-${index}`" class="rules-fact">
              <span class="rules-fact-label">{{ row.label }}</span>
              <strong class="rules-fact-value">{{ String(row.value ?? "") }}</strong>
            </div>
          </div>
          <p v-for="(note, index) in activeRules.notes" :key="`note-${index}`" class="rules-note">{{ note }}</p>
        </section>

        <div
          class="stage"
          :class="{
            win: phase === 'settled' && result?.win && !result?.jackpot,
            jackpot: phase === 'settled' && result?.jackpot,
            lose: phase === 'settled' && result && !result.win && !result.error
          }"
        >
          <div v-if="active.id === 'flip'" class="stage-flip">
            <div v-if="activeFlipJackpot" class="jackpot-callout" :class="{ hit: result?.jackpot }">
              <strong>{{ result?.jackpot ? $t("userGuild.games.jackpotHitTitle") : $t("userGuild.games.jackpotCalloutTitle") }}</strong>
              <p v-if="result?.jackpot">
                {{ $t("userGuild.games.jackpotHit", {
                  jpMult: formatMult(activeFlipJackpot.multiplier),
                  winMult: formatMult(activeFlipJackpot.winMult)
                }) }}
              </p>
              <p v-else>
                {{ $t("userGuild.games.jackpotCallout", {
                  chance: chancePct(activeFlipJackpot.chance),
                  jpMult: formatMult(activeFlipJackpot.multiplier),
                  winMult: formatMult(activeFlipJackpot.winMult),
                  realChance: chancePct(activeFlipJackpot.realChance)
                }) }}
              </p>
            </div>
            <div class="coin-scene">
              <div class="coin" :class="{ jackpot: result?.jackpot }" :style="{ transform: `rotateY(${coinDeg}deg)` }">
                <div class="coin-side pile">{{ $t("userGuild.games.pile") }}</div>
                <div class="coin-side face">{{ $t("userGuild.games.face") }}</div>
              </div>
            </div>
          </div>

          <div v-else-if="active.id === 'dice'" class="stage-dice">
            <div v-if="diceSides <= 6" class="dice-scene">
              <div class="dice-cube" :style="{ transform: `rotateX(${diceX}deg) rotateY(${diceY}deg)` }">
                <div class="dice-face f1">1</div>
                <div class="dice-face f2">2</div>
                <div class="dice-face f3">3</div>
                <div class="dice-face f4">4</div>
                <div class="dice-face f5">5</div>
                <div class="dice-face f6">6</div>
              </div>
            </div>
            <div v-else class="dice-number" :class="{ blur: playing }">{{ diceFace || "?" }}</div>
          </div>

          <div v-else-if="active.id === 'roulette'" class="stage-roulette">
            <div class="wheel-wrap">
              <div class="wheel-pin"></div>
              <div class="wheel" :style="{ transform: `rotate(${wheelDeg}deg)` }"></div>
              <div class="wheel-hub">{{ landedColor ? colorLabel(landedColor) : "●" }}</div>
            </div>
          </div>

          <div v-else-if="active.id === 'slot'" class="stage-slot">
            <div class="slot-machine" :class="{ spinning: slotMoving }">
              <span class="slot-side-mark left" aria-hidden="true">▶</span>
              <div class="slot-frame">
                <div class="slot-payline" aria-hidden="true"></div>
                <div
                  v-for="(reel, index) in slotReels"
                  :key="`reel-${index}`"
                  class="slot-reel"
                  :class="{ spinning: slotMoving }"
                >
                  <div class="slot-track" :style="slotStyle(index)">
                    <div v-for="(symbol, idx) in reel" :key="`s-${index}-${idx}`" class="slot-cell">{{ symbol }}</div>
                  </div>
                  <div class="slot-reel-curve top" aria-hidden="true"></div>
                  <div class="slot-reel-curve bottom" aria-hidden="true"></div>
                </div>
              </div>
              <span class="slot-side-mark right" aria-hidden="true">◀</span>
            </div>
            <p class="slot-payline-hint">{{ $t("userGuild.games.slotPayline") }}</p>
          </div>

          <div v-else-if="active.id === 'crash'" class="stage-crash">
            <div class="crash-mult" :class="{ boom: crashBoom, cashed: crashCashed }">{{ crashDisplay.toFixed(2) }}×</div>
            <div class="crash-bar">
              <span class="fill" :style="{ width: `${Math.min(100, (crashDisplay / Math.max(2, cashout)) * 50)}%` }"></span>
              <i class="mark" :style="{ left: `${Math.min(96, (Number(cashout) / Math.max(crashDisplay, Number(cashout), 2)) * 100)}%` }"></i>
            </div>
          </div>

          <div v-else-if="active.id === 'double'" class="stage-double">
            <div class="lounge-double" ref="doubleWindowRef">
              <div class="lounge-double-track" :style="doubleStyle">
                <div
                  v-for="(entry, index) in doubleItems"
                  :key="`dbl-${doubleSpinId}-${index}`"
                  class="lounge-double-cell"
                  :class="entry === 'win' ? 'is-win' : 'is-lose'"
                >
                  {{ entry === "win" ? $t("userGuild.games.doubleWin") : $t("userGuild.games.doubleLose") }}
                </div>
              </div>
              <div class="lounge-double-fade left" aria-hidden="true"></div>
              <div class="lounge-double-fade right" aria-hidden="true"></div>
              <div class="lounge-double-pointer" aria-hidden="true"></div>
            </div>
          </div>

          <div v-else-if="active.id === 'mystery'" class="stage-mystery">
            <div class="chest" :class="{ shake: playing, open: mysteryOpen }">
              <span class="lid">📦</span>
              <span class="spark">✨</span>
            </div>
            <div v-if="mysteryMult !== null" class="mystery-mult">×{{ mysteryMult }}</div>
          </div>

          <div v-else-if="active.id === 'higherLower'" class="stage-hl">
            <div class="hl-card" :class="{ show: hlCurrent !== null }">{{ hlCurrent ?? "?" }}</div>
            <div class="hl-vs">{{ choice === "moins" ? "▼" : "▲" }}</div>
            <div class="hl-card" :class="{ show: hlNext !== null }">{{ hlNext ?? "?" }}</div>
          </div>
        </div>

        <div v-if="statusPills.length" class="status-row">
          <UBadge
            v-for="pill in statusPills"
            :key="pill.label"
            :color="pill.color || (pill.accent ? 'primary' : 'neutral')"
            variant="subtle"
            size="md"
          >
            {{ pill.label }}
            <strong class="status-value">{{ pill.value }}</strong>
          </UBadge>
        </div>

        <UAlert
          v-if="result"
          :color="result.error ? 'warning' : result.jackpot ? 'warning' : result.win ? 'success' : 'error'"
          variant="subtle"
          :icon="result.error ? 'i-lucide-triangle-alert' : result.jackpot ? 'i-lucide-gem' : result.win ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
          :title="result.error ? $t('userGuild.games.blockedTitle') : result.jackpot ? $t('userGuild.games.jackpotHitTitle') : result.win ? $t('userGuild.games.win') : $t('userGuild.games.lose')"
        >
          <template #description>
            <span v-if="result.error" class="result-desc">{{ result.label }}</span>
            <span v-else-if="result.label && result.amount !== undefined" class="result-desc">
              {{ result.label }} {{ result.amount }}
              <img
                v-if="resolvedCurrencyIconUrl"
                :src="resolvedCurrencyIconUrl"
                class="currency-icon"
                alt=""
              />
              <span v-else-if="currencyTextFallback">{{ currencyTextFallback }}</span>
            </span>
            <span v-else-if="result.jackpot" class="result-desc">{{ $t("userGuild.games.jackpot") }}</span>
          </template>
        </UAlert>

        <div class="controls">
          <UFormField
            :label="$t('userGuild.games.bet')"
            :help="betError ? undefined : $t('userGuild.games.betHint', { min: active.minBet, max: active.maxBet })"
            :error="betError || undefined"
          >
            <div class="field-stack">
              <UInput
                :model-value="bet"
                type="number"
                size="lg"
                class="w-full"
                :min="active.minBet"
                :max="active.maxBet || undefined"
                :disabled="playing"
                :ui="{ trailing: 'pointer-events-none pe-3' }"
                @update:model-value="bet = Number($event)"
              >
                <template #trailing>
                  <img v-if="resolvedCurrencyIconUrl" :src="resolvedCurrencyIconUrl" class="currency-icon" alt="" />
                  <span v-else-if="currencyTextFallback" class="input-suffix">{{ currencyTextFallback }}</span>
                </template>
              </UInput>
              <div class="bet-presets">
                <UButton size="sm" color="neutral" variant="soft" :disabled="playing" @click="bet = active.minBet">
                  {{ $t("userGuild.games.minBet") }} · {{ active.minBet }}
                </UButton>
                <UButton size="sm" color="neutral" variant="soft" :disabled="playing" @click="bet = midBet">
                  {{ $t("userGuild.games.presetMid") }} · {{ midBet }}
                </UButton>
                <UButton size="sm" color="neutral" variant="soft" :disabled="playing" @click="bet = active.maxBet">
                  {{ $t("userGuild.games.maxBet") }} · {{ active.maxBet }}
                </UButton>
              </div>
            </div>
          </UFormField>

          <UFormField
            v-if="active.choiceType === 'select'"
            :label="$t('userGuild.games.choice')"
            :help="choiceHelp"
          >
            <div class="choice-row">
              <UButton
                v-for="option in active.choices"
                :key="option"
                :color="choiceButtonColor(option)"
                :variant="choice === option ? 'solid' : 'outline'"
                :disabled="playing"
                @click="choice = option"
              >
                <span v-if="isColorChoice(option)" class="color-dot" :class="option"></span>
                {{ choiceLabel(option) }}
              </UButton>
            </div>
          </UFormField>

          <UFormField
            v-else-if="active.choiceType === 'number'"
            :label="$t('userGuild.games.choice')"
            :help="choiceHelp"
          >
            <div class="dice-grid" :class="{ compact: diceSides > 10 }">
              <UButton
                v-for="n in diceSides"
                :key="n"
                :size="diceSides > 10 ? 'sm' : 'md'"
                :color="Number(choiceNumber) === n ? 'primary' : 'neutral'"
                :variant="Number(choiceNumber) === n ? 'solid' : 'outline'"
                :disabled="playing"
                :square="diceSides <= 9"
                @click="choiceNumber = n"
              >
                {{ n }}
              </UButton>
            </div>
          </UFormField>

          <UFormField
            v-else-if="active.choiceType === 'cashout'"
            :label="$t('userGuild.games.cashout')"
            :help="cashoutHelp"
          >
            <UInput
              :model-value="cashout"
              type="number"
              size="lg"
              class="w-full"
              min="1"
              step="0.1"
              :disabled="playing"
              :ui="{ trailing: 'pointer-events-none pe-3' }"
              @update:model-value="cashout = Number($event)"
            >
              <template #trailing>
                <span class="input-suffix">×</span>
              </template>
            </UInput>
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        :icon="muted ? 'i-lucide-volume-x' : 'i-lucide-volume-2'"
        :aria-label="muted ? $t('userGuild.games.unmute') : $t('userGuild.games.mute')"
        @click="toggleMute"
      />
      <div class="modal-actions">
        <UButton color="neutral" variant="outline" :disabled="playing" @click="closeArena">
          {{ $t("common.close") }}
        </UButton>
        <UButton color="primary" :disabled="playing || cooldownLeft > 0 || Boolean(betError)" @click="play">
          {{ playLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup>
const props = defineProps({
  settings: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  advancedUnlocked: { type: Boolean, default: false },
  guildId: { type: String, required: true },
  currencySymbol: { type: String, default: "💰" },
  currencyIconUrl: { type: String, default: "" }
});

const emit = defineEmits(["played"]);
const { t } = useI18n();
const config = useRuntimeConfig();
const { getToken, login } = useAuth();
const { muted, toggleMute, playCoin, playWin, playLose, playTick } = useGameAudio();

const active = ref(null);
const phase = ref("idle");
const playing = ref(false);
const bet = ref(10);
const choice = ref("");
const choiceNumber = ref(1);
const cashout = ref(2);
const result = ref(null);
const cooldownUntil = ref(0);
const cooldownTick = ref(0);
let cooldownTimer = null;
let spinRaf = 0;

const coinDeg = ref(0);
const landedFlip = ref("");
const diceX = ref(-18);
const diceY = ref(22);
const diceFace = ref(null);
const landedDice = ref(null);
const wheelDeg = ref(0);
const landedColor = ref("");
const slotReels = ref([["💎"], ["🍒"], ["⭐"]]);
const slotOffsets = ref([0, 0, 0]);
const slotMoving = ref(false);
const crashDisplay = ref(1);
const crashBoom = ref(false);
const crashCashed = ref(false);
const crashAt = ref(null);
const doubleItems = ref([]);
const doubleOffset = ref(0);
const doubleSpinning = ref(false);
const doubleSpinId = ref(0);
const doubleWindowRef = ref(null);
const mysteryOpen = ref(false);
const mysteryMult = ref(null);
const hlCurrent = ref(null);
const hlNext = ref(null);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const coverOf = (id) => `/games/${id}.webp`;
const iconOf = (id) => ({ flip: "🪙", dice: "🎲", roulette: "🎡", higherLower: "📈", crash: "🚀", double: "⚡", slot: "🎰", mystery: "✨" }[id] || "🎮");
const descOf = (id) => t(`userGuild.games.${id}Desc`);
const colorLabel = (value) => choiceLabel(value);

const choiceLabel = (option) => {
  const map = {
    pile: t("userGuild.games.choicePile"),
    face: t("userGuild.games.choiceFace"),
    plus: t("userGuild.games.choicePlus"),
    moins: t("userGuild.games.choiceMinus"),
    red: t("userGuild.games.choiceRed"),
    black: t("userGuild.games.choiceBlack"),
    green: t("userGuild.games.choiceGreen")
  };
  return map[String(option || "")] || option;
};

const houseKeepRate = () => 1 - Math.max(0, Number(props.settings?.houseEdgePercent || 0)) / 100;

const isFlipJackpotOn = (cfg = {}) =>
  cfg.jackpotEnabled !== false && Number(cfg.jackpotChancePercent || 0) > 0;

const flipJackpotInfo = (cfg = {}) => {
  if (!isFlipJackpotOn(cfg)) return null;
  const chance = Math.min(100, Math.max(0, Number(cfg.jackpotChancePercent || 0)));
  const multiplier = Number(cfg.jackpotMultiplier || 0);
  const winMult = Number(cfg.winMultiplier || 2);
  return {
    chance,
    multiplier,
    winMult,
    realChance: (50 * chance) / 100
  };
};

const maxPayoutInfo = (id, cfg = {}) => {
  let multiplier = 0;
  let reason = "win";
  if (id === "flip") {
    const win = Number(cfg.winMultiplier || 0);
    const jackpotOn = isFlipJackpotOn(cfg);
    const jackpot = jackpotOn ? Number(cfg.jackpotMultiplier || 0) : 0;
    if (jackpot > win) {
      multiplier = jackpot;
      reason = "jackpot";
    } else {
      multiplier = win;
    }
  } else if (id === "dice" || id === "higherLower") {
    multiplier = Number(cfg.winMultiplier || 0);
  } else if (id === "double") {
    multiplier = Number(cfg.multiplier || 0);
  } else if (id === "crash") {
    multiplier = Number(cfg.maxMultiplier || 0);
    reason = "cashoutMax";
  } else if (id === "roulette") {
    const colors = [
      ["red", Number(cfg.red?.multiplier || 0)],
      ["black", Number(cfg.black?.multiplier || 0)],
      ["green", Number(cfg.green?.multiplier || 0)]
    ].sort((a, b) => b[1] - a[1]);
    multiplier = colors[0][1];
    reason = colors[0][0];
  } else if (id === "slot") {
    const pays = (Array.isArray(cfg.payouts) ? cfg.payouts : []).map((row) => Number(row.multiplier || 0));
    multiplier = Math.max(Number(cfg.twoOfKindMultiplier || 0), ...pays, 0);
    reason = "bestCombo";
  } else if (id === "mystery") {
    const outcomes = Array.isArray(cfg.outcomes) ? cfg.outcomes : [];
    multiplier = outcomes.reduce((max, row) => Math.max(max, Number(row.multiplier || 0)), 0);
    reason = "bestChest";
  }
  return { multiplier, reason };
};

const games = computed(() => {
  const settings = props.settings || {};
  if (settings.enabled === false) return [];
  const catalog = [
    { id: "flip", choiceType: "select", choices: ["pile", "face"] },
    { id: "dice", choiceType: "number" },
    { id: "slot", choiceType: "" },
    { id: "roulette", choiceType: "select", choices: ["red", "black", "green"] },
    { id: "higherLower", choiceType: "select", choices: ["plus", "moins"] },
    { id: "crash", choiceType: "cashout" },
    { id: "double", choiceType: "" },
    { id: "mystery", choiceType: "" }
  ];
  const keep = houseKeepRate();
  return catalog
    .filter((game) => settings[game.id]?.enabled !== false)
    .filter((game) => props.advancedUnlocked || game.id === "flip")
    .map((game) => {
      const config = settings[game.id] || {};
      const minBet = Number(settings.minBet || 1);
      const maxBet = Number(settings.maxBet || 10000);
      const info = maxPayoutInfo(game.id, config);
      return {
        ...game,
        label: t(`userGuild.games.${game.id}`),
        minBet,
        maxBet,
        config,
        jackpot: game.id === "flip" ? flipJackpotInfo(config) : null,
        maxMultiplier: info.multiplier,
        maxReason: info.reason,
        maxPayout: Math.max(0, Math.floor(maxBet * info.multiplier * keep))
      };
    });
});

const payoutRanking = computed(() =>
  [...games.value].sort((a, b) => b.maxPayout - a.maxPayout || b.maxMultiplier - a.maxMultiplier)
);
const topPayoutId = computed(() => payoutRanking.value[0]?.id || "");

const activeFlipJackpot = computed(() => (active.value?.id === "flip" ? active.value.jackpot : null));
const diceSides = computed(() => Math.max(2, Math.min(20, Number(active.value?.config?.sides || 6))));
const slotSymbols = computed(() => {
  const list = active.value?.config?.symbols;
  return Array.isArray(list) && list.length ? list : ["💎", "🍒", "⭐", "🍋"];
});

const arenaOpen = computed({
  get: () => Boolean(active.value),
  set: (open) => {
    if (open || playing.value) return;
    closeArena();
  }
});

const midBet = computed(() => {
  if (!active.value) return 10;
  const min = Number(active.value.minBet || 1);
  const max = Number(active.value.maxBet || min);
  return Math.max(min, Math.floor((min + max) / 2));
});

const playLabel = computed(() => {
  if (playing.value) return t("userGuild.games.playing");
  if (cooldownLeft.value > 0) return `${t("userGuild.games.cooldown")} ${cooldownLeft.value}s`;
  if (result.value) return t("userGuild.games.replay");
  return t("userGuild.games.play");
});

const isColorChoice = (option) => ["red", "black", "green"].includes(String(option || ""));
const choiceButtonColor = (option) => {
  if (option === "red") return "error";
  if (option === "green") return "success";
  if (option === "black") return "neutral";
  return choice.value === option ? "primary" : "neutral";
};

const formatMult = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "×0";
  const rounded = Math.round(n * 100) / 100;
  return `×${rounded}`;
};

const chancePct = (value) => {
  const n = Number(value || 0);
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded}%`;
};

const netPayout = (stake, multiplier) => {
  const edge = Math.max(0, Number(props.settings?.houseEdgePercent || 0));
  return Math.max(0, Math.floor(Number(stake || 0) * Number(multiplier || 0) * (1 - edge / 100)));
};

const activeRules = computed(() => {
  const game = active.value;
  if (!game) return { goal: "", steps: [], rows: [], notes: [] };
  const cfg = game.config || {};
  const id = game.id;
  const edge = Math.max(0, Number(props.settings?.houseEdgePercent || 0));
  const stake = Number(bet.value) > 0 ? Number(bet.value) : Number(game.minBet || 10);
  const tk = (name, params) => t(`userGuild.games.rules.${id}.${name}`, params);
  const steps = [];
  const rows = [];
  const notes = [];
  let exampleMult = 0;

  if (id === "flip") {
    const winMult = Number(cfg.winMultiplier || 2);
    exampleMult = winMult;
    steps.push(tk("step1"), tk("step2"), tk("step3", { multiplier: formatMult(winMult) }));
    rows.push({ label: t("userGuild.games.rules.chance"), value: "50%" });
    rows.push({
      label: t("userGuild.games.rules.payout"),
      value: `${formatMult(winMult)} · ${t("userGuild.games.rules.beforeCommission")}`
    });
    const jackpot = flipJackpotInfo(cfg);
    if (jackpot) {
      steps.push(tk("jackpot", {
        chance: chancePct(jackpot.chance),
        multiplier: formatMult(jackpot.multiplier)
      }));
      rows.push({
        label: t("userGuild.games.rules.jackpotChance"),
        value: `${chancePct(jackpot.chance)} · ${t("userGuild.games.rules.afterWin")}`
      });
      rows.push({
        label: t("userGuild.games.rules.jackpotPayout"),
        value: `${formatMult(jackpot.multiplier)} · ${t("userGuild.games.rules.replacesWin")}`
      });
      notes.push(tk("jackpotReal", {
        realChance: chancePct(jackpot.realChance),
        chance: chancePct(jackpot.chance)
      }));
    }
  } else if (id === "dice") {
    const sides = diceSides.value;
    const winMult = Number(cfg.winMultiplier || 5);
    exampleMult = winMult;
    steps.push(
      tk("step1", { sides }),
      tk("step2", { sides, chance: chancePct(100 / sides) }),
      tk("step3", { multiplier: formatMult(winMult) })
    );
    rows.push({ label: t("userGuild.games.rules.chance"), value: `1/${sides} (${chancePct(100 / sides)})` });
    rows.push({
      label: t("userGuild.games.rules.payout"),
      value: `${formatMult(winMult)} · ${t("userGuild.games.rules.beforeCommission")}`
    });
  } else if (id === "roulette") {
    steps.push(tk("step1"), tk("step2"), tk("step3"));
    for (const color of ["red", "black", "green"]) {
      const item = cfg[color] || {};
      rows.push({
        label: choiceLabel(color),
        value: t("userGuild.games.rules.colorOdds", {
          chance: chancePct(item.chance),
          multiplier: formatMult(item.multiplier)
        })
      });
    }
    const selected = cfg[choice.value] || cfg.red || {};
    exampleMult = Number(selected.multiplier || 0);
  } else if (id === "higherLower") {
    const max = Math.max(2, Number(cfg.maxNumber || 10));
    const winMult = Number(cfg.winMultiplier || 2);
    exampleMult = winMult;
    steps.push(
      tk("step1", { max }),
      tk("step2"),
      tk("step3", { multiplier: formatMult(winMult) }),
      tk("step4")
    );
    rows.push({
      label: t("userGuild.games.rules.payout"),
      value: `${formatMult(winMult)} · ${t("userGuild.games.rules.beforeCommission")}`
    });
  } else if (id === "crash") {
    const max = formatMult(cfg.maxMultiplier || 20);
    const cash = Math.max(1, Number(cashout.value || 2));
    exampleMult = cash;
    steps.push(tk("step1"), tk("step2", { max }), tk("step3"), tk("step4"));
    rows.push({ label: t("userGuild.games.cashout"), value: formatMult(cash) });
    rows.push({ label: t("userGuild.games.rules.payout"), value: `${formatMult(cash)} ${t("userGuild.games.rules.beforeCommission")}` });
  } else if (id === "double") {
    const winMult = Number(cfg.multiplier || 2);
    exampleMult = winMult;
    steps.push(tk("step1"), tk("step2", { multiplier: formatMult(winMult) }), tk("step3"));
    rows.push({ label: t("userGuild.games.rules.chance"), value: "50%" });
    rows.push({
      label: t("userGuild.games.rules.payout"),
      value: `${formatMult(winMult)} · ${t("userGuild.games.rules.beforeCommission")}`
    });
  } else if (id === "slot") {
    const symbols = slotSymbols.value.join(" ");
    const twoKind = Number(cfg.twoOfKindMultiplier || 0);
    steps.push(tk("step1", { symbols }), tk("step2"));
    if (twoKind > 0) steps.push(tk("step3", { multiplier: formatMult(twoKind) }));
    steps.push(tk("step4"));
    const payouts = Array.isArray(cfg.payouts) ? cfg.payouts : [];
    for (const row of payouts) {
      rows.push({ label: String(row.combo || t("userGuild.games.rules.combo")), value: formatMult(row.multiplier) });
    }
    if (twoKind > 0) {
      rows.push({ label: t("userGuild.games.rules.twoKind"), value: formatMult(twoKind) });
    }
    exampleMult = Number(payouts[0]?.multiplier || twoKind || 0);
  } else if (id === "mystery") {
    const outcomes = Array.isArray(cfg.outcomes) ? cfg.outcomes : [];
    const total = outcomes.reduce((sum, item) => sum + Math.max(0, Number(item.chance || 0)), 0) || 1;
    steps.push(tk("step1"), tk("step2"), tk("step3"));
    for (const item of outcomes) {
      const mult = Number(item.multiplier || 0);
      const weight = chancePct((Math.max(0, Number(item.chance || 0)) / total) * 100);
      rows.push({
        label: formatMult(mult),
        value: mult <= 0 ? `${weight} · ${tk("lose")}` : weight
      });
    }
    const firstWin = outcomes.find((item) => Number(item.multiplier || 0) > 0);
    exampleMult = Number(firstWin?.multiplier || 0);
  }

  if (game.maxPayout) {
    rows.unshift({
      label: t("userGuild.games.maxPayoutFact"),
      value: `${game.maxPayout} (${formatMult(game.maxMultiplier)} · ${t(`userGuild.games.payoutReason.${game.maxReason}`)})`
    });
  }

  notes.push(t("userGuild.games.rules.youLose"));
  if (edge > 0) notes.push(t("userGuild.games.rules.commission", { edge }));
  if (id === "crash" && exampleMult > 0) {
    notes.push(t("userGuild.games.rules.exampleCrash", {
      bet: stake,
      cashout: formatMult(exampleMult),
      payout: netPayout(stake, exampleMult)
    }));
  } else if (exampleMult > 0) {
    notes.push(t("userGuild.games.rules.example", { bet: stake, payout: netPayout(stake, exampleMult) }));
  }

  return { goal: tk("goal"), steps, rows, notes };
});

const choiceHelp = computed(() => {
  const id = active.value?.id;
  if (id === "dice") {
    return t("userGuild.games.rules.dice.choiceHelp", {
      sides: diceSides.value,
      chance: chancePct(100 / diceSides.value)
    });
  }
  if (id === "flip") return t("userGuild.games.rules.flip.choiceHelp");
  if (id === "roulette") return t("userGuild.games.rules.roulette.choiceHelp");
  if (id === "higherLower") {
    return t("userGuild.games.rules.higherLower.choiceHelp", {
      max: Math.max(2, Number(active.value?.config?.maxNumber || 10))
    });
  }
  return t("userGuild.games.choiceHint");
});

const cashoutHelp = computed(() =>
  t("userGuild.games.rules.crash.choiceHelp", {
    max: formatMult(active.value?.config?.maxMultiplier || 20)
  })
);

const statusPills = computed(() => {
  if (!active.value) return [];
  const pills = [];
  if (active.value.choiceType === "select" && choice.value) {
    pills.push({ label: t("userGuild.games.yourChoice"), value: choiceLabel(choice.value), accent: false });
  }
  if (active.value.choiceType === "number") {
    pills.push({ label: t("userGuild.games.yourChoice"), value: String(choiceNumber.value), accent: false });
  }
  if (active.value.id === "flip" && landedFlip.value) {
    pills.push({ label: t("userGuild.games.landedOn"), value: choiceLabel(landedFlip.value), accent: true });
  }
  if (result.value?.jackpot) {
    pills.push({
      label: t("userGuild.games.jackpot"),
      value: formatMult(activeFlipJackpot.value?.multiplier || active.value.config?.jackpotMultiplier),
      accent: true,
      color: "warning"
    });
  }
  if (active.value.id === "dice" && landedDice.value) {
    pills.push({ label: t("userGuild.games.landedOn"), value: String(landedDice.value), accent: true });
  }
  if (active.value.id === "roulette" && landedColor.value) {
    pills.push({ label: t("userGuild.games.landedOn"), value: colorLabel(landedColor.value), accent: true });
  }
  if (active.value.id === "crash") {
    pills.push({ label: t("userGuild.games.cashout"), value: `${Number(cashout.value).toFixed(2)}×`, accent: false });
    if (crashAt.value) pills.push({ label: t("userGuild.games.crashedAt"), value: `${crashAt.value.toFixed(2)}×`, accent: true });
  }
  if (active.value.id === "higherLower" && hlCurrent.value !== null && hlNext.value !== null && hlCurrent.value === hlNext.value) {
    pills.push({ label: t("userGuild.games.result"), value: t("userGuild.games.tieLose"), accent: true });
  }
  return pills;
});

const isDiscordEmojiMarkup = (value) => /^<a?:[^:>]+:\d+>$/.test(String(value || "").trim());

const resolvedCurrencyIconUrl = computed(() => {
  if (props.currencyIconUrl) return props.currencyIconUrl;
  const raw = String(props.currencySymbol || "").trim();
  const match = raw.match(/^<(a)?:([^:>]+):(\d+)>$/);
  if (!match) return "";
  return `https://cdn.discordapp.com/emojis/${match[3]}.${match[1] ? "gif" : "png"}?size=48&quality=lossless`;
});

const currencyTextFallback = computed(() => {
  const raw = String(props.currencySymbol || "").trim();
  if (!raw || isDiscordEmojiMarkup(raw)) return "";
  return raw;
});

const betError = computed(() => {
  if (!active.value) return "";
  const value = Number(bet.value || 0);
  if (!Number.isFinite(value) || value <= 0) return t("userGuild.games.betInvalid");
  if (value < active.value.minBet) return t("userGuild.games.betBelowMin", { min: active.value.minBet });
  if (active.value.maxBet > 0 && value > active.value.maxBet) return t("userGuild.games.betAboveMax", { max: active.value.maxBet });
  return "";
});

const cooldownLeft = computed(() => {
  cooldownTick.value;
  if (!cooldownUntil.value) return 0;
  return Math.max(0, Math.ceil((cooldownUntil.value - Date.now()) / 1000));
});

const SLOT_CELL = 76;
const DOUBLE_CELL = 140;
const DOUBLE_GAP = 10;
const DOUBLE_STEP = DOUBLE_CELL + DOUBLE_GAP;

const slotStyle = (index) => ({
  transform: `translate3d(0, ${slotOffsets.value[index]}px, 0)`
});

const doubleStyle = computed(() => ({
  transform: `translate3d(${-doubleOffset.value}px, 0, 0)`
}));

const stopSpin = () => {
  if (spinRaf) cancelAnimationFrame(spinRaf);
  spinRaf = 0;
};

const easeOutCubic = (p) => 1 - (1 - p) ** 3;

const easeTo = (from, to, duration, apply) =>
  new Promise((resolve) => {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      apply(from + (to - from) * easeOutCubic(p));
      if (p < 1) spinRaf = requestAnimationFrame(tick);
      else resolve();
    };
    spinRaf = requestAnimationFrame(tick);
  });

const animateOffsets = (getFrom, getTo, duration, apply, staggerMs = 0) =>
  new Promise((resolve) => {
    const start = performance.now();
    const count = getTo().length;
    const tick = (now) => {
      let done = true;
      for (let i = 0; i < count; i += 1) {
        const localStart = start + i * staggerMs;
        const p = Math.min(1, Math.max(0, (now - localStart) / duration));
        const from = getFrom()[i];
        const to = getTo()[i];
        apply(i, from + (to - from) * easeOutCubic(p));
        if (p < 1) done = false;
      }
      if (!done) spinRaf = requestAnimationFrame(tick);
      else resolve();
    };
    spinRaf = requestAnimationFrame(tick);
  });

const openGame = (game) => {
  active.value = game;
  phase.value = "idle";
  playing.value = false;
  result.value = null;
  bet.value = Number(game.minBet || 10);
  choice.value = game.choices?.[0] || "";
  choiceNumber.value = 1;
  cashout.value = Math.min(2, Number(game.config?.maxMultiplier || 2));
  resetVisuals();
  if (game.id === "double") {
    nextTick(() => seedDoubleStrip(18));
  }
};

const resetVisuals = () => {
  stopSpin();
  landedFlip.value = "";
  landedDice.value = null;
  landedColor.value = "";
  crashDisplay.value = 1;
  crashBoom.value = false;
  crashCashed.value = false;
  crashAt.value = null;
  mysteryOpen.value = false;
  mysteryMult.value = null;
  hlCurrent.value = null;
  hlNext.value = null;
  diceFace.value = null;
  coinDeg.value = 0;
  diceX.value = -18;
  diceY.value = 22;
  wheelDeg.value = wheelDeg.value % 360;
  slotReels.value = [0, 1, 2].map(() => Array.from({ length: 8 }, () => slotSymbols.value[Math.floor(Math.random() * slotSymbols.value.length)]));
  slotOffsets.value = [0, 0, 0];
  doubleItems.value = [];
  doubleOffset.value = 0;
  doubleSpinning.value = false;
};

const closeArena = () => {
  if (playing.value) return;
  stopSpin();
  active.value = null;
  result.value = null;
  phase.value = "idle";
};

const playError = (payload = {}) => {
  const reason = String(payload.reason || payload.error || "");
  if (reason === "max_bet") return t("userGuild.games.betAboveMax", { max: payload.maxBet || active.value?.maxBet || 0 });
  if (reason === "min_bet") return t("userGuild.games.betBelowMin", { min: payload.minBet || active.value?.minBet || 0 });
  if (reason === "invalid_bet") return t("userGuild.games.betInvalid");
  if (reason === "insufficient_funds" || reason === "insufficient_balance") return t("userGuild.games.insufficientFunds");
  if (reason === "cooldown") return t("userGuild.games.cooldownActive");
  if (reason === "games_disabled" || reason === "game_disabled") return t("userGuild.games.disabled");
  return t("userGuild.games.playError");
};

const fetchPlay = async (payload) => {
  const token = getToken();
  if (!token) {
    login();
    return null;
  }
  const res = await fetch(`${config.public.apiBase}/api/user/guilds/${props.guildId}/games/play`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (res.status === 401) {
    login();
    return null;
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
};

const DICE_POSE = {
  1: [0, 0],
  2: [0, -90],
  3: [0, 180],
  4: [0, 90],
  5: [-90, 0],
  6: [90, 0]
};

const landCoin = async (face) => {
  const offset = face === "face" ? 180 : 0;
  const current = coinDeg.value;
  const target = Math.ceil((current + 12) / 360) * 360 + 720 + offset;
  await easeTo(current, target, 1100, (value) => {
    coinDeg.value = value;
  });
  coinDeg.value = target;
  landedFlip.value = face;
};

const landDice = async (roll) => {
  const pose = DICE_POSE[roll] || [0, 0];
  const fromX = diceX.value;
  const fromY = diceY.value;
  const toX = Math.ceil((fromX + 20) / 360) * 360 + 720 + pose[0];
  const toY = Math.ceil((fromY + 20) / 360) * 360 + 360 + pose[1];
  const start = performance.now();
  await new Promise((resolve) => {
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 1200);
      const eased = 1 - (1 - p) ** 3;
      diceX.value = fromX + (toX - fromX) * eased;
      diceY.value = fromY + (toY - fromY) * eased;
      if (p < 1) spinRaf = requestAnimationFrame(tick);
      else resolve();
    };
    spinRaf = requestAnimationFrame(tick);
  });
  diceX.value = toX;
  diceY.value = toY;
  diceFace.value = roll;
  landedDice.value = roll;
};

const landWheel = async (color) => {
  const pocket = color === "green" ? 4 : color === "black" ? 15 + Math.floor(Math.random() * 18) * 20 : 5 + Math.floor(Math.random() * 18) * 20;
  const current = wheelDeg.value;
  const target = current + 360 * 5 + (360 - (pocket % 360));
  await easeTo(current, target, 2400, (value) => {
    wheelDeg.value = value;
  });
  landedColor.value = color;
};

const spinSlots = async (symbols) => {
  stopSpin();
  const pool = slotSymbols.value.length ? slotSymbols.value : ["💎", "🍒", "⭐", "🍋"];
  const targets = Array.isArray(symbols) && symbols.length === 3 ? symbols : pool.slice(0, 3);
  const builds = targets.map((symbol) => {
    const reel = Array.from({ length: 28 }, () => pool[Math.floor(Math.random() * pool.length)]);
    // Middle payline = index of symbol that lands in the center cell (offset so symbol is 2nd visible)
    const centerIndex = reel.length - 3;
    reel[centerIndex] = symbol;
    return { reel, centerIndex };
  });
  slotMoving.value = false;
  slotReels.value = builds.map((item) => item.reel);
  const from = [0, 0, 0];
  slotOffsets.value = [...from];
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const to = builds.map((item) => -((item.centerIndex - 1) * SLOT_CELL));
  slotMoving.value = true;
  // ~3.4s spin, slight stagger so stops feel mechanical without looking desynced
  await animateOffsets(
    () => from,
    () => to,
    3400,
    (index, value) => {
      const next = [...slotOffsets.value];
      next[index] = value;
      slotOffsets.value = next;
    },
    160
  );
  slotOffsets.value = to;
  slotMoving.value = false;
};

const spinDouble = async (win) => {
  stopSpin();
  doubleSpinId.value += 1;
  const total = 42;
  const target = total - 7;
  const items = Array.from({ length: total }, (_, index) => (index % 3 === 0 ? "win" : "lose"));
  items[target] = win ? "win" : "lose";
  doubleItems.value = items;
  doubleSpinning.value = false;
  const approxWidth = doubleWindowRef.value?.clientWidth || 420;
  const from = Math.max(0, 2 * DOUBLE_STEP + DOUBLE_CELL / 2 - approxWidth / 2);
  doubleOffset.value = from;
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const width = doubleWindowRef.value?.clientWidth || approxWidth;
  const to = Math.max(0, target * DOUBLE_STEP + DOUBLE_CELL / 2 - width / 2);
  doubleSpinning.value = true;
  await easeTo(from, to, 2800, (value) => {
    doubleOffset.value = value;
  });
  doubleOffset.value = to;
  doubleSpinning.value = false;
};

const seedDoubleStrip = (count = 18) => {
  doubleSpinId.value += 1;
  doubleItems.value = Array.from({ length: count }, (_, index) => (index % 3 === 0 ? "win" : "lose"));
  const approxWidth = doubleWindowRef.value?.clientWidth || 420;
  doubleOffset.value = Math.max(0, 4 * DOUBLE_STEP + DOUBLE_CELL / 2 - approxWidth / 2);
  doubleSpinning.value = false;
};

const animateCrash = async (peak, cashed) => {
  crashBoom.value = false;
  crashCashed.value = false;
  crashDisplay.value = 1;
  const duration = Math.min(2600, 600 + peak * 160);
  await easeTo(1, peak, duration, (value) => {
    crashDisplay.value = value;
    if (cashed && !crashCashed.value && value >= Number(cashout.value) - 0.02) {
      crashCashed.value = true;
    }
    if (Math.random() < 0.12) playTick();
  });
  crashDisplay.value = peak;
  crashBoom.value = !cashed;
};

const play = async () => {
  if (!active.value || playing.value || betError.value) return;
  stopSpin();
  result.value = null;
  phase.value = "spinning";
  playing.value = true;
  landedFlip.value = "";
  landedDice.value = null;
  landedColor.value = "";
  crashAt.value = null;
  mysteryOpen.value = false;
  mysteryMult.value = null;
  hlCurrent.value = null;
  hlNext.value = null;
  crashCashed.value = false;
  crashBoom.value = false;
  crashDisplay.value = 1;
  slotMoving.value = false;
  doubleSpinning.value = false;
  // Force a fresh motion base so "Rejouer" always animates (CSS / leftover transforms)
  if (active.value.id === "flip") coinDeg.value = coinDeg.value % 360;
  if (active.value.id === "dice") {
    diceX.value = diceX.value % 360;
    diceY.value = diceY.value % 360;
    diceFace.value = null;
  }
  if (active.value.id === "roulette") wheelDeg.value = wheelDeg.value % 360;
  if (active.value.id === "slot") {
    slotOffsets.value = [0, 0, 0];
    const pool = slotSymbols.value.length ? slotSymbols.value : ["💎", "🍒", "⭐"];
    slotReels.value = [0, 1, 2].map(() =>
      Array.from({ length: 8 }, () => pool[Math.floor(Math.random() * pool.length)])
    );
  }
  if (active.value.id === "double") {
    seedDoubleStrip(18);
  }

  const payload = { gameId: active.value.id, bet: Number(bet.value || 0) };
  if (active.value.choiceType === "select") payload.choice = choice.value;
  if (active.value.choiceType === "number") payload.choice = Number(choiceNumber.value);
  if (active.value.choiceType === "cashout") payload.cashout = Number(cashout.value);

  if (active.value.id === "flip") playCoin();
  if (active.value.id === "crash") playTick();

  const needsWaitSpin = ["flip", "dice", "roulette"].includes(active.value.id);
  const spinWhileWaiting = () => {
    const id = active.value?.id;
    if (id === "flip") coinDeg.value += 22;
    else if (id === "dice" && diceSides.value <= 6) {
      diceX.value += 18;
      diceY.value += 14;
    } else if (id === "dice") {
      diceFace.value = 1 + Math.floor(Math.random() * diceSides.value);
    } else if (id === "roulette") wheelDeg.value += 16;
    if (playing.value && phase.value === "spinning") spinRaf = requestAnimationFrame(spinWhileWaiting);
  };
  if (needsWaitSpin) spinRaf = requestAnimationFrame(spinWhileWaiting);
  const minSpinPromise = needsWaitSpin ? wait(900) : Promise.resolve();

  try {
    const res = await fetchPlay(payload);
    await minSpinPromise;
    stopSpin();

    const ok = Boolean(res?.ok && res.data?.ok);
    if (!ok) {
      phase.value = "idle";
      const err = res?.data || {};
      if (err.reason === "cooldown" || err.retryIn) {
        const seconds = Number(err.retryIn || props.settings?.cooldownSeconds || 0);
        if (seconds > 0) cooldownUntil.value = Date.now() + seconds * 1000;
      }
      result.value = { error: true, win: false, label: playError(err), amount: undefined };
      return;
    }

  const win = Boolean(res.data.win);
  const payout = Number(res.data.payout || 0);
  const details = res.data.details || {};
  const cooldownSeconds = Number(props.settings?.cooldownSeconds || 0);
  if (cooldownSeconds > 0) cooldownUntil.value = Date.now() + cooldownSeconds * 1000;

  if (active.value.id === "flip") {
    const face = String(details.result || "").toLowerCase() === "face" ? "face" : "pile";
    await landCoin(face);
  } else if (active.value.id === "dice") {
    const roll = Math.max(1, Number(details.roll || 1));
    if (diceSides.value <= 6) await landDice(Math.min(6, roll));
    else {
      diceFace.value = roll;
      landedDice.value = roll;
      await wait(400);
    }
  } else if (active.value.id === "roulette") {
    const color = ["red", "black", "green"].includes(String(details.color || "")) ? details.color : "red";
    await landWheel(color);
  } else if (active.value.id === "slot") {
    await spinSlots(details.result);
  } else if (active.value.id === "double") {
    await spinDouble(win);
  } else if (active.value.id === "crash") {
    const peak = Math.max(1, Number(details.crashAt || 1));
    crashAt.value = peak;
    await animateCrash(peak, win);
  } else if (active.value.id === "mystery") {
    await wait(500);
    mysteryOpen.value = true;
    mysteryMult.value = Number(details.multiplier ?? res.data.multiplier ?? 0);
    await wait(500);
  } else if (active.value.id === "higherLower") {
    hlCurrent.value = null;
    hlNext.value = null;
    await nextTick();
    await wait(80);
    hlCurrent.value = details.current ?? "?";
    await wait(450);
    hlNext.value = details.next ?? "?";
    await wait(350);
  }

  await wait(280);
  result.value = {
    win,
    error: false,
    jackpot: Boolean(details.jackpot),
    label: win ? t("userGuild.games.winLabel") : t("userGuild.games.loseLabel"),
    amount: win ? payout : Number(payload.bet || 0)
  };
  phase.value = "settled";
    try {
      if (win) playWin();
      else playLose();
    } catch {
      // ignore audio
    }
    emit("played");
  } catch {
    stopSpin();
    phase.value = "idle";
    result.value = { error: true, win: false, label: t("userGuild.games.playError"), amount: undefined };
  } finally {
    playing.value = false;
    stopSpin();
  }
};

onMounted(() => {
  cooldownTimer = setInterval(() => {
    cooldownTick.value += 1;
  }, 250);
});

onUnmounted(() => {
  stopSpin();
  if (cooldownTimer) clearInterval(cooldownTimer);
});
</script>

<style scoped>
.lounge-copy {
  min-width: 0;
}
.lounge-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}
.lounge-help {
  margin: 4px 0 0;
  max-width: 54ch;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.45;
}
.lounge-empty {
  margin: 0;
  color: var(--text-muted);
}
.payout-rank {
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  border-radius: 14px;
  padding: 14px 16px;
  display: grid;
  gap: 8px;
}
.payout-rank h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}
.payout-rank p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.45;
}
.payout-rank ol {
  margin: 0;
  padding-left: 1.15rem;
  display: grid;
  gap: 6px;
}
.payout-rank li {
  display: grid;
  gap: 2px;
  font-size: 13px;
}
.payout-rank li span {
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.payout-rank-note {
  font-size: 12px !important;
}
.lounge-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.lounge-max {
  margin: 0;
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}
.lounge-jackpot {
  margin: 0;
  color: var(--warning);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}
.lounge-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
}
.lounge-card {
  display: flex;
  flex-direction: column;
  text-align: left;
  color: inherit;
  cursor: pointer;
  overflow: hidden;
  padding: 0;
  appearance: none;
  font: inherit;
  border-radius: 16px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  min-height: 250px;
  box-shadow: none;
  transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease), transform 0.15s var(--ease);
}
.lounge-card:hover,
.lounge-card:focus-visible {
  border-color: var(--accent);
  box-shadow: 0 10px 24px rgba(2, 6, 23, 0.18);
  transform: translateY(-2px);
  outline: none;
}
.lounge-cover {
  height: 112px;
  background-size: cover;
  background-position: center;
  background-color: var(--surface-2);
  position: relative;
}
.lounge-cover::after {
  content: "";
  position: absolute;
  inset: auto 0 0;
  height: 48px;
  background: linear-gradient(transparent, var(--surface));
}
.lounge-emoji {
  position: absolute;
  left: 12px;
  bottom: 10px;
  z-index: 1;
  font-size: 22px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55));
}
.lounge-body {
  display: grid;
  gap: 6px;
  padding: 12px 14px 8px;
  flex: 1;
}
.lounge-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.lounge-desc {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.lounge-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px 12px;
  border-top: 1px solid var(--border);
}
.lounge-range {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.lounge-cta {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}
.arena {
  display: grid;
  gap: 16px;
  min-width: 0;
  width: 100%;
  overflow-x: hidden;
}
.rules-box {
  border: 1px solid var(--border-strong);
  background: var(--surface);
  border-radius: 16px;
  padding: 14px 16px;
  display: grid;
  gap: 10px;
}
.rules-head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent);
}
.rules-head h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
.rules-steps {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 6px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.45;
}
.rules-facts {
  margin: 0;
  display: grid;
  gap: 6px;
}
.rules-fact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.rules-fact-label {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.35;
}
.rules-fact-value {
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--text);
}
.rules-note {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.45;
}
.stage {
  min-height: 236px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  padding: 20px 16px;
  background:
    radial-gradient(120% 90% at 50% 0%, var(--accent-soft), transparent 58%),
    var(--surface-2);
  border: 1px solid var(--border-strong);
  overflow: hidden;
  min-width: 0;
  width: 100%;
}
.stage.win {
  border-color: rgba(45, 212, 160, 0.5);
  box-shadow: inset 0 0 0 1px rgba(45, 212, 160, 0.18);
}
.stage.jackpot {
  border-color: rgba(251, 191, 36, 0.7);
  box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.28), 0 0 28px rgba(251, 191, 36, 0.18);
}
.stage.lose {
  border-color: rgba(248, 113, 113, 0.45);
  box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.14);
}
.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.status-value {
  margin-left: 6px;
  font-weight: 700;
}
.controls {
  display: grid;
  gap: 16px;
}
.field-stack,
.choice-row,
.bet-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.field-stack {
  display: grid;
  gap: 8px;
}
.dice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(2.75rem, 1fr));
  gap: 8px;
}
.dice-grid.compact {
  grid-template-columns: repeat(auto-fill, minmax(2.4rem, 1fr));
  gap: 6px;
}
.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18);
}
.color-dot.red { background: #ef4444; }
.color-dot.black { background: #0f172a; }
.color-dot.green { background: #22c55e; }
.input-suffix {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
}
.coin-scene,
.dice-scene {
  perspective: 900px;
  width: 150px;
  height: 150px;
  display: grid;
  place-items: center;
}
.stage-flip {
  display: grid;
  gap: 14px;
  justify-items: center;
  width: min(100%, 420px);
}
.jackpot-callout {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.4);
  text-align: left;
}
.jackpot-callout strong {
  display: block;
  font-size: 13px;
  color: var(--warning);
  margin-bottom: 4px;
}
.jackpot-callout p {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text);
}
.jackpot-callout.hit {
  background: rgba(251, 191, 36, 0.22);
  border-color: rgba(251, 191, 36, 0.7);
  box-shadow: 0 0 18px rgba(251, 191, 36, 0.2);
}
.coin {
  width: 128px;
  height: 128px;
  position: relative;
  transform-style: preserve-3d;
}
.coin-side {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  letter-spacing: 0.12em;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.coin-side.pile {
  background: radial-gradient(circle at 30% 20%, #fde68a, #d97706 70%);
  color: #111827;
  box-shadow: inset 0 0 0 6px rgba(180, 83, 9, 0.35);
}
.coin-side.face {
  transform: rotateY(180deg);
  background: radial-gradient(circle at 30% 20%, #93c5fd, #1d4ed8 70%);
  color: #eff6ff;
  box-shadow: inset 0 0 0 6px rgba(30, 64, 175, 0.4);
}
.coin.jackpot {
  filter: drop-shadow(0 0 18px #facc15);
}
.dice-cube {
  width: 84px;
  height: 84px;
  position: relative;
  transform-style: preserve-3d;
}
.dice-face {
  position: absolute;
  width: 84px;
  height: 84px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 36px;
  font-weight: 800;
  background: linear-gradient(145deg, #f87171, #991b1b);
  color: #fff;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.18);
}
.f1 { transform: rotateY(0deg) translateZ(42px); }
.f2 { transform: rotateY(90deg) translateZ(42px); }
.f3 { transform: rotateY(180deg) translateZ(42px); }
.f4 { transform: rotateY(-90deg) translateZ(42px); }
.f5 { transform: rotateX(90deg) translateZ(42px); }
.f6 { transform: rotateX(-90deg) translateZ(42px); }
.dice-number {
  font-size: 72px;
  font-weight: 800;
  color: #fde68a;
}
.dice-number.blur {
  filter: blur(2px);
}
.wheel-wrap {
  position: relative;
  width: 220px;
  height: 220px;
}
.wheel {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: repeating-conic-gradient(#dc2626 0 10deg, #0f172a 10deg 20deg);
  border: 10px solid #111827;
  box-shadow: inset 0 0 0 8px #fbbf24, 0 18px 30px rgba(0, 0, 0, 0.4);
  position: relative;
}
.wheel::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(#16a34a 0 12deg, transparent 12deg 360deg);
}
.wheel-hub {
  position: absolute;
  inset: 68px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #020617;
  border: 2px solid #fbbf24;
  font-size: 13px;
  font-weight: 700;
  z-index: 2;
}
.wheel-pin {
  position: absolute;
  top: -8px;
  left: 50%;
  width: 14px;
  height: 22px;
  transform: translateX(-50%);
  background: #facc15;
  border-radius: 4px;
  z-index: 3;
  clip-path: polygon(50% 100%, 0 0, 100% 0);
}
.slot-machine {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(100%, 420px);
}
.slot-side-mark {
  flex: 0 0 auto;
  width: 28px;
  height: 76px;
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 800;
  color: #facc15;
  text-shadow: 0 0 12px rgba(250, 204, 21, 0.45);
  border-radius: 8px;
  background: rgba(250, 204, 21, 0.1);
  border: 1px solid rgba(250, 204, 21, 0.35);
}
.slot-frame {
  position: relative;
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(70px, 1fr));
  gap: 8px;
  padding: 16px 12px;
  border-radius: 22px;
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(56, 189, 248, 0.16), transparent 55%),
    linear-gradient(180deg, #0f172a, #020617);
  border: 1px solid rgba(96, 165, 250, 0.35);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 12px 28px rgba(2, 6, 23, 0.45);
}
.slot-payline {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 50%;
  height: 76px;
  transform: translateY(-50%);
  border-radius: 12px;
  border: 1px dashed rgba(250, 204, 21, 0.55);
  background: rgba(250, 204, 21, 0.06);
  pointer-events: none;
  z-index: 4;
  box-shadow: inset 0 0 0 1px rgba(250, 204, 21, 0.12);
}
.slot-reel {
  height: 228px;
  overflow: hidden;
  border-radius: 999px / 28px;
  background: linear-gradient(180deg, #020617 0%, #111827 18%, #111827 82%, #020617 100%);
  position: relative;
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: inset 0 18px 18px rgba(0, 0, 0, 0.35), inset 0 -18px 18px rgba(0, 0, 0, 0.35);
}
.slot-reel.spinning .slot-track {
  filter: blur(1.2px) saturate(1.15);
}
.slot-track {
  display: flex;
  flex-direction: column;
  will-change: transform;
}
.slot-cell {
  height: 76px;
  display: grid;
  place-items: center;
  font-size: 40px;
  line-height: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
}
.slot-reel-curve {
  position: absolute;
  left: 0;
  right: 0;
  height: 42px;
  z-index: 3;
  pointer-events: none;
}
.slot-reel-curve.top {
  top: 0;
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.95) 0%, rgba(2, 6, 23, 0.55) 45%, transparent 100%);
}
.slot-reel-curve.bottom {
  bottom: 0;
  background: linear-gradient(0deg, rgba(2, 6, 23, 0.95) 0%, rgba(2, 6, 23, 0.55) 45%, transparent 100%);
}
.slot-payline-hint {
  margin: 10px 0 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
.slot-machine.spinning .slot-side-mark {
  animation: slot-mark-pulse 0.7s ease-in-out infinite alternate;
}
@keyframes slot-mark-pulse {
  from { opacity: 0.65; transform: scale(1); }
  to { opacity: 1; transform: scale(1.06); }
}
.stage-slot {
  display: grid;
  justify-items: center;
  width: min(100%, 460px);
}
.crash-mult {
  font-size: 56px;
  font-weight: 800;
  color: #fde68a;
}
.crash-mult.boom {
  color: #f87171;
}
.crash-mult.cashed {
  color: #86efac;
}
.crash-bar {
  position: relative;
  width: min(100%, 360px);
  height: 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
  overflow: hidden;
  margin-top: 12px;
}
.crash-bar .fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #facc15, #ef4444);
}
.crash-bar .mark {
  position: absolute;
  top: -4px;
  width: 3px;
  height: 18px;
  background: #fff;
}
.stage-double {
  width: 100%;
  max-width: 520px;
  min-width: 0;
}
.lounge-double {
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: 118px;
  overflow: hidden;
  border-radius: 16px;
  background: #0b1220;
  border: 1px solid var(--border-strong);
  isolation: isolate;
  contain: paint;
}
.lounge-double-track {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  width: max-content;
  max-width: none;
  padding: 0;
  margin: 0;
  will-change: transform;
  z-index: 1;
}
.lounge-double-cell {
  box-sizing: border-box;
  flex: 0 0 140px;
  width: 140px;
  min-width: 140px;
  max-width: 140px;
  height: 78px;
  margin: 0 10px 0 0;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 15px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding: 0 10px;
}
.lounge-double-cell.is-win {
  background: rgba(37, 99, 235, 0.28);
  color: #dbeafe;
  border: 1px solid rgba(96, 165, 250, 0.35);
}
.lounge-double-cell.is-lose {
  background: rgba(239, 68, 68, 0.22);
  color: #fecaca;
  border: 1px solid rgba(248, 113, 113, 0.28);
}
.lounge-double-pointer {
  position: absolute;
  left: 50%;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 999px;
  background: #60a5fa;
  box-shadow: 0 0 12px rgba(96, 165, 250, 0.65);
  transform: translateX(-50%);
  z-index: 3;
  pointer-events: none;
}
.lounge-double-fade {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 48px;
  z-index: 2;
  pointer-events: none;
}
.lounge-double-fade.left {
  left: 0;
  background: linear-gradient(90deg, #0b1220, transparent);
}
.lounge-double-fade.right {
  right: 0;
  background: linear-gradient(270deg, #0b1220, transparent);
}
.chest {
  font-size: 72px;
  position: relative;
}
.chest.shake {
  animation: shake 0.25s linear infinite;
}
.chest.open .spark {
  opacity: 1;
  transform: scale(1.3);
}
.spark {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  transition: 0.35s ease;
}
.mystery-mult {
  margin-top: 8px;
  font-size: 32px;
  font-weight: 800;
  color: #fde68a;
}
.stage-hl {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}
.hl-card {
  width: 92px;
  height: 124px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 34px;
  font-weight: 800;
  background: linear-gradient(180deg, #f8fafc, #cbd5e1);
  color: #0f172a;
  transform: rotateY(180deg);
  transition: transform 0.45s ease;
}
.hl-card.show {
  transform: rotateY(0);
}
.hl-vs {
  font-size: 28px;
  color: var(--warning);
}
.currency-icon {
  width: 16px;
  height: 16px;
  vertical-align: middle;
}
.result-desc {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.result-desc .currency-icon {
  width: 18px;
  height: 18px;
}
@media (max-width: 640px) {
  .lounge-grid {
    grid-template-columns: 1fr;
  }
  .lounge-card {
    min-height: 0;
  }
  .stage {
    min-height: 196px;
    padding: 16px 12px;
  }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
</style>

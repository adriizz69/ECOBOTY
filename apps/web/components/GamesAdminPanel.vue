<template>
  <UCard class="card games-admin">
    <div class="card-head">
      <div>
        <h3>{{ $t("adminGuild.games.title") }}</h3>
        <p class="muted">{{ $t(platformMode ? "adminGuild.games.subtitlePlatform" : "adminGuild.games.subtitleGuided") }}</p>
      </div>
      <div class="head-actions">
        <UButton color="neutral" variant="outline" @click="restoreAllDefaults">
          {{ $t("adminGuild.games.restoreAll") }}
        </UButton>
        <UButton v-if="!platformMode" color="primary" :disabled="Boolean(blockingError)" @click="$emit('save')">
          {{ $t("common.save") }}
        </UButton>
      </div>
    </div>

    <div class="notice">
      <strong>{{ $t(platformMode ? "adminGuild.games.sim.noticeTitle" : "adminGuild.games.noticeTitle") }}</strong>
      <p>{{ $t(platformMode ? "adminGuild.games.sim.noticeBody" : "adminGuild.games.noticeBody") }}</p>
    </div>

    <UAlert v-if="blockingError" color="error" variant="subtle" :title="blockingError" icon="i-lucide-circle-alert" />
    <UAlert
      v-else-if="globalAlert"
      :color="globalAlert.color"
      variant="subtle"
      :title="globalAlert.title"
      :description="globalAlert.description"
      :icon="globalAlert.color === 'error' ? 'i-lucide-circle-alert' : 'i-lucide-triangle-alert'"
    />

    <div class="sub-card">
      <h4>{{ $t("adminGuild.games.globalTitle") }}</h4>
      <p class="muted">{{ $t("adminGuild.games.globalHelpGuided") }}</p>
      <div class="grid">
        <div class="setting-row setting-row--switch">
          <span class="setting-label">{{ $t("adminGuild.games.enableAll") }}</span>
          <USwitch v-model="gamesConfig.enabled" />
        </div>
        <FieldNumber v-model="gamesConfig.minBet" :label="$t('adminGuild.games.minBet')" :hint="$t('adminGuild.games.hints.minBet')" :min="1" />
        <FieldNumber v-model="gamesConfig.maxBet" :label="$t('adminGuild.games.maxBet')" :hint="$t('adminGuild.games.hints.maxBet')" :min="1" />
        <FieldNumber v-model="gamesConfig.cooldownSeconds" :label="$t('adminGuild.games.cooldown')" :hint="$t('adminGuild.games.hints.cooldown')" :min="0" />
        <FieldNumber v-model="gamesConfig.houseEdgePercent" :label="$t('adminGuild.games.houseEdge')" :hint="$t('adminGuild.games.hints.houseEdge')" :min="0" :max="50" />
      </div>
    </div>

    <div class="catalog">
      <button
        v-for="game in catalog"
        :key="game.id"
        type="button"
        class="catalog-card"
        :class="{ active: selectedId === game.id, off: !isEnabled(game) }"
        @click="selectedId = game.id"
      >
        <img :src="coverOf(game.id)" :alt="game.title" class="catalog-cover" />
        <div class="catalog-body">
          <div class="catalog-title">{{ game.title }}</div>
          <p class="catalog-help">{{ game.short }}</p>
          <div class="catalog-toggle" @click.stop>
            <USwitch
              size="sm"
              :model-value="gamesConfig[game.id].enabled"
              :disabled="game.locked || chanceLocked(game.id)"
              @update:model-value="gamesConfig[game.id].enabled = $event"
            />
            <span>{{ isEnabled(game) ? $t("common.enable") : $t("adminGuild.games.disabled") }}</span>
          </div>
          <span v-if="game.locked" class="premium-tag">Premium</span>
        </div>
      </button>
    </div>

    <BillingPremiumGate
      v-if="selectedMeta?.locked"
      :locked="true"
      feature-key="games_advanced_modes"
      :benefits="gamesGateUnlockItems"
    />

    <div v-else-if="selectedMeta" class="sub-card editor">
      <div class="editor-hero">
        <img :src="coverOf(selectedMeta.id)" :alt="selectedMeta.title" class="editor-cover" />
        <div class="editor-hero-body">
          <h4>{{ selectedMeta.title }}</h4>
          <p class="muted">{{ selectedMeta.help }}</p>
        </div>
        <UButton color="neutral" variant="outline" size="sm" @click="restoreSelectedDefaults">
          {{ $t("adminGuild.games.restoreGame") }}
        </UButton>
      </div>

      <div class="explain">
        <div>
          <strong>{{ $t("adminGuild.games.howTitle") }}</strong>
          <p>{{ selectedMeta.how }}</p>
        </div>
        <div>
          <strong>{{ $t("adminGuild.games.exampleTitle") }}</strong>
          <p>{{ selectedExample }}</p>
        </div>
      </div>
      <UAlert
        v-if="selectedAlert"
        :color="selectedAlert.color"
        variant="subtle"
        :title="selectedAlert.title"
        :description="selectedAlert.description"
        :icon="selectedAlert.color === 'error' ? 'i-lucide-circle-alert' : 'i-lucide-triangle-alert'"
        class="selected-alert"
      />

      <div class="chance-box">
        <div class="chance-stat">
          <span class="muted">{{ $t("adminGuild.games.realChance") }}</span>
          <strong>{{ formatPct(oddsPreview.winChance) }}</strong>
        </div>
        <div class="chance-stat">
          <span class="muted">{{ $t("adminGuild.games.expectedRtp") }}</span>
          <strong>{{ formatPct(oddsPreview.rtp) }}</strong>
          <p class="field-hint">{{ $t("adminGuild.games.expectedRtpHelp") }}</p>
        </div>
        <p class="field-hint">{{ oddsPreview.hint }}</p>
      </div>

      <div v-if="selectedId === 'flip'" class="stack">
        <FieldNumber v-model="gamesConfig.flip.winMultiplier" :label="$t('adminGuild.games.winMultiplier')" :hint="$t('adminGuild.games.hints.winMultiplier')" step="0.1" />
        <div class="jackpot-box">
          <div class="jackpot-box-head">
            <UIcon name="i-lucide-gem" class="size-5" />
            <div>
              <h4>{{ $t("adminGuild.games.jackpotBox.title") }}</h4>
              <p>{{ $t("adminGuild.games.jackpotBox.lead") }}</p>
            </div>
          </div>
          <ol class="jackpot-steps">
            <li>{{ $t("adminGuild.games.jackpotBox.step1") }}</li>
            <li>{{ $t("adminGuild.games.jackpotBox.step2") }}</li>
            <li>{{ $t("adminGuild.games.jackpotBox.step3") }}</li>
            <li>{{ $t("adminGuild.games.jackpotBox.step4") }}</li>
          </ol>
          <div class="setting-row setting-row--switch">
            <span class="setting-label">{{ $t("adminGuild.games.jackpotEnabled") }}</span>
            <USwitch v-model="gamesConfig.flip.jackpotEnabled" />
          </div>
          <div class="grid" :class="{ 'is-disabled': gamesConfig.flip.jackpotEnabled === false }">
            <FieldNumber
              v-model="gamesConfig.flip.jackpotChancePercent"
              :label="$t('adminGuild.games.jackpotChance')"
              :hint="$t('adminGuild.games.hints.jackpotChance')"
              :disabled="gamesConfig.flip.jackpotEnabled === false"
            />
            <FieldNumber
              v-model="gamesConfig.flip.jackpotMultiplier"
              :label="$t('adminGuild.games.jackpotMultiplier')"
              :hint="$t('adminGuild.games.hints.jackpotMultiplier')"
              :disabled="gamesConfig.flip.jackpotEnabled === false"
            />
          </div>
          <p class="field-hint">
            {{ $t("adminGuild.games.jackpotBox.realChance", {
              value: formatChance(flipJackpotPreview.realChance),
              chance: formatChance(flipJackpotPreview.chance)
            }) }}
          </p>
          <p class="field-hint">
            {{ $t("adminGuild.games.jackpotBox.example", {
              bet: flipJackpotPreview.bet,
              normal: flipJackpotPreview.normal,
              jackpot: flipJackpotPreview.jackpot,
              winMult: flipJackpotPreview.winMult,
              jpMult: flipJackpotPreview.jpMult,
              realChance: formatChance(flipJackpotPreview.realChance)
            }) }}
          </p>
          <p class="field-hint">{{ $t("adminGuild.games.jackpotBox.recommend") }}</p>
          <UAlert
            v-if="flipJackpotPreview.useless"
            color="warning"
            variant="subtle"
            :title="$t('adminGuild.games.jackpotBox.warnUselessTitle')"
            :description="$t('adminGuild.games.jackpotBox.warnUseless')"
            icon="i-lucide-triangle-alert"
          />
          <UAlert
            v-else-if="flipJackpotPreview.tooHigh"
            :color="flipJackpotPreview.tooExtreme ? 'error' : 'warning'"
            variant="subtle"
            :title="$t('adminGuild.games.jackpotBox.warnHighTitle')"
            :description="$t('adminGuild.games.jackpotBox.warnHigh')"
            icon="i-lucide-triangle-alert"
          />
        </div>
      </div>

      <div v-else-if="selectedId === 'dice'" class="grid">
        <FieldNumber v-model="gamesConfig.dice.sides" :label="$t('adminGuild.games.dice.sides')" :hint="$t('adminGuild.games.hints.diceSides')" :min="2" :max="20" />
        <FieldNumber v-model="gamesConfig.dice.winMultiplier" :label="$t('adminGuild.games.winMultiplier')" :hint="$t('adminGuild.games.hints.winMultiplier')" step="0.1" />
      </div>

      <div v-else-if="selectedId === 'slot'" class="stack">
        <div class="setting-row">
          <strong>{{ $t("adminGuild.games.slot.iconsTitle") }}</strong>
          <p class="field-hint">{{ $t("adminGuild.games.hints.slotIcons") }}</p>
          <div class="icon-catalog">
            <button
              v-for="icon in slotIconCatalog"
              :key="icon"
              type="button"
              class="icon-chip"
              :class="{ on: isSlotIconEnabled(icon) }"
              :title="icon"
              @click="toggleSlotIcon(icon)"
            >
              {{ icon }}
            </button>
          </div>
        </div>
        <FieldNumber v-model="gamesConfig.slot.twoOfKindMultiplier" :label="$t('adminGuild.games.slot.twoKindMultiplier')" :hint="$t('adminGuild.games.hints.twoKind')" step="0.1" />
        <div>
          <div class="row-head">
            <strong>{{ $t("adminGuild.games.slot.payoutsTitle") }}</strong>
            <UButton size="xs" color="neutral" variant="outline" @click="addPayout">{{ $t("adminGuild.games.addRow") }}</UButton>
          </div>
          <p class="field-hint">{{ $t("adminGuild.games.hints.slotPayouts") }}</p>
          <div v-for="(row, index) in gamesConfig.slot.payouts" :key="`pay-${index}`" class="payout-row setting-row">
            <div class="payout-reels">
              <EbSelect
                v-for="part in 3"
                :key="`pay-${index}-${part}`"
                :model-value="comboPart(row.combo, part - 1)"
                :items="slotReelSelectItems"
                :searchable="false"
                @update:model-value="setComboPart(index, part - 1, $event)"
              />
            </div>
            <UFormField :label="$t('adminGuild.games.multiplier')">
              <UInput v-model.number="row.multiplier" type="number" min="0" step="0.1" class="w-full" />
            </UFormField>
            <UButton size="xs" color="error" variant="ghost" :disabled="gamesConfig.slot.payouts.length <= 1" @click="removePayout(index)">✕</UButton>
          </div>
        </div>
      </div>

      <div v-else-if="selectedId === 'roulette'" class="grid">
        <p class="field-hint" style="grid-column: 1 / -1;">{{ $t("adminGuild.games.hints.rouletteSum", { total: rouletteTotal }) }}</p>
        <FieldNumber v-model="gamesConfig.roulette.red.chance" :label="$t('adminGuild.games.roulette.red')" :hint="$t('adminGuild.games.hints.colorChance')" />
        <FieldNumber v-model="gamesConfig.roulette.red.multiplier" :label="$t('adminGuild.games.roulette.redMultiplier')" :hint="$t('adminGuild.games.hints.colorMultiplier')" step="0.1" />
        <FieldNumber v-model="gamesConfig.roulette.black.chance" :label="$t('adminGuild.games.roulette.black')" :hint="$t('adminGuild.games.hints.colorChance')" />
        <FieldNumber v-model="gamesConfig.roulette.black.multiplier" :label="$t('adminGuild.games.roulette.blackMultiplier')" :hint="$t('adminGuild.games.hints.colorMultiplier')" step="0.1" />
        <FieldNumber v-model="gamesConfig.roulette.green.chance" :label="$t('adminGuild.games.roulette.green')" :hint="$t('adminGuild.games.hints.greenChance')" />
        <FieldNumber v-model="gamesConfig.roulette.green.multiplier" :label="$t('adminGuild.games.roulette.greenMultiplier')" :hint="$t('adminGuild.games.hints.greenMultiplier')" step="0.1" />
      </div>

      <div v-else-if="selectedId === 'higherLower'" class="grid">
        <FieldNumber v-model="gamesConfig.higherLower.maxNumber" :label="$t('adminGuild.games.higherLower.maxNumber')" :hint="$t('adminGuild.games.hints.maxNumber')" :min="3" />
        <FieldNumber v-model="gamesConfig.higherLower.winMultiplier" :label="$t('adminGuild.games.winMultiplier')" :hint="$t('adminGuild.games.hints.winMultiplier')" step="0.1" />
        <div class="setting-row setting-row--switch">
          <div>
            <span class="setting-label">{{ $t("adminGuild.games.higherLower.streakBonus") }}</span>
            <p class="field-hint">{{ $t("adminGuild.games.hints.streakBonus") }}</p>
          </div>
          <USwitch v-model="gamesConfig.higherLower.streakBonusEnabled" />
        </div>
      </div>

      <div v-else-if="selectedId === 'crash'" class="grid">
        <FieldNumber v-model="gamesConfig.crash.maxMultiplier" :label="$t('adminGuild.games.crash.maxMultiplier')" :hint="$t('adminGuild.games.hints.crashMax')" step="0.1" />
        <FieldNumber v-model="gamesConfig.crash.crashChancePerTickPercent" :label="$t('adminGuild.games.crash.crashChance')" :hint="$t('adminGuild.games.hints.crashChance')" />
        <UFormField class="setting-row" :label="$t('adminGuild.games.crash.speed')" :help="$t('adminGuild.games.hints.crashSpeed')">
          <EbSelect v-model="gamesConfig.crash.speed" :items="crashSpeedItems" :searchable="false" />
        </UFormField>
      </div>

      <div v-else-if="selectedId === 'double'" class="grid">
        <FieldNumber v-model="gamesConfig.double.winChancePercent" :label="$t('adminGuild.games.winChance')" :hint="$t('adminGuild.games.hints.winChance')" />
        <FieldNumber v-model="gamesConfig.double.multiplier" :label="$t('adminGuild.games.multiplier')" :hint="$t('adminGuild.games.hints.winMultiplier')" step="0.1" />
      </div>

      <div v-else-if="selectedId === 'mystery'" class="stack">
        <div class="row-head">
          <strong>{{ $t("adminGuild.games.mystery.outcomesTitle") }}</strong>
          <UButton size="xs" color="neutral" variant="outline" @click="addOutcome">{{ $t("adminGuild.games.addRow") }}</UButton>
        </div>
        <p class="field-hint">{{ $t("adminGuild.games.hints.mysteryOutcomes", { total: mysteryTotal }) }}</p>
        <div v-for="(row, index) in gamesConfig.mystery.outcomes" :key="`out-${index}`" class="row-edit setting-row">
          <UFormField :label="$t('adminGuild.games.multiplier')">
            <UInput v-model.number="row.multiplier" type="number" min="0" step="0.1" class="w-full" />
          </UFormField>
          <UFormField :label="$t('adminGuild.games.mystery.chance')">
            <UInput v-model.number="row.chance" type="number" min="0" class="w-full" />
          </UFormField>
          <UButton size="xs" color="error" variant="ghost" @click="removeOutcome(index)">✕</UButton>
        </div>
      </div>

      <div v-if="showSimulator" class="sim-panel">
        <h4>{{ $t("adminGuild.games.sim.title") }}</h4>
        <p class="muted">{{ $t("adminGuild.games.sim.help") }}</p>
        <div v-if="simNeedsChoice" class="sim-params">
          <label v-if="selectedId === 'flip'">
            {{ $t("adminGuild.games.sim.choice") }}
            <EbSelect v-model="simChoice" :items="simFlipItems" :searchable="false" />
          </label>
          <label v-else-if="selectedId === 'dice'">
            {{ $t("adminGuild.games.sim.choice") }}
            <EbSelect v-model="simChoice" :items="simDiceItems" :searchable="false" />
          </label>
          <label v-else-if="selectedId === 'roulette'">
            {{ $t("adminGuild.games.sim.choice") }}
            <EbSelect v-model="simChoice" :items="simRouletteItems" :searchable="false" />
          </label>
          <label v-else-if="selectedId === 'higherLower'">
            {{ $t("adminGuild.games.sim.choice") }}
            <EbSelect v-model="simChoice" :items="simHigherLowerItems" :searchable="false" />
          </label>
          <label v-else-if="selectedId === 'crash'">
            {{ $t("adminGuild.games.sim.cashout") }}
            <UInput v-model.number="simCashout" type="number" min="1" step="0.1" class="w-full" />
          </label>
        </div>
        <div class="sim-btns">
          <UButton
            v-for="n in simRoundOptions"
            :key="n"
            color="neutral"
            variant="outline"
            size="sm"
            :loading="simBusy === n"
            :disabled="Boolean(simBusy)"
            @click="runSimulation(n)"
          >
            {{ n }}
          </UButton>
        </div>
        <p v-if="simError" class="alert danger">{{ simError }}</p>
        <div v-else-if="simRecap" class="sim-recap" :class="simRecap.verdict?.economy">
          <p class="sim-verdict">{{ simVerdictText }}</p>
          <p class="field-hint">{{ simSampleText }}</p>
          <div class="sim-stats">
            <div><span>{{ $t("adminGuild.games.sim.wins") }}</span><strong>{{ simRecap.wins }} / {{ simRecap.rounds }}</strong></div>
            <div><span>{{ $t("adminGuild.games.sim.losses") }}</span><strong>{{ simRecap.losses }}</strong></div>
            <div v-if="selectedId === 'flip'"><span>{{ $t("adminGuild.games.sim.jackpots") }}</span><strong>{{ simRecap.jackpots }}</strong></div>
            <div><span>{{ $t("adminGuild.games.sim.observedWin") }}</span><strong>{{ formatPct(simRecap.observedWinRate) }}</strong></div>
            <div><span>{{ $t("adminGuild.games.sim.expectedWin") }}</span><strong>{{ formatPct(simRecap.expectedWinRate) }}</strong></div>
            <div><span>{{ $t("adminGuild.games.sim.observedRtp") }}</span><strong>{{ formatPct(simRecap.observedRtp) }}</strong></div>
            <div><span>{{ $t("adminGuild.games.sim.expectedRtp") }}</span><strong>{{ formatPct(simRecap.expectedRtp) }}</strong></div>
            <div><span>{{ $t("adminGuild.games.sim.net") }}</span><strong :class="Number(simRecap.net) >= 0 ? 'pos' : 'neg'">{{ simRecap.net }}</strong></div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup>
import { defineComponent, h, resolveComponent } from "vue";
const FieldNumber = defineComponent({
  name: "FieldNumber",
  props: {
    modelValue: { type: [Number, String], default: 0 },
    label: { type: String, default: "" },
    hint: { type: String, default: "" },
    min: { type: Number, default: 0 },
    max: { type: Number, default: undefined },
    step: { type: [Number, String], default: 1 },
    disabled: { type: Boolean, default: false }
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const UFormField = resolveComponent("UFormField");
    const UInput = resolveComponent("UInput");
    return () =>
      h(
        UFormField,
        { label: props.label, help: props.hint || undefined, class: "setting-row" },
        {
          default: () =>
            h(UInput, {
              type: "number",
              class: "w-full",
              min: props.min,
              max: props.max,
              step: props.step,
              disabled: props.disabled,
              modelValue: props.modelValue,
              "onUpdate:modelValue": (value) => emit("update:modelValue", value === "" || value === null ? 0 : Number(value))
            })
        }
      );
  }
});

const props = defineProps({
  gamesConfig: { type: Object, required: true },
  guildId: { type: String, default: "" },
  advancedUnlocked: { type: Boolean, default: false },
  gamesGateUnlockItems: { type: Array, default: () => [] },
  platformMode: { type: Boolean, default: false },
  showSimulator: { type: Boolean, default: false }
});

defineEmits(["save"]);

const { t } = useI18n();
const { getToken } = useAuth();
const runtimeConfig = useRuntimeConfig();
const selectedId = ref("flip");
const simChoice = ref("pile");
const simCashout = ref(2);
const simBusy = ref(0);
const simError = ref("");
const simRecap = ref(null);
const simRoundOptions = [10, 20, 50, 100, 1000, 5000];
const SLOT_ICON_CATALOG = ["💎", "🍒", "⭐", "🍋", "🍇", "🍉", "🔔", "🍀", "💰", "👑", "🔥", "🎰"];
const slotIconCatalog = SLOT_ICON_CATALOG;

const defaultsOf = () => ({
  enabled: true,
  minBet: 10,
  maxBet: 10000,
  cooldownSeconds: 10,
  houseEdgePercent: 5,
  flip: { enabled: true, winChancePercent: 50, winMultiplier: 2, jackpotEnabled: true, jackpotChancePercent: 1, jackpotMultiplier: 10 },
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
  roulette: { enabled: true, red: { chance: 45, multiplier: 2 }, black: { chance: 45, multiplier: 2 }, green: { chance: 10, multiplier: 14 } },
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

const catalog = computed(() => [
  { id: "flip", title: t("adminGuild.games.coinFlip.title"), short: t("adminGuild.games.coinFlip.short"), help: t("adminGuild.games.coinFlip.help"), how: t("adminGuild.games.coinFlip.how"), locked: false },
  { id: "dice", title: t("adminGuild.games.dice.title"), short: t("adminGuild.games.dice.short"), help: t("adminGuild.games.dice.help"), how: t("adminGuild.games.dice.how"), locked: !props.advancedUnlocked && !props.platformMode },
  { id: "slot", title: t("adminGuild.games.slot.title"), short: t("adminGuild.games.slot.short"), help: t("adminGuild.games.slot.help"), how: t("adminGuild.games.slot.how"), locked: !props.advancedUnlocked && !props.platformMode },
  { id: "roulette", title: t("adminGuild.games.roulette.title"), short: t("adminGuild.games.roulette.short"), help: t("adminGuild.games.roulette.help"), how: t("adminGuild.games.roulette.how"), locked: !props.advancedUnlocked && !props.platformMode },
  { id: "higherLower", title: t("adminGuild.games.higherLower.title"), short: t("adminGuild.games.higherLower.short"), help: t("adminGuild.games.higherLower.help"), how: t("adminGuild.games.higherLower.how"), locked: !props.advancedUnlocked && !props.platformMode },
  { id: "crash", title: t("adminGuild.games.crash.title"), short: t("adminGuild.games.crash.short"), help: t("adminGuild.games.crash.help"), how: t("adminGuild.games.crash.how"), locked: !props.advancedUnlocked && !props.platformMode },
  { id: "double", title: t("adminGuild.games.double.title"), short: t("adminGuild.games.double.short"), help: t("adminGuild.games.double.help"), how: t("adminGuild.games.double.how"), locked: !props.advancedUnlocked && !props.platformMode },
  { id: "mystery", title: t("adminGuild.games.mystery.title"), short: t("adminGuild.games.mystery.short"), help: t("adminGuild.games.mystery.help"), how: t("adminGuild.games.mystery.how"), locked: !props.advancedUnlocked && !props.platformMode }
]);

const selectedMeta = computed(() => catalog.value.find((game) => game.id === selectedId.value) || null);
const isEnabled = (game) => props.gamesConfig?.[game.id]?.enabled !== false;
const coverOf = (id) => `/games/${id}.webp`;

const slotReelSymbols = computed(() => {
  const allowed = new Set(SLOT_ICON_CATALOG);
  const current = (props.gamesConfig.slot?.symbols || []).filter((icon) => allowed.has(icon));
  return current.length >= 3 ? current : SLOT_ICON_CATALOG.slice(0, 4);
});

const slotReelSelectItems = computed(() =>
  slotReelSymbols.value.map((icon) => ({ label: icon, value: icon }))
);

const isSlotIconEnabled = (icon) => slotReelSymbols.value.includes(icon);

const comboPart = (combo, index) => {
  const parts = Array.from(String(combo || ""));
  return parts[index] || slotReelSymbols.value[0] || "💎";
};

const setComboPart = (rowIndex, partIndex, symbol) => {
  const row = props.gamesConfig.slot?.payouts?.[rowIndex];
  if (!row) return;
  const fallback = slotReelSymbols.value[0] || "💎";
  const parts = [0, 1, 2].map((index) => comboPart(row.combo, index) || fallback);
  parts[partIndex] = SLOT_ICON_CATALOG.includes(symbol) ? symbol : fallback;
  row.combo = parts.join("");
};

const toggleSlotIcon = (icon) => {
  if (!SLOT_ICON_CATALOG.includes(icon)) return;
  const current = [...slotReelSymbols.value];
  const exists = current.includes(icon);
  if (exists) {
    if (current.length <= 3) return;
    const next = current.filter((item) => item !== icon);
    props.gamesConfig.slot.symbols = next;
    (props.gamesConfig.slot.payouts || []).forEach((row) => {
      const parts = [0, 1, 2].map((index) => {
        const part = comboPart(row.combo, index);
        return next.includes(part) ? part : next[0];
      });
      row.combo = parts.join("");
    });
    return;
  }
  props.gamesConfig.slot.symbols = [...current, icon];
};

const crashSpeedItems = computed(() => [
  { label: t("adminGuild.games.crash.speedSlow"), value: "slow" },
  { label: t("adminGuild.games.crash.speedNormal"), value: "normal" },
  { label: t("adminGuild.games.crash.speedFast"), value: "fast" }
]);

const rouletteTotal = computed(() =>
  Number(props.gamesConfig.roulette?.red?.chance || 0) +
  Number(props.gamesConfig.roulette?.black?.chance || 0) +
  Number(props.gamesConfig.roulette?.green?.chance || 0)
);
const mysteryTotal = computed(() =>
  (props.gamesConfig.mystery?.outcomes || []).reduce((sum, row) => sum + Number(row.chance || 0), 0)
);

const chanceStatusOf = (total) => {
  const n = Number(total || 0);
  if (!Number.isFinite(n) || Math.abs(n - 100) <= 0.05) return "ok";
  return n > 100 ? "over" : "under";
};
const rouletteChanceStatus = computed(() => chanceStatusOf(rouletteTotal.value));
const mysteryChanceStatus = computed(() => chanceStatusOf(mysteryTotal.value));
const chanceLocked = (id) => {
  if (id === "roulette") return rouletteChanceStatus.value !== "ok";
  if (id === "mystery") return mysteryChanceStatus.value !== "ok";
  return false;
};

const formatPct = (value) => `${Number(value || 0).toFixed(1)} %`;
const formatChance = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
};

const crashStepOf = (speed) => (speed === "fast" ? 0.2 : speed === "slow" ? 0.05 : 0.1);

const crashWinChance = (cfg, cashout) => {
  const maxMultiplier = Math.max(1, Number(cfg.maxMultiplier || 20));
  const step = crashStepOf(String(cfg.speed || "normal"));
  const cash = Math.max(1, Number(cashout || 2));
  const p = Math.min(100, Math.max(0, Number(cfg.crashChancePerTickPercent || 0))) / 100;
  let multiplier = 1;
  let ticks = 0;
  while (multiplier < maxMultiplier && multiplier + 1e-9 < cash) {
    ticks += 1;
    multiplier = Math.min(maxMultiplier, Number((multiplier + step).toFixed(2)));
  }
  return 100 * (1 - p) ** ticks;
};

const slotOdds = computed(() => {
  const symbols = slotReelSymbols.value;
  const n = symbols.length;
  const total = n * n * n;
  const payouts = props.gamesConfig.slot?.payouts || [];
  const twoKind = Number(props.gamesConfig.slot?.twoOfKindMultiplier || 0);
  let wins = 0;
  let expected = 0;
  for (let a = 0; a < n; a += 1) {
    for (let b = 0; b < n; b += 1) {
      for (let c = 0; c < n; c += 1) {
        const result = [symbols[a], symbols[b], symbols[c]];
        const combo = result.join("");
        const match = payouts.find((row) => row.combo === combo);
        let multiplier = 0;
        if (match) multiplier = Number(match.multiplier || 0);
        else if (result[0] === result[1] || result[0] === result[2] || result[1] === result[2]) multiplier = twoKind;
        expected += multiplier;
        if (multiplier > 0) wins += 1;
      }
    }
  }
  return {
    winChance: total ? (100 * wins) / total : 0,
    expected: total ? expected / total : 0
  };
});

const simNeedsChoice = computed(() => ["flip", "dice", "roulette", "higherLower", "crash"].includes(selectedId.value));
const simFlipItems = computed(() => [
  { label: t("userGuild.games.choicePile"), value: "pile" },
  { label: t("userGuild.games.choiceFace"), value: "face" }
]);
const simDiceItems = computed(() => {
  const sides = Math.max(2, Number(props.gamesConfig.dice?.sides || 6));
  return Array.from({ length: sides }, (_, index) => ({ label: String(index + 1), value: String(index + 1) }));
});
const simRouletteItems = computed(() => [
  { label: t("userGuild.games.choiceRed"), value: "red" },
  { label: t("userGuild.games.choiceBlack"), value: "black" },
  { label: t("userGuild.games.choiceGreen"), value: "green" }
]);
const simHigherLowerItems = computed(() => [
  { label: t("userGuild.games.choicePlus"), value: "plus" },
  { label: t("userGuild.games.choiceMinus"), value: "moins" }
]);

const oddsPreview = computed(() => {
  const id = selectedId.value;
  const cfg = props.gamesConfig[id] || {};
  const edgeKeep = 1 - Math.max(0, Number(props.gamesConfig.houseEdgePercent || 0)) / 100;
  let winChance = 0;
  let expected = 0;
  let hint = t("adminGuild.games.chanceLockedHint");
  if (id === "flip") {
    winChance = 50;
    const jackpot = cfg.jackpotEnabled !== false ? Math.min(100, Math.max(0, Number(cfg.jackpotChancePercent || 0))) / 100 : 0;
    expected = 0.5 * ((1 - jackpot) * Number(cfg.winMultiplier || 0) + jackpot * Number(cfg.jackpotMultiplier || 0));
    hint = t("adminGuild.games.flipChanceHint");
  } else if (id === "dice") {
    const sides = Math.max(2, Number(cfg.sides || 6));
    winChance = 100 / sides;
    expected = (winChance / 100) * Number(cfg.winMultiplier || 0);
    hint = t("adminGuild.games.diceChanceLockedHint", { sides, chance: winChance.toFixed(1) });
  } else if (id === "roulette") {
    const color = simChoice.value === "black" || simChoice.value === "green" ? simChoice.value : "red";
    const total = rouletteTotal.value || 100;
    const weight = Number(cfg[color]?.chance || 0);
    winChance = (100 * weight) / total;
    expected = (winChance / 100) * Number(cfg[color]?.multiplier || 0);
    hint = t("adminGuild.games.hints.colorChance");
  } else if (id === "higherLower") {
    const max = Math.max(2, Number(cfg.maxNumber || 10));
    winChance = ((max - 1) / (2 * max)) * 100;
    expected = (winChance / 100) * Number(cfg.winMultiplier || 0);
    hint = t("adminGuild.games.higherLowerChanceHint", { max, chance: winChance.toFixed(1) });
  } else if (id === "double") {
    winChance = Math.min(100, Math.max(0, Number(cfg.winChancePercent || 50)));
    expected = (winChance / 100) * Number(cfg.multiplier || 0);
    hint = t("adminGuild.games.hints.winChance");
  } else if (id === "crash") {
    winChance = crashWinChance(cfg, simCashout.value);
    expected = (winChance / 100) * Math.max(1, Number(simCashout.value || 2));
    hint = t("adminGuild.games.hints.crashChance");
  } else if (id === "slot") {
    winChance = slotOdds.value.winChance;
    expected = slotOdds.value.expected;
    hint = t("adminGuild.games.hints.slotPayouts");
  } else if (id === "mystery") {
    const rows = cfg.outcomes || [];
    const total = rows.reduce((sum, row) => sum + Math.max(0, Number(row.chance || 0)), 0);
    const wins = rows.reduce((sum, row) => sum + (Number(row.multiplier || 0) > 0 ? Math.max(0, Number(row.chance || 0)) : 0), 0);
    winChance = total ? (100 * wins) / total : 0;
    expected = total
      ? rows.reduce((sum, row) => sum + Number(row.multiplier || 0) * Math.max(0, Number(row.chance || 0)), 0) / total
      : 0;
    hint = t("adminGuild.games.hints.mysteryOutcomes", { total: mysteryTotal.value });
  }
  return { winChance, rtp: expected * edgeKeep * 100, hint };
});

const blockingError = computed(() => {
  const minBet = Number(props.gamesConfig.minBet || 0);
  const maxBet = Number(props.gamesConfig.maxBet || 0);
  if (minBet <= 0 || maxBet <= 0) return t("adminGuild.games.errors.betsPositive");
  if (minBet > maxBet) return t("adminGuild.games.errors.minAboveMax");
  if (!(props.gamesConfig.slot?.payouts || []).length) return t("adminGuild.games.errors.slotEmpty");
  if (!(props.gamesConfig.mystery?.outcomes || []).length) return t("adminGuild.games.errors.mysteryEmpty");
  if (rouletteChanceStatus.value === "under") {
    return t("adminGuild.games.errors.rouletteUnder", { total: formatChance(rouletteTotal.value) });
  }
  if (mysteryChanceStatus.value === "under") {
    return t("adminGuild.games.errors.mysteryUnder", { total: formatChance(mysteryTotal.value) });
  }
  return "";
});

const globalAlert = computed(() => {
  const edge = Number(props.gamesConfig.houseEdgePercent || 0);
  const cfg = props.gamesConfig.flip || {};
  const jackpot = cfg.jackpotEnabled !== false ? Math.min(100, Math.max(0, Number(cfg.jackpotChancePercent || 0))) / 100 : 0;
  const expected = 0.5 * ((1 - jackpot) * Number(cfg.winMultiplier || 0) + jackpot * Number(cfg.jackpotMultiplier || 0));
  const keep = 1 - Math.max(0, edge) / 100;
  const flipRtp = expected * keep * 100;
  if (flipRtp > 110) {
    return {
      color: "error",
      title: t("adminGuild.games.warnings.rtpHighTitle"),
      description: t("adminGuild.games.warnings.rtpHigh", { rtp: Math.round(flipRtp) })
    };
  }
  if (edge > 25) {
    return {
      color: "warning",
      title: t("adminGuild.games.warnings.houseEdgeHighTitle"),
      description: t("adminGuild.games.warnings.houseEdgeHigh")
    };
  }
  if (edge === 0) {
    return {
      color: "warning",
      title: t("adminGuild.games.warnings.houseEdgeZeroTitle"),
      description: t("adminGuild.games.warnings.houseEdgeZero")
    };
  }
  if (rouletteChanceStatus.value === "over") {
    return {
      color: "warning",
      title: t("adminGuild.games.warnings.rouletteOverTitle"),
      description: t("adminGuild.games.warnings.rouletteOver", { total: formatChance(rouletteTotal.value) })
    };
  }
  if (mysteryChanceStatus.value === "over") {
    return {
      color: "warning",
      title: t("adminGuild.games.warnings.mysteryOverTitle"),
      description: t("adminGuild.games.warnings.mysteryOver", { total: formatChance(mysteryTotal.value) })
    };
  }
  return null;
});

const selectedAlert = computed(() => {
  const id = selectedId.value;
  if (id === "roulette" && rouletteChanceStatus.value === "under") {
    return {
      color: "error",
      title: t("adminGuild.games.errors.rouletteUnderTitle"),
      description: t("adminGuild.games.errors.rouletteUnder", { total: formatChance(rouletteTotal.value) })
    };
  }
  if (id === "roulette" && rouletteChanceStatus.value === "over") {
    return {
      color: "warning",
      title: t("adminGuild.games.warnings.rouletteOverTitle"),
      description: t("adminGuild.games.warnings.rouletteOver", { total: formatChance(rouletteTotal.value) })
    };
  }
  if (id === "mystery" && mysteryChanceStatus.value === "under") {
    return {
      color: "error",
      title: t("adminGuild.games.errors.mysteryUnderTitle"),
      description: t("adminGuild.games.errors.mysteryUnder", { total: formatChance(mysteryTotal.value) })
    };
  }
  if (id === "mystery" && mysteryChanceStatus.value === "over") {
    return {
      color: "warning",
      title: t("adminGuild.games.warnings.mysteryOverTitle"),
      description: t("adminGuild.games.warnings.mysteryOver", { total: formatChance(mysteryTotal.value) })
    };
  }
  const rtp = Number(oddsPreview.value.rtp || 0);
  if (["flip", "dice", "double", "higherLower", "roulette", "slot", "mystery", "crash"].includes(id)) {
    if (rtp > 115) {
      return {
        color: "error",
        title: t("adminGuild.games.warnings.gameRtpHighTitle"),
        description: t("adminGuild.games.warnings.gameRtpHigh", { rtp: Math.round(rtp) })
      };
    }
    if (rtp < 35) {
      return {
        color: "warning",
        title: t("adminGuild.games.warnings.gameRtpLowTitle"),
        description: t("adminGuild.games.warnings.gameRtpLow", { rtp: Math.round(rtp) })
      };
    }
  }
  if (id === "slot" && !(props.gamesConfig.slot?.symbols || []).length) {
    return { color: "warning", title: t("adminGuild.games.warnings.slotSymbols"), description: "" };
  }
  return null;
});

const flipJackpotPreview = computed(() => {
  const cfg = props.gamesConfig.flip || {};
  const bet = Number(props.gamesConfig.minBet || 10);
  const winMult = Number(cfg.winMultiplier || 2);
  const jpMult = Number(cfg.jackpotMultiplier || 10);
  const chance = Math.min(100, Math.max(0, Number(cfg.jackpotChancePercent || 0)));
  const edge = 1 - Math.max(0, Number(props.gamesConfig.houseEdgePercent || 0)) / 100;
  const enabled = cfg.jackpotEnabled !== false;
  return {
    enabled,
    bet,
    winMult,
    jpMult,
    chance,
    realChance: (50 * chance) / 100,
    normal: Math.max(0, Math.floor(bet * winMult * edge)),
    jackpot: Math.max(0, Math.floor(bet * jpMult * edge)),
    useless: enabled && jpMult <= winMult,
    tooHigh: enabled && (chance > 5 || jpMult > 15),
    tooExtreme: enabled && (chance > 10 || jpMult > 25)
  };
});

const selectedExample = computed(() => {
  const bet = Number(props.gamesConfig.minBet || 10);
  const id = selectedId.value;
  const cfg = props.gamesConfig[id] || {};
  if (id === "flip") {
    return t("adminGuild.games.examples.flip", { bet, chance: 50, gain: Math.floor(bet * Number(cfg.winMultiplier || 0)) });
  }
  if (id === "dice") {
    return t("adminGuild.games.examples.dice", { bet, sides: cfg.sides, gain: Math.floor(bet * Number(cfg.winMultiplier || 0)) });
  }
  if (id === "double") {
    return t("adminGuild.games.examples.double", { bet, gain: Math.floor(bet * Number(cfg.multiplier || 0)) });
  }
  if (id === "crash") {
    return t("adminGuild.games.examples.crash", { bet, max: cfg.maxMultiplier });
  }
  if (id === "roulette") {
    return t("adminGuild.games.examples.roulette", { bet, green: Math.floor(bet * Number(cfg.green?.multiplier || 0)) });
  }
  return t("adminGuild.games.examples.generic", { bet });
});

const assignDeep = (target, source) => {
  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (Array.isArray(value)) {
      target[key] = JSON.parse(JSON.stringify(value));
    } else if (value && typeof value === "object") {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      assignDeep(target[key], value);
    } else {
      target[key] = value;
    }
  });
};

const restoreAllDefaults = () => {
  assignDeep(props.gamesConfig, defaultsOf());
};

const restoreSelectedDefaults = () => {
  const defaults = defaultsOf();
  const id = selectedId.value;
  if (!defaults[id]) return;
  assignDeep(props.gamesConfig[id], defaults[id]);
};

const addPayout = () => {
  if (!Array.isArray(props.gamesConfig.slot.payouts)) props.gamesConfig.slot.payouts = [];
  const icon = slotReelSymbols.value[0] || "💎";
  props.gamesConfig.slot.payouts.push({ combo: `${icon}${icon}${icon}`, multiplier: 5 });
};
const removePayout = (index) => {
  if ((props.gamesConfig.slot.payouts || []).length <= 1) return;
  props.gamesConfig.slot.payouts.splice(index, 1);
};
const addOutcome = () => {
  if (!Array.isArray(props.gamesConfig.mystery.outcomes)) props.gamesConfig.mystery.outcomes = [];
  props.gamesConfig.mystery.outcomes.push({ multiplier: 1, chance: 10 });
};
const removeOutcome = (index) => {
  if ((props.gamesConfig.mystery.outcomes || []).length <= 1) return;
  props.gamesConfig.mystery.outcomes.splice(index, 1);
};

watch(
  [rouletteChanceStatus, mysteryChanceStatus],
  () => {
    if (rouletteChanceStatus.value !== "ok" && props.gamesConfig.roulette) {
      props.gamesConfig.roulette.enabled = false;
    }
    if (mysteryChanceStatus.value !== "ok" && props.gamesConfig.mystery) {
      props.gamesConfig.mystery.enabled = false;
    }
  },
  { immediate: true }
);

watch(
  selectedId,
  (id) => {
    simRecap.value = null;
    simError.value = "";
    if (id === "flip") simChoice.value = "pile";
    if (id === "dice") simChoice.value = "1";
    if (id === "roulette") simChoice.value = "red";
    if (id === "higherLower") simChoice.value = "plus";
    if (id === "crash") simCashout.value = 2;
    if (id !== "slot") return;
    props.gamesConfig.slot.symbols = [...slotReelSymbols.value];
  },
  { immediate: true }
);

const simVerdictText = computed(() => {
  const economy = simRecap.value?.verdict?.economy;
  if (economy === "generous" || economy === "slightly_generous") return t("adminGuild.games.sim.verdictGenerous");
  if (economy === "harsh") return t("adminGuild.games.sim.verdictHarsh");
  return t("adminGuild.games.sim.verdictOk");
});

const simSampleText = computed(() => {
  const recap = simRecap.value;
  if (!recap) return "";
  if (recap.verdict?.sample === "small_sample") return t("adminGuild.games.sim.sampleSmall", { n: recap.rounds });
  if (recap.verdict?.sample === "off") return t("adminGuild.games.sim.sampleOff");
  return t("adminGuild.games.sim.sampleMatch");
});

const runSimulation = async (rounds) => {
  simBusy.value = rounds;
  simError.value = "";
  try {
    const token = getToken();
    const payload = {
      gameId: selectedId.value,
      rounds,
      bet: Number(props.gamesConfig.minBet || 10),
      settings: props.gamesConfig,
      choice: selectedId.value === "dice" ? Number(simChoice.value) : simChoice.value,
      cashout: Number(simCashout.value)
    };
    const res = await fetch(`${runtimeConfig.public.apiBase}/api/admin/games/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      simRecap.value = null;
      simError.value = t("adminGuild.games.sim.error");
      return;
    }
    simRecap.value = data.recap;
  } catch {
    simRecap.value = null;
    simError.value = t("adminGuild.games.sim.error");
  } finally {
    simBusy.value = 0;
  }
};
</script>

<style scoped>
.games-admin {
  display: grid;
  gap: 16px;
}
.card-head,
.row-head,
.head-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
.head-actions {
  align-items: center;
}
.editor-hero {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 14px;
  align-items: center;
  margin-bottom: 14px;
}
.editor-cover {
  width: 120px;
  height: 72px;
  object-fit: cover;
  border-radius: 12px;
}
.editor-hero-body h4 {
  margin: 0 0 4px;
}
.icon-catalog {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.icon-chip {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.45);
  font-size: 22px;
  cursor: pointer;
}
.icon-chip.on {
  border-color: rgba(34, 211, 238, 0.8);
  box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.35);
  background: rgba(34, 211, 238, 0.12);
}
.payout-row {
  display: grid;
  grid-template-columns: 1fr 110px auto;
  gap: 10px;
  align-items: end;
}
.payout-reels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
@media (max-width: 720px) {
  .editor-hero,
  .payout-row {
    grid-template-columns: 1fr;
  }
}
.notice,
.alert,
.explain {
  border-radius: 14px;
  padding: 12px 14px;
}
.notice {
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(129, 140, 248, 0.35);
}
.alert.warn {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fbbf24;
}
.alert.danger {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}
.explain {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  background: var(--surface-2);
  margin-bottom: 14px;
  border: 1px solid var(--border-strong);
}
.sub-card {
  border: 1px solid var(--border-strong);
  background: var(--surface);
  border-radius: 16px;
  padding: 16px;
}
.setting-row {
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  border-radius: 14px;
  padding: 12px 14px;
}
.setting-row--switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 56px;
}
.setting-label {
  font-size: 14px;
  font-weight: 600;
}
.catalog-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.chance-box,
.sim-panel {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
}
.chance-box {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin-bottom: 14px;
}
.chance-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.chance-stat .muted {
  font-size: 12px;
  line-height: 1.35;
}
.chance-stat strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.chance-stat .field-hint {
  margin: 0;
  font-size: 12px;
}
.chance-box > .field-hint {
  grid-column: 1 / -1;
  margin: 0;
}
.jackpot-box {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-left: 3px solid var(--warning);
}
.jackpot-box-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.jackpot-box-head h4 {
  margin: 0 0 4px;
  font-size: 15px;
}
.jackpot-box-head p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.45;
}
.jackpot-steps {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.45;
}
.grid.is-disabled {
  opacity: 0.55;
  pointer-events: none;
}
.sim-params {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin: 10px 0;
}
.sim-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 4px;
}
.sim-recap {
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.35);
}
.sim-recap.generous,
.sim-recap.slightly_generous {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.45);
}
.sim-recap.harsh {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.4);
}
.sim-verdict {
  margin: 0 0 6px;
  font-weight: 700;
}
.sim-stats {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  margin-top: 10px;
}
.sim-stats div {
  display: grid;
  gap: 2px;
}
.sim-stats span {
  font-size: 12px;
  color: var(--text-muted);
}
.sim-stats .pos {
  color: #86efac;
}
.sim-stats .neg {
  color: #fca5a5;
}
.explain p,
.notice p,
.field-hint {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.45;
}
.selected-alert {
  margin: 12px 0 4px;
}
.catalog {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}
.catalog-card {
  text-align: left;
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  overflow: hidden;
  background: var(--surface-2);
  color: inherit;
  cursor: pointer;
  padding: 0;
}
.catalog-card.active {
  border-color: rgba(129, 140, 248, 0.8);
  box-shadow: 0 0 0 1px rgba(129, 140, 248, 0.4);
}
.catalog-card.off {
  opacity: 0.62;
}
.catalog-cover {
  width: 100%;
  height: 110px;
  object-fit: cover;
  display: block;
}
.catalog-body {
  padding: 10px 12px 12px;
  display: grid;
  gap: 6px;
}
.catalog-title {
  font-weight: 700;
}
.catalog-help {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  min-height: 34px;
}
.premium-tag {
  font-size: 11px;
  color: #fbbf24;
}
.grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.stack,
.row-edit {
  display: grid;
  gap: 10px;
}
.row-edit {
  grid-template-columns: 1fr 120px auto;
  align-items: end;
}
</style>

<style>
.games-admin .field-hint {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
}
.games-admin input[type="number"],
.games-admin input[type="text"],
.games-admin .row-edit input {
  width: 100%;
}
</style>

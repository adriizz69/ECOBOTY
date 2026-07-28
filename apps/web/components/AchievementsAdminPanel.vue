<template>
  <UCard class="card achievements-admin">
    <div class="card-head">
      <div>
        <h3>Succes</h3>
        <p class="muted">Configuration complete du module succes par serveur.</p>
      </div>
      <div class="actions-inline">
        <UButton color="neutral" variant="outline" :loading="loading" @click="loadAll">Actualiser</UButton>
        <UButton color="primary" :loading="savingSettings" @click="saveSettingsAction">Sauver les parametres</UButton>
      </div>
    </div>

    <div v-if="statusMessage" class="muted status-line">{{ statusMessage }}</div>

    <div class="sub-card">
      <h4>Module global</h4>
      <div class="grid">
        <div class="switch-field">
          <span>Activer les succes</span>
          <label class="switch">
            <input v-model="settings.enabled" type="checkbox" />
            <span class="slider"></span>
          </label>
        </div>
        <label>
          Salon d'annonce des succes
          <EbSelect v-model="settings.announceChannelId" :items="channelSelectItems" />
        </label>
      </div>
    </div>

    <div class="sub-card templates-section">
      <h4>Templates rapides</h4>
      <p class="muted">Ajoute une base de succes en un clic, puis personnalise.</p>
      <div v-if="templates.length" class="template-grid">
        <button
          v-for="tpl in templates"
          :key="tpl.key"
          class="template-card"
          type="button"
          :style="templateCardStyle(tpl)"
          @click="applyTemplateAction(tpl.key)"
        >
          <div class="template-top">
            <div v-if="isTierTemplate(tpl)" class="template-badges">
              <span class="template-badge bronze">🏅</span>
              <span class="template-badge silver">🏅</span>
              <span class="template-badge gold">🏅</span>
              <span class="template-badge diamond">🏅</span>
            </div>
            <div v-else :class="['template-badge', 'unique', `shape-${templateShape(tpl)}`]">{{ iconGlyph(templateIcon(tpl)) }}</div>
            <span class="template-kind">{{ templateKindLabel(tpl) }}</span>
          </div>
          <div class="template-title">{{ templateTitle(tpl) }}</div>
          <p class="template-desc muted small">{{ templateDescription(tpl) }}</p>
          <div class="template-meta small">
            <span>{{ eventLabel(tpl.payload?.eventKey) }}</span>
            <span>{{ templateGoal(tpl) }}</span>
          </div>
        </button>
      </div>
      <div v-else class="muted small">Aucun template rapide disponible.</div>
    </div>

    <div class="card-head achievements-head" style="margin-top: 10px;">
      <div>
        <h4>Liste des succes</h4>
        <p class="muted small">{{ filteredAchievements.length }} / {{ achievements.length }} affiches</p>
      </div>
      <div class="achievements-head-actions">
        <label class="achievements-search">
          <input v-model.trim="achievementSearch" placeholder="Recherche d'un succes..." />
        </label>
        <UButton color="primary" @click="openCreate">Nouveau succes</UButton>
      </div>
    </div>

    <div v-if="loading" class="muted">Chargement...</div>
    <div v-else-if="!achievements.length" class="muted">Aucun succes configure.</div>
    <div v-else-if="!filteredAchievements.length" class="muted">Aucun succes ne correspond a la recherche.</div>
    <template v-else>
    <div v-if="achievementSections.length" class="achievement-sections">
      <section v-for="section in achievementSections" :key="section.key" class="achievement-section">
        <div class="achievement-section-head">
          <h5>{{ section.title }}</h5>
          <span class="muted small">{{ section.items.length }} affiche(s)</span>
        </div>
        <div class="achievement-grid">
          <article v-for="item in section.items" :key="item.id" class="achievement-card" :style="achievementCardStyle(item)">
            <div class="achievement-card-top">
              <div :class="['achievement-badge', `shape-${item.badge?.shape || 'hexagon'}`]" :style="badgeStyle(item.badge?.color)">
                <span>{{ iconGlyph(item.badge?.icon || eventDefaultIcon(item.eventKey)) }}</span>
              </div>
              <label class="switch achievement-switch" :title="item.enabled ? 'Actif' : 'Desactive'">
                <input
                  type="checkbox"
                  :checked="Boolean(item.enabled)"
                  :disabled="togglingId === Number(item.id || 0)"
                  @change="toggleEnabled(item)"
                />
                <span class="slider"></span>
              </label>
            </div>

            <div class="achievement-main">
              <div class="achievement-card-headline">
                <div class="achievement-title">{{ item.title }}</div>
                <button class="card-arrow" type="button" title="Editer" @click="openEdit(item)">›</button>
              </div>
              <p class="muted small">{{ item.description || 'Sans description' }}</p>
            </div>

            <div class="achievement-meta small">
              <span>{{ item.type === 'tier' ? 'Succes a paliers' : 'Succes unique' }}</span>
              <span>{{ eventLabel(item.eventKey) }}</span>
              <span v-if="item.type === 'unique' && item.eventKey === 'role_received' && item.eventTargetRoleId">
                Role: {{ roleName(item.eventTargetRoleId) }}
              </span>
              <span v-if="item.expiresAt">Expire: {{ formatDate(item.expiresAt) }}</span>
            </div>

            <div class="achievement-progress-caption small muted">{{ achievementValidatedText(item) }}</div>
            <div class="achievement-meter">
              <div class="achievement-meter-fill" :style="{ width: `${achievementVisualPercent(item)}%` }"></div>
            </div>

            <div class="achievement-foot">
              <span class="muted small">
                {{ achievementGoalText(item) }}
                <template v-if="canSyncFromDiscord(item)">
                  • Sync dispo pour membres deja eligibles
                </template>
              </span>
              <div class="actions-inline achievement-actions">
                <UButton
                  v-if="canSyncFromDiscord(item)"
                  color="neutral"
                  variant="outline"
                  :loading="syncingId === Number(item.id || 0)"
                  @click="syncAchievementAction(item)"
                >
                  Synchroniser
                </UButton>
                <UButton color="neutral" variant="outline" @click="openEdit(item)">Editer</UButton>
                <UButton color="error" variant="solid" :loading="deletingId === Number(item.id || 0)" @click="deleteAchievementAction(item)">
                  Supprimer
                </UButton>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <BillingPremiumGate
      v-if="lockedAchievementSections.length"
      locked
      feature-key="premium_restore_content"
      :benefits="lockedAchievementUnlockItems.length ? lockedAchievementUnlockItems : undefined"
      class="locked-achievements-gate"
    >
      <div class="achievement-sections">
        <section v-for="section in lockedAchievementSections" :key="`locked-${section.key}`" class="achievement-section">
          <div class="achievement-section-head">
            <h5>{{ section.title }}</h5>
            <span class="muted small">{{ section.items.length }} verrouille(s)</span>
          </div>
          <div class="achievement-grid">
            <article v-for="item in section.items" :key="`locked-${item.id}`" class="achievement-card" :style="achievementCardStyle(item)">
              <div class="achievement-card-top">
                <div :class="['achievement-badge', `shape-${item.badge?.shape || 'hexagon'}`]" :style="badgeStyle(item.badge?.color)">
                  <span>{{ iconGlyph(item.badge?.icon || eventDefaultIcon(item.eventKey)) }}</span>
                </div>
              </div>
              <div class="achievement-main">
                <div class="achievement-title">{{ item.title }}</div>
                <p class="muted small">{{ item.description || 'Sans description' }}</p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </BillingPremiumGate>
    </template>

    <Teleport to="body">
      <div v-if="editorOpen" class="editor-modal" @click.self="requestCloseEditor">
        <UCard class="editor-modal-card">
          <div v-if="isEditorDirty" class="editor-unsaved">
            <div class="editor-unsaved-copy">
              <strong>Modifications non sauvegardees</strong>
              <p class="muted small">Tu as des changements en cours. Sauvegarde pour appliquer sur le serveur.</p>
            </div>
          </div>
          <div class="editor-content">
          <div class="card-head">
            <div>
              <h4>{{ editingId ? 'Modifier un succes' : 'Creer un succes' }}</h4>
              <p class="muted small">Tous les champs de recompense/notification sont configurables.</p>
              <p class="muted small help-note">Commence par choisir le type et l'evenement, puis personnalise le badge, les notifications et les recompenses.</p>
            </div>
            <div class="actions-inline">
              <UButton color="neutral" variant="outline" @click="requestCloseEditor">Fermer</UButton>
              <UButton color="primary" :loading="savingAchievement" @click="saveAchievementAction">Sauver</UButton>
            </div>
          </div>

          <div class="editor-layout">
            <div class="editor-form">
            <div class="grid">
              <label>
                Type
                <EbSelect v-model="form.type" :items="typeSelectItems" :searchable="false" />
              </label>
              <label>
                Evenement
                <EbSelect v-model="form.eventKey" :items="eventSelectItems" :searchable="false" />
              </label>
              <label v-if="form.type === 'unique' && form.eventKey === 'role_received'" class="event-condition-field">
                Role a obtenir pour valider le succes
                <EbSelect v-model="form.eventTargetRoleId" :items="targetRoleSelectItems" />
                <span class="muted small">Des que le membre obtient ce role, le succes est valide.</span>
              </label>
              <label v-else-if="form.type === 'unique' && form.eventKey === 'server_boost'" class="event-condition-field">
                Condition de validation
                <input value="Validation automatique au premier boost" type="text" disabled />
                <span class="muted small">Le boost serveur ne peut etre obtenu qu'une fois par membre sur ce serveur.</span>
              </label>
              <label v-else-if="form.type === 'unique' && form.eventKey === 'twitch_authenticated'" class="event-condition-field">
                Condition de validation
                <input value="Validation automatique a la liaison Twitch" type="text" disabled />
                <span class="muted small">Le succes se debloque une seule fois quand le membre lie son compte Twitch.</span>
              </label>
              <label v-else-if="form.type === 'unique' && form.eventKey === 'birthday_added'" class="event-condition-field">
                Condition de validation
                <input value="Validation automatique a l'ajout d'un anniversaire" type="text" disabled />
                <span class="muted small">Le succes se debloque une seule fois quand le membre enregistre sa date d'anniversaire.</span>
              </label>
              <label v-else-if="form.type === 'unique' && form.eventKey === 'birthday_announced'" class="event-condition-field">
                Condition de validation
                <input value="Validation automatique lors de l'anniversaire du membre" type="text" disabled />
                <span class="muted small">Le succes se debloque quand l'anniversaire du membre est traite par le module anniversaire.</span>
              </label>
              <label v-else-if="form.type === 'unique'" class="event-condition-field">
                Nombre de fois a atteindre pour valider ce succes
                <input v-model.number="form.threshold" type="number" min="1" placeholder="Ex: 10" />
                <span class="muted small">Choisis le nombre de fois necessaires pour debloquer ce succes.</span>
              </label>
              <label>
                Nom du succes
                <input v-model.trim="form.title" maxlength="80" />
              </label>
              <label>
                Date limite (optionnel)
                <input v-model="form.expiresAt" type="datetime-local" />
              </label>
              <label style="grid-column: 1 / -1;">
                Description
                <textarea
                  v-model="form.description"
                  rows="2"
                  :maxlength="DESCRIPTION_MAX_CHARS"
                  @input="onDescriptionInput"
                ></textarea>
                <span class="muted small">Max {{ DESCRIPTION_MAX_LINES }} lignes / {{ DESCRIPTION_MAX_CHARS }} caracteres.</span>
              </label>
              <div class="switch-field switch-field-vertical">
                <div class="switch-field-copy">
                  <span>Actif</span>
                  <p class="muted small">
                    Quand ce switch est desactive, ce succes ne progresse plus et n'apparait plus cote utilisateur.
                  </p>
                </div>
                <label class="switch">
                  <input v-model="form.enabled" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
              <p v-if="form.type === 'unique'" class="muted small event-threshold-help">
                {{ uniqueThresholdHelp(form.eventKey) }}
              </p>
            </div>

            <div class="sub-card">
              <h4>Badge</h4>
              <p class="muted small help-note">Ce badge (forme, couleur, icone) est utilise pour l'affichage du succes et des annonces.</p>
              <fieldset class="bare-fieldset">
              <div class="visual-picker">
                <div class="picker-group">
                  <div class="picker-title">Forme</div>
                  <div class="picker-grid picker-grid-shapes">
                    <button
                      v-for="shape in badgeShapes"
                      :key="`main-shape-${shape}`"
                      type="button"
                      :class="['picker-btn', form.badge.shape === shape && 'active']"
                      :title="formatKeyLabel(shape)"
                      @click="form.badge.shape = shape"
                    >
                      <span :class="['shape-token', `shape-${shape}`]"></span>
                    </button>
                  </div>
                </div>

                <div class="picker-group">
                  <div class="picker-title">Couleur</div>
                  <div class="picker-grid picker-grid-colors">
                    <button
                      v-for="color in badgeColors"
                      :key="`main-color-${color}`"
                      type="button"
                      :class="['picker-btn', 'color-btn', form.badge.color === color && 'active']"
                      :title="formatKeyLabel(color)"
                      @click="form.badge.color = color"
                    >
                      <span class="color-token" :style="colorChipStyle(color)"></span>
                    </button>
                  </div>
                </div>

                <div class="picker-group">
                  <div class="picker-title">Icone</div>
                  <div class="picker-grid picker-grid-icons">
                    <button
                      v-for="icon in badgeIcons"
                      :key="`main-icon-${icon}`"
                      type="button"
                      :class="['picker-btn', 'icon-btn', form.badge.icon === icon && 'active']"
                      :title="formatKeyLabel(icon)"
                      @click="form.badge.icon = icon"
                    >
                      <span>{{ iconGlyph(icon) }}</span>
                    </button>
                  </div>
                </div>
              </div>
              </fieldset>
            </div>

            <div class="sub-card">
              <h4>Notifications</h4>
              <p class="muted small help-note">Les notifications de progression sont fixes a 75% pour garder une configuration simple et uniforme.</p>
              <div class="grid">
                <div class="switch-field">
                  <span>DM envoye a l'utilisateur lorsqu'il atteint 75%</span>
                  <label class="switch">
                    <input v-model="form.notify.progressEnabled" type="checkbox" />
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="switch-field">
                  <span>DM envoye a l'utilisateur a l'obtention</span>
                  <label class="switch">
                    <input v-model="form.notify.unlockEnabled" type="checkbox" />
                    <span class="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div v-if="form.type === 'unique'" class="sub-card">
              <h4>Recompense a l'obtention du succes</h4>
              <p class="muted small help-note">Cette recompense est donnee une seule fois a l'obtention du succes.</p>
              <RewardEditor v-model:model-value="form.reward" />
            </div>

            <div v-if="form.type === 'tier'" class="sub-card">
              <h4>Paliers Bronze / Silver / Gold / Diamond</h4>
              <p class="muted small">Les dependances sont forcees automatiquement (ex: Gold active Silver + Bronze). Clique sur la fleche pour ouvrir/fermer un palier.</p>
              <div v-for="tier in tierKeys" :key="tier" class="tier-block">
                <div class="tier-head">
                  <button type="button" class="tier-toggle-btn" @click="toggleTierPanel(tier)">
                    <span class="tier-toggle-arrow" :class="{ open: isTierPanelOpen(tier) }">▾</span>
                    <strong>{{ tierLabel(tier) }}</strong>
                  </button>
                  <label class="switch" :title="tier === 'bronze' ? 'Bronze reste actif' : ''">
                    <input
                      v-model="form.tiers[tier].enabled"
                      type="checkbox"
                      :disabled="tier === 'bronze'"
                    />
                    <span class="slider"></span>
                  </label>
                </div>
                <div v-show="isTierPanelOpen(tier)" class="tier-body">
                  <div class="grid">
                    <label>
                      Nom palier
                      <input v-model.trim="form.tiers[tier].title" maxlength="50" />
                    </label>
                    <label>
                      Seuil
                      <input v-model.number="form.tiers[tier].threshold" type="number" min="1" />
                    </label>
                  </div>
                  <fieldset class="bare-fieldset">
                  <div class="visual-picker compact">
                    <div class="picker-group">
                      <div class="picker-title">Forme badge</div>
                      <div class="picker-grid picker-grid-shapes">
                        <button
                          v-for="shape in badgeShapes"
                          :key="`${tier}-shape-${shape}`"
                          type="button"
                          :class="['picker-btn', form.tiers[tier].badge.shape === shape && 'active']"
                          :title="formatKeyLabel(shape)"
                          @click="form.tiers[tier].badge.shape = shape"
                        >
                          <span :class="['shape-token', `shape-${shape}`]"></span>
                        </button>
                      </div>
                    </div>
                    <div class="picker-group">
                      <div class="picker-title">Couleur badge</div>
                      <div class="picker-grid picker-grid-colors">
                        <button
                          v-for="color in badgeColors"
                          :key="`${tier}-color-${color}`"
                          type="button"
                          :class="['picker-btn', 'color-btn', form.tiers[tier].badge.color === color && 'active']"
                          :title="formatKeyLabel(color)"
                          @click="form.tiers[tier].badge.color = color"
                        >
                          <span class="color-token" :style="colorChipStyle(color)"></span>
                        </button>
                      </div>
                    </div>
                    <div class="picker-group">
                      <div class="picker-title">Icone badge</div>
                      <div class="picker-grid picker-grid-icons">
                        <button
                          v-for="icon in badgeIcons"
                          :key="`${tier}-icon-${icon}`"
                          type="button"
                          :class="['picker-btn', 'icon-btn', form.tiers[tier].badge.icon === icon && 'active']"
                          :title="formatKeyLabel(icon)"
                          @click="form.tiers[tier].badge.icon = icon"
                        >
                          <span>{{ iconGlyph(icon) }}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  </fieldset>
                  <div class="tier-notify-box">
                    <p class="muted small help-note">Pour les paliers, la notification de progression est geree au niveau du succes (75%).</p>
                    <div class="switch-field">
                      <span>DM envoye a l'utilisateur a l'obtention du palier</span>
                      <label class="switch">
                        <input v-model="form.tiers[tier].notify.unlockEnabled" type="checkbox" />
                        <span class="slider"></span>
                      </label>
                    </div>
                  </div>
                  <fieldset class="bare-fieldset">
                    <RewardEditor v-model:model-value="form.tiers[tier].reward" />
                  </fieldset>
                </div>
              </div>
            </div>

            <div v-if="form.type === 'tier'" class="sub-card">
              <h4>Recompense a l'obtention de tous les paliers du succes</h4>
              <p class="muted small help-note">Cette recompense est appliquee une fois quand tous les paliers du succes sont completes.</p>
              <fieldset class="bare-fieldset">
                <RewardEditor v-model:model-value="form.completionReward" />
              </fieldset>
            </div>
          </div>

            <div class="editor-preview">
              <div class="preview-card" :class="{ 'preview-card-tier': form.type === 'tier' }" :style="previewStyle">
                <template v-if="form.type === 'tier'">
                  <div class="preview-tier-strip">
                    <div
                      v-for="badgeItem in tierPreviewBadges"
                      :key="badgeItem.key"
                      class="preview-tier-item"
                      :class="{ disabled: !badgeItem.enabled }"
                    >
                      <div
                        :class="['preview-tier-badge', `shape-${badgeItem.badge.shape || 'hexagon'}`]"
                        :style="badgeStyle(badgeItem.badge.color)"
                      >
                        <span>{{ iconGlyph(badgeItem.badge.icon) }}</span>
                      </div>
                      <div class="preview-tier-name">{{ badgeItem.label }}</div>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div :class="['preview-badge', `shape-${form.badge.shape || 'hexagon'}`]">{{ iconGlyph(form.badge.icon) }}</div>
                </template>
                <div class="preview-content">
                  <div class="preview-kicker">{{ form.type === 'tier' ? 'Apercu succes a paliers' : 'ACHIEVEMENT UNLOCKED' }}</div>
                  <div class="preview-title">{{ form.title || 'Nouveau succes' }}</div>
                  <div class="preview-sub">{{ form.description || 'Description du succes' }}</div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </UCard>
      </div>

      <div v-if="showCloseConfirm" class="editor-close-modal" @click.self="continueEditorWork">
        <UCard class="editor-close-modal-card">
          <div class="card-head">
            <div>
              <h4>Veux-tu vraiment fermer ?</h4>
              <p class="muted small">Tout ce que tu as fait ne sera pas sauvegarde.</p>
            </div>
          </div>
          <div class="actions-inline editor-close-actions">
            <UButton color="error" variant="solid" @click="discardEditorChanges">Annuler sans sauvegarder</UButton>
            <UButton color="neutral" variant="outline" @click="continueEditorWork">Continuer mon travail</UButton>
          </div>
        </UCard>
      </div>
    </Teleport>
  </UCard>
</template>

<script setup>
import { defineComponent, h, resolveComponent } from "vue";

const EbSelect = resolveComponent("EbSelect");

const props = defineProps({
  guildId: {
    type: [String, Number],
    required: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  uniqueMax: {
    type: Number,
    default: null
  },
  tiersMax: {
    type: Number,
    default: null
  },
  tiersEnabled: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(["premium-upsell"]);

const { getToken, login } = useAuth();
const config = useRuntimeConfig();

const tierKeys = ["bronze", "silver", "gold", "diamond"];
const DM_PROGRESS_PERCENT = 75;
const DESCRIPTION_MAX_CHARS = 220;
const DESCRIPTION_MAX_LINES = 4;
const colorMap = {
  purple: "#7c3aed",
  blue: "#2563eb",
  green: "#16a34a",
  mint: "#10b981",
  gold: "#d97706",
  orange: "#ea580c",
  red: "#dc2626",
  pink: "#db2777",
  cyan: "#0891b2",
  yellow: "#ca8a04",
  white: "#cbd5e1",
  peach: "#fb923c"
};
const iconMap = {
  paw: "🐾",
  cat: "🐱",
  trophy: "🏆",
  medal: "🏅",
  sparkle: "✨",
  planet: "🪐",
  crown: "👑",
  star: "⭐",
  rocket: "🚀",
  gift: "🎁",
  coin: "🪙",
  gamepad: "🎮",
  headset: "🎧",
  shop: "🏪",
  heart: "💖",
  chat: "💬",
  fire: "🔥",
  snow: "❄️",
  target: "🎯",
  dice: "🎲",
  drop: "💧",
  shield: "🛡️",
  tag: "🏷️",
  graduation: "🎓",
  basketball: "🏀",
  bone: "🦴",
  bug: "🐞",
  thumb: "👍",
  wheel: "🎡",
  bomb: "💣",
  chef: "👨‍🍳",
  burger: "🍔",
  ghost: "👻",
  book: "📘",
  spider: "🕷️",
  tree: "🌲"
};

const eventMetaMap = {
  message_count: { label: "Messages", icon: "chat", color: "blue" },
  server_boost: { label: "Boost serveur", icon: "rocket", color: "pink" },
  role_received: { label: "Role recu", icon: "shield", color: "purple" },
  twitch_authenticated: { label: "Authentification Twitch", icon: "sparkle", color: "cyan" },
  twitch_sub_count: { label: "Abonnements Twitch", icon: "crown", color: "purple" },
  twitch_subgift_count: { label: "Subgifts Twitch", icon: "gift", color: "orange" },
  twitch_bits_sent: { label: "Bits Twitch", icon: "coin", color: "cyan" },
  birthday_added: { label: "Anniversaire ajoute", icon: "gift", color: "orange" },
  birthday_announced: { label: "Anniversaire celebre", icon: "star", color: "pink" },
  voice_minutes: { label: "Vocal", icon: "headset", color: "cyan" },
  reactions_added: { label: "Reactions", icon: "heart", color: "orange" },
  threads_created: { label: "Threads crees", icon: "book", color: "mint" },
  threads_participated: { label: "Participation threads", icon: "chat", color: "green" },
  economy_purchases: { label: "Achats economie", icon: "shop", color: "gold" },
  economy_sales_count: { label: "Ventes economie", icon: "tag", color: "mint" },
  lootboxes_opened: { label: "Lootbox ouvertes", icon: "gift", color: "purple" },
  economy_balance_reached: { label: "Solde economie", icon: "coin", color: "yellow" },
  daily_claims: { label: "Daily", icon: "gift", color: "yellow" },
  shop_views: { label: "Vues shop", icon: "shop", color: "peach" },
  twitch_watch_live_minutes: { label: "Minutes live Twitch", icon: "headset", color: "cyan" },
  games_played: { label: "Parties jouees", icon: "gamepad", color: "green" },
  games_won: { label: "Parties gagnees", icon: "trophy", color: "gold" }
};

const eventOptionTextMap = {
  message_count: "Le membre envoie X messages",
  server_boost: "Le membre boost le serveur (non configurable en palier)",
  role_received: "Le membre recoit un role (non configurable en palier)",
  twitch_authenticated: "Le membre s'authentifie avec Twitch (non configurable en palier)",
  twitch_sub_count: "Le membre s'abonne X fois a la chaine Twitch",
  twitch_subgift_count: "Le membre offre X subgifts sur la chaine Twitch",
  twitch_bits_sent: "Le membre envoie X bits sur la chaine Twitch",
  birthday_added: "Le membre ajoute sa date d'anniversaire (non configurable en palier)",
  birthday_announced: "Le membre est celebre automatiquement le jour de son anniversaire (non configurable en palier)",
  voice_minutes: "Le membre passe X minutes dans les salons vocaux",
  reactions_added: "Le membre ajoute des reactions a X messages",
  threads_created: "Un membre cree X fils de discussion ou publications de forum",
  threads_participated: "Un membre participe a X fils de discussion ou publications de forum",
  economy_purchases: "Le membre achete X objets d'economie",
  economy_sales_count: "Le membre vend X objets sur la revente",
  lootboxes_opened: "Le membre ouvre X lootboxes",
  economy_balance_reached: "Le membre atteint un solde economie de X",
  daily_claims: "Le membre utilise X fois la commande daily",
  shop_views: "Le membre regarde X fois le shop",
  twitch_watch_live_minutes: "Le membre passe X minutes sur le live Twitch",
  games_played: "Le membre joue a des jeux X fois",
  games_won: "Le membre gagne X parties"
};

const loading = ref(false);
const savingSettings = ref(false);
const savingAchievement = ref(false);
const deletingId = ref(0);
const togglingId = ref(0);
const syncingId = ref(0);
const statusMessage = ref("");

const channels = ref([]);
const roles = ref([]);
const templates = ref([]);
const achievements = ref([]);
const achievementSearch = ref("");
const guildMemberCount = ref(null);
const catalogs = ref({
  events: [],
  tiers: tierKeys,
  badges: { shapes: ["hexagon"], colors: ["purple"], icons: ["trophy"] }
});

const settings = reactive({
  enabled: false,
  announceChannelId: "",
  webShopViewCooldownSeconds: 60
});

const emptyReward = () => ({
  addRolesEnabled: false,
  addRoleIdsCsv: "",
  removeRolesEnabled: false,
  removeRoleIdsCsv: "",
  currencyEnabled: false,
  currencyAmount: 0
});

const emptyNotify = () => ({
  progressEnabled: false,
  progressPercent: DM_PROGRESS_PERCENT,
  unlockEnabled: true
});

const emptyBadge = () => ({
  shape: "hexagon",
  color: "purple",
  icon: "trophy"
});

const emptyTier = (key) => ({
  title: key === "bronze" ? "Bronze" : key === "silver" ? "Silver" : key === "gold" ? "Gold" : "Diamond",
  threshold: 1,
  enabled: key === "bronze",
  badge: emptyBadge(),
  notify: emptyNotify(),
  reward: emptyReward()
});

const buildDefaultForm = () => ({
  type: "unique",
  eventKey: "message_count",
  title: "",
  description: "",
  enabled: true,
  threshold: 1,
  eventTargetRoleId: "",
  expiresAt: "",
  badge: emptyBadge(),
  notify: emptyNotify(),
  reward: emptyReward(),
  completionReward: emptyReward(),
  tiers: {
    bronze: emptyTier("bronze"),
    silver: emptyTier("silver"),
    gold: emptyTier("gold"),
    diamond: emptyTier("diamond")
  }
});

const form = reactive(buildDefaultForm());
const editorOpen = ref(false);
const showCloseConfirm = ref(false);
const editingId = ref(0);
const editorSnapshot = ref("");
const tierPanels = reactive({
  bronze: true,
  silver: false,
  gold: false,
  diamond: false
});

const badgeShapes = computed(() => catalogs.value?.badges?.shapes || ["hexagon"]);
const badgeColors = computed(() => catalogs.value?.badges?.colors || ["purple"]);
const badgeIcons = computed(() => catalogs.value?.badges?.icons || ["trophy"]);

const availableEvents = computed(() => {
  const events = Array.isArray(catalogs.value?.events) ? catalogs.value.events : [];
  if (form.type === "tier") return events.filter((event) => event.supportsTier);
  return events;
});

const channelSelectItems = computed(() => [
  { label: "Aucun", value: "" },
  ...channels.value.map((channel) => ({
    label: channel.name,
    value: channel.id
  }))
]);

const typeSelectItems = computed(() => {
  const items = [{ label: "Unique", value: "unique" }];
  if (props.tiersEnabled) {
    items.push({ label: "Palier", value: "tier" });
  }
  return items;
});

const eventSelectItems = computed(() =>
  availableEvents.value.map((event) => ({
    label: eventOptionLabel(event.key),
    value: event.key
  }))
);

const targetRoleSelectItems = computed(() => [
  { label: "Selectionner un role", value: "" },
  ...roles.value.map((role) => ({
    label: role.name,
    value: String(role.id)
  }))
]);

const previewStyle = computed(() => {
  const accent = colorMap[form.badge.color] || "#7c3aed";
  return {
    borderColor: accent,
    boxShadow: `0 0 0 1px ${accent}55 inset`
  };
});

const tierPreviewBadges = computed(() => {
  const items = tierKeys.map((tierKey) => {
    const tier = form.tiers?.[tierKey] || emptyTier(tierKey);
    return {
      key: tierKey,
      label: String(tier.title || tierLabel(tierKey)),
      enabled: tierKey === "bronze" ? true : Boolean(tier.enabled),
      badge: {
        shape: String(tier.badge?.shape || "hexagon"),
        color: String(tier.badge?.color || "purple"),
        icon: String(tier.badge?.icon || "trophy")
      }
    };
  });
  items.push({
    key: "completion",
    label: "Palier final",
    enabled: true,
    badge: {
      shape: String(form.badge?.shape || "hexagon"),
      color: String(form.badge?.color || "purple"),
      icon: String(form.badge?.icon || "trophy")
    }
  });
  return items;
});

const fetchJson = async (url, options = {}) => {
  const token = getToken();
  if (!token) {
    login();
    return null;
  }
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (res.status === 401) {
    login();
    return null;
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
};

const parseCsvRoleIds = (csv) => {
  return String(csv || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
};

const clampDescription = (value) => {
  const normalized = String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").slice(0, DESCRIPTION_MAX_LINES);
  const merged = lines.join("\n");
  if (merged.length <= DESCRIPTION_MAX_CHARS) return merged;
  return merged.slice(0, DESCRIPTION_MAX_CHARS);
};

const onDescriptionInput = () => {
  form.description = clampDescription(form.description);
};

const joinRoleIds = (value) => {
  if (!Array.isArray(value)) return "";
  return value.map((item) => String(item)).filter(Boolean).join(", ");
};

const normalizeRewardPayload = (reward) => ({
  addRolesEnabled: Boolean(reward.addRolesEnabled),
  addRoleIds: parseCsvRoleIds(reward.addRoleIdsCsv),
  removeRolesEnabled: Boolean(reward.removeRolesEnabled),
  removeRoleIds: parseCsvRoleIds(reward.removeRoleIdsCsv),
  currencyEnabled: Boolean(reward.currencyEnabled),
  currencyAmount: Math.max(0, Number(reward.currencyAmount || 0))
});

const normalizeTierPayload = (tierKey) => {
  const tier = form.tiers[tierKey] || emptyTier(tierKey);
  return {
    title: String(tier.title || tierKey).trim() || tierKey,
    threshold: Math.max(1, Number(tier.threshold || 1)),
    enabled: tierKey === "bronze" ? true : Boolean(tier.enabled),
    badge: {
      shape: String(tier.badge.shape || "hexagon"),
      color: String(tier.badge.color || "purple"),
      icon: String(tier.badge.icon || "trophy")
    },
    notify: {
      progressEnabled: false,
      progressPercent: DM_PROGRESS_PERCENT,
      unlockEnabled: Boolean(tier.notify.unlockEnabled)
    },
    reward: normalizeRewardPayload(tier.reward)
  };
};

const toIsoDateOrNull = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const buildPayload = () => {
  return {
    type: form.type,
    eventKey: String(form.eventKey || "").trim(),
    title: String(form.title || "").trim(),
    description: clampDescription(form.description),
    enabled: Boolean(form.enabled),
    threshold: isSingleUnlockEvent(form.eventKey) ? 1 : Math.max(1, Number(form.threshold || 1)),
    eventTargetRoleId:
      form.type === "unique" && String(form.eventKey || "").trim() === "role_received"
        ? String(form.eventTargetRoleId || "").trim()
        : null,
    expiresAt: toIsoDateOrNull(form.expiresAt),
    badge: {
      shape: String(form.badge.shape || "hexagon"),
      color: String(form.badge.color || "purple"),
      icon: String(form.badge.icon || "trophy")
    },
    notify: {
      progressEnabled: Boolean(form.notify.progressEnabled),
      progressPercent: DM_PROGRESS_PERCENT,
      unlockEnabled: Boolean(form.notify.unlockEnabled)
    },
    reward: normalizeRewardPayload(form.reward),
    completionReward: normalizeRewardPayload(form.completionReward),
    tiers: {
      bronze: normalizeTierPayload("bronze"),
      silver: normalizeTierPayload("silver"),
      gold: normalizeTierPayload("gold"),
      diamond: normalizeTierPayload("diamond")
    }
  };
};

const serializePayload = (payload) => JSON.stringify(payload || {});

const setEditorSnapshot = (payload) => {
  editorSnapshot.value = serializePayload(payload);
};

const isEditorDirty = computed(() => {
  if (!editorOpen.value) return false;
  return serializePayload(buildPayload()) !== editorSnapshot.value;
});

const resetForm = () => {
  const next = buildDefaultForm();
  Object.assign(form, next);
};

const resetTierPanels = (tiersSource = null) => {
  tierPanels.bronze = true;
  tierPanels.silver = false;
  tierPanels.gold = false;
  tierPanels.diamond = false;
  if (!tiersSource) return;
  for (const tierKey of tierKeys) {
    const sourceTier = Array.isArray(tiersSource)
      ? tiersSource.find((tier) => String(tier?.tierKey || "") === tierKey)
      : tiersSource?.[tierKey];
    if (sourceTier?.enabled) tierPanels[tierKey] = true;
  }
};

const isTierPanelOpen = (tierKey) => Boolean(tierPanels[tierKey]);

const toggleTierPanel = (tierKey) => {
  tierPanels[tierKey] = !tierPanels[tierKey];
};

const mapRewardToForm = (reward) => ({
  addRolesEnabled: Boolean(reward?.addRolesEnabled),
  addRoleIdsCsv: joinRoleIds(reward?.addRoleIds),
  removeRolesEnabled: Boolean(reward?.removeRolesEnabled),
  removeRoleIdsCsv: joinRoleIds(reward?.removeRoleIds),
  currencyEnabled: Boolean(reward?.currencyEnabled),
  currencyAmount: Math.max(0, Number(reward?.currencyAmount || 0))
});

const mapRewardToPayload = (reward) => ({
  addRolesEnabled: Boolean(reward?.addRolesEnabled),
  addRoleIds: Array.isArray(reward?.addRoleIds) ? reward.addRoleIds.map(String).filter(Boolean) : [],
  removeRolesEnabled: Boolean(reward?.removeRolesEnabled),
  removeRoleIds: Array.isArray(reward?.removeRoleIds) ? reward.removeRoleIds.map(String).filter(Boolean) : [],
  currencyEnabled: Boolean(reward?.currencyEnabled),
  currencyAmount: Math.max(0, Number(reward?.currencyAmount || 0))
});

const tierLabel = (tier) => {
  if (tier === "bronze") return "Bronze";
  if (tier === "silver") return "Silver";
  if (tier === "gold") return "Gold";
  return "Diamond";
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const iconGlyph = (icon) => iconMap[icon] || "🏆";

const formatKeyLabel = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const colorChipStyle = (color) => {
  const accent = colorMap[String(color || "").trim()] || colorMap.purple;
  const { r, g, b } = parseHexToRgb(accent);
  return {
    background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.35), rgba(255,255,255,0) 55%), rgba(${r}, ${g}, ${b}, 0.95)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.7)`,
    boxShadow: `0 0 0 1px rgba(${r}, ${g}, ${b}, 0.35) inset`
  };
};

const eventLabel = (eventKey) => {
  const key = String(eventKey || "").trim();
  if (!key) return "Evenement";
  if (eventMetaMap[key]?.label) return eventMetaMap[key].label;
  return key.replaceAll("_", " ");
};

const isSingleUnlockEvent = (eventKey) => {
  const key = String(eventKey || "").trim();
  return (
    key === "role_received" ||
    key === "server_boost" ||
    key === "twitch_authenticated" ||
    key === "birthday_added" ||
    key === "birthday_announced"
  );
};

const uniqueThresholdHelp = (eventKey) => {
  const key = String(eventKey || "").trim();
  if (key === "role_received") {
    return "Choisis le role cible. Le succes est valide des que le membre obtient ce role.";
  }
  if (key === "server_boost") {
    return "Succes valide automatiquement au premier boost du membre.";
  }
  if (key === "twitch_authenticated") {
    return "Succes valide automatiquement lors de la liaison Twitch du membre.";
  }
  if (key === "birthday_added") {
    return "Succes valide automatiquement lors du premier enregistrement de la date d'anniversaire.";
  }
  if (key === "birthday_announced") {
    return "Succes valide automatiquement quand l'anniversaire du membre est traite sur le serveur.";
  }
  return "Definis le nombre exact de fois necessaires pour debloquer ce succes unique.";
};

const canSyncFromDiscord = (item) => {
  const type = String(item?.type || "").trim();
  const eventKey = String(item?.eventKey || "").trim();
  if (type !== "unique") return false;
  return (
    eventKey === "role_received" ||
    eventKey === "server_boost" ||
    eventKey === "birthday_added" ||
    eventKey === "twitch_authenticated"
  );
};

const roleName = (roleId) => {
  const id = String(roleId || "").trim();
  if (!id) return "Role inconnu";
  const row = (roles.value || []).find((role) => String(role.id) === id);
  return row?.name || id;
};

const eventOptionLabel = (eventKey) => {
  const key = String(eventKey || "").trim();
  if (!key) return "Selectionner un evenement";
  return eventOptionTextMap[key] || eventLabel(key);
};

const eventDefaultIcon = (eventKey) => {
  const key = String(eventKey || "").trim();
  return eventMetaMap[key]?.icon || "trophy";
};

const eventDefaultColor = (eventKey) => {
  const key = String(eventKey || "").trim();
  const colorKey = eventMetaMap[key]?.color || "purple";
  return colorMap[colorKey] || colorMap.purple;
};

const parseHexToRgb = (hex) => {
  const raw = String(hex || "").replace("#", "").trim();
  if (raw.length !== 6) return { r: 124, g: 58, b: 237 };
  const num = Number.parseInt(raw, 16);
  if (!Number.isFinite(num)) return { r: 124, g: 58, b: 237 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
};

const buildSurfaceStyle = (hex, options = {}) => {
  const { border = 0.35, glow = 0.2, top = 0.14, bottom = 0.08 } = options;
  const { r, g, b } = parseHexToRgb(hex);
  return {
    borderColor: `rgba(${r}, ${g}, ${b}, ${border})`,
    background: `linear-gradient(160deg, rgba(${r}, ${g}, ${b}, ${top}), rgba(15, 23, 42, 0.82) 58%), linear-gradient(180deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, ${bottom}))`,
    boxShadow: `inset 0 0 0 1px rgba(${r}, ${g}, ${b}, 0.12), 0 14px 24px rgba(${r}, ${g}, ${b}, ${glow})`
  };
};

const badgeStyle = (color) => {
  const accent = colorMap[String(color || "").trim()] || colorMap.purple;
  const { r, g, b } = parseHexToRgb(accent);
  return {
    borderColor: `rgba(${r}, ${g}, ${b}, 0.55)`,
    background: `radial-gradient(circle at 30% 24%, rgba(${r}, ${g}, ${b}, 0.42), rgba(15, 23, 42, 0.14) 62%), rgba(15, 23, 42, 0.7)`,
    boxShadow: `0 10px 22px rgba(${r}, ${g}, ${b}, 0.3), inset 0 0 0 1px rgba(${r}, ${g}, ${b}, 0.22)`
  };
};

const getTierEntries = (tiers) => {
  if (Array.isArray(tiers)) return tiers;
  if (!tiers || typeof tiers !== "object") return [];
  return tierKeys
    .map((tierKey) => ({
      tierKey,
      ...(tiers[tierKey] || {})
    }))
    .filter((row) => row && Object.keys(row).length > 1);
};

const achievementGoalText = (item) => {
  if (String(item?.type || "") !== "tier") return `Objectif: ${Math.max(1, Number(item?.threshold || 1))}`;
  const rows = getTierEntries(item?.tiers).filter((tier) => tier?.enabled);
  if (!rows.length) return "Aucun palier actif";
  const maxThreshold = rows.reduce((max, tier) => Math.max(max, Number(tier?.threshold || 1)), 1);
  return `Paliers actifs: ${rows.length} • Dernier palier: ${maxThreshold}`;
};

const achievementValidatedCount = (item) => {
  return Math.max(0, Number(item?.stats?.completedCount || 0));
};

const achievementValidatedText = (item) => {
  const completed = achievementValidatedCount(item);
  const members = Number(guildMemberCount.value);
  if (Number.isFinite(members) && members >= 0) {
    return `${completed} valides / ${Math.floor(members)} membres (hors bots)`;
  }
  return `${completed} valides / membres inconnus`;
};

const achievementVisualPercent = (item) => {
  const completed = achievementValidatedCount(item);
  const members = Number(guildMemberCount.value);
  if (Number.isFinite(members) && members > 0) {
    return Math.max(0, Math.min(100, Math.round((completed / members) * 100)));
  }
  const directPercent = Number(
    item?.progressPercent ?? item?.progress?.percent ?? item?.serverProgressPercent ?? 0
  );
  if (!Number.isFinite(directPercent)) return 0;
  return Math.max(0, Math.min(100, Math.round(directPercent)));
};

const filteredAchievements = computed(() => {
  const query = String(achievementSearch.value || "").trim().toLowerCase();
  if (!query) return achievements.value || [];
  return (achievements.value || []).filter((item) => {
    const haystack = [
      item?.title,
      item?.description,
      item?.eventKey,
      eventLabel(item?.eventKey),
      item?.type
    ]
      .map((part) => String(part || "").toLowerCase())
      .join(" ");
    return haystack.includes(query);
  });
});

const activeFilteredAchievements = computed(() =>
  (filteredAchievements.value || []).filter((item) => !item.premium_locked)
);
const lockedFilteredAchievements = computed(() =>
  (filteredAchievements.value || []).filter((item) => item.premium_locked)
);
const lockedAchievementUnlockItems = computed(() =>
  lockedFilteredAchievements.value.map((item) => item.title).filter(Boolean)
);

const buildAchievementSections = (rows = []) => {
  const tiers = rows.filter((item) => String(item?.type || "") === "tier");
  const unique = rows.filter((item) => String(item?.type || "") !== "tier");
  return [
    { key: "tier", title: "Succes a paliers", items: tiers },
    { key: "unique", title: "Succes uniques", items: unique }
  ].filter((section) => section.items.length > 0);
};

const achievementSections = computed(() => buildAchievementSections(activeFilteredAchievements.value || []));
const lockedAchievementSections = computed(() => buildAchievementSections(lockedFilteredAchievements.value || []));

const isTierTemplate = (tpl) => String(tpl?.payload?.type || "").trim() === "tier";

const templateKindLabel = (tpl) => (isTierTemplate(tpl) ? "Succes a paliers" : "Succes unique");

const templateTitle = (tpl) => {
  return String(tpl?.payload?.title || tpl?.title || "Template");
};

const templateDescription = (tpl) => {
  const direct = String(tpl?.payload?.description || "").trim();
  if (direct) return direct;
  return `Template base pour ${eventLabel(tpl?.payload?.eventKey)}.`;
};

const templateIcon = (tpl) => {
  const payloadIcon = String(tpl?.payload?.badge?.icon || "").trim();
  if (payloadIcon) return payloadIcon;
  return eventDefaultIcon(tpl?.payload?.eventKey);
};

const templateShape = (tpl) => {
  const payloadShape = String(tpl?.payload?.badge?.shape || "").trim();
  if (payloadShape) return payloadShape;
  return "hexagon";
};

const templateGoal = (tpl) => {
  if (!isTierTemplate(tpl)) return `Objectif: ${Math.max(1, Number(tpl?.payload?.threshold || 1))}`;
  const tiers = getTierEntries(tpl?.payload?.tiers).filter((tier) => tier?.enabled !== false);
  if (!tiers.length) return "Aucun palier";
  const maxThreshold = tiers.reduce((max, tier) => Math.max(max, Number(tier?.threshold || 1)), 1);
  return `${tiers.length} paliers • max ${maxThreshold}`;
};

const templateCardStyle = (tpl) => {
  const accent = eventDefaultColor(tpl?.payload?.eventKey);
  return buildSurfaceStyle(accent, { border: 0.4, glow: 0.18, top: 0.16, bottom: 0.1 });
};

const achievementCardStyle = (item) => {
  const badgeColor = colorMap[String(item?.badge?.color || "").trim()];
  const accent = badgeColor || eventDefaultColor(item?.eventKey);
  return buildSurfaceStyle(accent, { border: 0.34, glow: 0.16, top: 0.13, bottom: 0.08 });
};

const applyFormFromAchievement = (item) => {
  resetForm();
  form.type = item.type === "tier" ? "tier" : "unique";
  form.eventKey = item.eventKey || "message_count";
  form.title = item.title || "";
  form.description = item.description || "";
  form.enabled = item.enabled !== false;
  form.threshold = isSingleUnlockEvent(form.eventKey) ? 1 : Math.max(1, Number(item.threshold || 1));
  form.eventTargetRoleId = String(item.eventTargetRoleId || "");
  form.expiresAt = item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 16) : "";
  form.badge = {
    shape: item.badge?.shape || "hexagon",
    color: item.badge?.color || "purple",
    icon: item.badge?.icon || "trophy"
  };
  form.notify = {
    progressEnabled: Boolean(item.notify?.progressEnabled),
    progressPercent: DM_PROGRESS_PERCENT,
    unlockEnabled: item.notify?.unlockEnabled !== false
  };
  form.reward = mapRewardToForm(item.reward);
  form.completionReward = mapRewardToForm(item.completionReward);
  for (const tierKey of tierKeys) {
    const existingTier = (item.tiers || []).find((tier) => tier.tierKey === tierKey);
    form.tiers[tierKey] = {
      title: existingTier?.title || tierLabel(tierKey),
      threshold: Math.max(1, Number(existingTier?.threshold || 1)),
      enabled: tierKey === "bronze" ? true : Boolean(existingTier?.enabled),
      badge: {
        shape: existingTier?.badge?.shape || "hexagon",
        color: existingTier?.badge?.color || "purple",
        icon: existingTier?.badge?.icon || "trophy"
      },
      notify: {
        progressEnabled: false,
        progressPercent: DM_PROGRESS_PERCENT,
        unlockEnabled: existingTier?.notify?.unlockEnabled !== false
      },
      reward: mapRewardToForm(existingTier?.reward)
    };
  }
};

const buildPayloadFromAchievement = (item) => {
  const payload = {
    type: item.type === "tier" ? "tier" : "unique",
    eventKey: item.eventKey || "message_count",
    title: item.title || "",
    description: item.description || "",
    enabled: item.enabled !== false,
    threshold:
      isSingleUnlockEvent(item.eventKey)
        ? 1
        : Math.max(1, Number(item.threshold || 1)),
    eventTargetRoleId:
      String(item.type || "").trim() !== "tier" && String(item.eventKey || "").trim() === "role_received"
        ? String(item.eventTargetRoleId || "")
        : null,
    expiresAt: item.expiresAt || null,
    badge: {
      shape: item.badge?.shape || "hexagon",
      color: item.badge?.color || "purple",
      icon: item.badge?.icon || "trophy"
    },
    notify: {
      progressEnabled: Boolean(item.notify?.progressEnabled),
      progressPercent: DM_PROGRESS_PERCENT,
      unlockEnabled: item.notify?.unlockEnabled !== false
    },
    reward: mapRewardToPayload(item.reward),
    completionReward: mapRewardToPayload(item.completionReward),
    tiers: {}
  };
  for (const tierKey of tierKeys) {
    const existingTier = (item.tiers || []).find((tier) => tier.tierKey === tierKey);
    payload.tiers[tierKey] = {
      title: existingTier?.title || tierLabel(tierKey),
      threshold: Math.max(1, Number(existingTier?.threshold || 1)),
      enabled: tierKey === "bronze" ? true : Boolean(existingTier?.enabled),
      badge: {
        shape: existingTier?.badge?.shape || "hexagon",
        color: existingTier?.badge?.color || "purple",
        icon: existingTier?.badge?.icon || "trophy"
      },
      notify: {
        progressEnabled: false,
        progressPercent: DM_PROGRESS_PERCENT,
        unlockEnabled: existingTier?.notify?.unlockEnabled !== false
      },
      reward: mapRewardToPayload(existingTier?.reward)
    };
  }
  return payload;
};

const loadChannels = async () => {
  const res = await fetchJson(`${config.public.apiBase}/api/guilds/${props.guildId}/channels`);
  if (res?.ok) {
    channels.value = Array.isArray(res.data?.channels) ? res.data.channels : [];
  }
};

const loadRoles = async () => {
  const res = await fetchJson(`${config.public.apiBase}/api/guilds/${props.guildId}/roles`);
  if (res?.ok) {
    roles.value = Array.isArray(res.data?.roles) ? res.data.roles : [];
  }
};

const loadGuildSummary = async () => {
  const res = await fetchJson(`${config.public.apiBase}/api/guilds/${props.guildId}/summary`);
  if (!res?.ok) {
    guildMemberCount.value = null;
    return;
  }
  const count = Number(res.data?.summary?.members);
  const bots = Number(res.data?.summary?.bots);
  if (!Number.isFinite(count) || count < 0) {
    guildMemberCount.value = null;
    return;
  }
  const totalMembers = Math.floor(count);
  if (Number.isFinite(bots) && bots >= 0) {
    guildMemberCount.value = Math.max(0, totalMembers - Math.floor(bots));
    return;
  }
  guildMemberCount.value = null;
};

const loadConfig = async () => {
  const res = await fetchJson(`${config.public.apiBase}/api/guilds/${props.guildId}/achievements`);
  if (!res?.ok) {
    statusMessage.value = "Erreur chargement des succes.";
    return;
  }
  settings.enabled = Boolean(res.data?.settings?.enabled);
  settings.announceChannelId = String(res.data?.settings?.announceChannelId || "");
  settings.webShopViewCooldownSeconds = Math.max(5, Number(res.data?.settings?.webShopViewCooldownSeconds || 60));
  achievements.value = Array.isArray(res.data?.achievements) ? res.data.achievements : [];
  templates.value = Array.isArray(res.data?.templates) ? res.data.templates : [];
  catalogs.value = res.data?.catalogs || catalogs.value;
};

const loadAll = async () => {
  loading.value = true;
  statusMessage.value = "";
  await Promise.all([loadChannels(), loadRoles(), loadGuildSummary(), loadConfig()]);
  loading.value = false;
};

const saveSettingsAction = async () => {
  savingSettings.value = true;
  statusMessage.value = "";
  const res = await fetchJson(`${config.public.apiBase}/api/guilds/${props.guildId}/achievements/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      enabled: settings.enabled,
      announceChannelId: settings.announceChannelId,
      webShopViewCooldownSeconds: settings.webShopViewCooldownSeconds
    })
  });
  savingSettings.value = false;
  statusMessage.value = res?.ok ? "Parametres sauvegardes." : "Echec de sauvegarde des parametres.";
};

const openCreate = () => {
  const uniqueCount = achievements.value.filter((item) => String(item.type || "") !== "tier").length;
  const tierCount = achievements.value.filter((item) => String(item.type || "") === "tier").length;
  const uniqueMax = props.uniqueMax == null ? null : Number(props.uniqueMax);
  const tiersMax = props.tiersMax == null ? null : Number(props.tiersMax);
  const uniqueFull = uniqueMax != null && Number.isFinite(uniqueMax) && uniqueCount >= uniqueMax;
  const tiersFull =
    !props.tiersEnabled || (tiersMax != null && Number.isFinite(tiersMax) && tierCount >= tiersMax);
  if (uniqueFull && tiersFull) {
    emit("premium-upsell");
    return;
  }
  showCloseConfirm.value = false;
  editingId.value = 0;
  resetForm();
  if (uniqueFull && props.tiersEnabled && !tiersFull) {
    form.type = "tier";
  }
  resetTierPanels(form.tiers);
  setEditorSnapshot(buildPayload());
  editorOpen.value = true;
};

const openEdit = (item) => {
  showCloseConfirm.value = false;
  editingId.value = Number(item.id || 0);
  applyFormFromAchievement(item);
  resetTierPanels(item?.tiers);
  setEditorSnapshot(buildPayloadFromAchievement(item));
  editorOpen.value = true;
};

const closeEditor = () => {
  showCloseConfirm.value = false;
  editorOpen.value = false;
  editingId.value = 0;
  editorSnapshot.value = "";
};

const requestCloseEditor = () => {
  if (!editorOpen.value) return;
  if (!isEditorDirty.value) {
    closeEditor();
    return;
  }
  showCloseConfirm.value = true;
};

const continueEditorWork = () => {
  showCloseConfirm.value = false;
};

const discardEditorChanges = () => {
  showCloseConfirm.value = false;
  closeEditor();
};

const saveAchievementAction = async () => {
  const payload = buildPayload();
  if (!payload.title || !payload.eventKey) {
    statusMessage.value = "Nom et evenement obligatoires.";
    return;
  }
  if (payload.type === "unique" && payload.eventKey === "role_received" && !payload.eventTargetRoleId) {
    statusMessage.value = "Selectionne le role cible pour l'evenement role recu.";
    return;
  }
  savingAchievement.value = true;
  statusMessage.value = "";
  const url = editingId.value
    ? `${config.public.apiBase}/api/guilds/${props.guildId}/achievements/${editingId.value}`
    : `${config.public.apiBase}/api/guilds/${props.guildId}/achievements`;
  const method = editingId.value ? "PUT" : "POST";
  const res = await fetchJson(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  savingAchievement.value = false;
  if (!res?.ok) {
    statusMessage.value = "Echec de sauvegarde du succes.";
    return;
  }
  statusMessage.value = "Succes sauvegarde.";
  await loadConfig();
  closeEditor();
};

const toggleEnabled = async (item) => {
  togglingId.value = Number(item.id || 0);
  const payload = buildPayloadFromAchievement(item);
  payload.enabled = !item.enabled;
  const res = await fetchJson(
    `${config.public.apiBase}/api/guilds/${props.guildId}/achievements/${item.id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );
  togglingId.value = 0;
  statusMessage.value = res?.ok ? "Etat du succes mis a jour." : "Echec de mise a jour.";
  await loadConfig();
};

const syncAchievementAction = async (item) => {
  if (!canSyncFromDiscord(item)) return;
  const syncScopeLabelMap = {
    role_received: "membres ayant deja le role cible",
    server_boost: "boosters deja actifs",
    birthday_added: "membres ayant deja ajoute leur anniversaire",
    twitch_authenticated: "membres ayant deja lie leur compte Twitch"
  };
  const eventLabelText = syncScopeLabelMap[String(item?.eventKey || "").trim()] || "membres eligibles";
  const confirmed = window.confirm(
    `Synchroniser ce succes avec les ${eventLabelText} ?\\n\\n` +
      "Le bot ne retire/ajoute rien avant synchronisation: il valide juste les membres deja eligibles."
  );
  if (!confirmed) return;
  syncingId.value = Number(item.id || 0);
  const res = await fetchJson(
    `${config.public.apiBase}/api/guilds/${props.guildId}/achievements/${item.id}/sync`,
    {
      method: "POST"
    }
  );
  syncingId.value = 0;
  if (!res?.ok) {
    statusMessage.value = "Echec de synchronisation du succes.";
    return;
  }
  const scanned = Number(res.data?.scannedMembers || 0);
  const eligible = Number(res.data?.eligibleMembers || 0);
  const unlocked = Number(res.data?.unlockedMembers || 0);
  statusMessage.value = `Synchronisation terminee: ${eligible}/${scanned} eligibles, ${unlocked} debloques.`;
  await loadConfig();
};

const deleteAchievementAction = async (item) => {
  if (!window.confirm(`Supprimer le succes "${item.title}" ? Cette action supprime aussi l'historique utilisateur.`)) {
    return;
  }
  deletingId.value = Number(item.id || 0);
  const res = await fetchJson(
    `${config.public.apiBase}/api/guilds/${props.guildId}/achievements/${item.id}?confirm=DELETE`,
    {
      method: "DELETE"
    }
  );
  deletingId.value = 0;
  statusMessage.value = res?.ok ? "Succes supprime." : "Echec de suppression.";
  await loadConfig();
};

const applyTemplateAction = async (templateKey) => {
  const res = await fetchJson(
    `${config.public.apiBase}/api/guilds/${props.guildId}/achievements/templates/${templateKey}`,
    {
      method: "POST"
    }
  );
  statusMessage.value = res?.ok ? "Template ajoute." : "Echec d'ajout du template.";
  await loadConfig();
};

watch(
  () => props.guildId,
  () => {
    loadAll();
  },
  { immediate: true }
);

watch(
  () => form.type,
  (value) => {
    const allowed = availableEvents.value.map((event) => event.key);
    if (!allowed.includes(form.eventKey)) {
      form.eventKey = allowed[0] || "";
    }
    if (value === "tier" && !tierKeys.some((tierKey) => tierPanels[tierKey])) {
      tierPanels.bronze = true;
    }
    if (value === "tier") {
      form.eventTargetRoleId = "";
    }
  }
);

watch(
  () => form.eventKey,
  (eventKey) => {
    const key = String(eventKey || "").trim();
    if (isSingleUnlockEvent(key)) {
      form.threshold = 1;
    }
    if (key !== "role_received") {
      form.eventTargetRoleId = "";
    }
  }
);

const RewardEditor = defineComponent({
  props: {
    modelValue: { type: Object, required: true }
  },
  emits: ["update:modelValue"],
  setup(propsReward, { emit }) {
    const addRoleCandidate = ref("");
    const removeRoleCandidate = ref("");

    const patch = (next) => {
      emit("update:modelValue", {
        ...propsReward.modelValue,
        ...next
      });
    };

    const selectedRoleIds = (csv) => parseCsvRoleIds(csv).map((value) => String(value));

    const removeRoleFromField = (field, roleId) => {
      const values = selectedRoleIds(propsReward.modelValue[field]).filter((value) => value !== String(roleId));
      patch({ [field]: values.join(", ") });
    };

    const availableRolesForField = (field) => {
      const selected = new Set(selectedRoleIds(propsReward.modelValue[field]));
      return (roles.value || []).filter((role) => !selected.has(String(role.id)));
    };

    const addRoleToField = (field, roleId) => {
      const id = String(roleId || "").trim();
      if (!id) return;
      const values = selectedRoleIds(propsReward.modelValue[field]);
      if (values.includes(id)) return;
      values.push(id);
      patch({ [field]: values.join(", ") });
    };

    const selectedRolesForField = (field) => {
      const values = selectedRoleIds(propsReward.modelValue[field]);
      return values.map((roleId) => {
        const row = (roles.value || []).find((role) => String(role.id) === roleId);
        return {
          id: roleId,
          name: row?.name || "Role introuvable"
        };
      });
    };

    const renderRoleSelector = ({ field, candidateRef, label, emptyText, addLabel }) => {
      const options = availableRolesForField(field);
      const picked = selectedRolesForField(field);
      const roleItems = [
        { label: "Selectionner un role", value: "" },
        ...options.map((role) => ({
          label: String(role.name || "Role sans nom"),
          value: String(role.id)
        }))
      ];
      return h("div", { class: "reward-role-block" }, [
        h("div", { class: "reward-role-label" }, label),
        h("div", { class: "reward-role-inline" }, [
          h(EbSelect, {
            modelValue: candidateRef.value,
            items: roleItems,
            class: "role-select-single",
            "onUpdate:modelValue": (value) => {
              candidateRef.value = String(value || "");
            }
          }),
          h(
            "button",
            {
              type: "button",
              class: "role-action-btn",
              disabled: !candidateRef.value,
              onClick: () => {
                addRoleToField(field, candidateRef.value);
                candidateRef.value = "";
              }
            },
            addLabel
          )
        ]),
        h(
          "div",
          { class: "picked-roles" },
          picked.length
            ? picked.map((role) =>
                h(
                  "button",
                  {
                    type: "button",
                    class: "role-pill-btn",
                    title: "Retirer",
                    onClick: () => removeRoleFromField(field, role.id)
                  },
                  `${role.name} ✕`
                )
              )
            : [h("span", { class: "muted small" }, emptyText)]
        )
      ]);
    };

    return () =>
      h("div", { class: "reward-editor" }, [
        h("div", { class: "reward-section" }, [
          h("div", { class: "switch-field reward-section-head" }, [
            h("span", "Ajouter role(s)"),
            h("label", { class: "switch" }, [
              h("input", {
                type: "checkbox",
                checked: Boolean(propsReward.modelValue.addRolesEnabled),
                onInput: (event) => patch({ addRolesEnabled: event?.target?.checked })
              }),
              h("span", { class: "slider" })
            ])
          ]),
          h(
            "div",
            { class: "reward-section-body" },
            Boolean(propsReward.modelValue.addRolesEnabled)
              ? [
                  renderRoleSelector({
                    field: "addRoleIdsCsv",
                    candidateRef: addRoleCandidate,
                    label: "Roles a ajouter",
                    addLabel: "Ajouter",
                    emptyText: "Aucun role a ajouter selectionne."
                  })
                ]
              : [h("p", { class: "muted small reward-empty" }, "Active l'option pour choisir les roles a ajouter.")]
          )
        ]),

        h("div", { class: "reward-section" }, [
          h("div", { class: "switch-field reward-section-head" }, [
            h("span", "Retirer role(s)"),
            h("label", { class: "switch" }, [
              h("input", {
                type: "checkbox",
                checked: Boolean(propsReward.modelValue.removeRolesEnabled),
                onInput: (event) => patch({ removeRolesEnabled: event?.target?.checked })
              }),
              h("span", { class: "slider" })
            ])
          ]),
          h(
            "div",
            { class: "reward-section-body" },
            Boolean(propsReward.modelValue.removeRolesEnabled)
              ? [
                  renderRoleSelector({
                    field: "removeRoleIdsCsv",
                    candidateRef: removeRoleCandidate,
                    label: "Roles a retirer",
                    addLabel: "Ajouter",
                    emptyText: "Aucun role a retirer selectionne."
                  })
                ]
              : [h("p", { class: "muted small reward-empty" }, "Active l'option pour choisir les roles a retirer.")]
          )
        ]),

        h("div", { class: "reward-section" }, [
          h("div", { class: "switch-field reward-section-head" }, [
            h("span", "Donner monnaie"),
            h("label", { class: "switch" }, [
              h("input", {
                type: "checkbox",
                checked: Boolean(propsReward.modelValue.currencyEnabled),
                onInput: (event) => patch({ currencyEnabled: event?.target?.checked })
              }),
              h("span", { class: "slider" })
            ])
          ]),
          h(
            "div",
            { class: "reward-section-body" },
            Boolean(propsReward.modelValue.currencyEnabled)
              ? [
                  h("label", { class: "reward-currency-field" }, [
                    h("span", { class: "reward-currency-label" }, "Montant monnaie :"),
                    h("input", {
                      class: "reward-currency-input",
                      type: "number",
                      min: "0",
                      step: "1",
                      placeholder: "Ex: 1000",
                      value: Number(propsReward.modelValue.currencyAmount || 0),
                      onInput: (event) => patch({ currencyAmount: Math.max(0, Number(event?.target?.value || 0)) })
                    })
                  ])
                ]
              : [h("p", { class: "muted small reward-empty" }, "Active l'option pour choisir le montant a donner.")]
          )
        ])
      ]);
  }
});
</script>

<style scoped>
.locked-achievements-gate {
  width: 100%;
  margin-top: 16px;
}

.bare-fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
}

.achievements-admin {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.card-head h3,
.card-head h4 {
  margin: 0;
  line-height: 1.25;
}
.card-head p {
  margin: 8px 0 0;
}
.muted {
  color: var(--text-muted);
  line-height: 1.45;
}
.grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
}
label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

label > :is(input, select, textarea, .eb-select) {
  margin-top: 0;
}
input,
select,
textarea {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.32);
  color: inherit;
  padding: 10px 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
textarea {
  min-height: 88px;
  resize: vertical;
}
input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: rgba(45, 212, 160, 0.55);
  box-shadow: 0 0 0 3px rgba(45, 212, 160, 0.12);
}
.switch-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  padding: 10px 12px;
  background: linear-gradient(140deg, rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.2));
}
.switch-field-vertical {
  grid-column: 1 / -1;
  align-items: flex-start;
}
.switch-field-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.switch-field-copy p {
  margin: 0;
}
.event-condition-field {
  grid-column: auto;
}
.switch {
  position: relative;
  display: inline-flex;
  width: 42px;
  height: 24px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
  padding: 0;
  border: 0;
}
.slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
  transition: 0.2s;
}
.slider::before {
  content: "";
  position: absolute;
  left: 3px;
  top: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: 0.2s;
}
.switch input:checked + .slider {
  background: rgba(45, 212, 160, 0.9);
}
.switch input:checked + .slider::before {
  transform: translateX(18px);
}
.sub-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.33), rgba(15, 23, 42, 0.2));
}
.sub-card h4 {
  margin: 0 0 10px;
  line-height: 1.3;
}
.help-note {
  margin: 0 0 10px;
}
.event-threshold-help {
  margin: 0;
  grid-column: 1 / -1;
}
.visual-picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.picker-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.picker-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}
.picker-grid {
  display: grid;
  gap: 8px;
}
.picker-grid-shapes {
  grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
}
.picker-grid-colors {
  grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
}
.picker-grid-icons {
  grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
  max-height: 168px;
  overflow: auto;
  padding-right: 2px;
}
.picker-btn {
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.45);
  border-radius: 10px;
  min-height: 40px;
  min-width: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}
.picker-btn:hover {
  border-color: rgba(96, 165, 250, 0.6);
  transform: translateY(-1px);
}
.picker-btn.active {
  border-color: rgba(96, 165, 250, 0.85);
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.25) inset;
}
.shape-token {
  width: 24px;
  height: 24px;
  border: 1px solid rgba(226, 232, 240, 0.62);
  background: linear-gradient(145deg, rgba(191, 219, 254, 0.95), rgba(45, 212, 160, 0.88));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
  clip-path: polygon(25% 6%, 75% 6%, 94% 50%, 75% 94%, 25% 94%, 6% 50%);
}
.shape-hexagon {
  clip-path: polygon(25% 6%, 75% 6%, 94% 50%, 75% 94%, 25% 94%, 6% 50%);
}
.shape-pentagon {
  clip-path: polygon(50% 2%, 96% 35%, 78% 96%, 22% 96%, 4% 35%);
}
.shape-circle {
  clip-path: none;
  border-radius: 999px;
}
.shape-diamond {
  clip-path: polygon(50% 2%, 98% 50%, 50% 98%, 2% 50%);
}
.shape-square {
  clip-path: none;
  border-radius: 7px;
}
.shape-star {
  clip-path: polygon(50% 2%, 61% 36%, 98% 36%, 68% 58%, 80% 95%, 50% 72%, 20% 95%, 32% 58%, 2% 36%, 39% 36%);
}
.shape-heart {
  clip-path: polygon(50% 94%, 8% 56%, 8% 30%, 26% 12%, 50% 22%, 74% 12%, 92% 30%, 92% 56%);
}
.shape-octagon {
  clip-path: polygon(30% 2%, 70% 2%, 98% 30%, 98% 70%, 70% 98%, 30% 98%, 2% 70%, 2% 30%);
}
.shape-shield {
  clip-path: polygon(50% 2%, 90% 18%, 84% 72%, 50% 98%, 16% 72%, 10% 18%);
}
.shape-ticket {
  clip-path: polygon(8% 14%, 20% 14%, 26% 6%, 74% 6%, 80% 14%, 92% 14%, 92% 86%, 80% 86%, 74% 94%, 26% 94%, 20% 86%, 8% 86%);
}
.color-btn {
  padding: 6px;
}
.color-token {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.45);
}
.icon-btn span {
  font-size: 18px;
  line-height: 1;
}
.visual-picker.compact .picker-grid-icons {
  max-height: 116px;
}
.status-line {
  margin-top: -8px;
  padding: 4px 0;
}
.actions-inline {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.templates-section {
  position: relative;
  overflow: hidden;
}
.templates-section::after {
  content: "";
  position: absolute;
  inset: -40% auto auto -20%;
  width: 240px;
  height: 240px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(45, 212, 160, 0.2), transparent 72%);
  pointer-events: none;
}
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}
.template-card {
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 16px;
  background: linear-gradient(165deg, rgba(30, 41, 59, 0.32), rgba(15, 23, 42, 0.86));
  color: inherit;
  text-align: left;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  min-height: 190px;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}
.template-card:hover {
  border-color: rgba(96, 165, 250, 0.62);
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(2, 6, 23, 0.45);
}
.template-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.template-badges {
  display: inline-flex;
  align-items: center;
}
.template-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.7);
  display: grid;
  place-items: center;
  font-size: 19px;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.15);
}
.template-badges .template-badge + .template-badge {
  margin-left: -8px;
}
.template-badge.bronze {
  border-color: rgba(251, 146, 60, 0.72);
}
.template-badge.silver {
  border-color: rgba(226, 232, 240, 0.72);
}
.template-badge.gold {
  border-color: rgba(250, 204, 21, 0.72);
}
.template-badge.diamond {
  border-color: rgba(103, 232, 249, 0.72);
}
.template-badge.unique {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  font-size: 24px;
}
.template-kind {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: rgba(15, 23, 42, 0.46);
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.template-title {
  font-size: 1.16rem;
  font-weight: 800;
  line-height: 1.24;
}
.template-desc {
  margin: 0;
  flex: 1;
}
.template-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px dashed rgba(148, 163, 184, 0.24);
}
.achievements-head {
  align-items: flex-end;
}
.achievements-head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.achievements-search {
  min-width: 280px;
}
.achievements-search input {
  width: 100%;
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.54);
  border-color: rgba(148, 163, 184, 0.28);
}
.achievement-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.achievement-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.achievement-section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.achievement-section-head h5 {
  margin: 0;
  font-size: 0.98rem;
  line-height: 1.2;
}
.achievement-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(285px, 1fr));
  gap: 16px;
}
.achievement-card {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 18px;
  padding: 16px;
  background: linear-gradient(160deg, rgba(30, 41, 59, 0.36), rgba(15, 23, 42, 0.88));
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 286px;
}
.achievement-card p {
  margin: 0;
}
.achievement-card-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}
.achievement-badge {
  width: 54px;
  height: 54px;
  border-radius: 15px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  display: grid;
  place-items: center;
  color: #f8fafc;
}
.achievement-badge span {
  font-size: 24px;
}
.achievement-switch {
  transform: scale(1.02);
}
.achievement-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.achievement-card-headline {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
}
.card-arrow {
  border: 1px solid rgba(148, 163, 184, 0.36);
  background: rgba(15, 23, 42, 0.42);
  color: #e2e8f0;
  border-radius: 10px;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.card-arrow:hover {
  border-color: rgba(96, 165, 250, 0.65);
  background: rgba(30, 41, 59, 0.64);
}
.achievement-title {
  font-weight: 700;
  font-size: 1.12rem;
  line-height: 1.3;
}
.achievement-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 6px;
  border-top: 1px dashed rgba(148, 163, 184, 0.2);
}
.achievement-progress-caption {
  margin-top: 2px;
}
.achievement-meter {
  margin-top: auto;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.24);
  overflow: hidden;
}
.achievement-meter-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #60a5fa, #22d3ee);
}
.achievement-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.achievement-actions {
  justify-content: flex-end;
}
.editor-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  padding: 24px 16px;
  display: grid;
  place-items: center;
  overflow: auto;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(2px);
}
.editor-modal-card {
  width: min(1680px, calc(100vw - 24px));
  max-height: 92vh;
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.92));
  box-shadow: 0 24px 70px rgba(2, 6, 23, 0.58);
}
.editor-close-modal {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  background: rgba(2, 6, 23, 0.75);
}
.editor-close-modal-card {
  width: min(560px, calc(100vw - 24px));
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 16px;
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.95));
  box-shadow: 0 20px 50px rgba(2, 6, 23, 0.56);
}
.editor-close-actions {
  justify-content: flex-end;
}
.editor-unsaved {
  border: 1px solid rgba(245, 158, 11, 0.45);
  border-radius: 14px;
  background: linear-gradient(140deg, rgba(245, 158, 11, 0.18), rgba(15, 23, 42, 0.35));
  padding: 10px 12px;
  margin-bottom: 14px;
}
.editor-unsaved-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.editor-unsaved-copy p {
  margin: 0;
}
.editor-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
}
.editor-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.editor-preview {
  position: sticky;
  top: 18px;
  align-self: start;
}
.preview-card {
  border: 2px solid var(--ui-border, #2dd4a0);
  border-radius: 18px;
  background: linear-gradient(120deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.75));
  padding: 16px;
  display: flex;
  gap: 14px;
  align-items: center;
  min-height: 124px;
}
.preview-card-tier {
  flex-direction: column;
  align-items: stretch;
}
.preview-badge {
  width: 76px;
  height: 76px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.08);
  font-size: 30px;
}
.preview-tier-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}
.preview-tier-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.preview-tier-item.disabled {
  opacity: 0.42;
  filter: grayscale(0.25);
}
.preview-tier-badge {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 20px;
}
.preview-tier-name {
  text-align: center;
  font-size: 11px;
  line-height: 1.2;
  color: #cbd5e1;
}
.preview-kicker {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #f97316;
}
.preview-title {
  font-weight: 800;
  font-size: 1.14rem;
  line-height: 1.25;
}
.preview-sub {
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.45;
}
.tier-block {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  padding: 12px;
  margin-top: 10px;
  background: rgba(15, 23, 42, 0.2);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tier-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tier-toggle-btn {
  border: 0;
  background: transparent;
  color: inherit;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  cursor: pointer;
}
.tier-toggle-arrow {
  display: inline-flex;
  transition: transform 0.2s ease;
  color: var(--text-muted);
}
.tier-toggle-arrow.open {
  transform: rotate(180deg);
}
.tier-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}
.tier-notify-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
:deep(.reward-editor) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
:deep(.reward-editor .switch-field) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  padding: 10px 12px;
  background: linear-gradient(140deg, rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.2));
}
:deep(.reward-editor .switch) {
  position: relative;
  display: inline-flex;
  width: 42px;
  height: 24px;
}
:deep(.reward-editor .switch input) {
  opacity: 0;
  width: 0;
  height: 0;
  padding: 0;
  border: 0;
}
:deep(.reward-editor .slider) {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
  transition: 0.2s;
}
:deep(.reward-editor .slider::before) {
  content: "";
  position: absolute;
  left: 3px;
  top: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: 0.2s;
}
:deep(.reward-editor .switch input:checked + .slider) {
  background: rgba(45, 212, 160, 0.9);
}
:deep(.reward-editor .switch input:checked + .slider::before) {
  transform: translateX(18px);
}
:deep(.reward-section) {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.26);
  overflow: hidden;
}
:deep(.reward-section-head) {
  border: 0;
  border-radius: 0;
  background: linear-gradient(140deg, rgba(15, 23, 42, 0.38), rgba(15, 23, 42, 0.24));
}
:deep(.reward-section-body) {
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  padding: 10px;
  background: rgba(2, 6, 23, 0.34);
}
:deep(.reward-empty) {
  margin: 0;
}
:deep(.reward-role-block) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
:deep(.reward-role-label) {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
:deep(.reward-role-inline) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}
:deep(.role-select-single) {
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(2, 6, 23, 0.56);
  color: inherit;
  padding: 10px 12px;
}
:deep(.role-action-btn) {
  border: 1px solid rgba(96, 165, 250, 0.5);
  border-radius: 10px;
  background: rgba(26, 168, 122, 0.18);
  color: #dbeafe;
  font-weight: 700;
  padding: 0 14px;
  min-height: 40px;
  cursor: pointer;
}
:deep(.role-action-btn:hover:enabled) {
  border-color: rgba(96, 165, 250, 0.75);
  background: rgba(26, 168, 122, 0.28);
}
:deep(.role-action-btn:disabled) {
  cursor: not-allowed;
  opacity: 0.55;
}
:deep(.picked-roles) {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.42);
  padding: 8px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 40px;
}
:deep(.reward-currency-field) {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
:deep(.reward-currency-label) {
  font-size: 13px;
  font-weight: 700;
  color: #e2e8f0;
}
:deep(.reward-currency-input) {
  width: 100%;
}
:deep(.role-pill-btn) {
  border: 1px solid rgba(96, 165, 250, 0.45);
  background: rgba(30, 41, 59, 0.74);
  color: #e2e8f0;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
}
:deep(.role-pill-btn:hover) {
  border-color: rgba(96, 165, 250, 0.7);
  background: rgba(30, 41, 59, 0.92);
}
.small {
  font-size: 12px;
}
@media (max-width: 1100px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
  .editor-preview {
    position: static;
  }
  .preview-tier-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .editor-modal {
    padding: 12px;
  }
  .editor-modal-card {
    width: 100%;
    max-height: 94vh;
  }
  .editor-close-modal {
    padding: 12px;
  }
  .editor-close-modal-card {
    width: 100%;
  }
  .achievements-admin {
    gap: 16px;
  }
  .sub-card {
    padding: 12px;
  }
  .picker-grid-icons {
    max-height: 132px;
  }
  :deep(.reward-role-inline) {
    grid-template-columns: 1fr;
  }
  .template-card {
    min-height: 170px;
    padding: 14px;
  }
  .achievements-head {
    align-items: flex-start;
  }
  .achievements-head-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  .achievements-search {
    min-width: 0;
    width: 100%;
  }
  .achievement-card {
    padding: 14px;
    min-height: 260px;
  }
  .achievement-foot {
    flex-direction: column;
    align-items: flex-start;
  }
  .achievement-actions {
    width: 100%;
  }
}
</style>

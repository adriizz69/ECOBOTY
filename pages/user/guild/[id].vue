<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>{{ greetingText }}</h2>
        <p class="muted">
          <span v-if="summary?.guild?.name">{{ $t("userGuild.serverLabel") }}: {{ summary.guild.name }} · </span>
          {{ $t("userGuild.subtitle") }}
          <span v-if="summary?.economy?.name">{{ $t("userGuild.currencyLabel") }}: {{ summary.economy.name }}</span>
        </p>
      </div>
      <div class="head-actions">
        <UButton color="neutral" variant="outline" to="/user">{{ $t("common.back") }}</UButton>
        <UButton color="neutral" variant="outline" @click="refreshAll">{{ $t("common.refresh") }}</UButton>
        <div class="balance-card" v-if="summary">
          <span class="muted">{{ $t("userGuild.balance") }}</span>
          <strong class="balance-value">
            {{ summary.balance }}
            <img
              v-if="currencyIconUrl"
              :src="currencyIconUrl"
              class="currency-icon"
              alt=""
            />
            <span v-else>{{ currencySymbol }}</span>
          </strong>
        </div>
      </div>
    </div>

    <UCard v-if="loading" class="card">{{ $t("common.loading") }}</UCard>
    <UCard v-else-if="disabled" class="card">
      <h3>{{ $t("userGuild.disabledTitle") }}</h3>
      <p class="muted">
        {{ $t("userGuild.disabledText") }}
        <span v-if="disabledReason">({{ disabledReason }})</span>.
      </p>
    </UCard>

    <template v-else>
      <div class="tabs">
        <button :class="['tab', activeTab === 'shops' && 'active']" @click="activeTab = 'shops'">{{ $t("userGuild.tabs.shops") }}</button>
        <button :class="['tab', activeTab === 'inventory' && 'active']" @click="activeTab = 'inventory'">{{ $t("userGuild.tabs.inventory") }}</button>
        <button :class="['tab', activeTab === 'market' && 'active']" @click="activeTab = 'market'">{{ $t("userGuild.tabs.market") }}</button>
        <button :class="['tab', activeTab === 'games' && 'active']" @click="activeTab = 'games'">{{ $t("userGuild.tabs.games") }}</button>
        <button :class="['tab', activeTab === 'logs' && 'active']" @click="activeTab = 'logs'">{{ $t("userGuild.tabs.logs") }}</button>
      </div>

      <div v-show="activeTab === 'shops'" class="grid">
        <UCard class="card">
          <div class="card-head">
            <div>
              <h3>{{ $t("userGuild.shops.title") }}</h3>
              <p class="muted helper">
                {{ $t("userGuild.shops.help") }}
              </p>
            </div>
          </div>
          <div v-if="!shops.length" class="muted">{{ $t("userGuild.shops.empty") }}</div>
          <div class="shop-grid">
            <button
              v-for="shop in paginatedShops"
              :key="shop.id"
              :class="[
                'shop-card',
                selectedShopId === String(shop.id) && 'active',
                !shop.allowed && 'locked'
              ]"
              :disabled="!shop.allowed"
              @click="selectShop(shop)"
            >
              <div class="shop-thumb" :style="shop.image_url ? { backgroundImage: `url(${shop.image_url})` } : {}">
                <span v-if="!shop.image_url">🏪</span>
              </div>
              <div class="shop-body">
                <div class="shop-name">{{ shop.name }}</div>
                <div class="muted small shop-desc">{{ shop.description || $t("userGuild.shops.defaultDesc") }}</div>
                <div class="shop-meta">{{ $t("userGuild.shops.discount") }}: {{ shop.discount_percent || 0 }}%</div>
              </div>
              <span v-if="!shop.allowed" class="pill danger">{{ $t("userGuild.shops.locked") }}</span>
            </button>
          </div>
          <div v-if="shopPages > 1" class="pagination">
            <UButton color="neutral" variant="outline" :disabled="shopPage <= 1" @click="changeShopPage(-1)">
              {{ $t("common.prev") }}
            </UButton>
            <span>{{ $t("common.page") }} {{ shopPage }} / {{ shopPages }}</span>
            <UButton color="neutral" variant="outline" :disabled="shopPage >= shopPages" @click="changeShopPage(1)">
              {{ $t("common.next") }}
            </UButton>
          </div>
          <p v-if="shopError" class="muted">{{ shopError }}</p>
        </UCard>

        <UCard class="card">
          <div class="card-head">
            <div>
              <h3>{{ $t("userGuild.items.title") }}</h3>
              <p class="muted helper">
                {{ $t("userGuild.items.help") }}
              </p>
            </div>
          </div>
          <div v-if="itemsLoading" class="muted">{{ $t("common.loading") }}</div>
          <div v-else-if="!shopItems.length" class="muted">{{ $t("userGuild.items.selectShop") }}</div>
          <div v-else class="items-grid">
            <div
              v-for="item in paginatedShopItems"
              :key="item.id"
              class="item-card item-card--clickable"
              role="button"
              tabindex="0"
              @click="openItemDetails(item)"
              @keydown.enter.prevent="openItemDetails(item)"
            >
              <div class="item-image" :style="item.image_url ? { backgroundImage: `url(${item.image_url})` } : {}">
                <span v-if="!item.image_url">{{ item.type === 'lootbox' ? '🎁' : '🧾' }}</span>
              </div>
              <div class="item-info">
                <div class="item-name">{{ item.name }}</div>
                <div class="muted small item-desc">{{ item.description || $t("common.noDescription") }}</div>
                <div class="item-footer">
                  <div class="price">
                    {{ item.final_price }}
                    <img v-if="currencyIconUrl" :src="currencyIconUrl" class="currency-icon" alt="" />
                    <span v-else>{{ currencySymbol }}</span>
                  </div>
                </div>
              </div>
              <div class="item-more">{{ $t("common.seeMore") }}</div>
            </div>
          </div>
          <div v-if="itemPages > 1" class="pagination">
            <UButton color="neutral" variant="outline" :disabled="itemPage <= 1" @click="changeItemPage(-1)">
              {{ $t("common.prev") }}
            </UButton>
            <span>{{ $t("common.page") }} {{ itemPage }} / {{ itemPages }}</span>
            <UButton color="neutral" variant="outline" :disabled="itemPage >= itemPages" @click="changeItemPage(1)">
              {{ $t("common.next") }}
            </UButton>
          </div>
        </UCard>
      </div>

      <div v-show="activeTab === 'inventory'" class="grid">
        <UCard class="card">
          <div class="card-head">
            <div>
              <h3>{{ $t("userGuild.inventory.title") }}</h3>
              <p class="muted helper">
                {{ $t("userGuild.inventory.help") }}
              </p>
            </div>
          </div>
          <div v-if="inventoryLoading" class="muted">{{ $t("common.loading") }}</div>
          <div v-else-if="!inventory.length" class="muted">{{ $t("userGuild.inventory.empty") }}</div>
          <div v-else>
            <div class="inventory-stats">
              <div class="stat-pill">{{ $t("userGuild.inventory.items") }}: {{ inventoryItemCount }}</div>
              <div class="stat-pill">{{ $t("userGuild.inventory.lootboxes") }}: {{ inventoryLootboxCount }}</div>
              <div class="stat-pill">{{ $t("userGuild.inventory.sellable") }}: {{ inventorySellableCount }}</div>
            </div>
            <p v-if="inventoryActionStatus" class="muted small">{{ inventoryActionStatus }}</p>
            <div class="items-grid inventory-grid">
              <div v-for="item in inventory" :key="item.item_id" class="item-card inventory-card">
              <div class="item-image" :style="item.image_url ? { backgroundImage: `url(${item.image_url})` } : {}">
                <span v-if="!item.image_url">{{ item.type === 'lootbox' ? '🎁' : '🎒' }}</span>
              </div>
              <div class="item-info">
                <div class="item-name">{{ item.name }}</div>
                <div class="muted small item-desc">{{ item.description || $t("common.noDescription") }}</div>
                <div class="inventory-meta">
                  <span class="pill neutral">x{{ item.quantity }}</span>
                  <span v-if="item.type === 'lootbox'" class="pill info">{{ $t("userGuild.inventory.lootbox") }}</span>
                  <span v-else-if="item.type === 'temp_role'" class="pill warning">{{ $t("userGuild.inventory.tempRole") }}</span>
                  <span v-else-if="item.type === 'role'" class="pill info">{{ $t("userGuild.inventory.role") }}</span>
                </div>
              </div>
              <div class="item-actions">
                <UButton v-if="item.type === 'lootbox'" color="primary" @click="startLootbox(item)">
                  {{ $t("common.open") }}
                </UButton>
                <UButton
                  v-else-if="item.type === 'role' || item.type === 'temp_role'"
                  color="primary"
                  @click="useInventoryItem(item)"
                >
                  {{ $t("userGuild.inventory.use") }}
                </UButton>
                <UButton
                  v-else-if="item.type === 'inventory'"
                  color="neutral"
                  variant="solid"
                  @click="prepareSale(item)"
                >
                  {{ $t("userGuild.market.sell") }}
                </UButton>
                <UButton v-else color="neutral" variant="outline" disabled>{{ $t("userGuild.inventory.notSellable") }}</UButton>
              </div>
              </div>
            </div>
          </div>
        </UCard>
        <UCard class="card">
          <div class="card-head">
            <div>
              <h3>{{ $t("userGuild.market.title") }}</h3>
              <p class="muted helper">
                {{ $t("userGuild.market.help") }}
              </p>
            </div>
          </div>
          <div class="sale-preview" :class="{ empty: !selectedSaleItem }">
            <template v-if="selectedSaleItem">
              <div
                class="sale-preview-image"
                :style="selectedSaleItem.image_url ? { backgroundImage: `url(${selectedSaleItem.image_url})` } : {}"
              >
                <span v-if="!selectedSaleItem.image_url">🎒</span>
              </div>
              <div class="sale-preview-body">
                <div class="sale-preview-title">{{ selectedSaleItem.name }}</div>
                <div class="muted small">{{ $t("userGuild.market.available") }}: x{{ selectedSaleItem.quantity }}</div>
                <div class="muted small">{{ $t("userGuild.market.listed") }}: x{{ saleQuantity }}</div>
              </div>
            </template>
            <template v-else>
              <div class="muted small">{{ $t("userGuild.market.previewEmpty") }}</div>
            </template>
          </div>
          <div class="grid">
            <label>
              {{ $t("userGuild.market.itemLabel") }}
              <select v-model="saleItemId">
                <option value="">{{ $t("userGuild.market.selectItem") }}</option>
                <option
                  v-for="item in inventoryForSale"
                  :key="item.item_id"
                  :value="String(item.item_id)"
                >
                  {{ item.name }} (x{{ item.quantity }})
                </option>
              </select>
            </label>
            <label>
              {{ $t("common.quantity") }}
              <input
                v-model.number="saleQuantity"
                type="number"
                min="1"
                :max="selectedSaleItem?.quantity || 1"
              />
            </label>
            <label>
              {{ $t("common.price") }}
              <div class="price-field">
                <input v-model.number="salePrice" type="number" min="1" />
                <span class="price-symbol">
                  <img v-if="currencyIconUrl" :src="currencyIconUrl" class="currency-icon" alt="" />
                  <span v-else>{{ currencySymbol }}</span>
                </span>
              </div>
            </label>
          </div>
          <p class="muted small">{{ $t("userGuild.market.priceNote") }}</p>
          <UButton color="primary" :loading="saleSaving" @click="createSaleItem">
            {{ saleSaving ? $t("userGuild.market.selling") : $t("userGuild.market.sell") }}
          </UButton>
          <p v-if="saleStatus" class="muted">{{ saleStatus }}</p>
        </UCard>
      </div>

      <UCard v-show="activeTab === 'market'" class="card">
        <div class="card-head">
          <div>
            <h3>{{ $t("userGuild.market.marketTitle") }}</h3>
            <p class="muted helper">
              {{ $t("userGuild.market.marketHelp") }}
            </p>
          </div>
        </div>
        <div v-if="salesLoading" class="muted">{{ $t("common.loading") }}</div>
        <div v-else-if="!sales.length" class="muted">{{ $t("userGuild.market.emptySales") }}</div>
        <div v-else class="items-grid market-grid">
          <div v-for="sale in sales" :key="sale.id" class="item-card">
            <div class="item-image" :style="sale.image_url ? { backgroundImage: `url(${sale.image_url})` } : {}">
              <span v-if="!sale.image_url">🛒</span>
            </div>
            <div class="item-info">
              <div class="item-name">{{ sale.name }}</div>
              <div class="muted small">
                {{ $t("userGuild.market.soldBy") }} {{ sale.seller_username || sale.seller_discord_id }}
              </div>
              <div class="price">
                {{ sale.price }}
                <img v-if="currencyIconUrl" :src="currencyIconUrl" class="currency-icon" alt="" />
                <span v-else>{{ currencySymbol }}</span>
              </div>
              <div class="muted small">{{ $t("common.quantity") }}: x{{ sale.quantity || 1 }}</div>
            </div>
            <UButton color="primary" @click="buySaleItem(sale)">{{ $t("common.buy") }}</UButton>
          </div>
        </div>
      </UCard>

      <div v-show="activeTab === 'games'" class="grid">
        <UCard class="card">
          <div class="card-head">
            <div>
              <h3>{{ $t("userGuild.games.title") }}</h3>
              <p class="muted helper">
                {{ $t("userGuild.games.help") }}
              </p>
            </div>
          </div>
          <div v-if="gamesLoading" class="muted">{{ $t("common.loading") }}</div>
          <div v-else-if="!enabledGames.length" class="muted">{{ $t("userGuild.games.empty") }}</div>
          <div v-else class="games-grid">
            <div v-for="game in enabledGames" :key="game.id" class="game-card">
              <div class="game-head">
                <div class="game-icon">{{ gameIcon(game.id) }}</div>
                <div class="game-head-body">
                  <div class="game-title">{{ game.label }}</div>
                  <div class="muted small">{{ gameDescriptions[game.id] }}</div>
                </div>
              </div>
              <div class="game-meta">
                <span class="pill neutral">{{ $t("userGuild.games.minBet") }}: {{ game.minBet }}</span>
                <span class="pill neutral">{{ $t("userGuild.games.maxBet") }}: {{ game.maxBet }}</span>
              </div>
              <UButton color="primary" @click="openGameModal(game)">{{ $t("userGuild.games.play") }}</UButton>
            </div>
          </div>
        </UCard>
      </div>

      <div v-show="activeTab === 'logs'" class="grid">
        <UCard class="card">
          <div class="card-head">
            <div>
              <h3>{{ $t("userGuild.logs.gainsTitle") }}</h3>
              <p class="muted helper">
                {{ $t("userGuild.logs.gainsHelp") }}
              </p>
            </div>
          </div>
          <div v-if="logsLoading" class="muted">{{ $t("common.loading") }}</div>
          <div v-else-if="!userLogs.gains.length" class="muted">{{ $t("userGuild.logs.noGains") }}</div>
          <div v-else class="log-list">
            <div v-for="log in paginatedGainLogs" :key="log.id" class="log-row">
              <span>{{ formatDate(log.created_at) }}</span>
              <span>{{ formatSource(log.source) }}</span>
              <span class="log-amount">
                {{ formatSigned(log.total_amount, false) }}
                <img v-if="currencyIconUrl" :src="currencyIconUrl" class="currency-icon" alt="" />
                <span v-else>{{ currencySymbol }}</span>
              </span>
            </div>
          </div>
          <div v-if="gainLogPages > 1" class="pagination">
            <UButton color="neutral" variant="outline" :disabled="gainLogPage <= 1" @click="gainLogPage--">
              {{ $t("common.prev") }}
            </UButton>
            <span>{{ $t("common.page") }} {{ gainLogPage }} / {{ gainLogPages }}</span>
            <UButton color="neutral" variant="outline" :disabled="gainLogPage >= gainLogPages" @click="gainLogPage++">
              {{ $t("common.next") }}
            </UButton>
          </div>
        </UCard>
        <UCard class="card">
          <div class="card-head">
            <div>
              <h3>{{ $t("userGuild.logs.eventsTitle") }}</h3>
              <p class="muted helper">
                {{ $t("userGuild.logs.eventsHelp") }}
              </p>
            </div>
          </div>
          <div v-if="logsLoading" class="muted">{{ $t("common.loading") }}</div>
          <div v-else-if="!userLogs.events.length" class="muted">{{ $t("userGuild.logs.noEvents") }}</div>
          <div v-else class="log-list">
            <div v-for="log in paginatedEventLogs" :key="log.id" class="log-row">
              <span>{{ formatDate(log.created_at) }}</span>
              <span>{{ formatEvent(log.type) }}</span>
              <span class="log-amount">
                {{ formatAmount(log.amount, false) }}
                <img v-if="currencyIconUrl" :src="currencyIconUrl" class="currency-icon" alt="" />
                <span v-else>{{ currencySymbol }}</span>
              </span>
            </div>
          </div>
          <div v-if="eventLogPages > 1" class="pagination">
            <UButton color="neutral" variant="outline" :disabled="eventLogPage <= 1" @click="eventLogPage--">
              {{ $t("common.prev") }}
            </UButton>
            <span>{{ $t("common.page") }} {{ eventLogPage }} / {{ eventLogPages }}</span>
            <UButton color="neutral" variant="outline" :disabled="eventLogPage >= eventLogPages" @click="eventLogPage++">
              {{ $t("common.next") }}
            </UButton>
          </div>
        </UCard>
      </div>
    </template>

    <div v-if="itemDetailsTarget" class="modal">
      <UCard class="modal-card modal-card--wide">
        <div class="modal-head">
          <div>
            <h3>{{ $t("userGuild.items.detailsTitle") }}</h3>
            <p class="muted">{{ $t("userGuild.items.detailsHelp") }}</p>
          </div>
          <UButton color="neutral" variant="outline" @click="closeItemDetails">✕</UButton>
        </div>
        <div class="item-detail">
          <div
            class="item-detail-image"
            :style="itemDetailsTarget.image_url ? { backgroundImage: `url(${itemDetailsTarget.image_url})` } : {}"
          >
            <span v-if="!itemDetailsTarget.image_url">
              {{ itemDetailsTarget.type === 'lootbox' ? '🎁' : '🧾' }}
            </span>
          </div>
          <div class="item-detail-info">
            <div class="item-detail-title">{{ itemDetailsTarget.name }}</div>
            <div class="item-detail-description">
              {{ itemDetailsTarget.description || $t("common.noDescription") }}
            </div>
            <div class="item-detail-meta">
              <span class="item-chip">
                {{ itemDetailsTarget.type === 'lootbox' ? $t("userGuild.inventory.lootbox") : $t("userGuild.items.item") }}
              </span>
              <span
                v-if="Number(itemDetailsTarget.discount_percent || 0) > 0"
                class="item-chip"
              >
                -{{ itemDetailsTarget.discount_percent }}%
              </span>
            </div>
            <div class="item-detail-price">
              {{ itemDetailsTarget.final_price }}
              <img v-if="currencyIconUrl" :src="currencyIconUrl" class="currency-icon" alt="" />
              <span v-else>{{ currencySymbol }}</span>
            </div>
            <div class="muted small">{{ $t("userGuild.items.buyHint") }}</div>
          </div>
        </div>
        <div class="actions">
          <UButton color="neutral" variant="outline" @click="closeItemDetails">{{ $t("common.close") }}</UButton>
          <UButton color="primary" @click="startPurchaseFromDetails">{{ $t("common.buy") }}</UButton>
        </div>
      </UCard>
    </div>

    <div v-if="purchaseTarget" class="modal">
      <UCard class="modal-card">
        <h3>{{ $t("userGuild.items.confirmTitle") }}</h3>
        <p class="muted">
          {{ $t("userGuild.items.confirmText", { name: purchaseTarget.name }) }}
          {{ purchaseTarget.final_price }}
          <img v-if="currencyIconUrl" :src="currencyIconUrl" class="currency-icon" alt="" />
          <span v-else>{{ currencySymbol }}</span>
          ?
        </p>
        <div class="actions">
          <UButton color="neutral" variant="outline" @click="purchaseTarget = null">{{ $t("common.cancel") }}</UButton>
          <UButton color="primary" :loading="purchaseLoading" @click="confirmPurchase">
            {{ purchaseLoading ? $t("userGuild.items.buying") : $t("common.confirm") }}
          </UButton>
        </div>
      </UCard>
    </div>

    <div v-if="lootboxOpen" class="modal">
      <UCard class="modal-card lootbox-card">
        <h3>{{ $t("userGuild.lootbox.openTitle") }}</h3>
        <div class="lootbox-window" ref="lootboxWindowRef">
          <div
            :key="lootboxSpinKey"
            class="lootbox-track"
            :class="{ spinning: lootboxSpinning }"
            :style="lootboxSpinStyle"
          >
            <div
              v-for="(entry, index) in lootboxAnimationItems"
              :key="`lootbox-${index}`"
              class="lootbox-cell"
              :class="entry.tier ? `tier-${entry.tier}` : ''"
            >
              <div class="lootbox-icon" :style="entry.image_url ? { backgroundImage: `url(${entry.image_url})` } : {}">
                <span v-if="!entry.image_url">🎁</span>
              </div>
              <div class="lootbox-name">{{ entry.name }}</div>
            </div>
          </div>
          <div class="lootbox-marker"></div>
        </div>
        <div v-if="lootboxResult" class="lootbox-reward">
          <div
            class="reward-image"
            :class="lootboxResultTier ? `tier-${lootboxResultTier}` : ''"
            :style="lootboxResult.reward?.image_url ? { backgroundImage: `url(${lootboxResult.reward.image_url})` } : {}"
          >
            <span v-if="!lootboxResult.reward?.image_url">🎁</span>
          </div>
          <p class="muted">{{ $t("userGuild.lootbox.won") }} <strong>{{ lootboxResult.reward?.name }}</strong></p>
          <p
            v-if="lootboxResult?.reward?.type && inventoryRewardTypes.includes(lootboxResult.reward.type)"
            class="muted small"
          >
            {{ $t("userGuild.lootbox.inventoryNotice") }}
          </p>
        </div>
      </UCard>
    </div>

    <div v-if="gameModalOpen" class="modal">
      <UCard class="modal-card">
        <h3>{{ activeGame?.label }}</h3>
        <p class="muted">{{ activeGame?.id ? gameDescriptions[activeGame.id] : "" }}</p>
        <div v-if="activeGame?.id === 'flip'" class="coin-stage">
          <div class="coin-spin" :class="{ playing: gamePlaying, back: coinResultFace === 'face' }">
            <div class="coin-face front">{{ $t("userGuild.games.pile") }}</div>
            <div class="coin-face back">{{ $t("userGuild.games.face") }}</div>
          </div>
        </div>
        <div v-if="activeGame?.id === 'dice'" class="dice-stage">
          <div class="dice-cube" :class="{ playing: gamePlaying }" :style="diceRotationStyle">
            <div class="dice-face dice-face-1">⚀</div>
            <div class="dice-face dice-face-2">⚁</div>
            <div class="dice-face dice-face-3">⚂</div>
            <div class="dice-face dice-face-4">⚃</div>
            <div class="dice-face dice-face-5">⚄</div>
            <div class="dice-face dice-face-6">⚅</div>
          </div>
        </div>
        <div v-if="activeGame?.id === 'roulette'" class="roulette-stage">
          <div
            class="roulette-wheel"
            :class="{ playing: gamePlaying }"
            :style="{ transform: `rotate(${rouletteRotation}deg)` }"
          ></div>
          <div class="roulette-pin"></div>
        </div>
        <div v-if="activeGame?.id === 'slot'" class="slot-stage">
          <div class="slot-machine">
            <div class="slot-frame">
              <div class="slot-glow"></div>
              <div class="slot-reels">
                <div v-for="(reel, reelIndex) in slotReels" :key="`reel-${reelIndex}`" class="slot-reel">
                  <div class="slot-reel-track" :style="slotReelStyle(reelIndex)">
                    <div v-for="(symbol, idx) in reel" :key="`sym-${reelIndex}-${idx}`" class="slot-symbol">
                      <img v-if="slotSymbolUrl(symbol)" :src="slotSymbolUrl(symbol)" alt="" />
                      <span v-else>{{ symbol }}</span>
                    </div>
                  </div>
                  <div class="slot-mask"></div>
                </div>
              </div>
              <div class="slot-line"></div>
            </div>
            <div class="slot-footer">
              <span class="pill neutral">{{ $t("userGuild.games.bet") }}: {{ gameBet }}</span>
              <span class="pill neutral">{{ $t("userGuild.games.cooldown") }}: {{ gameCooldownRemaining }}s</span>
            </div>
          </div>
        </div>
        <div v-if="activeGame?.id === 'crash'" class="crash-stage">
          <div class="crash-line" :class="{ playing: gamePlaying }"></div>
        </div>
        <div v-if="activeGame?.id === 'double'" class="double-stage">
          <div class="double-opener">
            <div class="double-window" ref="doubleWindowRef">
              <div
                :key="doubleSpinKey"
                class="double-track"
                :class="{ spinning: doubleSpinning }"
                :style="doubleSpinStyle"
              >
                <div
                  v-for="(entry, index) in doubleSpinItems"
                  :key="`double-${index}`"
                  class="double-card"
                  :class="entry === 'DOUBLE' ? 'win' : 'lose'"
                >
                  {{ entry === "DOUBLE" ? $t("userGuild.games.doubleWin") : $t("userGuild.games.doubleLose") }}
                </div>
              </div>
              <div class="double-pointer"></div>
            </div>
            <div class="double-caption">{{ $t("userGuild.games.doubleTitle") }}</div>
            <div v-if="doubleResultLabel" class="double-result">
              {{ $t("userGuild.games.result") }} :
              <strong>{{ doubleResultLabel === "DOUBLE" ? $t("userGuild.games.doubleWin") : $t("userGuild.games.doubleLose") }}</strong>
            </div>
          </div>
        </div>
        <div v-if="activeGame?.id === 'mystery'" class="mystery-stage">
          <div class="mystery-orb" :class="{ playing: gamePlaying }">✨</div>
        </div>
        <div v-if="activeGame?.id === 'higherLower'" class="hl-stage">
          <div class="hl-arrow" :class="{ playing: gamePlaying }">⬆️⬇️</div>
        </div>
        <div class="grid">
          <label>
            {{ $t("userGuild.games.bet") }}
            <input v-model.number="gameBet" type="number" min="1" />
          </label>
          <label v-if="activeGame?.choiceType === 'select'">
            {{ $t("userGuild.games.choice") }}
            <select v-model="gameChoice">
              <option v-for="option in activeGame.choices" :key="option" :value="option">
                {{ choiceLabel(option) }}
              </option>
            </select>
          </label>
          <label v-if="activeGame?.choiceType === 'number'">
            {{ $t("userGuild.games.choice") }}
            <input v-model.number="gameChoiceNumber" type="number" min="1" />
          </label>
          <label v-if="activeGame?.choiceType === 'cashout'">
            {{ $t("userGuild.games.cashout") }}
            <input v-model.number="gameCashout" type="number" min="1" />
          </label>
        </div>
        <div class="actions">
          <UButton color="neutral" variant="outline" @click="closeGameModal">{{ $t("common.cancel") }}</UButton>
          <UButton
            color="primary"
            :disabled="gamePlaying || gameCooldownRemaining > 0"
            @click="playGameAction"
          >
            {{
              gamePlaying
                ? $t("userGuild.games.playing")
                : gameCooldownRemaining > 0
                  ? `${$t("userGuild.games.cooldown")} ${gameCooldownRemaining}s`
                  : $t("userGuild.games.play")
            }}
          </UButton>
        </div>
      </UCard>
    </div>
    <div v-if="gameResultModal" class="modal">
      <UCard class="modal-card">
        <h3>{{ gameResultData?.win ? $t("userGuild.games.win") : $t("userGuild.games.lose") }}</h3>
        <p class="muted">
          <span v-if="gameResultData?.label">{{ gameResultData.label }}</span>
          <span v-if="gameResultData?.amount !== undefined">
            {{ gameResultData.amount }}
            <img v-if="currencyIconUrl" :src="currencyIconUrl" class="currency-icon" alt="" />
            <span v-else>{{ currencySymbol }}</span>
          </span>
        </p>
        <div v-if="activeGame?.id === 'slot' && lastSlotResult.length" class="slot-result">
          <div class="slot-result-label">{{ $t("userGuild.games.result") }}</div>
          <div class="slot-result-row">
            <div v-for="(symbol, idx) in lastSlotResult" :key="`slot-res-${idx}`" class="slot-result-symbol">
              <img v-if="slotSymbolUrl(symbol)" :src="slotSymbolUrl(symbol)" alt="" />
              <span v-else>{{ symbol }}</span>
            </div>
          </div>
        </div>
        <div v-if="activeGame?.id === 'double' && doubleResultLabel" class="double-result-summary">
          <span class="double-result-label">{{ $t("userGuild.games.result") }}</span>
          <span class="double-result-value">
            {{ doubleResultLabel === "DOUBLE" ? $t("userGuild.games.doubleWin") : $t("userGuild.games.doubleLose") }}
          </span>
        </div>
        <div class="actions">
          <UButton color="neutral" variant="outline" @click="closeGameResult">{{ $t("common.close") }}</UButton>
          <UButton
            color="primary"
            :disabled="gameCooldownRemaining > 0"
            @click="replayGame"
          >
            {{ gameCooldownRemaining > 0 ? `${$t("userGuild.games.cooldown")} ${gameCooldownRemaining}s` : $t("userGuild.games.replay") }}
          </UButton>
        </div>
      </UCard>
    </div>
  </section>
  <audio ref="coinAudio" preload="auto">
    <source
      src="https://www.myinstants.com/media/sounds/294twister294_DD3F2wb.mp3"
      type="audio/mpeg"
    />
  </audio>
  <audio ref="winAudio" preload="auto">
    <source
      src="https://www.myinstants.com/media/sounds/slot-machine-jackpot-sound-effect.mp3"
      type="audio/mpeg"
    />
  </audio>
  <audio ref="loseAudio" preload="auto">
    <source
      src="https://www.myinstants.com/media/sounds/mario-loose.mp3"
      type="audio/mpeg"
    />
  </audio>
</template>

<script setup>
const config = useRuntimeConfig();
const route = useRoute();
const { t } = useI18n();
const { getToken, login } = useAuth();
const guildId = route.params.id;

const me = ref(null);
const summary = ref(null);
const loading = ref(true);
const disabled = ref(false);
const disabledReason = ref("");
const activeTab = ref("shops");

const shops = ref([]);
const shopItems = ref([]);
const selectedShopId = ref("");
const itemsLoading = ref(false);
const shopError = ref("");
const shopPage = ref(1);
const shopPageSize = 8;
const itemPage = ref(1);
const itemPageSize = 8;

const inventory = ref([]);
const inventoryLoading = ref(false);
const inventoryActionStatus = ref("");

const sales = ref([]);
const salesLoading = ref(false);

const saleItemId = ref("");
const salePrice = ref(0);
const saleQuantity = ref(1);
const saleSaving = ref(false);
const saleStatus = ref("");

const purchaseTarget = ref(null);
const purchaseLoading = ref(false);
const itemDetailsTarget = ref(null);

const userLogs = reactive({ gains: [], events: [] });
const logsLoading = ref(false);
const logPageSize = 20;
const gainLogPage = ref(1);
const eventLogPage = ref(1);

const gamesSettings = ref(null);
const gamesLoading = ref(false);

const lootboxOpen = ref(false);
const lootboxAnimationItems = ref([]);
const lootboxResult = ref(null);
const lootboxResultTier = ref("");
const inventoryRewardTypes = ["inventory", "irl", "role", "temp_role"];
const lootboxTimer = ref(null);
const lootboxWindowRef = ref(null);
const lootboxSpinKey = ref(0);
const lootboxSpinning = ref(false);
const lootboxOffset = ref(0);
const lootboxSpinDurationMs = 5200;
const lootboxItemWidth = 156;
const lootboxItemGap = 16;

const slotReels = ref([[], [], []]);
const slotOffsets = ref([0, 0, 0]);
const slotSpinDurationMs = 1700;
const slotCellSize = 72;
const slotSpinDelays = [0, 140, 280];
const lastSlotResult = ref([]);

const doubleSpinItems = ref([]);
const doubleResultLabel = ref("");
const doubleSpinKey = ref(0);
const doubleSpinning = ref(false);
const doubleOffset = ref(0);
const doubleWindowRef = ref(null);
const doubleSpinDurationMs = 3800;
const doubleItemWidth = 132;
const doubleItemGap = 12;

const gameModalOpen = ref(false);
const activeGame = ref(null);
const gameBet = ref(0);
const gameChoice = ref("");
const gameChoiceNumber = ref(1);
const gameCashout = ref(1);
const gamePlaying = ref(false);
const gameResultModal = ref(false);
const gameResultData = ref(null);
const gameCooldownUntil = ref(null);
const cooldownTick = ref(0);
const rouletteRotation = ref(0);
const rouletteSpinDurationMs = 4000;
const coinAudio = ref(null);
const winAudio = ref(null);
const loseAudio = ref(null);
const coinResultFace = ref("");
const diceResultFace = ref(null);
const diceRotationStyle = computed(() => {
  const face = Number(diceResultFace.value || 0);
  switch (face) {
    case 1:
      return { transform: "rotateX(0deg) rotateY(0deg)" };
    case 2:
      return { transform: "rotateX(0deg) rotateY(-90deg)" };
    case 3:
      return { transform: "rotateX(0deg) rotateY(180deg)" };
    case 4:
      return { transform: "rotateX(0deg) rotateY(90deg)" };
    case 5:
      return { transform: "rotateX(-90deg) rotateY(0deg)" };
    case 6:
      return { transform: "rotateX(90deg) rotateY(0deg)" };
    default:
      return { transform: "rotateX(-20deg) rotateY(20deg)" };
  }
});

const fetchJson = async (url, options = {}) => {
  const token = getToken();
  if (!token) {
    login();
    return null;
  }
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });
  if (res.status === 401) {
    login();
    return null;
  }
  const data = await res.json();
  return { ok: res.ok, data };
};

const loadMe = async () => {
  const res = await fetchJson(`${config.public.apiBase}/api/me`);
  if (res?.ok) {
    me.value = res.data?.user || null;
  } else {
    me.value = null;
  }
};

const clampPage = (page, total) => Math.min(Math.max(1, page), Math.max(1, total));

const syncShopPageForSelected = () => {
  if (!selectedShopId.value || !shops.value.length) return;
  const index = shops.value.findIndex((shop) => String(shop.id) === String(selectedShopId.value));
  if (index < 0) return;
  const targetPage = Math.floor(index / shopPageSize) + 1;
  shopPage.value = clampPage(targetPage, shopPages.value);
};

const greetingLabel = computed(() => {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 5 ? t("common.greetingEvening") : t("common.greetingMorning");
});

const greetingName = computed(() => {
  return me.value?.impersonated_username || me.value?.username || "";
});

const greetingText = computed(() => {
  return greetingName.value ? `${greetingLabel.value} ${greetingName.value}` : greetingLabel.value;
});

const slotSymbols = computed(() => {
  const symbols = gamesSettings.value?.slot?.symbols;
  if (Array.isArray(symbols) && symbols.length) return symbols;
  return ["💎", "🍒", "⭐", "🍋"];
});

const slotSymbolUrl = (symbol) => {
  const parsed = parseDiscordEmoji(symbol);
  if (!parsed) return "";
  return `https://cdn.discordapp.com/emojis/${parsed.id}.${parsed.animated ? "gif" : "png"}`;
};

const randomSlotSymbol = () => {
  const symbols = slotSymbols.value;
  return symbols[Math.floor(Math.random() * symbols.length)];
};

const buildSlotReel = (target) => {
  const count = 18 + Math.floor(Math.random() * 6);
  const reel = Array.from({ length: count }, randomSlotSymbol);
  reel.push(target);
  reel.push(randomSlotSymbol());
  return { reel, targetIndex: reel.length - 2 };
};

const initSlotReels = () => {
  slotReels.value = [0, 1, 2].map(() => Array.from({ length: 9 }, randomSlotSymbol));
  slotOffsets.value = [0, 0, 0];
};

const spinSlot = async (resultSymbols = []) => {
  const targets = Array.isArray(resultSymbols) && resultSymbols.length === 3
    ? resultSymbols
    : [randomSlotSymbol(), randomSlotSymbol(), randomSlotSymbol()];
  const builds = targets.map((symbol) => buildSlotReel(symbol));
  slotReels.value = builds.map((item) => item.reel);
  slotOffsets.value = [0, 0, 0];
  await nextTick();
  slotOffsets.value = builds.map((item) => -((item.targetIndex - 1) * slotCellSize));
  await new Promise((resolve) =>
    setTimeout(resolve, slotSpinDurationMs + slotSpinDelays[2])
  );
};

const slotReelStyle = (index) => ({
  transform: `translateY(${slotOffsets.value[index]}px)`,
  transitionDuration: `${slotSpinDurationMs + slotSpinDelays[index]}ms`,
  transitionTimingFunction: "cubic-bezier(0.08, 0.82, 0.15, 1)",
  transitionDelay: `${slotSpinDelays[index]}ms`
});

const doubleSpinStyle = computed(() => ({
  "--double-offset": `${doubleOffset.value}px`,
  "--double-duration": `${doubleSpinDurationMs}ms`,
  "--double-item-width": `${doubleItemWidth}px`,
  "--double-gap": `${doubleItemGap}px`
}));

const buildDoubleItems = (total) => {
  const pattern = ["DOUBLE", "RIEN", "RIEN", "DOUBLE", "RIEN", "DOUBLE"];
  const seed = Math.floor(Math.random() * pattern.length);
  return Array.from({ length: total }).map((_, index) =>
    pattern[(index + seed) % pattern.length]
  );
};

const initDouble = () => {
  doubleSpinItems.value = buildDoubleItems(40);
  doubleOffset.value = 0;
  doubleResultLabel.value = "";
  doubleSpinning.value = false;
  doubleSpinKey.value += 1;
};

const spinDouble = async (win) => {
  const totalItems = 60;
  const targetIndex = totalItems - 18;
  const items = buildDoubleItems(totalItems);
  items[targetIndex] = win ? "DOUBLE" : "RIEN";
  doubleSpinItems.value = items;
  doubleResultLabel.value = "";
  doubleOffset.value = 0;
  doubleSpinning.value = false;
  doubleSpinKey.value += 1;
  await nextTick();
  const windowWidth = doubleWindowRef.value?.clientWidth || 360;
  const step = doubleItemWidth + doubleItemGap;
  const trackWidth = totalItems * step - doubleItemGap;
  const targetOffset =
    targetIndex * step - (windowWidth / 2 - doubleItemWidth / 2);
  const clampedOffset = Math.min(
    Math.max(targetOffset, 0),
    Math.max(0, trackWidth - windowWidth)
  );
  requestAnimationFrame(() => {
    doubleSpinning.value = true;
    doubleOffset.value = clampedOffset;
  });
  await new Promise((resolve) => setTimeout(resolve, doubleSpinDurationMs));
  doubleSpinning.value = false;
  doubleResultLabel.value = win ? "DOUBLE" : "RIEN";
};

const loadSummary = async () => {
  const res = await fetchJson(`${config.public.apiBase}/api/user/guilds/${guildId}/summary`);
  if (!res) return;
  if (!res.ok) {
    disabled.value = true;
    disabledReason.value = res.data?.reason || "";
    return;
  }
  disabled.value = false;
  disabledReason.value = "";
  summary.value = res.data;
};

const loadShops = async () => {
  const res = await fetchJson(`${config.public.apiBase}/api/user/guilds/${guildId}/shops`);
  if (!res) return;
  if (res.ok) {
    shops.value = res.data.shops || [];
    const hasSelected = shops.value.some((shop) => String(shop.id) === String(selectedShopId.value));
    if ((!selectedShopId.value || !hasSelected) && shops.value.length) {
      const firstAllowed = shops.value.find((s) => s.allowed) || shops.value[0];
      selectedShopId.value = firstAllowed ? String(firstAllowed.id) : "";
    }
    syncShopPageForSelected();
    if (selectedShopId.value) {
      await loadItems();
    }
  }
};

const loadItems = async () => {
  if (!selectedShopId.value) return;
  itemsLoading.value = true;
  shopError.value = "";
  const res = await fetchJson(
    `${config.public.apiBase}/api/user/guilds/${guildId}/shops/${selectedShopId.value}/items`
  );
  if (!res) {
    itemsLoading.value = false;
    return;
  }
  if (!res.ok) {
    shopItems.value = [];
    shopError.value = res.data?.error === "missing_roles"
      ? t("userGuild.errors.missingRoles")
      : t("userGuild.errors.loadItems");
  } else {
    shopItems.value = res.data.items || [];
  }
  itemsLoading.value = false;
  itemPage.value = 1;
};

const loadInventory = async () => {
  inventoryLoading.value = true;
  const res = await fetchJson(`${config.public.apiBase}/api/user/guilds/${guildId}/inventory`);
  if (!res) {
    inventoryLoading.value = false;
    return;
  }
  inventory.value = res.ok ? res.data.items || [] : [];
  inventoryLoading.value = false;
};

const useInventoryItem = async (item) => {
  if (!item?.item_id) return;
  inventoryActionStatus.value = "";
  if (!window.confirm(t("userGuild.inventory.useConfirm", { name: item.name }))) return;
  const res = await fetchJson(
    `${config.public.apiBase}/api/user/guilds/${guildId}/inventory/${item.item_id}/use`,
    { method: "POST" }
  );
  if (!res?.ok) {
    inventoryActionStatus.value = t("userGuild.inventory.useError");
    return;
  }
  inventoryActionStatus.value = t("userGuild.inventory.useSuccess", { name: item.name });
  await loadInventory();
};

const loadSales = async () => {
  salesLoading.value = true;
  const res = await fetchJson(`${config.public.apiBase}/api/user/guilds/${guildId}/sales`);
  if (!res) {
    salesLoading.value = false;
    return;
  }
  sales.value = res.ok ? res.data.sales || [] : [];
  salesLoading.value = false;
};

const loadLogs = async () => {
  logsLoading.value = true;
  const res = await fetchJson(`${config.public.apiBase}/api/user/guilds/${guildId}/logs?limit=50`);
  if (!res) {
    logsLoading.value = false;
    return;
  }
  if (res.ok) {
    userLogs.gains = res.data.gains || [];
    userLogs.events = res.data.events || [];
  } else {
    userLogs.gains = [];
    userLogs.events = [];
  }
  logsLoading.value = false;
};

const loadGames = async () => {
  gamesLoading.value = true;
  const res = await fetchJson(`${config.public.apiBase}/api/user/guilds/${guildId}/games/settings`);
  if (!res) {
    gamesLoading.value = false;
    return;
  }
  gamesSettings.value = res.ok ? res.data.settings || null : null;
  gamesLoading.value = false;
};

const refreshAll = async () => {
  loading.value = true;
  await loadMe();
  await loadSummary();
  if (!disabled.value) {
    await Promise.all([loadShops(), loadInventory(), loadSales(), loadLogs(), loadGames()]);
  }
  loading.value = false;
};

const selectShop = async (shop) => {
  selectedShopId.value = String(shop.id);
  syncShopPageForSelected();
  await loadItems();
};

const shopPages = computed(() => Math.max(1, Math.ceil(shops.value.length / shopPageSize)));

const paginatedShops = computed(() => {
  const page = clampPage(shopPage.value, shopPages.value);
  const start = (page - 1) * shopPageSize;
  return shops.value.slice(start, start + shopPageSize);
});

const itemPages = computed(() => Math.max(1, Math.ceil(shopItems.value.length / itemPageSize)));

const paginatedShopItems = computed(() => {
  const page = clampPage(itemPage.value, itemPages.value);
  const start = (page - 1) * itemPageSize;
  return shopItems.value.slice(start, start + itemPageSize);
});

const changeShopPage = (delta) => {
  shopPage.value = clampPage(shopPage.value + delta, shopPages.value);
};

const changeItemPage = (delta) => {
  itemPage.value = clampPage(itemPage.value + delta, itemPages.value);
};

const openItemDetails = (item) => {
  itemDetailsTarget.value = item;
};

const closeItemDetails = () => {
  itemDetailsTarget.value = null;
};

const startPurchaseFromDetails = () => {
  if (!itemDetailsTarget.value) return;
  openPurchase(itemDetailsTarget.value);
  itemDetailsTarget.value = null;
};

const openPurchase = (item) => {
  purchaseTarget.value = item;
};

const confirmPurchase = async () => {
  if (!purchaseTarget.value || !selectedShopId.value) return;
  purchaseLoading.value = true;
  const res = await fetchJson(
    `${config.public.apiBase}/api/user/guilds/${guildId}/shops/${selectedShopId.value}/purchase`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: purchaseTarget.value.id })
    }
  );
  purchaseLoading.value = false;
  purchaseTarget.value = null;
  if (res?.ok) {
    await refreshAll();
  }
};

const prepareSale = (item) => {
  saleItemId.value = String(item.item_id);
  saleQuantity.value = 1;
};

const createSaleItem = async () => {
  if (!saleItemId.value || Number(salePrice.value || 0) <= 0) return;
  const quantity = Math.max(1, Math.floor(Number(saleQuantity.value || 1)));
  saleSaving.value = true;
  saleStatus.value = "";
  const res = await fetchJson(`${config.public.apiBase}/api/user/guilds/${guildId}/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: saleItemId.value, price: salePrice.value, quantity })
  });
  saleSaving.value = false;
  if (res?.ok) {
    saleStatus.value = t("userGuild.market.saleSuccess");
    saleItemId.value = "";
    salePrice.value = 0;
    saleQuantity.value = 1;
    await refreshAll();
  } else {
    saleStatus.value = t("userGuild.market.saleError");
  }
};

const buySaleItem = async (sale) => {
  const res = await fetchJson(
    `${config.public.apiBase}/api/user/guilds/${guildId}/sales/${sale.id}/buy`,
    { method: "POST" }
  );
  if (res?.ok) {
    await refreshAll();
  }
};

const lootboxSpinStyle = computed(() => ({
  "--lootbox-offset": `${lootboxOffset.value}px`,
  "--lootbox-duration": `${lootboxSpinDurationMs}ms`,
  "--lootbox-item-width": `${lootboxItemWidth}px`,
  "--lootbox-gap": `${lootboxItemGap}px`
}));

const lootboxChanceValue = (entry) => {
  const raw = Number(entry?.chance ?? entry?.probability ?? entry?.weight ?? 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, raw);
};

const lootboxTierForChance = (percent) => {
  if (percent >= 30) return "common";
  if (percent >= 15) return "uncommon";
  if (percent >= 7) return "rare";
  if (percent > 1) return "epic";
  if (percent > 0) return "legendary";
  return "unknown";
};

const findLootboxTier = (reward, entries) => {
  const name = String(reward?.name || "");
  const image = String(reward?.image_url || "");
  const exactMatch = entries.find(
    (entry) => entry.name === name && String(entry.image_url || "") === image
  );
  if (exactMatch) return exactMatch.tier || "";
  const byName = entries.filter((entry) => entry.name === name);
  if (byName.length === 1) return byName[0].tier || "";
  return "";
};

const parseLootboxEntries = (item) => {
  let data = item?.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }
  const entries = Array.isArray(data?.lootbox) ? data.lootbox : [];
  const base = entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      name: entry.name || t("userGuild.lootbox.rewardFallback"),
      image_url: entry.image_url || "",
      chance: lootboxChanceValue(entry)
    }));
  const totalChance = base.reduce((sum, entry) => sum + entry.chance, 0);
  return base.map((entry) => {
    const chancePercent = totalChance > 0 ? (entry.chance / totalChance) * 100 : 0;
    return {
      ...entry,
      chancePercent,
      tier: lootboxTierForChance(chancePercent)
    };
  });
};

const buildLootboxItems = (pool, total) => {
  const safePool = pool.length ? pool : [{ name: t("userGuild.lootbox.rewardFallback"), image_url: "" }];
  const seed = Math.floor(Math.random() * safePool.length);
  return Array.from({ length: total }).map((_, index) => {
    const entry = safePool[(index + seed) % safePool.length];
    return {
      name: entry.name,
      image_url: entry.image_url,
      chance: entry.chance ?? 0,
      chancePercent: entry.chancePercent ?? 0,
      tier: entry.tier || "unknown"
    };
  });
};

const startLootbox = async (item) => {
  if (lootboxSpinning.value || lootboxOpen.value) return;
  const entries = parseLootboxEntries(item);
  const pool = entries.length ? entries : [{ name: t("userGuild.lootbox.rewardFallback"), image_url: "" }];
  const totalItems = 60;
  const targetIndex = totalItems - 18;
  lootboxAnimationItems.value = buildLootboxItems(pool, totalItems);
  lootboxResult.value = null;
  lootboxResultTier.value = "";
  lootboxOpen.value = true;
  lootboxSpinning.value = false;
  lootboxOffset.value = 0;
  lootboxSpinKey.value += 1;

  const res = await fetchJson(
    `${config.public.apiBase}/api/user/guilds/${guildId}/inventory/${item.item_id}/open`,
    { method: "POST" }
  );

  if (res?.ok && res.data?.reward) {
    const fallbackTier = lootboxAnimationItems.value[targetIndex]?.tier || "";
    const rewardTier = findLootboxTier(res.data.reward, entries);
    lootboxAnimationItems.value = lootboxAnimationItems.value.map((entry, index) =>
      index === targetIndex
        ? {
            name: res.data.reward?.name || entry.name,
            image_url: res.data.reward?.image_url || entry.image_url,
            chance: entry.chance,
            chancePercent: entry.chancePercent,
            tier: rewardTier || entry.tier
          }
        : entry
    );
    lootboxResultTier.value = rewardTier || fallbackTier;
  }

  await nextTick();
  const windowWidth = lootboxWindowRef.value?.clientWidth || 720;
  const step = lootboxItemWidth + lootboxItemGap;
  const trackWidth = totalItems * step - lootboxItemGap;
  const targetOffset =
    targetIndex * step - (windowWidth / 2 - lootboxItemWidth / 2);
  const clampedOffset = Math.min(
    Math.max(targetOffset, 0),
    Math.max(0, trackWidth - windowWidth)
  );
  requestAnimationFrame(() => {
    lootboxSpinning.value = true;
    lootboxOffset.value = clampedOffset;
  });

  if (lootboxTimer.value) clearTimeout(lootboxTimer.value);
  lootboxTimer.value = setTimeout(async () => {
    if (res?.ok) {
      lootboxResult.value = res.data;
      await refreshAll();
    }
    lootboxSpinning.value = false;
    lootboxOffset.value = clampedOffset;
    setTimeout(() => {
      lootboxOpen.value = false;
      lootboxResult.value = null;
      lootboxResultTier.value = "";
    }, 1200);
  }, lootboxSpinDurationMs);
};

const enabledGames = computed(() => {
  const settings = gamesSettings.value || {};
  if (settings.enabled === false) return [];
  const list = [
    { id: "flip", label: t("userGuild.games.flip"), config: settings.flip, choiceType: "select", choices: ["pile", "face"] },
    { id: "dice", label: t("userGuild.games.dice"), config: settings.dice, choiceType: "number" },
    { id: "roulette", label: t("userGuild.games.roulette"), config: settings.roulette, choiceType: "select", choices: ["red", "black", "green"] },
    { id: "higherLower", label: t("userGuild.games.higherLower"), config: settings.higherLower, choiceType: "select", choices: ["plus", "moins"] },
    { id: "crash", label: t("userGuild.games.crash"), config: settings.crash, choiceType: "cashout" },
    { id: "double", label: t("userGuild.games.double"), config: settings.double },
    { id: "slot", label: t("userGuild.games.slot"), config: settings.slot },
    { id: "mystery", label: t("userGuild.games.mystery"), config: settings.mystery }
  ];
  return list
    .filter((game) => game.config?.enabled !== false)
    .map((game) => ({
      ...game,
      minBet: Number(gamesSettings.value?.minBet || 1),
      maxBet: Number(gamesSettings.value?.maxBet || 10000)
    }));
});

const openGameModal = (game) => {
  activeGame.value = game;
  gameBet.value = Number(game.minBet || 1);
  gameChoice.value = game.choices?.[0] || "";
  gameChoiceNumber.value = 1;
  gameCashout.value = 1;
  gameResultModal.value = false;
  gameResultData.value = null;
  gameCooldownUntil.value = null;
  coinResultFace.value = "";
  diceResultFace.value = activeGame.value?.id === "dice" ? 1 : null;
  if (activeGame.value?.id === "slot") {
    initSlotReels();
  } else {
    lastSlotResult.value = [];
  }
  if (activeGame.value?.id === "double") {
    initDouble();
  } else {
    doubleResultLabel.value = "";
    doubleOffset.value = 0;
    doubleSpinning.value = false;
    doubleSpinKey.value += 1;
  }
  gameModalOpen.value = true;
};

const closeGameModal = () => {
  gameModalOpen.value = false;
  activeGame.value = null;
  doubleResultLabel.value = "";
  doubleOffset.value = 0;
  doubleSpinning.value = false;
  doubleSpinKey.value += 1;
};

const playGameAction = async () => {
  if (!activeGame.value) return;
  const defaultCooldownSeconds = Number(gamesSettings.value?.cooldownSeconds || 0);
  gameCooldownUntil.value = defaultCooldownSeconds > 0 ? Date.now() + defaultCooldownSeconds * 1000 : null;
  if (activeGame.value.id === "flip") {
    coinResultFace.value = "";
  }
  gamePlaying.value = true;
  const spinStart = Date.now();
  const spinDurationMs = 1200;
  if (activeGame.value.id === "flip" && coinAudio.value) {
    try {
      coinAudio.value.currentTime = 0;
      await coinAudio.value.play();
    } catch {
      // ignore audio errors
    }
  }
  const payload = {
    gameId: activeGame.value.id,
    bet: Number(gameBet.value || 0)
  };
  if (activeGame.value.choiceType === "select") {
    payload.choice = gameChoice.value;
  }
  if (activeGame.value.choiceType === "number") {
    payload.choice = gameChoiceNumber.value;
  }
  if (activeGame.value.choiceType === "cashout") {
    payload.cashout = gameCashout.value;
  }
  const res = await fetchJson(`${config.public.apiBase}/api/user/guilds/${guildId}/games/play`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res?.ok) {
    const rawWin = res.data?.win;
    const win =
      rawWin === true ||
      rawWin === 1 ||
      rawWin === "1" ||
      String(rawWin).toLowerCase() === "true";
    const payout = res.data?.payout ?? 0;
    if (activeGame.value?.id === "flip") {
      const choice = String(payload.choice || "").toLowerCase();
      const apiResult = String(res.data?.details?.result || "").toLowerCase();
      let resolved = "";
      if (apiResult === "pile" || apiResult === "face") {
        resolved = apiResult;
      } else if (choice === "pile" || choice === "face") {
        resolved = win ? choice : choice === "pile" ? "face" : "pile";
      }
      coinResultFace.value = resolved;
    }
    if (activeGame.value?.id === "dice") {
      const roll = Number(res.data?.details?.roll || 0);
      diceResultFace.value = roll >= 1 && roll <= 6 ? roll : null;
    }
    if (activeGame.value?.id === "roulette") {
      const apiColor = String(res.data?.details?.color || res.data?.details?.result || "").toLowerCase();
      const color = ["red", "black", "green"].includes(apiColor) ? apiColor : "red";
      const targetAngle = pickRouletteAngle(color);
      const spins = 4;
      rouletteRotation.value = rouletteRotation.value + spins * 360 + (360 - targetAngle);
    }
    const nextResult = win
      ? { win: true, label: t("userGuild.games.winLabel"), amount: payout }
      : { win: false, label: t("userGuild.games.loseLabel"), amount: Number(payload.bet || 0) };
    const showResult = async () => {
      gameResultData.value = nextResult;
      const keepGameOpen = activeGame.value?.id === "roulette";
      if (!keepGameOpen) {
        gameModalOpen.value = false;
      }
      gameResultModal.value = true;
      try {
        if (win && winAudio.value) {
          winAudio.value.currentTime = 0;
          await winAudio.value.play();
        } else if (!win && loseAudio.value) {
          loseAudio.value.currentTime = 0;
          await loseAudio.value.play();
        }
      } catch {
        // ignore audio errors
      }
    };
    if (activeGame.value?.id === "flip") {
      const elapsed = Date.now() - spinStart;
      const delay = Math.max(0, spinDurationMs - elapsed);
      const revealPauseMs = 900;
      setTimeout(() => {
        gamePlaying.value = false;
        setTimeout(async () => {
          await showResult();
        }, revealPauseMs);
      }, delay);
    } else if (activeGame.value?.id === "dice") {
      const elapsed = Date.now() - spinStart;
      const delay = Math.max(0, spinDurationMs - elapsed);
      const revealPauseMs = 900;
      setTimeout(() => {
        gamePlaying.value = false;
        setTimeout(async () => {
          await showResult();
        }, revealPauseMs);
      }, delay);
    } else if (activeGame.value?.id === "roulette") {
      const elapsed = Date.now() - spinStart;
      const delay = Math.max(0, rouletteSpinDurationMs - elapsed);
      const revealPauseMs = 900;
      setTimeout(() => {
        gamePlaying.value = false;
        setTimeout(async () => {
          await showResult();
        }, revealPauseMs);
      }, delay);
    } else if (activeGame.value?.id === "slot") {
      const resultSymbols = Array.isArray(res.data?.details?.result) ? res.data.details.result : [];
      lastSlotResult.value = resultSymbols;
      await spinSlot(resultSymbols);
      gamePlaying.value = false;
      await showResult();
    } else if (activeGame.value?.id === "double") {
      await spinDouble(win);
      gamePlaying.value = false;
      await showResult();
    } else {
      gamePlaying.value = false;
      await showResult();
    }
    await refreshAll();
  } else {
    gamePlaying.value = false;
    if (activeGame.value?.id === "dice") {
      diceResultFace.value = 1;
    }
    if (activeGame.value?.id === "flip") {
      coinResultFace.value = "pile";
    }
    if (activeGame.value?.id === "slot") {
      lastSlotResult.value = [];
    }
    if (activeGame.value?.id === "double") {
      doubleResultLabel.value = "";
      doubleOffset.value = 0;
      doubleSpinning.value = false;
      doubleSpinKey.value += 1;
    }
    if (res?.reason === "cooldown" || res?.retryIn) {
      const retrySeconds = Number(res?.retryIn || 0) || Number(gamesSettings.value?.cooldownSeconds || 0);
      if (retrySeconds > 0) {
        gameCooldownUntil.value = Date.now() + retrySeconds * 1000;
      }
    }
    const revealPauseMs = activeGame.value?.id === "dice" || activeGame.value?.id === "flip" ? 900 : 0;
    setTimeout(async () => {
      gameResultData.value = { win: false, label: t("userGuild.games.playError") };
      gameModalOpen.value = false;
      gameResultModal.value = true;
      try {
        if (loseAudio.value) {
          loseAudio.value.currentTime = 0;
          await loseAudio.value.play();
        }
      } catch {
        // ignore audio errors
      }
    }, revealPauseMs);
  }
};

const closeGameResult = () => {
  gameResultModal.value = false;
};

const replayGame = () => {
  if (!activeGame.value) return;
  gameResultModal.value = false;
  if (activeGame.value.id === "flip") {
    coinResultFace.value = "";
  }
  if (activeGame.value.id === "dice") {
    diceResultFace.value = 1;
  }
  gameModalOpen.value = true;
};

const gameCooldownRemaining = computed(() => {
  cooldownTick.value;
  if (!gameCooldownUntil.value) return 0;
  return Math.max(0, Math.ceil((gameCooldownUntil.value - Date.now()) / 1000));
});

const pickRouletteAngle = (color) => {
  const slice = 10;
  if (color === "green") return 4;
  const isRed = color === "red";
  const slot = Math.floor(Math.random() * 18);
  const base = slot * 20 + (isRed ? 0 : 10);
  return base + slice / 2;
};

const formatDate = (value) => {
  if (!value) return t("common.na");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("common.na");
  return date.toLocaleString();
};

const formatSigned = (value) => {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : ""}${amount}`;
};

const formatAmount = (value) => {
  const amount = Number(value || 0);
  return `${amount}`;
};

const formatSource = (source) => {
  switch (String(source || "")) {
    case "message":
      return t("userGuild.logs.sourceMessage");
    case "voice":
      return t("userGuild.logs.sourceVoice");
    case "twitch_message":
      return t("userGuild.logs.sourceTwitchMessage");
    case "twitch_watch":
      return t("userGuild.logs.sourceTwitchWatch");
    default:
      return source || t("common.na");
  }
};

const formatEvent = (type) => {
  if (type === "shop_purchase") return t("userGuild.logs.eventShopPurchase");
  if (type === "sale_purchase") return t("userGuild.logs.eventSalePurchase");
  if (type === "sale_reclaim") return t("userGuild.logs.eventSaleReclaim");
  return type || t("userGuild.logs.eventGeneric");
};

const inventoryForSale = computed(() =>
  inventory.value.filter((item) => item.type === "inventory")
);

const inventoryItemCount = computed(() =>
  inventory.value.reduce((total, item) => total + Number(item.quantity || 0), 0)
);

const inventoryLootboxCount = computed(() =>
  inventory.value
    .filter((item) => item.type === "lootbox")
    .reduce((total, item) => total + Number(item.quantity || 0), 0)
);

const inventorySellableCount = computed(() =>
  inventory.value
    .filter((item) => item.type === "inventory")
    .reduce((total, item) => total + Number(item.quantity || 0), 0)
);

const selectedSaleItem = computed(() =>
  inventoryForSale.value.find((item) => String(item.item_id) === String(saleItemId.value))
);

watch(selectedSaleItem, (item) => {
  if (!item) {
    saleQuantity.value = 1;
    return;
  }
  if (!saleQuantity.value || saleQuantity.value < 1) saleQuantity.value = 1;
  if (saleQuantity.value > Number(item.quantity || 1)) {
    saleQuantity.value = Number(item.quantity || 1);
  }
});

const currencySymbol = computed(() => summary.value?.economy?.emoji || "💰");

const parseDiscordEmoji = (value) => {
  const raw = String(value || "");
  const match = raw.match(/^<a?:\w+:(\d+)>$/);
  if (!match) return null;
  const animated = raw.startsWith("<a:");
  return { id: match[1], animated };
};

const currencyIconUrl = computed(() => {
  const parsed = parseDiscordEmoji(currencySymbol.value);
  if (!parsed) return "";
  return `https://cdn.discordapp.com/emojis/${parsed.id}.${parsed.animated ? "gif" : "png"}`;
});

const gameDescriptions = computed(() => ({
  flip: t("userGuild.games.flipDesc"),
  dice: t("userGuild.games.diceDesc"),
  roulette: t("userGuild.games.rouletteDesc"),
  higherLower: t("userGuild.games.higherLowerDesc"),
  crash: t("userGuild.games.crashDesc"),
  double: t("userGuild.games.doubleDesc"),
  slot: t("userGuild.games.slotDesc"),
  mystery: t("userGuild.games.mysteryDesc")
}));

const choiceLabel = (option) => {
  switch (String(option || "")) {
    case "pile":
      return t("userGuild.games.choicePile");
    case "face":
      return t("userGuild.games.choiceFace");
    case "plus":
      return t("userGuild.games.choicePlus");
    case "moins":
      return t("userGuild.games.choiceMinus");
    case "red":
      return t("userGuild.games.choiceRed");
    case "black":
      return t("userGuild.games.choiceBlack");
    case "green":
      return t("userGuild.games.choiceGreen");
    default:
      return option;
  }
};

const gameIcon = (id) => {
  const icons = {
    flip: "🪙",
    dice: "🎲",
    roulette: "🎡",
    higherLower: "📈",
    crash: "🚀",
    double: "⚡",
    slot: "🎰",
    mystery: "✨"
  };
  return icons[id] || "🎮";
};

const gainLogPages = computed(() => {
  const total = userLogs.gains.length || 0;
  return Math.max(1, Math.ceil(total / logPageSize));
});

const eventLogPages = computed(() => {
  const total = userLogs.events.length || 0;
  return Math.max(1, Math.ceil(total / logPageSize));
});

const paginatedGainLogs = computed(() => {
  const page = Math.min(Math.max(1, gainLogPage.value), gainLogPages.value);
  const start = (page - 1) * logPageSize;
  return userLogs.gains.slice(start, start + logPageSize);
});

const paginatedEventLogs = computed(() => {
  const page = Math.min(Math.max(1, eventLogPage.value), eventLogPages.value);
  const start = (page - 1) * logPageSize;
  return userLogs.events.slice(start, start + logPageSize);
});

watch(
  () => [userLogs.gains.length, userLogs.events.length],
  () => {
    gainLogPage.value = 1;
    eventLogPage.value = 1;
  }
);

watch(shopPages, (total) => {
  shopPage.value = clampPage(shopPage.value, total);
});

watch(itemPages, (total) => {
  itemPage.value = clampPage(itemPage.value, total);
});

watch(selectedShopId, () => {
  itemPage.value = 1;
});

let cooldownTimerId;
onMounted(() => {
  refreshAll();
  cooldownTimerId = setInterval(() => {
    cooldownTick.value = Date.now();
  }, 500);
});
onBeforeUnmount(() => {
  if (cooldownTimerId) clearInterval(cooldownTimerId);
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  padding: 8px 4px 32px;
  font-family: "Space Grotesk", "Sora", "Poppins", sans-serif;
  color: var(--text);
}
.page::before,
.page::after {
  content: "";
  position: absolute;
  inset: -120px -40px auto;
  height: 360px;
  background: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.35), transparent 60%),
    radial-gradient(circle at 80% 0%, rgba(16, 185, 129, 0.25), transparent 55%),
    radial-gradient(circle at 50% 40%, rgba(236, 72, 153, 0.18), transparent 60%);
  z-index: 0;
  pointer-events: none;
}
.page::after {
  inset: auto -40px -180px;
  height: 320px;
  background: radial-gradient(circle at 70% 30%, rgba(99, 102, 241, 0.2), transparent 60%),
    radial-gradient(circle at 10% 50%, rgba(56, 189, 248, 0.18), transparent 60%);
}
.page > * {
  position: relative;
  z-index: 1;
}
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(120deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.6));
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
}
.head-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
.balance-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(79, 70, 229, 0.25));
  border: 1px solid rgba(99, 102, 241, 0.4);
}
.balance-value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.currency-icon {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  vertical-align: middle;
}
.muted {
  color: var(--text-muted);
}
.small {
  font-size: 12px;
}
.card {
  background: var(--surface);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
}
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.card-head h3 {
  margin: 0 0 4px;
}
.helper {
  font-size: 13px;
  line-height: 1.5;
}
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.15);
}
.tab {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: var(--surface-2);
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tab.active {
  border-color: rgba(99, 102, 241, 0.8);
  background: linear-gradient(120deg, rgba(99, 102, 241, 0.5), rgba(14, 165, 233, 0.35));
}
.shop-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin-top: 12px;
}
.shop-card {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 16px;
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.2);
  cursor: pointer;
  color: inherit;
  text-align: left;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  min-height: 140px;
}
.shop-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 28px rgba(15, 23, 42, 0.45);
}
.shop-card.active {
  border-color: rgba(99, 102, 241, 0.8);
  background: linear-gradient(120deg, rgba(99, 102, 241, 0.35), rgba(14, 165, 233, 0.2));
}
.shop-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.shop-thumb {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  background: radial-gradient(circle at top, rgba(99, 102, 241, 0.35), rgba(15, 23, 42, 0.85));
  display: grid;
  place-items: center;
  font-size: 28px;
  color: var(--text-soft);
  background-size: cover;
  background-position: center;
}
.shop-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.shop-desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.4;
  min-height: 2.8em;
}
.shop-name {
  font-size: 16px;
  font-weight: 700;
}
.shop-meta {
  font-size: 12px;
  color: var(--text-soft);
}
.items-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin-top: 12px;
}
.item-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.18);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-height: 320px;
}
.inventory-card {
  min-height: 280px;
}
.inventory-grid {
  grid-template-columns: repeat(auto-fill, minmax(220px, 240px));
  justify-content: flex-start;
}
.market-grid {
  grid-template-columns: repeat(auto-fill, minmax(220px, 240px));
  justify-content: flex-start;
}
.inventory-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.stat-pill {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(148, 163, 184, 0.15);
  color: var(--text);
  border: 1px solid rgba(148, 163, 184, 0.25);
}
.item-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.4);
}
.item-card--clickable {
  cursor: pointer;
}
.item-image {
  width: 100%;
  height: 140px;
  border-radius: 12px;
  background: radial-gradient(circle at top, rgba(99, 102, 241, 0.3), rgba(15, 23, 42, 0.8));
  display: grid;
  place-items: center;
  background-size: cover;
  background-position: center;
  color: var(--text-soft);
  font-size: 28px;
}
.item-name {
  font-weight: 700;
}
.item-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.inventory-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.item-desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.4;
  min-height: 2.8em;
}
.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
}
.price {
  font-weight: 600;
}
.item-more {
  margin-top: auto;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(96, 165, 250, 0.5);
  background: linear-gradient(120deg, rgba(59, 130, 246, 0.25), rgba(14, 165, 233, 0.2));
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #dbeafe;
}
.sale-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.18);
  margin-bottom: 12px;
}
.sale-preview.empty {
  justify-content: center;
  text-align: center;
}
.sale-preview-image {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: radial-gradient(circle at top, rgba(99, 102, 241, 0.35), rgba(15, 23, 42, 0.85));
  display: grid;
  place-items: center;
  font-size: 26px;
  color: var(--text-soft);
  background-size: cover;
  background-position: center;
}
.sale-preview-title {
  font-weight: 700;
}
.price-field {
  display: flex;
  align-items: center;
  gap: 8px;
}
.price-field input {
  flex: 1;
}
.price-symbol {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.2);
  font-size: 12px;
  color: var(--text-soft);
}
.item-actions {
  display: flex;
  gap: 8px;
}
.games-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin-top: 12px;
}
.game-card {
  padding: 12px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.18);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 220px;
}
.game-title {
  font-weight: 700;
}
.game-head {
  display: flex;
  gap: 12px;
  align-items: center;
}
.game-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: radial-gradient(circle at top, rgba(99, 102, 241, 0.35), rgba(15, 23, 42, 0.9));
  color: #c7d2fe;
}
.game-head-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.game-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}
.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.log-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--surface-2);
}
.log-amount {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}
.pill.danger {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
  border: 1px solid rgba(239, 68, 68, 0.4);
}
.pill.neutral {
  background: rgba(148, 163, 184, 0.15);
  color: var(--text);
  border: 1px solid rgba(148, 163, 184, 0.25);
}
.pill.info {
  background: rgba(59, 130, 246, 0.18);
  color: #bfdbfe;
  border: 1px solid rgba(59, 130, 246, 0.4);
}
.pill.warning {
  background: rgba(251, 191, 36, 0.18);
  color: #fde68a;
  border: 1px solid rgba(251, 191, 36, 0.45);
}
.coin-stage {
  display: grid;
  place-items: center;
  padding: 14px 0;
}
.coin-spin {
  width: 72px;
  height: 72px;
  position: relative;
  transform-style: preserve-3d;
  animation: none;
}
.coin-spin.playing {
  animation: coin-flip 1.2s linear forwards;
}
.coin-spin.back {
  transform: rotateY(180deg);
}
.coin-face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle at top, rgba(250, 204, 21, 0.95), rgba(245, 158, 11, 0.8));
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.3);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #111827;
  backface-visibility: hidden;
}
.coin-face.back {
  transform: rotateY(180deg);
  background: radial-gradient(circle at top, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.8));
  color: var(--text);
}
@keyframes coin-flip {
  0% {
    transform: rotateY(0deg);
  }
  100% {
    transform: rotateY(720deg);
  }
}

.dice-stage,
.roulette-stage,
.slot-stage,
.crash-stage,
.double-stage,
.mystery-stage,
.hl-stage {
  display: grid;
  place-items: center;
  padding: 12px 0;
}
.slot-machine {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(100%, 520px);
}
.slot-frame {
  position: relative;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.75));
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: inset 0 0 30px rgba(14, 165, 233, 0.18), 0 18px 30px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.slot-glow {
  position: absolute;
  inset: 12px;
  border-radius: 14px;
  border: 1px solid rgba(96, 165, 250, 0.25);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.25);
  pointer-events: none;
}
.slot-reels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.slot-reel {
  height: 208px;
  border-radius: 14px;
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.2);
  overflow: hidden;
  position: relative;
}
.slot-reel-track {
  display: flex;
  flex-direction: column;
  gap: 8px;
  will-change: transform;
}
.slot-symbol {
  height: 64px;
  display: grid;
  place-items: center;
  font-size: 34px;
  color: #f8fafc;
}
.slot-symbol img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}
.slot-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(15, 23, 42, 0.95) 0%,
    rgba(15, 23, 42, 0.3) 25%,
    rgba(15, 23, 42, 0.1) 50%,
    rgba(15, 23, 42, 0.3) 75%,
    rgba(15, 23, 42, 0.95) 100%
  );
  pointer-events: none;
}
.slot-line {
  position: absolute;
  left: 16px;
  right: 16px;
  top: 50%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), transparent);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
}
.slot-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.slot-result {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: grid;
  gap: 8px;
}
.slot-result-label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.slot-result-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.slot-result-symbol {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.2);
  font-size: 22px;
  color: #f8fafc;
}
.slot-result-symbol img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}
.double-opener {
  width: min(100%, 620px);
  display: grid;
  gap: 12px;
  justify-items: center;
}
.double-window {
  position: relative;
  width: 100%;
  height: 150px;
  overflow: hidden;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.8));
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: inset 0 0 28px rgba(14, 165, 233, 0.2), 0 18px 30px rgba(0, 0, 0, 0.35);
}
.double-window::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(15, 23, 42, 0.95) 0%,
    rgba(15, 23, 42, 0) 18%,
    rgba(15, 23, 42, 0) 82%,
    rgba(15, 23, 42, 0.95) 100%
  );
  pointer-events: none;
  z-index: 2;
}
.double-window::after {
  content: "";
  position: absolute;
  inset: 12px;
  border-radius: 14px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  box-shadow: 0 0 18px rgba(59, 130, 246, 0.2);
  pointer-events: none;
  z-index: 1;
}
.double-track {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0;
  gap: var(--double-gap, 12px);
  transform: translateX(calc(-1 * var(--double-offset, 0px)));
  transition: transform 0ms;
  will-change: transform;
}
.double-track.spinning {
  transition: transform var(--double-duration, 0ms) cubic-bezier(0.08, 0.82, 0.15, 1);
}
.double-card {
  flex: 0 0 auto;
  width: var(--double-item-width, 132px);
  height: 88px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: var(--surface-2);
  color: var(--text);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12), 0 8px 16px rgba(0, 0, 0, 0.25);
}
.double-card.win {
  border-color: rgba(59, 130, 246, 0.6);
  background: rgba(37, 99, 235, 0.18);
  color: #dbeafe;
}
.double-card.lose {
  border-color: rgba(248, 113, 113, 0.55);
  background: rgba(239, 68, 68, 0.18);
  color: #fee2e2;
}
.double-pointer {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 1), rgba(59, 130, 246, 0.2));
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.8);
  z-index: 3;
}
.double-pointer::before {
  content: "";
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 10px solid rgba(59, 130, 246, 0.9);
}
.double-pointer::after {
  content: "";
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-top: 10px solid rgba(59, 130, 246, 0.9);
}
.double-caption {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: #93c5fd;
}
.double-result {
  font-size: 14px;
  color: var(--text);
}
.double-result-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.2);
}
.double-result-label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.double-result-value {
  font-weight: 700;
  color: var(--text);
}
.roulette-stage {
  position: relative;
}
.dice-cube {
  width: 64px;
  height: 64px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.4s ease;
}
.dice-cube.playing {
  animation: dice-spin 1.2s linear infinite;
}
.dice-face {
  position: absolute;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  font-size: 76px;
  font-weight: 800;
  line-height: 0.85;
  border-radius: 12px;
  background: linear-gradient(145deg, #ef4444, #b91c1c);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.15), 0 12px 20px rgba(0, 0, 0, 0.35);
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
}
.dice-face-1 {
  transform: rotateY(0deg) translateZ(32px);
}
.dice-face-2 {
  transform: rotateY(90deg) translateZ(32px);
}
.dice-face-3 {
  transform: rotateY(180deg) translateZ(32px);
}
.dice-face-4 {
  transform: rotateY(-90deg) translateZ(32px);
}
.dice-face-5 {
  transform: rotateX(90deg) translateZ(32px);
}
.dice-face-6 {
  transform: rotateX(-90deg) translateZ(32px);
}
@keyframes dice-spin {
  0% {
    transform: rotateX(0deg) rotateY(0deg);
  }
  50% {
    transform: rotateX(180deg) rotateY(180deg);
  }
  100% {
    transform: rotateX(360deg) rotateY(360deg);
  }
}
.roulette-wheel {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: repeating-conic-gradient(#ef4444 0deg 10deg, #0f172a 10deg 20deg);
  border: 8px solid rgba(15, 23, 42, 0.9);
  box-shadow: inset 0 0 0 6px var(--border), 0 18px 28px rgba(0, 0, 0, 0.35);
  transition: transform 4s cubic-bezier(0.12, 0.8, 0.2, 1);
  position: relative;
}
.roulette-wheel::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(#16a34a 0deg 8deg, transparent 8deg 360deg);
  box-shadow: inset 0 0 0 3px rgba(16, 185, 129, 0.7);
}
.roulette-wheel::after {
  content: "";
  position: absolute;
  inset: 16px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(2, 6, 23, 0.95), rgba(15, 23, 42, 0.7));
  box-shadow: inset 0 0 0 2px var(--border);
}
.roulette-pin {
  width: 10px;
  height: 22px;
  border-radius: 999px;
  background: rgba(250, 204, 21, 0.95);
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.35);
}
.crash-line {
  width: 140px;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.8), rgba(16, 185, 129, 0.8));
  position: relative;
  overflow: hidden;
}
.crash-line.playing::after {
  content: "";
  position: absolute;
  left: -40%;
  top: 0;
  width: 40%;
  height: 100%;
  background: var(--surface-2);
  animation: crash-pulse 0.8s linear infinite;
}
.mystery-orb {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.6), rgba(15, 23, 42, 0.9));
  box-shadow: 0 0 20px rgba(236, 72, 153, 0.5);
}
.mystery-orb.playing {
  animation: mystery-glow 1s ease-in-out infinite;
}
.hl-arrow {
  font-size: 28px;
}
.hl-arrow.playing {
  animation: hl-bounce 0.6s ease-in-out infinite;
}

@keyframes crash-pulse {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(350%);
  }
}
@keyframes mystery-glow {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(236, 72, 153, 0.5);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 30px rgba(236, 72, 153, 0.9);
    transform: scale(1.05);
  }
}
@keyframes hl-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

select,
input,
textarea {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: var(--surface-2);
  color: inherit;
  padding: 10px 12px;
}
select:focus,
input:focus,
textarea:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.7);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
  z-index: 2000;
}
.modal-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 20px;
  width: min(90vw, 520px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.45);
}
.modal-card--wide {
  width: min(90vw, 640px);
}
.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.item-detail {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border-radius: 16px;
  background: var(--surface-2);
  border: 1px solid rgba(148, 163, 184, 0.16);
}
.item-detail-image {
  width: 140px;
  height: 140px;
  border-radius: 16px;
  background: radial-gradient(circle at top, rgba(99, 102, 241, 0.35), rgba(15, 23, 42, 0.85));
  display: grid;
  place-items: center;
  font-size: 36px;
  color: var(--text-soft);
  background-size: cover;
  background-position: center;
}
.item-detail-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.item-detail-title {
  font-size: 20px;
  font-weight: 700;
}
.item-detail-description {
  color: var(--text-soft);
  line-height: 1.5;
}
.item-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.item-chip {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.2);
  color: #c7d2fe;
  border: 1px solid rgba(99, 102, 241, 0.4);
}
.item-detail-price {
  font-size: 18px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lootbox-card {
  width: min(90vw, 720px);
}
.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
.lootbox-window {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.8));
  height: 170px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: inset 0 0 28px rgba(14, 165, 233, 0.16), 0 16px 26px rgba(0, 0, 0, 0.3);
}
.lootbox-window::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(15, 23, 42, 0.95) 0%,
    rgba(15, 23, 42, 0) 18%,
    rgba(15, 23, 42, 0) 82%,
    rgba(15, 23, 42, 0.95) 100%
  );
  pointer-events: none;
  z-index: 2;
}
.lootbox-window::after {
  content: "";
  position: absolute;
  inset: 12px;
  border-radius: 14px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  box-shadow: 0 0 18px rgba(59, 130, 246, 0.18);
  pointer-events: none;
  z-index: 1;
}
.lootbox-track {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0;
  gap: var(--lootbox-gap, 16px);
  transform: translateX(calc(-1 * var(--lootbox-offset, 0px)));
  transition: transform 0ms;
  will-change: transform;
}
.lootbox-track.spinning {
  transition: transform var(--lootbox-duration, 0ms) cubic-bezier(0.08, 0.82, 0.15, 1);
}
.lootbox-cell {
  --tier-color: 148, 163, 184;
  flex: 0 0 auto;
  width: var(--lootbox-item-width, 156px);
  height: 118px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  padding: 10px;
  gap: 6px;
  text-align: center;
  border: 1px solid rgba(var(--tier-color), 0.35);
  background: linear-gradient(140deg, rgba(var(--tier-color), 0.18), rgba(15, 23, 42, 0.88));
  color: var(--text);
  box-shadow: inset 0 0 0 1px rgba(var(--tier-color), 0.12), 0 10px 18px rgba(0, 0, 0, 0.3);
}
.lootbox-cell.tier-unknown,
.lootbox-cell.tier-common {
  --tier-color: 148, 163, 184;
}
.lootbox-cell.tier-uncommon {
  --tier-color: 59, 130, 246;
}
.lootbox-cell.tier-rare {
  --tier-color: 139, 92, 246;
}
.lootbox-cell.tier-epic {
  --tier-color: 236, 72, 153;
}
.lootbox-cell.tier-legendary {
  --tier-color: 245, 158, 11;
}
.lootbox-icon {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  margin: 0 auto;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.5), rgba(15, 23, 42, 0.9));
  display: grid;
  place-items: center;
  background-size: cover;
  background-position: center;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.45), 0 0 18px rgba(var(--tier-color), 0.35);
}
.lootbox-name {
  font-size: 12px;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lootbox-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 1), rgba(59, 130, 246, 0.2));
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.8);
  z-index: 3;
}
.lootbox-marker::before {
  content: "";
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 10px solid rgba(59, 130, 246, 0.9);
}
.lootbox-marker::after {
  content: "";
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-top: 10px solid rgba(59, 130, 246, 0.9);
}

@media (max-width: 640px) {
  .shop-card {
    grid-template-columns: 1fr;
  }
  .shop-thumb {
    width: 100%;
    height: 140px;
  }
  .item-detail {
    grid-template-columns: 1fr;
  }
  .item-detail-image {
    width: 100%;
    height: 180px;
  }
}
.lootbox-reward {
  display: flex;
  align-items: center;
  gap: 12px;
}
.reward-image {
  --tier-color: 99, 102, 241;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(var(--tier-color), 0.2);
  border: 1px solid rgba(var(--tier-color), 0.35);
  display: grid;
  place-items: center;
  background-size: cover;
  background-position: center;
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.25), 0 0 12px rgba(var(--tier-color), 0.35);
}
.reward-image.tier-unknown,
.reward-image.tier-common {
  --tier-color: 148, 163, 184;
}
.reward-image.tier-uncommon {
  --tier-color: 59, 130, 246;
}
.reward-image.tier-rare {
  --tier-color: 139, 92, 246;
}
.reward-image.tier-epic {
  --tier-color: 236, 72, 153;
}
.reward-image.tier-legendary {
  --tier-color: 245, 158, 11;
}
:global(body.theme-light) .page,
:global(body.theme-light) .card,
:global(body.theme-light) .sub-card,
:global(body.theme-light) .modal-card,
:global(body.theme-light) .shop-card,
:global(body.theme-light) .item-card,
:global(body.theme-light) .game-card,
:global(body.theme-light) .inventory-item,
:global(body.theme-light) .market-card,
:global(body.theme-light) .logs-table,
:global(body.theme-light) .list-row {
  background: #ffffff;
  border-color: rgba(148, 163, 184, 0.25);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}
:global(body.theme-light) .tab-pill,
:global(body.theme-light) .pill,
:global(body.theme-light) .source-pill {
  background: #eef2ff;
  border-color: rgba(148, 163, 184, 0.25);
  color: var(--text);
}
:global(body.theme-light) .tab-pill.active {
  background: rgba(99, 102, 241, 0.18);
  color: var(--text);
}
:global(body.theme-light) .muted,
:global(body.theme-light) .item-sub,
:global(body.theme-light) .meta,
:global(body.theme-light) .small {
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
:global(body.theme-light) .item-detail-image {
  border-color: rgba(148, 163, 184, 0.25);
}
</style>

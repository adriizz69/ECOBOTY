<template>
  <UDashboardPanel id="admin-v2-games">
    <template #header>
      <UDashboardNavbar title="Jeux">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <AdminV2NotificationsButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPageCard
        v-if="!isAdmin"
        title="Accès refusé"
        description="Cette page est réservée à l’administrateur du bot."
        variant="subtle"
      />

      <div v-else class="space-y-6">
        <UPageCard
          title="Simulateur de probabilités"
          description="Teste les mini-jeux avec une config fictive. Rien n’est enregistré sur les serveurs. L’outil n’est plus dans l’admin serveur, pour éviter la charge."
          variant="naked"
          orientation="horizontal"
        />

        <GamesAdminPanel
          :games-config="gamesConfig"
          platform-mode
          show-simulator
          :advanced-unlocked="true"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup>
definePageMeta({ layout: "admin-v2" });

const { isAdmin, requireAdmin } = useAdminV2Guard();

const gamesConfig = reactive({
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

onMounted(async () => {
  await requireAdmin();
});
</script>

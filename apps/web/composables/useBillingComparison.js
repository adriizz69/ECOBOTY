export function useBillingComparison() {
  const { t } = useI18n();

  const comparisonSections = computed(() => [
    {
      title: t("pricing.compareSections.general"),
      rows: [
        { key: "billedEntity", free: t("pricing.compareValues.none"), premium: t("pricing.compareValues.guild") },
      { key: "shops", free: "1", premium: "10" },
      { key: "items", free: "6", premium: "6" },
      { key: "lootbox", free: false, premium: true },
        { key: "logs", free: t("pricing.compareValues.logsFree"), premium: t("pricing.compareValues.logsPremium") }
      ]
    },
    {
      title: t("pricing.compareSections.economy"),
      rows: [
        { key: "economyCore", free: true, premium: true },
        { key: "multiShops", free: false, premium: true },
        { key: "marketplace", free: false, premium: true },
        { key: "inventoryAdvanced", free: false, premium: true },
        { key: "automationAdvanced", free: false, premium: true }
      ]
    },
    {
      title: t("pricing.compareSections.community"),
      rows: [
        { key: "leaderboard", free: true, premium: true },
        { key: "leaderboardAdvanced", free: false, premium: true },
        { key: "logsExtended", free: false, premium: true },
        { key: "birthdays", free: true, premium: true }
      ]
    },
    {
      title: t("pricing.compareSections.integrations"),
      rows: [
        { key: "gamesBase", free: t("pricing.compareValues.coinFlipOnly"), premium: true },
        { key: "gamesAdvanced", free: false, premium: true },
        { key: "achievementsBase", free: t("pricing.compareValues.achievementsUniqueFree"), premium: true },
        { key: "achievementsTiers", free: t("pricing.compareValues.achievementsTierFree"), premium: true },
        { key: "support", free: true, premium: true }
      ]
    },
    {
      title: t("pricing.compareSections.twitch"),
      rows: [
        { key: "twitchConnect", free: false, premium: true },
        { key: "twitchMessageGains", free: false, premium: true },
        { key: "twitchWatch", free: false, premium: true },
        { key: "twitchSubsBits", free: false, premium: true },
        { key: "twitchDaily", free: false, premium: true },
        { key: "twitchPromo", free: false, premium: true },
        { key: "twitchEvents", free: false, premium: true },
        { key: "twitchMultipliers", free: false, premium: true }
      ]
    }
  ]);

  const cellValue = (value) => {
    if (value === true) return "check";
    if (value === false) return "dash";
    return "text";
  };

  return { comparisonSections, cellValue };
}

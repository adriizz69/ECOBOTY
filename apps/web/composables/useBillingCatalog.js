const FALLBACK_PLANS = Object.freeze({
  free: {
    planKey: "free",
    label: "Free",
    description: "Pour démarrer EcoBoty sur un petit serveur.",
    prices: {
      monthly: { amountCents: 0, label: "0 €" },
      quarterly: { amountCents: 0, label: "0 €" },
      yearly: { amountCents: 0, label: "0 €" }
    }
  },
  premium: {
    planKey: "premium",
    label: "Premium",
    description: "Pour les serveurs qui veulent aller plus loin.",
    prices: {
      monthly: { amountCents: 499, label: "4,99 €", perMonth: "4,99 €", billed: null },
      quarterly: { amountCents: 1347, label: "4,49 €", perMonth: "4,49 €", billed: "13,47 € / 3 mois", discountPercent: 10 },
      yearly: { amountCents: 4790, label: "3,99 €", perMonth: "3,99 €", billed: "47,90 € / an", discountPercent: 20 }
    }
  }
});

export function useBillingCatalog() {
  const config = useRuntimeConfig();

  const loading = ref(false);
  const catalog = ref({
    currency: "eur",
    plans: [FALLBACK_PLANS.free, FALLBACK_PLANS.premium]
  });

  const freePlan = computed(() => catalog.value?.plans?.find((p) => p.planKey === "free") || FALLBACK_PLANS.free);
  const premiumPlan = computed(() => catalog.value?.plans?.find((p) => p.planKey === "premium") || FALLBACK_PLANS.premium);

  const resolvePremiumDisplay = (intervalKey) => {
    const prices = premiumPlan.value?.prices || FALLBACK_PLANS.premium.prices;
    const fallback = FALLBACK_PLANS.premium.prices[intervalKey];
    const fromApi = prices[intervalKey];
    if (!fromApi) return fallback;

    if (intervalKey === "monthly") {
      return {
        perMonth: fromApi.label || "4,99 €",
        billed: null,
        discountPercent: 0
      };
    }
    if (intervalKey === "quarterly") {
      return {
        perMonth: "4,49 €",
        billed: fromApi.label || "13,47 € / 3 mois",
        discountPercent: 10
      };
    }
    return {
      perMonth: "3,99 €",
      billed: fromApi.label || "47,90 € / an",
      discountPercent: 20
    };
  };

  const loadCatalog = async () => {
    loading.value = true;
    try {
      const base = String(config.public.apiBase || "").replace(/\/$/, "");
      const res = await fetch(`${base}/public/billing/plans`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.plans) && data.plans.length) {
        catalog.value = data;
      }
    } catch {
      // keep fallback catalog
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    catalog,
    freePlan,
    premiumPlan,
    resolvePremiumDisplay,
    loadCatalog
  };
}

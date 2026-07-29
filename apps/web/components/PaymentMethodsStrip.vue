<template>
  <div class="payments-strip">
    <p class="payments-label">{{ displayLabel }}</p>
    <div class="payments-logos" role="list" aria-label="Moyens de paiement acceptés">
      <div v-for="method in methods" :key="method.name" class="payments-badge" role="listitem">
        <img :src="method.src" :alt="method.name" loading="lazy" decoding="async" />
      </div>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n();

const props = defineProps({
  label: { type: String, default: "" }
});

const displayLabel = computed(() => props.label || t("landing.paymentsAccepted"));

const methods = [
  { name: "Visa", src: "/payments/visa.svg" },
  { name: "Mastercard", src: "/payments/mastercard.svg" },
  { name: "Apple Pay", src: "/payments/apple-pay.svg" },
  { name: "Google Pay", src: "/payments/google-pay.svg" },
  { name: "Link", src: "/payments/link.svg" },
  { name: "Revolut", src: "/payments/revolut.svg" },
  { name: "PayPal", src: "/payments/paypal.svg" }
];
</script>

<style scoped>
.payments-strip {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.payments-label {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.payments-logos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.payments-badge {
  height: 46px;
  min-width: 84px;
  padding: 7px 12px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.payments-badge img {
  display: block;
  height: 28px;
  width: auto;
  max-width: 112px;
  object-fit: contain;
}

@media (max-width: 640px) {
  .payments-badge {
    height: 42px;
    min-width: 74px;
    padding: 6px 10px;
  }

  .payments-badge img {
    height: 24px;
    max-width: 100px;
  }
}
</style>

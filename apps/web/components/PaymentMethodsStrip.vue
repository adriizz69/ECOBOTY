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
  {
    name: "Visa",
    src: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg"
  },
  {
    name: "Mastercard",
    src: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
  },
  {
    name: "Apple Pay",
    src: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg"
  },
  {
    name: "Google Pay",
    src: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg"
  },
  {
    name: "Link",
    src: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Link_%28Stripe%29_logo.svg"
  },
  {
    name: "Revolut",
    src: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Revolut_logo.svg"
  },
  {
    name: "PayPal",
    src: "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
  }
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
  height: 36px;
  min-width: 56px;
  padding: 0 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.payments-badge img {
  display: block;
  max-height: 18px;
  max-width: 64px;
  width: auto;
  object-fit: contain;
}

.payments-badge:nth-child(5) img {
  max-height: 16px;
  max-width: 48px;
}
</style>

<template>
  <UModal
    v-model:open="open"
    :title="title || 'Confirmation'"
    :description="description || 'Cette action est irréversible.'"
  >
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Annuler"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          :label="confirmLabel || 'Confirmer'"
          color="error"
          variant="solid"
          :loading="loading"
          @click="onConfirm"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup>
const props = defineProps({
  title: String,
  description: String,
  confirmLabel: String,
  action: Function
});

const emit = defineEmits(["confirmed"]);

const open = ref(false);
const loading = ref(false);

const onConfirm = async () => {
  loading.value = true;
  try {
    if (typeof props.action === "function") {
      await props.action();
    }
    emit("confirmed");
    open.value = false;
  } finally {
    loading.value = false;
  }
};
</script>

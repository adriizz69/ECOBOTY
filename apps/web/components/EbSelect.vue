<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean, null],
    default: null
  },
  items: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  },
  searchable: {
    type: [Boolean, Object],
    default: undefined
  },
  placeholder: {
    type: String,
    default: ""
  },
  number: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["update:modelValue", "change"]);

const searchInput = computed(() => {
  if (props.searchable === false) return false;
  if (props.searchable === true) {
    return { placeholder: "Rechercher…", icon: "i-lucide-search" };
  }
  if (props.searchable && typeof props.searchable === "object") {
    return props.searchable;
  }
  return props.items.length > 8
    ? { placeholder: "Rechercher…", icon: "i-lucide-search" }
    : false;
});

const onUpdate = (value) => {
  let next = value;
  if (props.number && next !== "" && next != null && next !== false) {
    const n = Number(next);
    next = Number.isFinite(n) ? n : next;
  }
  emit("update:modelValue", next);
  emit("change", next);
};
</script>

<template>
  <USelectMenu
    :model-value="modelValue"
    :items="items"
    value-key="value"
    label-key="label"
    :disabled="disabled"
    :search-input="searchInput"
    :placeholder="placeholder || undefined"
    color="neutral"
    variant="outline"
    class="w-full eb-select"
    @update:model-value="onUpdate"
  />
</template>

<style scoped>
.eb-select {
  min-height: 42px;
}
</style>

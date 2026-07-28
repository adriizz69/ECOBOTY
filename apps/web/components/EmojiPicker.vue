<script setup>
defineOptions({ name: "EmojiPickerWrapper" });
import "emoji-picker-element";
import { onMounted, onBeforeUnmount, ref, shallowRef } from "vue";

const emit = defineEmits(["select"]);
const hostRef = ref(null);
const pickerEl = shallowRef(null);

const onEmojiClick = (event) => {
  const value =
    event?.detail?.unicode ||
    event?.detail?.emoji?.unicode ||
    event?.detail?.emoji?.native ||
    "";
  if (value) emit("select", value);
};

onMounted(() => {
  if (!hostRef.value) return;
  const el = document.createElement("emoji-picker");
  el.className = "picker";
  el.addEventListener("emoji-click", onEmojiClick);
  hostRef.value.appendChild(el);
  pickerEl.value = el;
});

onBeforeUnmount(() => {
  if (pickerEl.value) {
    pickerEl.value.removeEventListener("emoji-click", onEmojiClick);
    pickerEl.value.remove();
    pickerEl.value = null;
  }
});
</script>

<template>
  <div class="emoji-picker" ref="hostRef"></div>
</template>

<style scoped>
.emoji-picker {
  width: 100%;
}
.picker {
  width: 100%;
  max-width: 360px;
  --background: rgba(8, 12, 20, 0.95);
  --border-color: rgba(255, 255, 255, 0.12);
  --input-border-color: rgba(255, 255, 255, 0.2);
  --input-background: rgba(0, 0, 0, 0.2);
  --outline-color: rgba(124, 58, 237, 0.5);
  --category-button-color: #9ca3af;
  --category-button-active-color: #e5e7eb;
}
:global(body.theme-light) .picker {
  --background: #ffffff;
  --border-color: rgba(148, 163, 184, 0.25);
  --input-border-color: rgba(148, 163, 184, 0.35);
  --input-background: #f8fafc;
  --outline-color: rgba(59, 130, 246, 0.4);
  --category-button-color: #475569;
  --category-button-active-color: #0f172a;
}
</style>

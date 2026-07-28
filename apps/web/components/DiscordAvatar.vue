<script setup>
const props = defineProps({
  userId: {
    type: [String, Number],
    default: ""
  },
  avatar: {
    type: String,
    default: ""
  },
  size: {
    type: Number,
    default: 64
  },
  alt: {
    type: String,
    default: ""
  }
});

const failed = ref(false);

const src = computed(() => {
  if (failed.value) return discordDefaultAvatarUrl(props.userId);
  return discordAvatarUrl(props.userId, props.avatar, { size: props.size });
});

const onError = () => {
  failed.value = true;
};

watch(
  () => [props.userId, props.avatar],
  () => {
    failed.value = false;
  }
);
</script>

<template>
  <img
    class="discord-avatar"
    :src="src"
    :alt="alt"
    loading="lazy"
    decoding="async"
    referrerpolicy="no-referrer"
    @error="onError"
  />
</template>

<style scoped>
.discord-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: inherit;
}
</style>

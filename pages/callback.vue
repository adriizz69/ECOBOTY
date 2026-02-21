<template>
  <section>
    <h2>Connexion en cours...</h2>
  </section>
</template>

<script setup>
const route = useRoute();
const { setToken } = useAuth();

onMounted(() => {
  const token = route.query.token;
  if (typeof token === "string" && token.length > 0) {
    setToken(token);
  }
  const redirect = route.query.redirect;
  if (typeof redirect === "string" && redirect.length > 0) {
    try {
      const url = new URL(redirect, window.location.origin);
      if (url.origin === window.location.origin) {
        navigateTo(url.pathname + url.search + url.hash);
        return;
      }
      window.location.href = redirect;
      return;
    } catch {
      navigateTo(redirect);
      return;
    }
  }
  navigateTo("/servers");
});
</script>

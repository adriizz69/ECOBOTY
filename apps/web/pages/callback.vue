<template>
  <section class="callback-page">
    <h2>Connexion en cours…</h2>
  </section>
</template>

<script setup>
const route = useRoute();
const { setToken } = useAuth();

const readToken = () => {
  const fromQuery = route.query.token;
  if (typeof fromQuery === "string" && fromQuery.length > 0) return fromQuery;

  const hash = String(window.location.hash || "").replace(/^#/, "");
  if (!hash) return "";
  const params = new URLSearchParams(hash);
  return params.get("token") || "";
};

onMounted(() => {
  const token = readToken();
  if (token) {
    setToken(token);
  }

  // Drop token from address bar (query + hash)
  if (window.history?.replaceState) {
    const clean = `${window.location.pathname}${window.location.search}`
      .replace(/([?&])token=[^&]*&?/, "$1")
      .replace(/[?&]$/, "");
    window.history.replaceState({}, "", clean.split("#")[0] || "/callback");
  }

  const redirect = route.query.redirect;
  if (typeof redirect === "string" && redirect.length > 0) {
    try {
      const url = new URL(redirect, window.location.origin);
      if (url.origin === window.location.origin) {
        navigateTo(url.pathname + url.search + url.hash);
        return;
      }
    } catch {
      navigateTo(redirect);
      return;
    }
  }

  navigateTo("/servers");
});
</script>

<style scoped>
.callback-page {
  padding: 2rem;
  text-align: center;
}
</style>

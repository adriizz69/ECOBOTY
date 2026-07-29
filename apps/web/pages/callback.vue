<template>
  <section class="callback-page">
    <h2>Connexion en cours…</h2>
  </section>
</template>

<script setup>
const route = useRoute();
const { setToken, markJustAuthed } = useAuth();

const readToken = () => {
  const fromQuery = route.query.token;
  if (typeof fromQuery === "string" && fromQuery.length > 0) return fromQuery;

  const hash = String(window.location.hash || "").replace(/^#/, "");
  if (!hash) return "";
  const params = new URLSearchParams(hash);
  return params.get("token") || "";
};

const resolveRedirectTarget = () => {
  const redirect = route.query.redirect;
  if (typeof redirect !== "string" || !redirect.length) return "/servers";
  try {
    const url = new URL(redirect, window.location.origin);
    if (url.origin !== window.location.origin) return "/servers";
    if (!url.pathname || url.pathname === "/callback") return "/servers";
    return `${url.pathname}${url.search}${url.hash}` || "/servers";
  } catch {
    return redirect.startsWith("/") ? redirect : "/servers";
  }
};

onMounted(() => {
  const token = readToken();
  if (token) {
    setToken(token);
    markJustAuthed();
  }

  const target = resolveRedirectTarget();

  // Hard navigation after token write avoids SPA races that remount /servers
  // before localStorage is readable and retrigger Discord OAuth.
  window.location.replace(target);
});
</script>

<style scoped>
.callback-page {
  padding: 2rem;
  text-align: center;
}
</style>

export default defineEventHandler((event) => {
  const url = event.node.req.url || "";
  if (url === "/_nuxt" || url === "/_nuxt/") {
    event.node.res.statusCode = 204;
    event.node.res.end();
    return null;
  }
});

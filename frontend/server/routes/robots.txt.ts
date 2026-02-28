import { defineEventHandler } from "h3";

const normalizeBaseUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "https://ecoboty.eu";
  return raw.replace(/\/+$/, "");
};

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const baseUrl = normalizeBaseUrl(config.public?.baseUrl);
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /servers",
    "Disallow: /user",
    "Disallow: /guild/",
    "Disallow: /user/",
    "Disallow: /callback",
    `Sitemap: ${baseUrl}/sitemap.xml`
  ].join("\n");

  setHeader(event, "content-type", "text/plain; charset=utf-8");
  return body;
});

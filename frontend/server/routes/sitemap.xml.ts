import { defineEventHandler } from "h3";

const normalizeBaseUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "https://ecoboty.eu";
  return raw.replace(/\/+$/, "");
};

const toAbsoluteUrl = (baseUrl, path) => `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

const escapeXml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const baseUrl = normalizeBaseUrl(config.public?.baseUrl);
  const now = new Date().toISOString();

  const pages = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/documentation", changefreq: "weekly", priority: "0.8" },
    { path: "/documentation/admin", changefreq: "weekly", priority: "0.7" },
    { path: "/documentation/utilisateur", changefreq: "weekly", priority: "0.7" },
    { path: "/setup", changefreq: "daily", priority: "0.6" },
    { path: "/mentions-legales", changefreq: "monthly", priority: "0.3" },
    { path: "/conditions", changefreq: "monthly", priority: "0.3" },
    { path: "/confidentialite", changefreq: "monthly", priority: "0.3" }
  ];

  const urls = pages
    .map((entry) => {
      const loc = escapeXml(toAbsoluteUrl(baseUrl, entry.path));
      return [
        "<url>",
        `  <loc>${loc}</loc>`,
        `  <lastmod>${now}</lastmod>`,
        `  <changefreq>${entry.changefreq}</changefreq>`,
        `  <priority>${entry.priority}</priority>`,
        "</url>"
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>"
  ].join("\n");

  setHeader(event, "content-type", "application/xml; charset=utf-8");
  return xml;
});

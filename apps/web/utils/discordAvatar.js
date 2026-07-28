/**
 * Discord CDN avatar helpers + default fallback.
 */

export function discordDefaultAvatarUrl(userId) {
  const id = String(userId || "").trim();
  if (!/^\d+$/.test(id)) {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
  try {
    const index = Number((BigInt(id) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  } catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

export function discordAvatarUrl(userId, avatar, { size = 64 } = {}) {
  const id = String(userId || "").trim();
  const value = String(avatar || "").trim();
  if (!value) return discordDefaultAvatarUrl(id);

  if (value.startsWith("http://") || value.startsWith("https://")) {
    // Already a full URL — keep size if missing
    if (/[?&]size=/.test(value)) return value;
    return `${value}${value.includes("?") ? "&" : "?"}size=${size}`;
  }

  // Hash only
  const hash = value.replace(/\.(png|gif|webp|jpg|jpeg)$/i, "");
  const ext = hash.startsWith("a_") ? "gif" : "png";
  if (!id) return discordDefaultAvatarUrl(id);
  return `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext}?size=${size}`;
}

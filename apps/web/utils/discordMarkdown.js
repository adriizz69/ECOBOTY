/**
 * Render Discord-flavored markdown to safe HTML (preview only).
 * @param {string} raw
 * @param {{ roleName?: (id: string) => string, channelName?: (id: string) => string, emojiMap?: Record<string, string> }} [opts]
 */
export function renderDiscordMarkdown(raw, opts = {}) {
  const roleName = opts.roleName || ((id) => `role-${id}`);
  const channelName = opts.channelName || ((id) => `channel-${id}`);
  const emojiMap = opts.emojiMap || {};

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const content = String(raw || "");
  if (!content.trim()) return "";

  const codeBlocks = [];
  let text = content.replace(/```([\s\S]*?)```/g, (_m, code) => {
    const i = codeBlocks.length;
    codeBlocks.push(`<pre class="d-codeblock"><code>${escapeHtml(code.replace(/^\n/, ""))}</code></pre>`);
    return `\u0000CB${i}\u0000`;
  });

  const inlineCodes = [];
  text = text.replace(/`([^`\n]+)`/g, (_m, code) => {
    const i = inlineCodes.length;
    inlineCodes.push(`<code class="d-inline-code">${escapeHtml(code)}</code>`);
    return `\u0000IC${i}\u0000`;
  });

  text = escapeHtml(text);

  text = text.replace(/:([a-zA-Z0-9_]+):/g, (match, key) => emojiMap[key] || match);

  text = text
    .replace(/&lt;a:([a-zA-Z0-9_]+):(\d+)&gt;/g, (_m, name, id) => {
      return `<img class="d-emoji" alt=":${name}:" src="https://cdn.discordapp.com/emojis/${id}.gif?size=48&amp;quality=lossless" />`;
    })
    .replace(/&lt;:([a-zA-Z0-9_]+):(\d+)&gt;/g, (_m, name, id) => {
      return `<img class="d-emoji" alt=":${name}:" src="https://cdn.discordapp.com/emojis/${id}.png?size=48&amp;quality=lossless" />`;
    });

  text = text
    .replace(/&lt;@!?(\d+)&gt;/g, (_m, id) => `<span class="d-mention">@${escapeHtml(id)}</span>`)
    .replace(/&lt;@&amp;(\d+)&gt;/g, (_m, id) => {
      return `<span class="d-mention d-mention-role">@${escapeHtml(roleName(id))}</span>`;
    })
    .replace(/&lt;#(\d+)&gt;/g, (_m, id) => {
      return `<span class="d-mention d-mention-channel">#${escapeHtml(channelName(id))}</span>`;
    })
    .replace(/@everyone/g, '<span class="d-mention d-mention-everyone">@everyone</span>')
    .replace(/@here/g, '<span class="d-mention d-mention-everyone">@here</span>');

  text = text.replace(/&lt;(https?:\/\/[^&]+)&gt;/g, (_m, url) => {
    const safe = url.replace(/&amp;/g, "&");
    return `<a class="d-link" href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safe)}</a>`;
  });

  // Headers + block quotes (line-based; Discord: # / ## / ### at line start)
  text = text
    .split("\n")
    .map((line) => {
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        return `<div class="d-heading d-heading-${level}">${heading[2]}</div>`;
      }
      if (/^&gt;&gt;&gt;\s?/.test(line)) {
        return `<div class="d-quote">${line.replace(/^&gt;&gt;&gt;\s?/, "")}</div>`;
      }
      if (/^&gt;\s?/.test(line)) {
        return `<div class="d-quote">${line.replace(/^&gt;\s?/, "")}</div>`;
      }
      return line;
    })
    .join("\n");

  text = text
    .replace(/\|\|(.+?)\|\|/g, '<span class="d-spoiler">$1</span>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, "$1<em>$2</em>");

  // Autolink bare URLs in text segments only (not inside tags/attrs)
  text = text.replace(/(^|>)([^<]+)/g, (_m, boundary, chunk) => {
    const linked = chunk.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
      const clean = url.replace(/[),.;!?]+$/g, "");
      const trailing = url.slice(clean.length);
      return `<a class="d-link" href="${clean}" target="_blank" rel="noopener noreferrer">${clean}</a>${trailing}`;
    });
    return `${boundary}${linked}`;
  });

  text = text.replace(/\n/g, "<br>");

  text = text.replace(/\u0000CB(\d+)\u0000/g, (_m, i) => codeBlocks[Number(i)] || "");
  text = text.replace(/\u0000IC(\d+)\u0000/g, (_m, i) => inlineCodes[Number(i)] || "");

  return text;
}

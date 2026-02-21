const parseAdminIds = () => {
  const raw = process.env.ADMIN_USER_IDS || process.env.ADMIN_USER_ID || "1328058083246608407";
  return raw
    .split(",")
    .map((id) => String(id || "").trim())
    .filter(Boolean);
};

export const requireAdmin = (req, res, next) => {
  const adminIds = parseAdminIds();
  const userId = req.user?.discord_id;
  if (!userId || !adminIds.includes(String(userId))) {
    return res.status(403).json({ error: "forbidden" });
  }
  return next();
};

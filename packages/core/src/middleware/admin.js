import { isPlatformAdminId } from "../services/platform-admin.js";

export const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.discord_id;
    if (!userId || !(await isPlatformAdminId(userId))) {
      return res.status(403).json({ error: "forbidden" });
    }
    return next();
  } catch (error) {
    return res.status(500).json({ error: "admin_check_failed" });
  }
};

import { jwtVerify } from "jose";

export const jwtMiddleware = async (req, res, next) => {
  if (req.path === "/health" || req.path === "/status") return next();
  const rawSecret = process.env.API_SECRET_KEY || "";
  const secret = new TextEncoder().encode(rawSecret);
  if (!rawSecret) {
    return res.status(500).json({ error: "missing_api_secret" });
  }
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing_token" });

  try {
    const { payload } = await jwtVerify(token, secret);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "invalid_token" });
  }
};

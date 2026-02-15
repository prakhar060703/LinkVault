import { config } from "./config.js";
import { User } from "./models/User.js";
import { verifyAuthToken } from "./utils/security.js";

const getToken = (req) => {
  const authHeader = req.header("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

export const requireAuth = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Authentication required." });

    const decoded = verifyAuthToken(token, config.jwtSecret);
    const user = await User.findById(decoded.sub).select("_id name email role");
    if (!user) return res.status(401).json({ error: "Invalid authentication token." });

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Invalid authentication token." });
  }
};

export const requireAdmin = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required." });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  return next();
};

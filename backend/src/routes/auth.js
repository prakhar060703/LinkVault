import express from "express";
import { User } from "../models/User.js";
import { requireAuth } from "../auth.js";
import { hashPassword, signAuthToken, verifyPassword } from "../utils/security.js";
import { config } from "../config.js";

const router = express.Router();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toAuthResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role
});

router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required." });
    }

    if (name.length < 2 || name.length > 60) {
      return res.status(400).json({ error: "Name must be between 2 and 60 characters." });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    if (password.length > 128) {
      return res.status(400).json({ error: "Password must be less than 129 characters." });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email already in use." });

    const { hash, salt } = hashPassword(password);
    const role = email === config.adminEmail ? "admin" : "user";

    const user = await User.create({
      name,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      role
    });

    const token = signAuthToken({ userId: String(user._id), role: user.role }, config.jwtSecret);

    return res.status(201).json({ token, user: toAuthResponse(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) return res.status(400).json({ error: "email and password are required." });
    if (!emailRegex.test(email)) return res.status(400).json({ error: "Invalid email format." });
    if (password.length > 128) return res.status(400).json({ error: "Invalid credentials." });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials." });

    const validPassword = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!validPassword) return res.status(401).json({ error: "Invalid credentials." });

    const token = signAuthToken({ userId: String(user._id), role: user.role }, config.jwtSecret);
    return res.status(200).json({ token, user: toAuthResponse(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({ user: toAuthResponse(req.user) });
});

export default router;

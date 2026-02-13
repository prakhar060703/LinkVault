import path from "path";
import fs from "fs";
import express from "express";
import multer from "multer";
import { Share } from "../models/Share.js";
import { config } from "../config.js";
import { generateToken, hashPassword, verifyPassword } from "../utils/security.js";

const router = express.Router();

const ensureUploadDir = () => {
  const absDir = path.resolve(config.uploadDir);
  if (!fs.existsSync(absDir)) fs.mkdirSync(absDir, { recursive: true });
};

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.resolve(config.uploadDir)),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${generateToken()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSizeBytes }
});

const parseExpiry = (rawDate) => {
  if (!rawDate) {
    const dt = new Date();
    dt.setMinutes(dt.getMinutes() + config.defaultExpiryMinutes);
    return dt;
  }

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const isExpired = (share) => share.expiresAt.getTime() <= Date.now();

const isAccessDeniedForOneTime = (share) => share.oneTimeView && share.viewCount > 0;

const validatePassword = (share, providedPassword) => {
  if (!share.passwordHash) return { ok: true };
  if (!providedPassword) return { ok: false, reason: "missing" };
  const valid = verifyPassword(providedPassword, share.passwordSalt, share.passwordHash);
  return valid ? { ok: true } : { ok: false, reason: "invalid" };
};

const baseResponse = (share) => ({
  token: share.token,
  type: share.type,
  expiresAt: share.expiresAt,
  oneTimeView: share.oneTimeView,
  hasPassword: Boolean(share.passwordHash)
});

router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    const text = (req.body.text || "").trim();
    const hasText = text.length > 0;
    const hasFile = Boolean(req.file);

    if ((hasText && hasFile) || (!hasText && !hasFile)) {
      return res.status(400).json({ error: "Provide either text or file, but not both." });
    }

    const expiresAt = parseExpiry(req.body.expiresAt);
    if (!expiresAt) {
      return res.status(400).json({ error: "Invalid expiry date." });
    }

    if (expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({ error: "Expiry must be in the future." });
    }

    const token = generateToken();
    const password = (req.body.password || "").trim();
    const oneTimeView = String(req.body.oneTimeView || "false").toLowerCase() === "true";

    let passwordHash = null;
    let passwordSalt = null;

    if (password.length > 0) {
      const hashed = hashPassword(password);
      passwordHash = hashed.hash;
      passwordSalt = hashed.salt;
    }

    const shareData = {
      token,
      type: hasText ? "text" : "file",
      text: hasText ? text : null,
      file: hasFile
        ? {
            originalName: req.file.originalname,
            storedName: req.file.filename,
            mimeType: req.file.mimetype || "application/octet-stream",
            size: req.file.size,
            path: req.file.path
          }
        : null,
      expiresAt,
      oneTimeView,
      passwordHash,
      passwordSalt
    };

    const created = await Share.create(shareData);

    return res.status(201).json({
      ...baseResponse(created),
      shareUrl: `${config.baseUrl}/api/shares/${created.token}`
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:token", async (req, res, next) => {
  try {
    const token = req.params.token;
    const providedPassword = req.header("x-access-password") || req.query.password || "";
    const share = await Share.findOne({ token });

    if (!share) return res.status(403).json({ error: "Invalid link." });
    if (isExpired(share)) return res.status(410).json({ error: "Link expired." });
    if (isAccessDeniedForOneTime(share)) return res.status(410).json({ error: "Link already used." });

    const passwordCheck = validatePassword(share, providedPassword);
    if (!passwordCheck.ok) {
      return res.status(401).json({
        error: passwordCheck.reason === "missing" ? "Password required." : "Invalid password.",
        passwordRequired: true
      });
    }

    if (share.type === "text") {
      share.viewCount += 1;
      await share.save();

      return res.status(200).json({
        ...baseResponse(share),
        text: share.text
      });
    }

    return res.status(200).json({
      ...baseResponse(share),
      file: {
        originalName: share.file.originalName,
        mimeType: share.file.mimeType,
        size: share.file.size,
        downloadUrl: `${config.baseUrl}/api/shares/${share.token}/download`
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:token/download", async (req, res, next) => {
  try {
    const token = req.params.token;
    const providedPassword = req.header("x-access-password") || req.query.password || "";
    const share = await Share.findOne({ token });

    if (!share) return res.status(403).json({ error: "Invalid link." });
    if (share.type !== "file") return res.status(400).json({ error: "This link does not contain a file." });
    if (isExpired(share)) return res.status(410).json({ error: "Link expired." });
    if (isAccessDeniedForOneTime(share)) return res.status(410).json({ error: "Link already used." });

    const passwordCheck = validatePassword(share, providedPassword);
    if (!passwordCheck.ok) {
      return res.status(401).json({
        error: passwordCheck.reason === "missing" ? "Password required." : "Invalid password.",
        passwordRequired: true
      });
    }

    share.viewCount += 1;
    await share.save();

    return res.download(path.resolve(share.file.path), share.file.originalName);
  } catch (error) {
    return next(error);
  }
});

export default router;

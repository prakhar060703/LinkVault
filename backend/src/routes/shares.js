import path from "path";
import fs from "fs";
import express from "express";
import multer from "multer";
import { Share } from "../models/Share.js";
import { config } from "../config.js";
import { generateToken, hashPassword, verifyPassword } from "../utils/security.js";
import { requireAuth } from "../auth.js";

const router = express.Router();
const tokenRegex = /^[a-f0-9]{32}$/i;
const maxTextLength = 20000;

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
const getAccessCount = (share) => Number(share.viewCount || 0) + Number(share.downloadCount || 0);

const isAccessDeniedForOneTime = (share) => share.oneTimeView && getAccessCount(share) > 0;
const isAccessDeniedForMaxViews = (share) =>
  Number.isFinite(share.maxViews) && share.maxViews !== null && getAccessCount(share) >= share.maxViews;

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
  maxViews: share.maxViews,
  viewCount: share.viewCount,
  downloadCount: share.downloadCount,
  reportCount: share.reports.length,
  hasPassword: Boolean(share.passwordHash)
});

const toMineResponse = (share) => ({
  id: share._id,
  token: share.token,
  type: share.type,
  text: share.type === "text" ? share.text || "" : null,
  file:
    share.type === "file"
      ? {
          originalName: share.file?.originalName || "",
          mimeType: share.file?.mimeType || "",
          size: share.file?.size || 0
        }
      : null,
  viewCount: share.viewCount,
  downloadCount: share.downloadCount,
  maxViews: share.maxViews,
  oneTimeView: share.oneTimeView,
  reportCount: share.reports.length,
  expiresAt: share.expiresAt,
  createdAt: share.createdAt,
  shareUrl: `${config.baseUrl}/api/shares/${share.token}`
});

router.post("/", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    const text = (req.body.text || "").trim();
    const hasText = text.length > 0;
    const hasFile = Boolean(req.file);

    if ((hasText && hasFile) || (!hasText && !hasFile)) {
      return res.status(400).json({ error: "Provide either text or file, but not both." });
    }

    if (hasText && text.length > maxTextLength) {
      return res.status(400).json({ error: `Text must be ${maxTextLength} characters or less.` });
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
    const maxViewsRaw = req.body.maxViews;
    let maxViews = null;

    if (maxViewsRaw !== undefined && String(maxViewsRaw).trim() !== "") {
      const parsedMaxViews = Number.parseInt(maxViewsRaw, 10);
      if (!Number.isFinite(parsedMaxViews) || parsedMaxViews <= 0) {
        return res.status(400).json({ error: "maxViews must be a positive integer." });
      }
      maxViews = parsedMaxViews;
    }

    let passwordHash = null;
    let passwordSalt = null;

    if (password.length > 0) {
      if (password.length > 128) {
        return res.status(400).json({ error: "Password must be less than 129 characters." });
      }
      const hashed = hashPassword(password);
      passwordHash = hashed.hash;
      passwordSalt = hashed.salt;
    }

    const shareData = {
      token,
      owner: req.user._id,
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
      maxViews,
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

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const shares = await Share.find({ owner: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ items: shares.map(toMineResponse) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/id/:shareId", requireAuth, async (req, res, next) => {
  try {
    const share = await Share.findById(req.params.shareId);
    if (!share) return res.status(404).json({ error: "Share not found." });

    const isOwner = String(share.owner) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "You do not have permission to delete this share." });
    }

    if (share.type === "file" && share.file?.path) {
      const filePath = path.resolve(share.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await share.deleteOne();
    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.post("/:token/report", requireAuth, async (req, res, next) => {
  try {
    const token = String(req.params.token || "");
    if (!tokenRegex.test(token)) return res.status(400).json({ error: "Invalid token format." });

    const share = await Share.findOne({ token: req.params.token });
    if (!share) return res.status(404).json({ error: "Share not found." });

    const alreadyReported = share.reports.some((report) => String(report.reportedBy) === String(req.user._id));
    if (alreadyReported) {
      return res.status(400).json({ error: "You have already reported this share." });
    }

    const reason = String(req.body.reason || "").trim();
    if (reason.length > 300) return res.status(400).json({ error: "Reason must be 300 characters or less." });

    share.reports.push({
      reportedBy: req.user._id,
      reason
    });

    await share.save();
    return res.status(201).json({ ok: true, reportCount: share.reports.length });
  } catch (error) {
    return next(error);
  }
});

router.get("/:token", async (req, res, next) => {
  try {
    const token = req.params.token;
    if (!tokenRegex.test(token)) return res.status(403).json({ error: "Invalid link." });
    const providedPassword = req.header("x-access-password") || req.query.password || "";
    const share = await Share.findOne({ token });

    if (!share) return res.status(403).json({ error: "Invalid link." });
    if (isExpired(share)) return res.status(410).json({ error: "Link expired." });
    if (isAccessDeniedForOneTime(share)) return res.status(410).json({ error: "Link already used." });
    if (isAccessDeniedForMaxViews(share)) return res.status(410).json({ error: "Maximum views reached." });

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
    if (!tokenRegex.test(token)) return res.status(403).json({ error: "Invalid link." });
    const providedPassword = req.header("x-access-password") || req.query.password || "";
    const share = await Share.findOne({ token });

    if (!share) return res.status(403).json({ error: "Invalid link." });
    if (share.type !== "file") return res.status(400).json({ error: "This link does not contain a file." });
    if (isExpired(share)) return res.status(410).json({ error: "Link expired." });
    if (isAccessDeniedForOneTime(share)) return res.status(410).json({ error: "Link already used." });
    if (isAccessDeniedForMaxViews(share)) return res.status(410).json({ error: "Maximum views reached." });

    const passwordCheck = validatePassword(share, providedPassword);
    if (!passwordCheck.ok) {
      return res.status(401).json({
        error: passwordCheck.reason === "missing" ? "Password required." : "Invalid password.",
        passwordRequired: true
      });
    }

    share.downloadCount += 1;
    await share.save();

    return res.download(path.resolve(share.file.path), share.file.originalName);
  } catch (error) {
    return next(error);
  }
});

export default router;

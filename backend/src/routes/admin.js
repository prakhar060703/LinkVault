import express from "express";
import { requireAdmin, requireAuth } from "../auth.js";
import { User } from "../models/User.js";
import { Share } from "../models/Share.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

const toShareItem = (share) => ({
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
  owner: share.owner
    ? {
        id: share.owner._id,
        name: share.owner.name,
        email: share.owner.email,
        role: share.owner.role
      }
    : null,
  viewCount: share.viewCount,
  downloadCount: share.downloadCount,
  maxViews: share.maxViews,
  oneTimeView: share.oneTimeView,
  reportCount: share.reports.length,
  expiresAt: share.expiresAt,
  createdAt: share.createdAt
});

router.get("/users", async (_req, res, next) => {
  try {
    const roleFilter = String(_req.query.role || "all");
    const userQuery = roleFilter === "all" ? {} : { role: roleFilter };
    const users = await User.find(userQuery).sort({ createdAt: -1 }).lean();
    const userIds = users.map((u) => u._id);

    const shareStats = await Share.aggregate([
      { $match: { owner: { $in: userIds } } },
      {
        $group: {
          _id: "$owner",
          shareCount: { $sum: 1 },
          totalViews: { $sum: { $add: ["$viewCount", "$downloadCount"] } }
        }
      }
    ]);

    const statsMap = new Map(shareStats.map((entry) => [String(entry._id), entry]));

    return res.status(200).json({
      items: users.map((user) => {
        const stats = statsMap.get(String(user._id)) || { shareCount: 0, totalViews: 0 };
        return {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          shareCount: stats.shareCount,
          totalViews: stats.totalViews,
          createdAt: user.createdAt
        };
      })
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/users/:userId/shares", async (req, res, next) => {
  try {
    const shares = await Share.find({ owner: req.params.userId }).populate("owner", "name email role").sort({ createdAt: -1 });
    return res.status(200).json({
      items: shares.map(toShareItem)
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/shares", async (req, res, next) => {
  try {
    const ownerRole = String(req.query.ownerRole || "all");
    const shares = await Share.find({})
      .populate("owner", "name email role")
      .sort({ createdAt: -1 });

    const filtered = shares.filter((share) => {
      if (ownerRole === "all") return true;
      return share.owner?.role === ownerRole;
    });

    return res.status(200).json({ items: filtered.map(toShareItem) });
  } catch (error) {
    return next(error);
  }
});

router.get("/reported", async (_req, res, next) => {
  try {
    const shares = await Share.find({ "reports.0": { $exists: true } })
      .populate("owner", "name email role")
      .sort({});

    const sorted = shares.sort((a, b) => {
      const reportDelta = b.reports.length - a.reports.length;
      if (reportDelta !== 0) return reportDelta;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return res.status(200).json({ items: sorted.map(toShareItem) });
  } catch (error) {
    return next(error);
  }
});

export default router;

import fs from "fs/promises";
import path from "path";
import { Share } from "../models/Share.js";

const CLEANUP_INTERVAL_MS = 60 * 1000;
const CLEANUP_BATCH_SIZE = 200;

const removeFileIfPresent = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(path.resolve(filePath));
  } catch (_error) {
    // Ignore missing files or transient FS cleanup issues.
  }
};

const cleanupExpiredShares = async () => {
  const now = new Date();
  const expired = await Share.find({ expiresAt: { $lte: now } }).limit(CLEANUP_BATCH_SIZE);
  if (!expired.length) return;

  for (const share of expired) {
    if (share.type === "file" && share.file?.path) {
      await removeFileIfPresent(share.file.path);
    }
  }

  await Share.deleteMany({ _id: { $in: expired.map((share) => share._id) } });
};

export const startExpiredShareCleanupJob = () => {
  // Run once at startup so stale records/files are cleaned immediately.
  cleanupExpiredShares().catch((error) => {
    console.error("Initial expired share cleanup failed:", error);
  });

  setInterval(() => {
    cleanupExpiredShares().catch((error) => {
      console.error("Expired share cleanup failed:", error);
    });
  }, CLEANUP_INTERVAL_MS);
};

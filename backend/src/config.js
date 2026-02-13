import dotenv from "dotenv";

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: toInt(process.env.PORT, 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/linkvault",
  baseUrl: process.env.BASE_URL || "http://localhost:4000",
  defaultExpiryMinutes: toInt(process.env.DEFAULT_EXPIRY_MINUTES, 30),
  maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE_MB, 20) * 1024 * 1024,
  uploadDir: process.env.UPLOAD_DIR || "uploads"
};

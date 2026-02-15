import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import express from "express";
import { config } from "./config.js";
import sharesRouter from "./routes/shares.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import { errorHandler, notFoundHandler } from "./middleware.js";
import { User } from "./models/User.js";
import { hashPassword } from "./utils/security.js";

const app = express();

if (!fs.existsSync(path.resolve(config.uploadDir))) {
  fs.mkdirSync(path.resolve(config.uploadDir), { recursive: true });
}

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  return res.status(200).json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/shares", sharesRouter);
app.use("/api/admin", adminRouter);
app.use(notFoundHandler);
app.use(errorHandler);

const ensureAdminUser = async () => {
  const existing = await User.findOne({ email: config.adminEmail });
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
    }
    return;
  }

  const { hash, salt } = hashPassword(config.adminPassword);
  await User.create({
    name: "Admin",
    email: config.adminEmail,
    passwordHash: hash,
    passwordSalt: salt,
    role: "admin"
  });
};

const start = async () => {
  await mongoose.connect(config.mongoUri);
  await ensureAdminUser();
  app.listen(config.port, () => {
    console.log(`Backend listening at http://localhost:${config.port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

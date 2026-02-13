import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import express from "express";
import { config } from "./config.js";
import sharesRouter from "./routes/shares.js";
import { errorHandler, notFoundHandler } from "./middleware.js";

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

app.use("/api/shares", sharesRouter);
app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  await mongoose.connect(config.mongoUri);
  app.listen(config.port, () => {
    console.log(`Backend listening at http://localhost:${config.port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

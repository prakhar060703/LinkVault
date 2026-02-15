import crypto from "crypto";
import jwt from "jsonwebtoken";

const KEY_LENGTH = 64;

export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return { hash, salt };
};

export const verifyPassword = (password, salt, expectedHash) => {
  if (!salt || !expectedHash) return false;
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
};

export const generateToken = () => crypto.randomBytes(16).toString("hex");

export const signAuthToken = ({ userId, role }, jwtSecret) =>
  jwt.sign({ sub: userId, role }, jwtSecret, { expiresIn: "7d" });

export const verifyAuthToken = (token, jwtSecret) => jwt.verify(token, jwtSecret);

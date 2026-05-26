import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const ACCESS_SECRET = "site-network-access-secret-key-2024";
const REFRESH_SECRET = "site-network-refresh-secret-key-2024";
const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY = "7d";

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function generateAccessToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function generateRefreshToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch {
    return null;
  }
}

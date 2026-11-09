import crypto from "crypto";

export function newId(prefix = "") {
  return prefix + crypto.randomBytes(9).toString("base64url");
}

export function nowISO() {
  return new Date().toISOString();
}

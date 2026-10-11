import { randomUUID } from "node:crypto";

export function createOrderNumber(now = Date.now(), uuid = randomUUID()) {
  return `NO-${now.toString(36).toUpperCase()}-${uuid.slice(0, 8).toUpperCase()}`;
}

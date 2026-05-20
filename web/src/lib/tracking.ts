import { createHmac } from "node:crypto";

const SECRET = process.env.BETTER_AUTH_SECRET ?? "dev-secret";

export function signToken(payload: string) {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function trackingPixelUrl(messageId: string) {
  const base = process.env.TRACKING_DOMAIN
    ? `https://${process.env.TRACKING_DOMAIN}`
    : process.env.APP_URL ?? "http://localhost:3000";
  const sig = signToken(`open:${messageId}`);
  return `${base}/t/open/${messageId}.gif?s=${sig}`;
}

export function trackingClickUrl(messageId: string, url: string) {
  const base = process.env.TRACKING_DOMAIN
    ? `https://${process.env.TRACKING_DOMAIN}`
    : process.env.APP_URL ?? "http://localhost:3000";
  const encoded = Buffer.from(url, "utf8").toString("base64url");
  const sig = signToken(`click:${messageId}:${encoded}`);
  return `${base}/t/click/${messageId}?u=${encoded}&s=${sig}`;
}

export function unsubscribeUrl(messageId: string, subscriberId: string) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const sig = signToken(`unsub:${messageId}:${subscriberId}`);
  return `${base}/u/${subscriberId}?m=${messageId}&s=${sig}`;
}

export function injectTracking(html: string, messageId: string, subscriberId: string) {
  const linkRegex = /href=(["'])(https?:\/\/[^"']+)\1/g;
  const rewritten = html.replace(linkRegex, (_m, q, url) => {
    return `href=${q}${trackingClickUrl(messageId, url)}${q}`;
  });
  const pixel = `<img src="${trackingPixelUrl(messageId)}" width="1" height="1" alt="" style="display:none" />`;
  const unsub = unsubscribeUrl(messageId, subscriberId);
  const footer = `<div style="margin-top:24px;font-size:12px;color:#666;text-align:center"><a href="${unsub}">Unsubscribe</a></div>`;
  if (rewritten.includes("</body>")) {
    return rewritten.replace("</body>", `${footer}${pixel}</body>`);
  }
  return rewritten + footer + pixel;
}

export function verifyToken(payload: string, sig: string) {
  return signToken(payload) === sig;
}

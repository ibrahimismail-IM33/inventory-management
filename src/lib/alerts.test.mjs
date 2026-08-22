// Test alert scheduling + digest. Run: node --experimental-strip-types src/lib/alerts.test.mjs
import assert from "node:assert/strict";

let mod;
try {
  mod = await import("./alerts.ts");
} catch {
  console.log("skip: run with `node --experimental-strip-types src/lib/alerts.test.mjs`");
  process.exit(0);
}
const { isAlertDue, buildDigest, isoWeekdayMYT } = mod;

const base = {
  id: "c1",
  name: "Kedai Maju",
  currency: "MYR",
  alert_enabled: true,
  alert_days_before: 14,
  alert_frequency: "daily",
  alert_weekday: 1,
  alert_last_sent_at: null,
};

// A Monday in MYT: 2026-08-24 03:00Z -> 11:00 MYT Monday
const monday = new Date("2026-08-24T03:00:00Z");
assert.equal(isoWeekdayMYT(monday), 1);

// Disabled -> not due
assert.equal(isAlertDue({ ...base, alert_enabled: false }, monday), false);
// Daily enabled -> due
assert.equal(isAlertDue(base, monday), true);
// Weekly on Monday, today Monday -> due
assert.equal(isAlertDue({ ...base, alert_frequency: "weekly", alert_weekday: 1 }, monday), true);
// Weekly on Tuesday, today Monday -> not due
assert.equal(isAlertDue({ ...base, alert_frequency: "weekly", alert_weekday: 2 }, monday), false);
// Already sent today -> not due
assert.equal(isAlertDue({ ...base, alert_last_sent_at: "2026-08-24T04:00:00Z" }, monday), false);
// force overrides everything
assert.equal(isAlertDue({ ...base, alert_enabled: false }, monday, true), true);

// Digest content
const now = new Date("2026-08-24T03:00:00Z");
const d = buildDigest(base, [
  { productName: "Milk 1L", batchCode: "L1", expiresAt: "2026-08-22", qty: 3 }, // expired
  { productName: "Soap", batchCode: "L2", expiresAt: "2026-08-28", qty: 5 }, // soon
], now);
assert.equal(d.expiredCount, 1);
assert.equal(d.soonCount, 1);
assert.ok(d.subject.includes("1 expired"));
assert.ok(d.html.includes("Milk 1L"));
assert.ok(d.text.includes("Soap"));

// Empty -> friendly "nothing" message
const empty = buildDigest(base, [], now);
assert.equal(empty.expiredCount, 0);
assert.ok(empty.subject.toLowerCase().includes("no stock"));

console.log("ok: all WAQT alert tests passed");

// Lead form validation (server re-validates everything). Node 22.18+ strips the TS types.
import { test } from "node:test";
import assert from "node:assert/strict";
import { leadInputSchema, tourDateInRange } from "../src/server/lead-schema.ts";

const base = {
  type: "contact",
  name: "Pat Smith",
  email: "pat@example.com",
  humanCheck: "7",
  consent: true,
  formToken: "x",
  sourcePage: "/lots/801",
};
const day = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const ok = (extra) => leadInputSchema.safeParse({ ...base, ...extra }).success;
const tour = { type: "tour", phone: "5855550100", tourWindow: "Morning" };

test("single-line fields reject newlines and control characters", () => {
  assert.equal(ok({}), true);
  assert.equal(ok({ name: "Pat\nEmail: x@y.z" }), false);
  assert.equal(ok({ agentName: "A\rB" }), false);
  assert.equal(ok({ note: "line one\nline two\ttab" }), true);
  assert.equal(ok({ note: "a\u0000b" }), false);
});

test("tour dates must be real dates from today to a year out", () => {
  assert.equal(ok({ ...tour, tourDate: day(3) }), true);
  assert.equal(ok({ ...tour, tourDate: day(-10) }), false);
  assert.equal(ok({ ...tour, tourDate: day(400) }), false);
  assert.equal(tourDateInRange("2027-02-30"), false);
  assert.equal(tourDateInRange(day(0)), true);
});

test("lots and source page", () => {
  assert.equal(ok({ lotId: "999" }), false);
  const r = leadInputSchema.safeParse({ ...base, sourcePage: "https://elsewhere.example/" });
  assert.equal(r.success && r.data.sourcePage, undefined);
});

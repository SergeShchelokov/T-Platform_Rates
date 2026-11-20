import { test } from "node:test";
import assert from "node:assert/strict";
import {
  moneyToCents,
  draftTotal,
  validDate,
  versionErrors,
  currentVersion,
  upcomingVersion,
  lockReason,
  newVersionDraft,
  savedVersion,
} from "../src/domain.mjs";

test("money parsing and totals preserve kopecks and allow a zero price", () => {
  assert.equal(moneyToCents("1 234,56 ₽"), 123456);
  assert.equal(moneyToCents("0"), 0);
  assert.equal(moneyToCents("-10"), null);
  assert.equal(moneyToCents("12.001"), null);
  assert.equal(moneyToCents("Infinity"), null);
  assert.equal(
    draftTotal({
      price: "900",
      services: [{ price: "0,10" }, { price: "0,20" }],
    }),
    30,
  );
});

test("dates reject invalid, past and occupied dates but allow editing the same version", () => {
  assert.equal(validDate("2026-02-30"), false);
  const versions = [{ id: "one", date: "2026-12-01" }];
  const draft = { id: "", date: "2026-12-01", price: "300", services: [] };
  assert.ok(versionErrors(draft, versions, "2026-11-20").date);
  assert.deepEqual(
    versionErrors({ ...draft, id: "one" }, versions, "2026-11-20"),
    {},
  );
  assert.ok(
    versionErrors({ ...draft, date: "2026-11-19" }, [], "2026-11-20").date,
  );
  assert.deepEqual(
    versionErrors({ ...draft, date: "2026-11-20" }, [], "2026-11-20"),
    {},
  );
  assert.ok(
    versionErrors(
      { ...draft, services: [{ id: "s", name: "", price: "1" }] },
      [],
      "2026-11-20",
    )["name-s"],
  );
});

test("effective conditions update after deletion and future versions are never active early", () => {
  const previous = { id: "old", date: "2026-11-01", calculated: false };
  const current = { id: "current", date: "2026-11-20", calculated: false };
  const future = { id: "future", date: "2026-12-01", calculated: false };
  assert.equal(
    currentVersion({ versions: [previous, future, current] }, "2026-11-20"),
    current,
  );
  assert.equal(
    currentVersion({ versions: [previous, future] }, "2026-11-20"),
    previous,
  );
  assert.equal(currentVersion({ versions: [future] }, "2026-11-20"), undefined);
  assert.equal(upcomingVersion({ versions: [future] }, "2026-11-20"), future);
  assert.ok(lockReason(previous, "2026-11-20"));
  assert.ok(lockReason({ ...current, calculated: true }, "2026-11-20"));
  assert.equal(lockReason(current, "2026-11-20"), "");
});

test("new versions copy current prices and services without sharing rows or a date", () => {
  const source = {
    id: "v",
    date: "2026-11-20",
    priceCents: 3000,
    services: [{ id: "s", name: "ФЛАЙТ", priceCents: 3000 }],
  };
  const draft = newVersionDraft(source);
  assert.equal(draft.date, "");
  draft.services[0].name = "Другая услуга";
  assert.equal(source.services[0].name, "ФЛАЙТ");
  draft.date = "2026-12-01";
  assert.equal(savedVersion(draft).priceCents, 3000);
});

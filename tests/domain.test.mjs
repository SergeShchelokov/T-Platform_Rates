import { test } from "node:test";
import assert from "node:assert/strict";
import { demoRates } from "../src/demo.mjs";
import {
  moneyToCents,
  maskPrice,
  draftTotal,
  validDate,
  versionErrors,
  currentVersion,
  upcomingVersion,
  objectCount,
  dailyAmount,
  isRate,
  lockReason,
  versionDeletionReason,
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

test("price input accepts numeric money and rejects letters, signs and extra decimals", () => {
  assert.equal(maskPrice(""), "");
  assert.equal(maskPrice("30"), "30");
  assert.equal(maskPrice("30,50"), "30,50");
  assert.equal(maskPrice("30.50"), "30,50");
  assert.equal(maskPrice("1 234,56 ₽"), "1234,56");
  for (const value of [
    "abc",
    "30руб",
    "-30",
    "+30",
    "1e3",
    "30,500",
    "1,2,3",
    "123456789",
  ]) {
    assert.equal(maskPrice(value), null);
  }
});

test("dates reject invalid, past and occupied dates but allow editing the same version", () => {
  const emptyDraft = newVersionDraft();
  assert.ok(versionErrors(emptyDraft, [], "2026-11-20").date);
  assert.ok(versionErrors(emptyDraft, [], "2026-11-20").price);
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

test("deletion cannot leave a tariff without versions, while eligible versions remain removable", () => {
  const current = { id: "current", date: "2026-11-20", calculated: false };
  const future = { id: "future", date: "2026-12-01", calculated: false };
  for (const version of [current, future]) {
    assert.match(
      versionDeletionReason({ versions: [version] }, version, "2026-11-20"),
      /единственную версию/,
    );
  }
  const rate = { versions: [current, future] };
  assert.equal(versionDeletionReason(rate, current, "2026-11-20"), "");
  assert.equal(versionDeletionReason(rate, future, "2026-11-20"), "");
  assert.match(
    versionDeletionReason(rate, { ...current, calculated: true }, "2026-11-20"),
    /выполнен расчёт/,
  );
  assert.match(
    versionDeletionReason(
      rate,
      { ...current, date: "2026-11-19" },
      "2026-11-20",
    ),
    /прошла/,
  );
  const remaining = {
    versions: rate.versions.filter((version) => version.id !== current.id),
  };
  assert.match(
    versionDeletionReason(remaining, future, "2026-11-20"),
    /единственную версию/,
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

test("daily amount uses the effective price and the total objects in assigned organizations", () => {
  const current = {
    id: "current",
    date: "2026-11-20",
    priceCents: 3000,
    calculated: false,
    services: [],
  };
  const future = {
    ...current,
    id: "future",
    date: "2026-12-01",
    priceCents: 3550,
  };
  const rate = {
    id: "rate",
    name: "ФЛАЙТ",
    comment: "",
    versions: [future, current],
    organizations: [
      { id: "one", name: "АгроВектор", objects: 12 },
      { id: "two", name: "ТрансЛогистика", objects: 8 },
      { id: "three", name: "УралАгро", objects: 5 },
    ],
  };
  assert.equal(objectCount(rate), 25);
  assert.equal(dailyAmount(rate, "2026-11-19"), 0);
  assert.equal(dailyAmount(rate, "2026-11-20"), 75000);
  assert.equal(dailyAmount(rate, "2026-12-01"), 88750);
  assert.equal(dailyAmount({ ...rate, organizations: [] }, "2026-11-20"), 0);
  assert.equal(dailyAmount({ ...rate, versions: [] }, "2026-11-20"), 0);
  assert.equal(dailyAmount({ ...rate, versions: [future] }, "2026-11-20"), 0);
  assert.equal(isRate(rate), true);
  assert.equal(isRate({ ...rate, organizations: undefined }), true);
  assert.equal(
    isRate({
      ...rate,
      organizations: [{ ...rate.organizations[0], objects: -1 }],
    }),
    false,
  );
});

test("demo tariffs have two effective and one future tariff, three consistent versions each", () => {
  const day = "2026-11-20";
  const examples = demoRates(day);
  assert.equal(examples.length, 3);
  assert.equal(examples.filter((rate) => currentVersion(rate, day)).length, 2);
  assert.equal(
    examples.filter(
      (rate) => !currentVersion(rate, day) && upcomingVersion(rate, day),
    ).length,
    1,
  );
  assert.deepEqual(
    examples.map((rate) => dailyAmount(rate, day)),
    [75000, 48000, 0],
  );
  for (const rate of examples) {
    assert.ok(isRate(rate));
    assert.equal(rate.versions.length, 3);
    assert.equal(new Set(rate.versions.map((version) => version.date)).size, 3);
    for (const version of rate.versions) {
      assert.ok(validDate(version.date));
      if (version.services.length) {
        assert.equal(
          version.priceCents,
          version.services.reduce((sum, row) => sum + row.priceCents, 0),
        );
      }
    }
  }
});

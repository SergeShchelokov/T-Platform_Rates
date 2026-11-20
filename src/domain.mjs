export function today() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Yekaterinburg",
  }).format(new Date());
}

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

export function moneyToCents(value) {
  const normalized = String(value).replace(/[\s₽]/g, "").replace(",", ".");
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function money(cents, fractions = true) {
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: fractions ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)} ₽`;
}

export function formatDate(value) {
  if (!validDate(value)) return "—";
  return value.split("-").reverse().join(".");
}

export function orderedVersions(rate) {
  return [...rate.versions].sort((a, b) => b.date.localeCompare(a.date));
}

export function currentVersion(rate, day = today()) {
  return orderedVersions(rate).find((version) => version.date <= day);
}

export function upcomingVersion(rate, day = today()) {
  return [...rate.versions]
    .filter((version) => version.date > day)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

export function lockReason(version, day = today()) {
  if (version.date < day) return "Дата начала действия прошла";
  if (version.calculated) return "По версии уже выполнен расчёт";
  return "";
}

export function versionErrors(draft, versions = [], day = today()) {
  /** @type {Record<string, string>} */
  const errors = {};
  if (!validDate(draft.date)) errors.date = "Выберите дату начала действия";
  else if (draft.date < day)
    errors.date = "Выберите сегодняшнюю или будущую дату";
  else if (
    versions.some(
      (version) => version.id !== draft.id && version.date === draft.date,
    )
  ) {
    errors.date = "На эту дату уже есть версия тарифа. Выберите другую дату";
  }
  if (draft.services.length === 0 && moneyToCents(draft.price) === null) {
    errors.price = "Введите сумму от 0 до 99 999 999,99 ₽";
  }
  for (const service of draft.services) {
    if (!service.name.trim())
      errors[`name-${service.id}`] = "Введите название услуги";
    if (moneyToCents(service.price) === null)
      errors[`price-${service.id}`] = "Введите корректную цену";
  }
  return errors;
}

export function draftTotal(draft) {
  if (draft.services.length === 0) return moneyToCents(draft.price) ?? 0;
  return draft.services.reduce(
    (sum, service) => sum + (moneyToCents(service.price) ?? 0),
    0,
  );
}

export function newVersionDraft(version) {
  return {
    id: "",
    date: "",
    price: version
      ? (version.priceCents / 100).toFixed(2).replace(".", ",")
      : "",
    services: (version?.services ?? []).map((service) => ({
      id: crypto.randomUUID(),
      name: service.name,
      price: (service.priceCents / 100).toFixed(2).replace(".", ","),
    })),
  };
}

export function savedVersion(draft) {
  return {
    id: draft.id || crypto.randomUUID(),
    date: draft.date,
    priceCents: draftTotal(draft),
    calculated: false,
    services: draft.services.map((service) => ({
      id: service.id,
      name: service.name.trim(),
      priceCents: moneyToCents(service.price),
    })),
  };
}

export function isRate(value) {
  return (
    value &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.comment === "string" &&
    Array.isArray(value.versions) &&
    value.versions.every(
      (version) =>
        validDate(version.date) &&
        typeof version.id === "string" &&
        Number.isSafeInteger(version.priceCents) &&
        version.priceCents >= 0 &&
        typeof version.calculated === "boolean" &&
        Array.isArray(version.services) &&
        version.services.every(
          (service) =>
            typeof service.id === "string" &&
            typeof service.name === "string" &&
            Number.isSafeInteger(service.priceCents) &&
            service.priceCents >= 0,
        ),
    )
  );
}

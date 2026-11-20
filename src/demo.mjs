import { today } from "./domain.mjs";

export function demoRates(day = today()) {
  const date = (offset) => {
    const value = new Date(`${day}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  };
  const version = (id, offset, priceCents, services = []) => ({
    id,
    date: date(offset),
    priceCents,
    calculated: offset < 0,
    services: services.map(([name, priceCents], index) => ({
      id: `${id}-${index}`,
      name,
      priceCents,
    })),
  });
  return [
    {
      id: "demo-flight",
      name: "ФЛАЙТ + контроль топлива",
      comment:
        "Доступ к сервису ФЛАЙТ и контроль расхода топлива: заправки, сливы и отчёты по каждому объекту. Настройка и сопровождение включены.",
      organizations: [
        { id: "demo-agro", name: "ООО «АгроВектор»", objects: 12 },
        { id: "demo-logistics", name: "ООО «ТрансЛогистика»", objects: 8 },
        { id: "demo-ural", name: "ООО «УралАгро»", objects: 5 },
      ],
      versions: [
        version("flight-1", -60, 2000, [
          ["Доступ к ФЛАЙТ", 1000],
          ["Контроль топлива", 1000],
        ]),
        version("flight-2", -30, 2500, [
          ["Доступ к ФЛАЙТ", 1500],
          ["Контроль топлива", 1000],
        ]),
        version("flight-3", 0, 3000, [
          ["Доступ к ФЛАЙТ", 1500],
          ["Контроль топлива", 1500],
        ]),
      ],
    },
    {
      id: "demo-autograph",
      name: "АвтоГРАФ.WEB — мониторинг",
      comment:
        "Базовый спутниковый мониторинг автопарка в АвтоГРАФ.WEB: местоположение, история маршрутов, пробег и уведомления о событиях.",
      organizations: [
        { id: "demo-trans", name: "ООО «ВекторТранс»", objects: 21 },
        { id: "demo-cargo", name: "ООО «УралКарго»", objects: 19 },
      ],
      versions: [
        version("autograph-1", -45, 800),
        version("autograph-2", -15, 1000),
        version("autograph-3", 0, 1200),
      ],
    },
    {
      id: "demo-agro",
      name: "Агросервисы — сезонный контроль",
      comment:
        "Мониторинг полевых работ: обработанная площадь, работа техники и расход топлива. Тариф подготовлен для подключения хозяйств к новому сезону.",
      organizations: [
        { id: "demo-fields", name: "ООО «Новые поля»", objects: 11 },
        { id: "demo-harvest", name: "ООО «Урожай»", objects: 7 },
      ],
      versions: [
        version("agro-1", 7, 4000, [
          ["Учёт полевых работ", 2500],
          ["Контроль топлива", 1500],
        ]),
        version("agro-2", 37, 4500, [
          ["Учёт полевых работ", 3000],
          ["Контроль топлива", 1500],
        ]),
        version("agro-3", 67, 5000, [
          ["Учёт полевых работ", 3000],
          ["Контроль топлива", 2000],
        ]),
      ],
    },
  ];
}

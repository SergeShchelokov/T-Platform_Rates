<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { useStorage, useTimer } from "@vuetify/v0";
import { Button, Dialog, Tabs } from "@vuetify/v0/components";
import Icon from "./components/Icon.vue";
import VersionFields from "./components/VersionFields.vue";
import RateDetails from "./components/RateDetails.vue";
import { demoRates } from "./demo.mjs";
import brand from "./assets/brand.png";
import type { Rate, Version, VersionDraft } from "./types";
import {
  today,
  money,
  formatDate,
  currentVersion,
  upcomingVersion,
  objectCount,
  dailyAmount,
  orderedVersions,
  lockReason,
  versionDeletionReason,
  versionErrors,
  newVersionDraft,
  savedVersion,
  isRate,
} from "./domain.mjs";

const rates = useStorage().get<Rate[]>("rates-v1", []);
const storageError = shallowRef("");
if (!Array.isArray(rates.value) || !rates.value.every(isRate)) {
  storageError.value =
    "Не удалось прочитать сохранённые тарифы. Сохранённые данные доступны в хранилище браузера.";
} else {
  const populatedRates = rates.value.filter((rate) => rate.versions.length > 0);
  const missingExamples = demoRates().filter(
    (example) => !populatedRates.some((rate) => rate.id === example.id),
  );
  if (missingExamples.length || populatedRates.length !== rates.value.length)
    rates.value = [...missingExamples, ...populatedRates];
}
const day = shallowRef(today());
useTimer(
  () => {
    day.value = today();
  },
  { duration: 60_000, repeat: true },
).start();
const collapsed = shallowRef(false);
const view = shallowRef("table");
const search = shallowRef("");
const mainOpen = shallowRef(false);
const nestedOpen = shallowRef(false);
const deleteOpen = shallowRef(false);
const tab = shallowRef("parameters");
const selectedId = shallowRef("");
const creating = shallowRef(false);
const name = shallowRef("");
const comment = shallowRef("");
const draft = ref<VersionDraft>(newVersionDraft());
const errors = ref<Record<string, string>>({});
const attempted = shallowRef(false);
const deletingId = shallowRef("");
const notification = shallowRef("");
const notificationTimer = useTimer(
  () => {
    notification.value = "";
  },
  { duration: 5000 },
);

const selected = computed(() =>
  !storageError.value
    ? rates.value.find((rate) => rate.id === selectedId.value)
    : undefined,
);
const active = computed(() =>
  selected.value
    ? (currentVersion(selected.value, day.value) as Version | undefined)
    : undefined,
);
const pending = computed(() =>
  selected.value
    ? (upcomingVersion(selected.value, day.value) as Version | undefined)
    : undefined,
);
const shownVersion = computed(() => active.value ?? pending.value);
const deleting = computed(() =>
  selected.value?.versions.find((version) => version.id === deletingId.value),
);
const filtered = computed(() =>
  storageError.value
    ? []
    : rates.value.filter((rate) =>
        `${rate.name} ${rate.comment}`
          .toLocaleLowerCase("ru")
          .includes(search.value.trim().toLocaleLowerCase("ru")),
      ),
);
const versionList = computed(() =>
  selected.value ? (orderedVersions(selected.value) as Version[]) : [],
);
const selectedTitle = computed(() =>
  creating.value
    ? name.value.trim() || "Новый тариф"
    : (selected.value?.name ?? ""),
);
const editorFilled = computed(
  () =>
    !!draft.value.date &&
    (draft.value.services.length > 0
      ? draft.value.services.every(
          (service) => service.name.trim() && service.price.trim(),
        )
      : !!draft.value.price.trim()),
);
const navItems = [
  ["organizations", "Организации"],
  ["shield", "Пользователи"],
  ["shield", "Роли"],
  ["services", "Сервисы"],
  ["shield", "Биллинг"],
  ["shield", "Категории объектов"],
  ["repeat", "Ретрансляторы"],
  ["transcoders", "Транскодеры"],
  ["rates", "Тарифы"],
  ["trash", "Корзина"],
];

function notify(message: string) {
  notification.value = message;
  notificationTimer.start();
}
function openCreate() {
  creating.value = true;
  selectedId.value = "";
  name.value = "";
  comment.value = "";
  tab.value = "parameters";
  draft.value = newVersionDraft();
  errors.value = {};
  attempted.value = false;
  mainOpen.value = true;
}
function openRate(rate: Rate) {
  selectedId.value = rate.id;
  creating.value = false;
  name.value = rate.name;
  comment.value = rate.comment;
  tab.value = "parameters";
  errors.value = {};
  attempted.value = false;
  mainOpen.value = true;
}
function beginVersion(version?: Version) {
  if (version && lockReason(version, today()))
    return notify(lockReason(version, today()));
  name.value = selected.value!.name;
  comment.value = selected.value!.comment;
  draft.value = newVersionDraft(version ?? active.value);
  if (version) {
    draft.value.id = version.id;
    draft.value.date = version.date;
  }
  errors.value = {};
  attempted.value = false;
  nestedOpen.value = true;
}
function validate() {
  const result = versionErrors(
    draft.value,
    selected.value?.versions ?? [],
    today(),
  ) as Record<string, string>;
  if (!name.value.trim()) result.name = "Введите название тарифа";
  return result;
}
watch(
  draft,
  () => {
    if (attempted.value) errors.value = validate();
  },
  { deep: true },
);
function saveRate() {
  attempted.value = true;
  errors.value = validate();
  if (Object.keys(errors.value).length) {
    tab.value = "parameters";
    return;
  }
  if (creating.value) {
    const rate: Rate = {
      id: crypto.randomUUID(),
      name: name.value.trim(),
      comment: comment.value.trim(),
      versions: [savedVersion(draft.value)],
      organizations: [],
    };
    rates.value = [...rates.value, rate];
    selectedId.value = rate.id;
    creating.value = false;
    day.value = today();
    mainOpen.value = false;
    search.value = "";
    notify(`Тариф «${rate.name}» создан`);
  }
}
function saveVersion() {
  attempted.value = true;
  errors.value = validate();
  const existing = selected.value?.versions.find(
    (version) => version.id === draft.value.id,
  );
  if (existing && lockReason(existing, today()))
    return notify(lockReason(existing, today()));
  if (Object.keys(errors.value).length || !selected.value) return;
  const version = savedVersion(draft.value);
  selected.value.name = name.value.trim();
  selected.value.comment = comment.value.trim();
  selected.value.versions = [
    ...selected.value.versions.filter((row) => row.id !== version.id),
    version,
  ];
  nestedOpen.value = false;
  day.value = today();
  tab.value = "history";
  notify(existing ? "Версия обновлена" : "Новая версия тарифа создана");
}
function requestDelete(version: Version) {
  if (!selected.value) return;
  const reason = versionDeletionReason(selected.value, version, today());
  if (reason) return notify(reason);
  deletingId.value = version.id;
  deleteOpen.value = true;
}
function removeVersion() {
  if (!selected.value || !deleting.value) return;
  const reason = versionDeletionReason(selected.value, deleting.value, today());
  if (reason) {
    deleteOpen.value = false;
    return notify(reason);
  }
  selected.value.versions = selected.value.versions.filter(
    (version) => version.id !== deletingId.value,
  );
  deleteOpen.value = false;
  notify("Версия тарифа удалена");
}
function versionLabel(version: Version) {
  if (version.date > day.value)
    return `Начнёт действовать с ${formatDate(version.date)}`;
  if (version.id === active.value?.id)
    return `Действует с ${formatDate(version.date)}`;
  const next = [...(selected.value?.versions ?? [])]
    .filter((row) => row.date > version.date && row.date <= day.value)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return `Не действует с ${formatDate(next?.date ?? version.date)}`;
}
function listVersion(rate: Rate) {
  return currentVersion(rate, day.value) ?? upcomingVersion(rate, day.value);
}
function stateLabel(rate: Rate) {
  if (currentVersion(rate, day.value)) return "Действует";
  return upcomingVersion(rate, day.value) ? "Запланирован" : "Нет версии";
}
</script>

<template>
  <div class="application" :class="{ collapsed }">
    <aside class="sidebar" aria-label="Навигация">
      <a class="brand" href="#" aria-label="Т.Платформа — тарифы"
        ><span class="brand-image"
          ><img :src="brand" alt="Т.Платформа" width="178" height="24" /></span
      ></a>
      <nav>
        <template v-for="[icon, label] in navItems" :key="label">
          <Button.Root
            v-if="label === 'Тарифы'"
            class="nav-item current"
            :aria-label="label"
            aria-current="page"
            @click="mainOpen = false"
            ><Icon :name="icon!" /><span>{{ label }}</span></Button.Root
          >
          <span v-else class="nav-item" :title="`${label} — раздел платформы`"
            ><Icon :name="icon!" /><span>{{ label }}</span></span
          >
        </template>
      </nav>
      <div class="sidebar-links">
        <a
          href="https://soft.glonassgps.com/contacts/"
          target="_blank"
          rel="noreferrer"
          ><Icon name="phone" /><span>Контакты</span><Icon name="chevron" /></a
        ><a href="https://help.tk-nav.ru/" target="_blank" rel="noreferrer"
          ><Icon name="support" /><span>Поддержка</span><Icon name="chevron"
        /></a>
      </div>
      <Button.Root
        class="collapse-button"
        :aria-label="collapsed ? 'Развернуть меню' : 'Свернуть меню'"
        :aria-expanded="!collapsed"
        @click="collapsed = !collapsed"
        ><Icon name="menu" /><span>Свернуть</span></Button.Root
      >
    </aside>

    <main class="workspace">
      <header class="page-header">
        <h1>Тарифы</h1>
        <div class="account">
          <div class="balance">
            <Icon name="balance" /><span>Баланс: &nbsp;0 ₽</span>
          </div>
          <div class="section-account">
            <small>Секция</small><span>ГКХолдМегаМоллКомп</span>
          </div>
          <Icon name="chevron" /><span class="avatar">АК</span>
        </div>
      </header>
      <section class="content-panel" aria-label="Тарифы">
        <div v-if="storageError" class="storage-error" role="alert">
          {{ storageError }}
        </div>
        <div v-else-if="rates.length === 0" class="empty-state first-empty">
          <div class="empty-icon"><Icon name="empty" /></div>
          <h2>У вас не создано ни одного тарифа</h2>
          <Button.Root class="button primary" @click="openCreate"
            >Создать</Button.Root
          >
        </div>
        <template v-else>
          <div class="toolbar">
            <div class="search-field">
              <Icon name="search" /><input
                v-model="search"
                type="search"
                placeholder="Найти"
                aria-label="Найти тариф"
              />
            </div>
            <div class="toolbar-actions">
              <Button.Group
                v-model="view"
                mandatory
                class="view-toggle"
                label="Представление тарифов"
                ><Button.Root
                  class="icon-button"
                  :class="{ selected: view === 'cards' }"
                  value="cards"
                  aria-label="Карточки"
                  ><Icon name="cards" /></Button.Root
                ><Button.Root
                  class="icon-button"
                  :class="{ selected: view === 'table' }"
                  value="table"
                  aria-label="Таблица"
                  ><Icon name="table" /></Button.Root></Button.Group
              ><Button.Root class="button primary" @click="openCreate"
                ><Icon name="plus" />Создать</Button.Root
              >
            </div>
          </div>
          <div v-if="filtered.length === 0" class="empty-state search-empty">
            <div class="empty-icon"><Icon name="search" /></div>
            <h2>Тарифы не найдены</h2>
            <p>Попробуйте изменить поисковый запрос</p>
            <Button.Root class="button outlined" @click="search = ''"
              >Сбросить поиск</Button.Root
            >
          </div>
          <div v-else-if="view === 'table'" class="table-frame">
            <table class="rates-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Действует с</th>
                  <th class="numeric">За объект, ₽ / сутки</th>
                  <th class="numeric">Организации</th>
                  <th class="numeric">Объекты</th>
                  <th class="numeric">Всего, ₽ / сутки</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="rate in filtered"
                  :key="rate.id"
                  tabindex="0"
                  :aria-label="`Открыть тариф ${rate.name}`"
                  @click="openRate(rate)"
                  @keydown.enter="openRate(rate)"
                  @keydown.space.prevent="openRate(rate)"
                >
                  <td>{{ rate.name }}</td>
                  <td>
                    {{
                      listVersion(rate)
                        ? formatDate(listVersion(rate)!.date)
                        : "—"
                    }}
                  </td>
                  <td class="numeric">
                    {{
                      listVersion(rate)
                        ? money(listVersion(rate)!.priceCents, false)
                        : "—"
                    }}
                  </td>
                  <td class="numeric">{{ rate.organizations?.length ?? 0 }}</td>
                  <td class="numeric">{{ objectCount(rate) }}</td>
                  <td class="numeric">
                    {{ money(dailyAmount(rate, day), false) }}
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="
                        currentVersion(rate, day)
                          ? 'active'
                          : rate.versions.length
                            ? 'scheduled'
                            : 'neutral'
                      "
                      >{{ stateLabel(rate) }}</span
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="rates-grid">
            <Button.Root
              v-for="rate in filtered"
              :key="rate.id"
              class="rate-card"
              :aria-label="`Открыть тариф ${rate.name}`"
              @click="openRate(rate)"
              ><span
                class="badge"
                :class="
                  currentVersion(rate, day)
                    ? 'active'
                    : rate.versions.length
                      ? 'scheduled'
                      : 'neutral'
                "
                >{{ stateLabel(rate)
                }}{{
                  listVersion(rate)
                    ? ` с ${formatDate(listVersion(rate)!.date)}`
                    : ""
                }}</span
              >
              <h2>{{ rate.name }}</h2>
              <small>Описание</small>
              <p>{{ rate.comment || "Комментарий не указан" }}</p>
              <template v-if="listVersion(rate)?.services.length"
                ><small>Услуги в тарифе</small>
                <ul>
                  <li
                    v-for="service in listVersion(rate)!.services"
                    :key="service.id"
                  >
                    {{ service.name }}
                  </li>
                </ul></template
              >
              <div class="card-bottom">
                <strong>{{ money(dailyAmount(rate, day), false) }}</strong
                ><small>Всего в сутки с тарифа</small>
                <div class="card-stats">
                  <div>
                    <b>{{ rate.organizations?.length ?? 0 }}</b
                    ><small>Организаций</small>
                  </div>
                  <div>
                    <b>{{ objectCount(rate) }}</b
                    ><small>Объектов</small>
                  </div>
                  <div>
                    <b>{{
                      listVersion(rate)
                        ? money(listVersion(rate)!.priceCents, false)
                        : "—"
                    }}</b
                    ><small>В сутки за объект</small>
                  </div>
                </div>
              </div></Button.Root
            >
          </div>
        </template>
      </section>
    </main>

    <Dialog.Root v-model="mainOpen">
      <Dialog.Content
        class="drawer"
        :class="{ 'drawer-under': nestedOpen }"
        :close-on-click-outside="false"
      >
        <header class="drawer-header">
          <div>
            <small v-if="creating">Создание тарифа</small
            ><Dialog.Title>{{ selectedTitle }}</Dialog.Title>
          </div>
          <Button.Root
            class="icon-button close-button"
            aria-label="Закрыть карточку тарифа"
            @click="mainOpen = false"
            ><Icon name="close"
          /></Button.Root>
        </header>
        <div class="drawer-tabs">
          <Tabs.Root v-model="tab"
            ><Tabs.List class="tabs-list" label="Карточка тарифа"
              ><Tabs.Item value="parameters">Параметры</Tabs.Item
              ><Tabs.Item value="history">История версий</Tabs.Item></Tabs.List
            >
            <div class="drawer-body">
              <Tabs.Panel value="parameters">
                <form
                  v-if="creating"
                  id="rate-form"
                  class="rate-form"
                  novalidate
                  @submit.prevent="saveRate"
                >
                  <RateDetails
                    v-model:name="name"
                    v-model:comment="comment"
                    :errors="errors"
                  />
                  <VersionFields v-model="draft" :errors="errors" />
                </form>
                <template v-else-if="selected">
                  <div class="view-name">
                    <div>
                      <h3>Название тарифа</h3>
                      <p>{{ selected.name }}</p>
                    </div>
                    <Button.Root class="button primary" @click="beginVersion()"
                      ><Icon name="plus" />Новая версия тарифа</Button.Root
                    >
                  </div>
                  <section v-if="selected.comment.trim()" class="comment-view">
                    <h3>Комментарий</h3>
                    <p>{{ selected.comment }}</p>
                  </section>
                  <h3>Параметры тарифа</h3>
                  <div class="parameter-summary">
                    <div>
                      <small>Цена, всего</small
                      ><strong>{{
                        shownVersion ? money(shownVersion.priceCents) : "—"
                      }}</strong>
                    </div>
                    <div><small>Период</small><strong>Сутки</strong></div>
                    <div>
                      <small>{{
                        pending && !active
                          ? "Начнёт действовать с"
                          : "Действует с"
                      }}</small
                      ><strong>{{
                        shownVersion ? formatDate(shownVersion.date) : "—"
                      }}</strong>
                    </div>
                  </div>
                  <template v-if="shownVersion?.services.length"
                    ><h3 class="composition-title">Состав тарифа</h3>
                    <table class="composition-table">
                      <thead>
                        <tr>
                          <th>Услуга</th>
                          <th class="numeric">Цена</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="service in shownVersion.services"
                          :key="service.id"
                        >
                          <td>{{ service.name }}</td>
                          <td class="numeric">
                            {{ money(service.priceCents) }}
                          </td>
                        </tr>
                      </tbody>
                    </table></template
                  >
                  <p v-if="!shownVersion" class="muted version-note">
                    Нет действующей версии. Создайте новую версию, чтобы задать
                    стоимость и дату начала действия.
                  </p>
                  <section
                    v-if="selected.organizations?.length"
                    class="organization-summary"
                  >
                    <h3>Подключённые организации</h3>
                    <p class="muted">
                      Демонстрационные назначения ·
                      {{ objectCount(selected) }} объектов
                    </p>
                    <table
                      class="composition-table"
                      aria-label="Подключённые организации"
                    >
                      <thead>
                        <tr>
                          <th>Организация</th>
                          <th class="numeric">Объекты</th>
                          <th class="numeric">В сутки</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="organization in selected.organizations"
                          :key="organization.id"
                        >
                          <td>{{ organization.name }}</td>
                          <td class="numeric">{{ organization.objects }}</td>
                          <td class="numeric">
                            {{
                              money(
                                (active?.priceCents ?? 0) *
                                  organization.objects,
                              )
                            }}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr>
                          <th>Итого в сутки</th>
                          <td class="numeric">{{ objectCount(selected) }}</td>
                          <td class="numeric">
                            {{ money(dailyAmount(selected, day)) }}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    <p class="muted">
                      {{
                        active
                          ? `${money(active.priceCents)} за объект × ${objectCount(selected)} объектов`
                          : pending
                            ? `Начисления начнутся с ${formatDate(pending.date)}`
                            : "Начислений нет, пока у тарифа нет действующей версии"
                      }}
                    </p>
                  </section>
                </template>
              </Tabs.Panel>
              <Tabs.Panel value="history">
                <div
                  v-if="creating || !versionList.length"
                  class="empty-state history-empty"
                >
                  <div class="empty-icon"><Icon name="empty" /></div>
                  <h2>История версий пока пуста</h2>
                  <p>
                    {{
                      creating
                        ? "Первая версия появится после сохранения тарифа"
                        : "Создайте версию тарифа с новыми условиями"
                    }}
                  </p>
                  <Button.Root
                    v-if="!creating"
                    class="button primary"
                    @click="beginVersion()"
                    ><Icon name="plus" />Новая версия тарифа</Button.Root
                  >
                </div>
                <div v-else class="history-list">
                  <article
                    v-for="version in versionList"
                    :key="version.id"
                    class="version-card"
                    :class="{
                      'past-version':
                        version.date < day && version.id !== active?.id,
                    }"
                  >
                    <header>
                      <span
                        class="badge"
                        :class="
                          version.date > day
                            ? 'scheduled'
                            : version.id === active?.id
                              ? 'active'
                              : 'neutral'
                        "
                        >{{ versionLabel(version) }}</span
                      >
                      <div class="version-actions">
                        <Button.Root
                          class="icon-button"
                          :aria-label="`Редактировать версию от ${formatDate(version.date)}`"
                          :disabled="!!lockReason(version, day)"
                          :title="
                            lockReason(version, day) || 'Редактировать версию'
                          "
                          @click="beginVersion(version)"
                          ><Icon name="edit" /></Button.Root
                        ><Button.Root
                          class="icon-button remove-version"
                          :aria-label="`Удалить версию от ${formatDate(version.date)}`"
                          :disabled="
                            !!versionDeletionReason(selected!, version, day)
                          "
                          :title="
                            versionDeletionReason(selected!, version, day) ||
                            'Удалить версию'
                          "
                          @click="requestDelete(version)"
                          ><Icon name="trash-row"
                        /></Button.Root>
                      </div>
                    </header>
                    <div class="version-total">
                      <strong>{{ selected?.name }}</strong
                      ><b
                        >{{ money(version.priceCents) }} <span>/ сутки</span></b
                      >
                    </div>
                    <div
                      v-for="service in version.services"
                      :key="service.id"
                      class="version-service"
                    >
                      <span>{{ service.name }}</span
                      ><span>{{ money(service.priceCents) }} / сутки</span>
                    </div>
                    <p
                      v-if="versionDeletionReason(selected!, version, day)"
                      class="lock-reason"
                    >
                      {{ versionDeletionReason(selected!, version, day) }}
                    </p>
                  </article>
                </div>
              </Tabs.Panel>
            </div>
          </Tabs.Root>
        </div>
        <footer class="drawer-footer">
          <template v-if="creating"
            ><Button.Root class="button outlined" @click="mainOpen = false"
              >Закрыть</Button.Root
            ><Button.Root
              v-slot="{ attrs }"
              renderless
              :disabled="!name.trim() || !editorFilled"
              ><button
                v-bind="attrs"
                class="button primary"
                type="submit"
                form="rate-form"
              >
                Сохранить
              </button></Button.Root
            ></template
          ><template v-else
            ><Button.Root
              class="button danger-soft"
              :disabled="
                !shownVersion ||
                !!versionDeletionReason(selected!, shownVersion, day)
              "
              :title="
                shownVersion
                  ? versionDeletionReason(selected!, shownVersion, day)
                  : 'Нет версии для удаления'
              "
              @click="shownVersion && requestDelete(shownVersion)"
              ><Icon name="trash-red" />{{
                active
                  ? "Удалить действующую версию"
                  : pending
                    ? "Удалить запланированную версию"
                    : "Удалить версию"
              }}</Button.Root
            ><span class="spacer" /><Button.Root
              class="button outlined"
              @click="mainOpen = false"
              >Закрыть</Button.Root
            ></template
          >
        </footer>
        <Dialog.Root v-model="nestedOpen"
          ><Dialog.Content
            class="drawer version-drawer"
            :close-on-click-outside="false"
            ><header class="drawer-header">
              <div>
                <small>{{ selected?.name }}</small
                ><Dialog.Title>{{
                  draft.id ? "Редактирование версии" : "Новая версия тарифа"
                }}</Dialog.Title>
              </div>
              <Button.Root
                class="icon-button close-button"
                aria-label="Закрыть форму версии"
                @click="nestedOpen = false"
                ><Icon name="close"
              /></Button.Root>
            </header>
            <form
              id="version-form"
              class="drawer-body standalone-form"
              novalidate
              @submit.prevent="saveVersion"
            >
              <RateDetails
                v-model:name="name"
                v-model:comment="comment"
                :errors="errors"
              />
              <VersionFields v-model="draft" :errors="errors" />
            </form>
            <footer class="drawer-footer">
              <Button.Root class="button outlined" @click="nestedOpen = false"
                >Закрыть</Button.Root
              ><Button.Root
                v-slot="{ attrs }"
                renderless
                :disabled="!name.trim() || !editorFilled"
                ><button
                  v-bind="attrs"
                  class="button primary"
                  type="submit"
                  form="version-form"
                >
                  Сохранить
                </button></Button.Root
              >
            </footer></Dialog.Content
          ></Dialog.Root
        >
        <Dialog.Root v-model="deleteOpen"
          ><Dialog.Content class="confirmation" :close-on-click-outside="false"
            ><Dialog.Title>Удалить версию тарифа?</Dialog.Title
            ><Dialog.Description
              >Будет удалена версия, которая действует с
              {{ formatDate(deleting?.date ?? "") }}. По ней ещё не выполнен
              расчёт.</Dialog.Description
            >
            <div class="confirmation-actions">
              <Button.Root class="button outlined" @click="deleteOpen = false"
                >Отмена</Button.Root
              ><Button.Root class="button danger" @click="removeVersion"
                >Удалить</Button.Root
              >
            </div></Dialog.Content
          ></Dialog.Root
        >
      </Dialog.Content>
    </Dialog.Root>
    <Teleport
      :to="nestedOpen ? '.version-drawer' : mainOpen ? '.drawer' : 'body'"
      ><div v-if="notification" class="toast" role="status" aria-live="polite">
        <span class="toast-mark" aria-hidden="true">✓</span
        ><span>{{ notification }}</span
        ><Button.Root
          class="icon-button"
          aria-label="Закрыть уведомление"
          @click="notification = ''"
          ><Icon name="close"
        /></Button.Root></div
    ></Teleport>
  </div>
</template>

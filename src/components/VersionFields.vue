<script setup lang="ts">
import { nextTick } from "vue";
import { Button, Popover } from "@vuetify/v0/components";
import { draftTotal, money, moneyToCents, maskPrice } from "../domain.mjs";
import type { VersionDraft } from "../types";
import DateField from "./DateField.vue";
import Icon from "./Icon.vue";

const draft = defineModel<VersionDraft>({ required: true });
defineProps<{ errors: Record<string, string> }>();

async function addService() {
  const id = crypto.randomUUID();
  draft.value.services.push({ id, name: "", price: "" });
  await nextTick();
  document.getElementById(`service-${id}`)?.focus();
}

function normalizePrice(service?: { price: string }) {
  if (service) {
    const cents = moneyToCents(service.price);
    if (cents !== null)
      service.price = (cents / 100).toFixed(2).replace(".", ",");
  } else {
    const cents = moneyToCents(draft.value.price);
    if (cents !== null)
      draft.value.price = (cents / 100).toFixed(2).replace(".", ",");
  }
}

function inputPrice(event: Event, service?: { price: string }) {
  const input = event.target as HTMLInputElement;
  const price = maskPrice(input.value);
  if (price === null) {
    input.value = service ? service.price : draft.value.price;
    return;
  }
  input.value = price;
  if (service) service.price = price;
  else draft.value.price = price;
}
</script>

<template>
  <section class="version-fields">
    <div class="section-heading">
      <h3>Параметры тарифа</h3>
      <Button.Root class="button mini primary" @click="addService"
        ><Icon name="plus-small" />Добавить услугу в тариф</Button.Root
      >
    </div>
    <div class="version-inputs">
      <div>
        <div
          class="field compact"
          :class="{ invalid: errors.price, calculated: draft.services.length }"
        >
          <label
            v-if="draft.services.length || draft.price"
            for="version-price"
            class="floating-label"
            >Цена, ₽{{ draft.services.length ? "" : " *" }}</label
          >
          <input
            id="version-price"
            aria-label="Цена, ₽"
            :value="
              draft.services.length
                ? money(draftTotal(draft)).replace(' ₽', '')
                : draft.price
            "
            :readonly="draft.services.length > 0"
            placeholder="Введите цену"
            inputmode="decimal"
            :aria-invalid="!!errors.price"
            :aria-describedby="errors.price ? 'price-error' : undefined"
            @input="inputPrice"
            @blur="normalizePrice()"
          />
        </div>
        <p
          v-if="errors.price"
          id="price-error"
          class="field-error"
          role="alert"
        >
          {{ errors.price }}
        </p>
      </div>
      <label class="field floating compact period-field"
        ><span>Период *</span
        ><select aria-label="Период" disabled>
          <option>Сутки</option></select
        ><Icon name="chevron"
      /></label>
      <DateField v-model="draft.date" :error="errors.date" />
    </div>
    <template v-if="draft.services.length">
      <div class="section-heading services-heading">
        <h3>Список услуг</h3>
        <Popover.Root position-area="bottom span-right">
          <Popover.Activator
            class="icon-button tiny"
            aria-label="Как рассчитывается стоимость"
            ><Icon name="help"
          /></Popover.Activator>
          <Popover.Content class="help-popover"
            >Общая цена равна сумме цен услуг. Состав услуг носит справочный
            характер.</Popover.Content
          >
        </Popover.Root>
      </div>
      <div class="service-editor">
        <div class="service-editor-head">
          <span>Название</span><span>₽ / сутки</span><span />
        </div>
        <div
          v-for="service in draft.services"
          :key="service.id"
          class="service-editor-row"
        >
          <div>
            <input
              :id="`service-${service.id}`"
              v-model="service.name"
              :aria-label="`Название услуги ${draft.services.indexOf(service) + 1}`"
              placeholder="Название услуги"
              maxlength="150"
              :class="{ invalid: errors[`name-${service.id}`] }"
            />
            <p
              v-if="errors[`name-${service.id}`]"
              class="field-error"
              role="alert"
            >
              {{ errors[`name-${service.id}`] }}
            </p>
          </div>
          <div>
            <input
              :value="service.price"
              :aria-label="`Цена услуги ${draft.services.indexOf(service) + 1}`"
              placeholder="0,00"
              class="service-price"
              :class="{ invalid: errors[`price-${service.id}`] }"
              inputmode="decimal"
              @input="inputPrice($event, service)"
              @blur="normalizePrice(service)"
            />
            <p
              v-if="errors[`price-${service.id}`]"
              class="field-error"
              role="alert"
            >
              {{ errors[`price-${service.id}`] }}
            </p>
          </div>
          <Button.Root
            class="icon-button remove-service"
            :aria-label="`Удалить услугу ${service.name || draft.services.indexOf(service) + 1}`"
            @click="
              draft.services = draft.services.filter(
                (row) => row.id !== service.id,
              )
            "
            ><Icon name="trash-row"
          /></Button.Root>
        </div>
      </div>
    </template>
  </section>
</template>

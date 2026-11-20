<script setup lang="ts">
import { nextTick, shallowRef, watch } from "vue";
import { createCalendar } from "@vuetify/v0";
import { Button, Popover } from "@vuetify/v0/components";
import { today, validDate, formatDate } from "../domain.mjs";
import Icon from "./Icon.vue";

const props = defineProps<{ modelValue: string; error?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const opened = shallowRef(false);
const selected = shallowRef<string | undefined>(
  validDate(props.modelValue) ? props.modelValue : undefined,
);
const calendar = createCalendar({
  value: selected,
  min: () => today(),
  locale: "ru-RU",
  firstDayOfWeek: 1,
  weekdayFormat: "short",
  mandatory: true,
});

watch(opened, (value) => {
  if (value)
    calendar.goto(validDate(props.modelValue) ? props.modelValue : today());
});
watch(
  () => props.modelValue,
  (value) => {
    selected.value = validDate(value) ? value : undefined;
  },
);

function typeDate(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  const parts = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  emit(
    "update:modelValue",
    parts ? `${parts[3]}-${parts[2]}-${parts[1]}` : value,
  );
}

function selectDate(iso: string) {
  calendar.select(iso);
  emit("update:modelValue", iso);
  opened.value = false;
}

async function navigate(event: KeyboardEvent) {
  const shifts: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
  };
  if (!(event.key in shifts)) return;
  event.preventDefault();
  calendar.move("day", shifts[event.key]);
  await nextTick();
  const button = document.querySelector<HTMLButtonElement>(
    `[data-day="${calendar.focused.value}"]`,
  );
  button?.focus();
}
</script>

<template>
  <div class="date-field">
    <div class="field floating compact" :class="{ invalid: error }">
      <label for="effective-date">Применять с *</label>
      <input
        id="effective-date"
        :value="validDate(modelValue) ? formatDate(modelValue) : modelValue"
        placeholder="ДД.ММ.ГГГГ"
        inputmode="numeric"
        autocomplete="off"
        :aria-invalid="!!error"
        :aria-describedby="error ? 'date-error' : undefined"
        @input="typeDate"
      />
      <Popover.Root v-model="opened" position-area="bottom span-left">
        <Popover.Activator
          class="icon-button calendar-trigger"
          aria-label="Выбрать дату начала действия"
        >
          <Icon name="calendar" />
        </Popover.Activator>
        <Popover.Content class="calendar-popover">
          <div class="calendar-header">
            <strong>{{ calendar.label.value }}</strong>
            <Button.Root
              class="icon-button previous"
              aria-label="Предыдущий месяц"
              :disabled="calendar.isFirst.value"
              @click="calendar.prev"
              ><Icon name="chevron"
            /></Button.Root>
            <Button.Root
              class="icon-button next"
              aria-label="Следующий месяц"
              :disabled="calendar.isLast.value"
              @click="calendar.next"
              ><Icon name="chevron"
            /></Button.Root>
          </div>
          <div class="calendar-grid weekdays">
            <span v-for="day in calendar.weekdays.value" :key="day">{{
              day
            }}</span>
          </div>
          <div
            class="calendar-grid"
            role="group"
            aria-label="Дни месяца"
            @keydown="navigate"
          >
            <template
              v-for="(week, index) in calendar.month.value.weeks"
              :key="index"
            >
              <Button.Root
                v-for="day in week"
                :key="day.iso"
                :data-day="day.iso"
                :disabled="day.disabled || day.outside"
                :aria-label="formatDate(day.iso)"
                :aria-pressed="day.selected"
                :class="[
                  'calendar-day',
                  {
                    outside: day.outside,
                    today: day.iso === today(),
                    selected: day.selected,
                  },
                ]"
                @click="selectDate(day.iso)"
                >{{ day.day }}</Button.Root
              >
            </template>
          </div>
          <Button.Root class="calendar-today" @click="selectDate(today())"
            >Сегодня · {{ formatDate(today()) }}</Button.Root
          >
        </Popover.Content>
      </Popover.Root>
    </div>
    <p v-if="error" id="date-error" class="field-error" role="alert">
      {{ error }}
    </p>
  </div>
</template>

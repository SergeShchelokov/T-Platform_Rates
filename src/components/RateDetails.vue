<script setup lang="ts">
import { useId } from "vue";

const name = defineModel<string>("name", { required: true });
const comment = defineModel<string>("comment", { required: true });
defineProps<{ errors: Record<string, string> }>();
const fieldId = `rate-name-${useId()}`;
</script>

<template>
  <div class="rate-details">
    <div class="field name-field" :class="{ invalid: errors.name }">
      <label v-if="name" :for="fieldId" class="floating-label"
        >Название тарифа *</label
      >
      <input
        :id="fieldId"
        v-model="name"
        placeholder="Название тарифа *"
        maxlength="150"
        autocomplete="off"
        :aria-invalid="!!errors.name"
        :aria-describedby="errors.name ? `${fieldId}-error` : undefined"
        aria-label="Название тарифа"
      />
    </div>
    <p
      v-if="errors.name"
      :id="`${fieldId}-error`"
      class="field-error"
      role="alert"
    >
      {{ errors.name }}
    </p>
    <label class="field floating comment-field">
      <span>Комментарий</span>
      <textarea
        v-model="comment"
        placeholder="Напишите о тарифе"
        maxlength="2000"
        aria-label="Комментарий"
      />
    </label>
  </div>
</template>

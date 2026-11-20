<script setup lang="ts">
defineProps<{ name: string }>();
const icons = import.meta.glob("../assets/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
</script>

<template>
  <span class="icon" aria-hidden="true"
    ><img :src="icons[`../assets/${name}.svg`]" alt=""
  /></span>
</template>

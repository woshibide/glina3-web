<script setup>
import { ref } from "vue";
import sun from "../icons/sun.svg?raw";
import system from "../icons/system.svg?raw";
import moon from "../icons/moon.svg?raw";

// Markup mirrored in site/snippets/theme-switch.php. The highlighted option is driven by
// html[data-theme] in CSS, so it is correct before this component mounts.
const options = [
  { value: "light", label: "Light", icon: sun },
  { value: "system", label: "System", icon: system },
  { value: "dark", label: "Dark", icon: moon },
];

const root = document.documentElement;
const current = ref(root.dataset.theme ?? "system");

function choose(value) {
  current.value = value;
  try {
    if (value === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", value);
  } catch {
    // Storage blocked (private mode): the choice still applies to this page.
  }
  const apply = () => {
    if (value === "system") delete root.dataset.theme;
    else root.dataset.theme = value;
  };
  if (document.startViewTransition) document.startViewTransition(apply);
  else apply();
}
</script>

<template>
  <div class="theme-switch" role="group" aria-label="Colour theme">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :data-theme-option="option.value"
      :aria-label="option.label"
      :title="option.label"
      :aria-pressed="current === option.value"
      @click="choose(option.value)"
      v-html="option.icon"
    ></button>
  </div>
</template>

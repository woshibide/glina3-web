<script setup>
import ThemeSwitch from "./components/ThemeSwitch.vue";

// Props come from the JSON that site/controllers/site.php builds for every page.
defineProps({
  site: { type: Object, required: true },
  page: { type: Object, required: true },
});
</script>

<template>
  <div class="board">
    <header class="tile masthead">
      <a :href="site.url">{{ site.title }}</a>
      <nav aria-label="Main">
        <a
          v-for="item in site.nav"
          :key="item.url"
          :href="item.url"
          :aria-current="item.active ? 'page' : undefined"
        >{{ item.title }}</a>
      </nav>
      <ThemeSwitch />
    </header>

    <main class="tile">
      <h1 class="title">{{ page.title }}</h1>
      <!-- Kirbytext HTML written by editors in the Panel. -->
      <div class="text" v-html="page.text"></div>
    </main>

    <footer class="tile">
      <a :href="`mailto:${site.email}`">{{ site.email }}</a>
    </footer>
  </div>
</template>

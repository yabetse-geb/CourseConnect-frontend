<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { computed } from "vue";

const authStore = useAuthStore();
const route = useRoute();

const isAuthPage = computed(() => route.path === "/auth");
</script>

<template>
  <header v-if="!isAuthPage">
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/schedule">Schedule</RouterLink>
      <a href="#" @click.prevent="authStore.logout">Logout</a>
    </nav>
  </header>

  <main :class="{ 'no-nav': isAuthPage }">
    <RouterView />
  </main>
</template>

<style scoped>
header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: #a31f34;
  border-bottom: 1px solid #a31f34;
  box-shadow: 0 2px 4px rgba(163, 31, 52, 0.3);
  padding: 1rem 0;
}

nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  padding: 0 1rem;
}

nav a {
  color: #ffffff;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

nav a:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

nav a.router-link-exact-active {
  color: #ffffff;
  font-weight: 600;
  background-color: rgba(255, 255, 255, 0.15);
}

main {
  margin-top: 60px;
  min-height: calc(100vh - 60px);
  width: 100%;
}

main.no-nav {
  margin-top: 0;
  min-height: 100vh;
}

@media (min-width: 1024px) {
  nav {
    justify-content: flex-start;
    padding: 0 2rem;
  }
}
</style>

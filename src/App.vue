<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import HelloWorld from "./components/HelloWorld.vue";
import { useAuthStore } from "@/stores/auth";
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'

const authStore = useAuthStore()
const route = useRoute()

const isAuthPage = computed(() => route.path === '/auth')
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

    <div class="wrapper">
      <HelloWorld msg="You did it!" />

      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
        <RouterLink v-if="authStore.session" to="/user">User</RouterLink>
        <RouterLink v-if="!authStore.session" to="/auth">Login</RouterLink>
        <a v-else href="#" @click.prevent="authStore.logout">Logout</a>
      </nav>
    </div>
  <header v-if="!isAuthPage">
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/scheduling">Scheduling</RouterLink>
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
  background-color: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  color: var(--color-text);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

nav a:hover {
  background-color: var(--color-background);
}

nav a.router-link-exact-active {
  color: var(--color-heading);
  font-weight: 500;
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

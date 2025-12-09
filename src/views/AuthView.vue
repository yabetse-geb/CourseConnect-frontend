<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const isLogin = ref(true);
const username = ref("");
const password = ref("");

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  authStore.error = null; // Clear errors when switching modes
};

const handleSubmit = async () => {
  if (!username.value || !password.value) {
    authStore.error = "Please fill in all fields";
    return;
  }

  if (isLogin.value) {
    await authStore.login(username.value, password.value);
  } else {
    await authStore.register(username.value, password.value);
  }
};
</script>

<template>
  <div class="auth-container">
    <div class="auth-card">
      <h2>{{ isLogin ? "Login" : "Register" }}</h2>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Enter username"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter password"
            required
          />
        </div>

        <div v-if="authStore.error" class="error-message">
          {{ authStore.error }}
        </div>

        <button type="submit" :disabled="authStore.loading">
          {{
            authStore.loading ? "Processing..." : isLogin ? "Login" : "Register"
          }}
        </button>
      </form>

      <p class="toggle-text">
        {{ isLogin ? "Don't have an account?" : "Already have an account?" }}
        <a href="#" @click.prevent="toggleMode">
          {{ isLogin ? "Register here" : "Login here" }}
        </a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #ffffff;
}

.auth-card {
  background: #a31f34;
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid #a31f34;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #ffffff;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: bold;
  color: #ffffff;
}

input {
  padding: 0.75rem;
  border: 1px solid #a31f34;
  border-radius: 4px;
  background: #8a8b8c;
  color: #ffffff;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

input:focus {
  outline: none;
  border-color: #a31f34;
  box-shadow: 0 0 0 2px rgba(163, 31, 52, 0.3);
}

button {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #8a8b8c;
  color: #ffffff;
  border: 1px solid #a31f34;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

button:hover:not(:disabled) {
  background-color: #8a8b8c;
  transform: scale(1.05);
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  color: #ffffff;
  font-size: 0.9rem;
  text-align: center;
  background-color: rgba(163, 31, 52, 0.3);
  border: 1px solid #a31f34;
  padding: 0.5rem;
  border-radius: 4px;
}

.toggle-text {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.9rem;
  color: #ffffff;
}

.toggle-text a {
  color: #ffffff;
  text-decoration: underline;
}

.toggle-text a:hover {
  text-decoration: none;
  opacity: 0.8;
}
</style>

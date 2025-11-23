<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const isLogin = ref(true);
const username = ref('');
const password = ref('');

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  authStore.error = null; // Clear errors when switching modes
};

const handleSubmit = async () => {
  if (!username.value || !password.value) {
    authStore.error = 'Please fill in all fields';
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
      <h2>{{ isLogin ? 'Login' : 'Register' }}</h2>
      
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
          {{ authStore.loading ? 'Processing...' : (isLogin ? 'Login' : 'Register') }}
        </button>
      </form>

      <p class="toggle-text">
        {{ isLogin ? "Don't have an account?" : "Already have an account?" }}
        <a href="#" @click.prevent="toggleMode">
          {{ isLogin ? 'Register here' : 'Login here' }}
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
  min-height: 60vh;
}

.auth-card {
  background: var(--color-background-soft);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--color-heading);
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
  color: var(--color-text);
}

input {
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
}

button {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: hsla(160, 100%, 37%, 1);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: hsla(160, 100%, 30%, 1);
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  color: #ff4444;
  font-size: 0.9rem;
  text-align: center;
}

.toggle-text {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.9rem;
}

.toggle-text a {
  color: hsla(160, 100%, 37%, 1);
  text-decoration: none;
}

.toggle-text a:hover {
  text-decoration: underline;
}
</style>

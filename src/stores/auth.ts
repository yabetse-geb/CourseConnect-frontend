import { ref } from 'vue';
import { defineStore } from 'pinia';
import { authApi } from '@/api/syncs/auth';
import { useRouter } from 'vue-router';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<string | null>(localStorage.getItem('user'));
  const session = ref<string | null>(localStorage.getItem('session_token'));
  const error = ref<string | null>(null);
  const loading = ref(false);
  const router = useRouter();

  async function login(username: string, password: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await authApi.login(username, password);
      if (response.session) {
        session.value = response.session;
        user.value = response.user;
        localStorage.setItem('session_token', response.session);
        localStorage.setItem('user', response.user);
        // Redirect to home or dashboard after login
        if (router) router.push('/');
      }
    } catch (e: any) {
      error.value = e.message || 'Login failed';
    } finally {
      loading.value = false;
    }
  }

  async function register(username: string, password: string) {
    loading.value = true;
    error.value = null;
    try {
      console.log('Attempting to register user:', username);
      const response = await authApi.register(username, password);
      console.log('Registration response:', response);
      // After register, we might want to auto-login or ask user to login
      // For now, let's assume we just tell them it succeeded or auto-login if the API returns a session (which the sync definition didn't seem to imply, but let's stick to the sync definition which returns user)
      // The sync definition for RegisterResponseSuccess returns { user }, but Login returns { session }.
      // So we probably need to login after register.
      user.value = response.user;
      await login(username, password);
    } catch (e: any) {
      error.value = e.message || 'Registration failed';
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    if (!session.value) return;
    loading.value = true;
    try {
      await authApi.logout(session.value);
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      session.value = null;
      user.value = null;
      localStorage.removeItem('session_token');
      localStorage.removeItem('user');
      loading.value = false;
      if (router) router.push('/auth');
    }
  }

  return {
    user,
    session,
    error,
    loading,
    login,
    register,
    logout
  };
});

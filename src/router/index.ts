import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: '/scheduling',
      name: 'scheduling',
      component: () => import('../views/SchedulingView.vue'),
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('../views/AuthView.vue'),
      meta: { requiresAuth: false },
    },
  ],
})

// Navigation guard to check authentication
router.beforeEach((to, from, next) => {
  // Check if the route requires authentication
  const requiresAuth = to.meta.requiresAuth !== false; // default to true if not specified
  
  // Get the session token from localStorage
  const sessionToken = localStorage.getItem('session_token');
  
  // If the route requires auth and there's no session token
  if (requiresAuth && !sessionToken) {
    // Redirect to auth page
    next({ name: 'auth' });
  } else if (!requiresAuth && sessionToken && to.name === 'auth') {
    // If user is already logged in and trying to access auth page, redirect to home
    next({ name: 'home' });
  } else {
    // Allow navigation
    next();
  }
});

export default router

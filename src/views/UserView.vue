<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { getUsername } from "@/api/syncs/auth";
import { apiCall } from "@/api/api";
import FriendsList from "@/components/FriendsList.vue";
import BlockedListView from "@/components/BlockedListView.vue";
import GroupsList from "@/components/GroupsList.vue";
import FriendRequestsList from "@/components/FriendRequestsList.vue";

const authStore = useAuthStore();

const loadingUsername = ref(false);
const username = ref("");

const currentUserId = ref<string | null>(authStore.user || null);
const friendListRefreshKey = ref(0);

function handleFriendUpdates() {
  friendListRefreshKey.value += 1;
}

async function getUserFromSession() {
  if (!authStore.session) {
    console.log("No session available");
    return null;
  }

  try {
    console.log("Getting user from session:", authStore.session);
    const response = await apiCall(
      "/Sessioning/_getUser",
      { session: authStore.session },
      "Get User from Session"
    );
    console.log("Sessioning/_getUser response:", response);

    // Based on GetUserFromSessionResponseSuccess sync: [Requesting.respond, { request, user }]
    // The response should be { user: string } (request ID is internal)
    let userId: string | null = null;
    if (response && response.user) {
      userId = response.user as string;
    }

    console.log("Extracted user ID from session:", userId);
    return userId;
  } catch (e: any) {
    console.error("Error getting user from session:", e);
    return null;
  }
}

async function loadUsername() {
  loadingUsername.value = true;
  console.log(
    "loadUsername called - currentUserId:",
    currentUserId.value,
    "session:",
    authStore.session
  );
  let userId = currentUserId.value;

  // If we don't have a user ID, try to get it from the session
  if (!userId && authStore.session) {
    console.log("No user ID found, fetching from session...");
    userId = await getUserFromSession();
    if (userId) {
      console.log("Setting user ID:", userId);
      currentUserId.value = userId;
      authStore.user = userId;
    } else {
      console.log("Failed to get user ID from session");
      loadingUsername.value = false;
      return;
    }
  }

  if (!userId) {
    console.log("No user ID available, cannot load username");
    loadingUsername.value = false;
    return;
  }

  try {
    console.log("Loading username for user ID:", userId);
    const fetchedUsername = await getUsername(userId);
    console.log("Got username:", fetchedUsername);
    if (fetchedUsername) {
      username.value = fetchedUsername;
      console.log("Username set to:", username.value);
    } else {
      console.log("Username is null or empty");
    }
  } catch (e: any) {
    console.error("Error loading username:", e);
  } finally {
    loadingUsername.value = false;
  }
}

// Watch for session changes
watch(
  () => authStore.session,
  async (newSession) => {
    if (newSession && !currentUserId.value) {
      await loadUsername();
    }
  }
);

onMounted(async () => {
  // Ensure session is loaded from localStorage if not in store
  if (!authStore.session && localStorage.getItem("session_token")) {
    authStore.session = localStorage.getItem("session_token");
  }

  // Load username from API
  await loadUsername();
});
</script>

<template>
  <div class="user-page">
    <header class="page-header">
      <h1>Profile Page</h1>
    </header>

    <div class="user-profile-section">
      <div class="profile-details">
        <div class="username-block">
          <span class="username-label">Username</span>
          <span class="username-value" v-if="loadingUsername">
            Loading...
          </span>
          <span class="username-value" v-else>{{ username || "Not set" }}</span>
        </div>
      </div>
    </div>

    <div class="requests-section" v-if="authStore.session">
      <FriendRequestsList
        :session="authStore.session"
        @friend-updated="handleFriendUpdates"
      />
    </div>

    <div class="lists-section">
      <FriendsList
        :session="authStore.session"
        :refreshKey="friendListRefreshKey"
      />
      <BlockedListView :session="authStore.session" />
      <GroupsList :userId="currentUserId" />
    </div>
  </div>
</template>

<style scoped>
.user-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 2rem;
  margin-bottom: 15px;
  color: white;
}

.user-profile-section {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
  display: flex;
  justify-content: center;
}

.profile-details {
  text-align: center;
}

.username-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.username-label {
  font-weight: 600;
  font-size: 1.1rem;
  color: white;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.username-value {
  font-size: 2rem;
  font-weight: 700;
  color: white;
  padding: 10px 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05),
    rgba(255, 255, 255, 0.01)
  );
  min-width: 250px;
}

.requests-section {
  margin-bottom: 30px;
}

.lists-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 1024px) {
  .lists-section {
    grid-template-columns: 1fr;
  }
}
</style>

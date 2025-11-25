<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  getBlockedUsersBySession,
  blockUserBySession,
  unblockUserBySession,
} from "@/api/concepts/BlockingAPI";
import { getUsername } from "@/api/syncs/auth";

interface Props {
  session: string | null;
  refreshKey?: number;
}

const props = defineProps<Props>();
const authStore = useAuthStore();

interface BlockedUser {
  userId: string;
  username: string;
}

const blockedUsers = ref<BlockedUser[]>([]);
const searchQuery = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

const filteredBlockedUsers = computed(() => {
  if (!searchQuery.value) return blockedUsers.value;
  const query = searchQuery.value.toLowerCase();
  return blockedUsers.value.filter((u) =>
    u.username.toLowerCase().includes(query)
  );
});

async function loadBlockedUsers() {
  const session = props.session || authStore.session;
  if (!session) {
    console.log("BlockedListView: No session available");
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    console.log(
      "BlockedListView: Loading blocked users with session:",
      session
    );
    const response = await getBlockedUsersBySession(session);
    console.log("BlockedListView: API response:", response);

    let blockedIds: string[] = [];
    if (response && typeof response === "object") {
      if ("blockedUsers" in response && Array.isArray(response.blockedUsers)) {
        blockedIds = response.blockedUsers;
      } else if ("user" in response && Array.isArray(response.user)) {
        blockedIds = response.user;
      }
    } else if (Array.isArray(response)) {
      blockedIds = response;
    }

    blockedIds = blockedIds
      .map((item: any) => {
        if (typeof item === "string" && item.length > 0) {
          return item;
        }
        if (typeof item === "object" && item !== null) {
          const possibleKeys = ["userId", "user", "blocked", "target", "id"];
          for (const key of possibleKeys) {
            if (typeof item[key] === "string") {
              return item[key];
            }
          }
          const keys = Object.keys(item);
          if (keys.length === 1 && typeof item[keys[0]] === "string") {
            return item[keys[0]];
          }
        }
        return null;
      })
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const blockedWithUsernames = await Promise.all(
      blockedIds.map(async (userId: string) => {
        try {
          const username = await getUsername(userId);
          return {
            userId,
            username: username || "Unknown User",
          };
        } catch (e) {
          console.error(
            `BlockedListView: Error fetching username for ${userId}:`,
            e
          );
          return {
            userId,
            username: "Unknown User",
          };
        }
      })
    );

    blockedUsers.value = blockedWithUsernames;
  } catch (e: any) {
    error.value = e.message || "Failed to load blocked users";
    console.error("BlockedListView: Error loading blocked users:", e);
  } finally {
    loading.value = false;
  }
}

async function handleBlock() {
  const session = props.session || authStore.session;
  if (!session || !searchQuery.value.trim()) {
    return;
  }

  const targetUsername = searchQuery.value.trim();
  loading.value = true;
  error.value = null;
  try {
    console.log(`BlockedListView: Blocking user ${targetUsername}`);
    await blockUserBySession(session, targetUsername);
    searchQuery.value = "";
    await loadBlockedUsers();
  } catch (e: any) {
    error.value = e.message || "Failed to block user";
    console.error("BlockedListView: Error blocking user:", e);
  } finally {
    loading.value = false;
  }
}

async function handleUnblock(username: string) {
  const session = props.session || authStore.session;
  if (!session) {
    error.value = "No session available";
    return;
  }

  if (!confirm(`Unblock ${username}?`)) {
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    console.log(`BlockedListView: Unblocking user ${username}`);
    await unblockUserBySession(session, username);
    await loadBlockedUsers();
  } catch (e: any) {
    error.value = e.message || "Failed to unblock user";
    console.error("BlockedListView: Error unblocking user:", e);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.session,
  (newSession) => {
    if (newSession) {
      console.log("BlockedListView: Session changed, reloading blocked users");
      loadBlockedUsers();
    }
  },
  { immediate: true }
);

watch(
  () => props.refreshKey,
  () => {
    console.log("BlockedListView: refreshKey changed, reloading blocked users");
    loadBlockedUsers();
  }
);

onMounted(() => {
  const session = props.session || authStore.session;
  if (session) {
    loadBlockedUsers();
  } else {
    console.log("BlockedListView: Waiting for session to load...");
  }
});
</script>

<template>
  <div class="blocked-box">
    <h2>BLOCKED</h2>

    <div class="search-section">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Username to block"
        class="search-input"
        @keyup.enter="handleBlock"
      />
      <button class="block-button" @click="handleBlock" :disabled="loading">
        Block
      </button>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="loading && blockedUsers.length === 0" class="loading">
      Loading...
    </div>

    <ul v-else class="blocked-list">
      <li
        v-for="blocked in filteredBlockedUsers"
        :key="blocked.userId"
        class="blocked-item"
      >
        <span>{{ blocked.username }}</span>
        <button
          class="unblock-button"
          @click="handleUnblock(blocked.username)"
          title="Unblock user"
        >
          ×
        </button>
      </li>
      <li v-if="filteredBlockedUsers.length === 0" class="empty-message">
        No blocked users
      </li>
    </ul>
  </div>
</template>

<style scoped>
.blocked-box {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-height: 400px;
}

.blocked-box h2 {
  margin: 0 0 10px 0;
  font-size: 1.2rem;
  text-align: center;
}

.search-section {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background);
  color: white;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.block-button {
  padding: 8px 16px;
  background-color: var(--color-button);
  color: var(--color-button-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.block-button:hover {
  background-color: var(--color-button-hover);
}

.blocked-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.blocked-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--color-border);
}

.blocked-item span {
  flex: 1;
}

.unblock-button {
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 5px;
  line-height: 1;
}

.unblock-button:hover {
  color: var(--color-error, #ff4444);
}

.empty-message {
  text-align: center;
  padding: 20px;
  color: var(--color-text-muted);
  font-style: italic;
}

.error-message {
  color: var(--color-error, #ff4444);
  padding: 10px;
  background-color: var(--color-background-mute);
  border-radius: 4px;
  font-size: 0.9rem;
}

.loading {
  text-align: center;
  padding: 20px;
  color: var(--color-text-muted);
}
</style>

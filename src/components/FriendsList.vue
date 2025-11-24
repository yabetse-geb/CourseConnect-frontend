<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  getAllFriends,
  removeFriend,
  requestFriend,
} from "@/api/concepts/FriendingAPI";

interface Props {
  userId: string | null;
}

const props = defineProps<Props>();
const authStore = useAuthStore();

const friends = ref<{ friend: string }[]>([]);
const searchQuery = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

const filteredFriends = computed(() => {
  if (!searchQuery.value) return friends.value;
  return friends.value.filter((f) =>
    f.friend.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

async function loadFriends() {
  if (!props.userId) return;

  loading.value = true;
  error.value = null;
  try {
    friends.value = await getAllFriends(props.userId);
  } catch (e: any) {
    error.value = e.message || "Failed to load friends";
    console.error("Error loading friends:", e);
  } finally {
    loading.value = false;
  }
}

async function handleAddFriend() {
  if (!authStore.session || !searchQuery.value.trim()) return;

  const usernameToAdd = searchQuery.value.trim();
  loading.value = true;
  error.value = null;

  try {
    await requestFriend(authStore.session, usernameToAdd);
    searchQuery.value = "";
    // Reload friends list to show the new friend if they accepted immediately
    await loadFriends();
  } catch (e: any) {
    error.value = e.message || "Failed to send friend request";
    console.error("Error sending friend request:", e);
  } finally {
    loading.value = false;
  }
}

async function handleRemoveFriend(friendId: string) {
  if (!props.userId) return;

  if (!confirm("Are you sure you want to remove this friend?")) return;

  loading.value = true;
  error.value = null;
  try {
    await removeFriend(props.userId, friendId);
    await loadFriends();
  } catch (e: any) {
    error.value = e.message || "Failed to remove friend";
    console.error("Error removing friend:", e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadFriends();
});
</script>

<template>
  <div class="friends-box">
    <h2>FRIENDS</h2>

    <div class="search-section">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search:"
        class="search-input"
        @keyup.enter="handleAddFriend"
      />
      <button class="add-button" @click="handleAddFriend">Add</button>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="loading" class="loading">Loading...</div>

    <ul v-else class="friends-list">
      <li
        v-for="friend in filteredFriends"
        :key="friend.friend"
        class="friend-item"
      >
        <span>{{ friend.friend }}</span>
        <button
          class="remove-button"
          @click="handleRemoveFriend(friend.friend)"
          title="Remove friend"
        >
          ×
        </button>
      </li>
      <li v-if="filteredFriends.length === 0" class="empty-message">
        No friends found
      </li>
    </ul>
  </div>
</template>

<style scoped>
.friends-box {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-height: 400px;
}

.friends-box h2 {
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

.add-button {
  padding: 8px 16px;
  background-color: var(--color-button);
  color: var(--color-button-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.add-button:hover {
  background-color: var(--color-button-hover);
}

.friends-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.friend-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background-color 0.2s;
}

.friend-item:hover {
  background-color: var(--color-background-mute);
}

.friend-item span {
  flex: 1;
}

.remove-button {
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 5px;
  line-height: 1;
}

.remove-button:hover {
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

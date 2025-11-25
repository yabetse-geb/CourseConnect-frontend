<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  getAllFriendsBySession,
  removeFriend,
  requestFriend,
} from "@/api/concepts/FriendingAPI";
import { getUsername } from "@/api/syncs/auth";

interface Props {
  session: string | null;
  userId?: string | null; // Optional, kept for backward compatibility
}

const props = defineProps<Props>();
const authStore = useAuthStore();

interface Friend {
  friendId: string;
  friendUsername: string;
}

const friends = ref<Friend[]>([]);
const searchQuery = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

const filteredFriends = computed(() => {
  if (!searchQuery.value) return friends.value;
  const query = searchQuery.value.toLowerCase();
  return friends.value.filter((f) =>
    f.friendUsername.toLowerCase().includes(query)
  );
});

async function loadFriends() {
  const session = props.session || authStore.session;
  if (!session) {
    console.log("FriendsList: No session available");
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    console.log("FriendsList: Loading friends with session:", session);
    const response = await getAllFriendsBySession(session);
    console.log("FriendsList: API response:", response);

    // Extract friend IDs from response
    // Based on GetAllFriendsResponseSuccess sync: returns { friends: string[] }
    let friendIds: string[] = [];

    if (Array.isArray(response)) {
      // Response is directly an array
      friendIds = response;
    } else if (response && typeof response === "object") {
      // Response is an object - check for friends property (from sync)
      if ("friends" in response && Array.isArray(response.friends)) {
        friendIds = response.friends;
      } else if ("friend" in response && Array.isArray(response.friend)) {
        // Fallback for old format
        friendIds = response.friend;
      }
    }

    // Filter and normalize: handle case where array contains objects instead of strings
    friendIds = friendIds
      .map((item: any) => {
        // If it's already a string, use it
        if (typeof item === "string" && item.length > 0) {
          return item;
        }
        // If it's an object, try to extract user ID from common property names
        if (typeof item === "object" && item !== null) {
          // Try common property names
          if (item.friend && typeof item.friend === "string") {
            return item.friend;
          }
          if (item.friendId && typeof item.friendId === "string") {
            return item.friendId;
          }
          if (item.user && typeof item.user === "string") {
            return item.user;
          }
          if (item.id && typeof item.id === "string") {
            return item.id;
          }
          // If object has only one property, use that value
          const keys = Object.keys(item);
          if (keys.length === 1 && typeof item[keys[0]] === "string") {
            return item[keys[0]];
          }
        }
        // Return null for invalid items (will be filtered out)
        return null;
      })
      .filter((id): id is string => id !== null && typeof id === "string");

    console.log("FriendsList: Extracted friend IDs:", friendIds);
    console.log("FriendsList: Number of friends:", friendIds.length);

    // Fetch usernames for each friend
    const friendsWithUsernames = await Promise.all(
      friendIds.map(async (friendId: string) => {
        try {
          const username = await getUsername(friendId);
          console.log(
            `FriendsList: Fetched username for ${friendId}:`,
            username
          );
          if (!username) {
            console.warn(`FriendsList: No username found for ${friendId}`);
          }
          return {
            friendId,
            friendUsername: username || "Unknown User",
          };
        } catch (e) {
          console.error(
            `FriendsList: Error fetching username for ${friendId}:`,
            e
          );
          return {
            friendId,
            friendUsername: "Unknown User",
          };
        }
      })
    );

    console.log("FriendsList: Final friends array:", friendsWithUsernames);
    friends.value = friendsWithUsernames;
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
  const session = props.session || authStore.session;
  if (!session) {
    error.value = "No session available";
    return;
  }

  if (!confirm("Are you sure you want to remove this friend?")) return;

  loading.value = true;
  error.value = null;
  try {
    // Get current user ID from session
    const { apiCall } = await import("@/api/api");
    const userResponse = await apiCall(
      "/Sessioning/_getUser",
      { session },
      "Get User from Session"
    );
    const currentUserId = userResponse?.user as string;

    if (!currentUserId) {
      throw new Error("Could not get current user ID");
    }

    await removeFriend(currentUserId, friendId);
    await loadFriends();
  } catch (e: any) {
    error.value = e.message || "Failed to remove friend";
    console.error("Error removing friend:", e);
  } finally {
    loading.value = false;
  }
}

// Watch for session changes
watch(
  () => props.session,
  (newSession) => {
    if (newSession) {
      console.log("FriendsList: Session prop changed, loading friends...");
      loadFriends();
    }
  },
  { immediate: true } // Run immediately if session is already available on mount
);

onMounted(() => {
  // If session is already available on mount, load friends. Otherwise, the watcher will handle it.
  const session = props.session || authStore.session;
  if (session) {
    console.log("FriendsList: Session available on mount, loading friends...");
    loadFriends();
  } else {
    console.log(
      "FriendsList: No session on mount, waiting for session via watcher..."
    );
  }
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
        :key="friend.friendId"
        class="friend-item"
      >
        <span>{{ friend.friendUsername }}</span>
        <button
          class="remove-button"
          @click="handleRemoveFriend(friend.friendId)"
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

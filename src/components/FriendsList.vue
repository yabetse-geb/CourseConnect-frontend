<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  getAllFriendsBySession,
  removeFriendBySession,
  requestFriend,
} from "@/api/concepts/FriendingAPI";
import { getUsername, getAllUsers } from "@/api/syncs/auth";

interface Props {
  session: string | null;
  userId?: string | null; // Optional, kept for backward compatibility
  refreshKey?: number;
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

// Autocomplete state - following CourseSearch.vue pattern
const allUsersWithUsernames = ref<{ userId: string; username: string }[]>([]);
const loadingSuggestions = ref(false);
const showSuggestions = ref(false);

const filteredFriends = computed(() => {
  if (!searchQuery.value) return friends.value;
  const query = searchQuery.value.toLowerCase();
  return friends.value.filter((f) =>
    f.friendUsername.toLowerCase().includes(query)
  );
});

// Computed property for autocomplete suggestions - following CourseSearch.vue pattern
const filteredSuggestions = computed(() => {
  if (!searchQuery.value.trim()) {
    return [];
  }

  const query = searchQuery.value.toLowerCase().trim();
  const filtered = allUsersWithUsernames.value
    .filter((user) => {
      const username = user.username.toLowerCase();
      return username.includes(query) && username !== "unknown user";
    })
    .map((user) => user.username)
    .slice(0, 10); // Limit to 10 suggestions

  console.log(`FriendsList: Filtered suggestions for "${query}":`, filtered);
  console.log(
    `FriendsList: Total users available:`,
    allUsersWithUsernames.value.length
  );

  return filtered;
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

// Load all users for autocomplete - following CourseSearch.vue pattern
async function loadAllUsers() {
  const session = props.session || authStore.session;
  console.log(
    "FriendsList: loadAllUsers called - session:",
    !!session,
    "already loaded:",
    allUsersWithUsernames.value.length > 0
  );

  if (!session) {
    console.warn("FriendsList: loadAllUsers - No session available!");
    return;
  }

  if (allUsersWithUsernames.value.length > 0) {
    console.log("FriendsList: loadAllUsers - Users already loaded, skipping");
    return;
  }

  loadingSuggestions.value = true;
  error.value = null;

  try {
    console.log("FriendsList: Loading all users with session:", session);
    const userIds = await getAllUsers(session);
    console.log(
      "FriendsList: Got user IDs:",
      userIds,
      "count:",
      userIds.length
    );

    if (userIds.length === 0) {
      console.warn("FriendsList: getAllUsers returned empty array!");
    }

    // Fetch usernames for all users
    const usersWithUsernames = await Promise.all(
      userIds.map(async (userId: string) => {
        try {
          const username = await getUsername(userId);
          console.log(`FriendsList: Fetched username for ${userId}:`, username);
          if (!username) {
            return null;
          }
          return {
            userId,
            username,
          };
        } catch (e) {
          console.error(`Error fetching username for ${userId}:`, e);
          return null;
        }
      })
    );

    // Filter out null entries (users without usernames)
    allUsersWithUsernames.value = usersWithUsernames.filter(
      (user): user is { userId: string; username: string } => user !== null
    );

    console.log(
      "FriendsList: Loaded users with usernames:",
      allUsersWithUsernames.value
    );
    console.log(
      "FriendsList: Usernames:",
      allUsersWithUsernames.value.map((u) => u.username)
    );
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load users";
    allUsersWithUsernames.value = [];
    console.error("FriendsList: Error loading users:", err);
  } finally {
    loadingSuggestions.value = false;
  }
}

// Handle search input - following CourseSearch.vue pattern
async function handleSearch() {
  // Ensure users are loaded if not already
  if (allUsersWithUsernames.value.length === 0) {
    const session = props.session || authStore.session;
    console.log(
      "FriendsList: handleSearch - session available:",
      !!session,
      "session:",
      session
    );
    if (session) {
      console.log("FriendsList: handleSearch - calling loadAllUsers()");
      await loadAllUsers();
      console.log(
        "FriendsList: handleSearch - loadAllUsers completed, users loaded:",
        allUsersWithUsernames.value.length
      );
    } else {
      console.warn("FriendsList: handleSearch - No session available!");
    }
  }

  // Show suggestions if there's a query and results
  showSuggestions.value =
    searchQuery.value.trim().length > 0 && filteredSuggestions.value.length > 0;
}

// Watch search query to automatically show/hide suggestions
watch(
  () => searchQuery.value,
  () => {
    const query = searchQuery.value.trim();
    if (query.length > 0) {
      const hasSuggestions = filteredSuggestions.value.length > 0;
      showSuggestions.value = hasSuggestions;
      console.log(
        `FriendsList: Query "${query}" - showSuggestions:`,
        showSuggestions.value,
        "filteredSuggestions.length:",
        filteredSuggestions.value.length
      );
    } else {
      showSuggestions.value = false;
    }
  }
);

function selectSuggestion(username: string) {
  searchQuery.value = username;
  showSuggestions.value = false;
  // Don't auto-add, let user click Add button or press Enter
}

function handleInputFocus() {
  // Show suggestions if we have a query and results
  if (searchQuery.value && searchQuery.value.trim().length > 0) {
    showSuggestions.value = filteredSuggestions.value.length > 0;
  }
}

function handleInputBlur() {
  // Delay hiding suggestions to allow clicks on suggestions
  setTimeout(() => {
    showSuggestions.value = false;
  }, 200);
}

async function handleAddFriend() {
  if (!authStore.session || !searchQuery.value.trim()) return;

  const usernameToAdd = searchQuery.value.trim();
  loading.value = true;
  error.value = null;
  showSuggestions.value = false;

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

async function handleRemoveFriend(friendUsername: string) {
  const session = props.session || authStore.session;
  if (!session) {
    error.value = "No session available";
    return;
  }

  if (!confirm(`Remove ${friendUsername} from your friends?`)) return;

  loading.value = true;
  error.value = null;
  try {
    console.log(
      `FriendsList: Removing friend ${friendUsername} with session ${session}`
    );
    await removeFriendBySession(session, friendUsername);
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
      loadFriends();
      loadAllUsers(); // Load all users for autocomplete when session becomes available
    }
  },
  { immediate: true } // Run immediately if session is already available on mount
);

// Watch for refresh key changes to reload friends after external updates
watch(
  () => props.refreshKey,
  () => {
    console.log("FriendsList: refreshKey changed, reloading friends...");
    loadFriends();
  }
);

onMounted(() => {
  // If session is already available on mount, load friends and users. Otherwise, the watcher will handle it.
  const session = props.session || authStore.session;
  if (session) {
    loadFriends();
    loadAllUsers(); // Load all users for autocomplete - following CourseSearch.vue pattern
  }
});
</script>

<template>
  <div class="friends-box">
    <h2>FRIENDS</h2>

    <div class="search-section">
      <div class="search-input-wrapper">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search:"
          class="search-input"
          @input="handleSearch"
          @keyup.enter="handleAddFriend"
          @focus="handleInputFocus"
          @blur="handleInputBlur"
        />
        <ul
          v-if="showSuggestions && filteredSuggestions.length > 0"
          class="suggestions-list"
          style="display: block"
        >
          <li
            v-for="(suggestion, index) in filteredSuggestions"
            :key="index"
            class="suggestion-item"
            @mousedown.prevent="selectSuggestion(suggestion)"
          >
            {{ suggestion }}
          </li>
        </ul>
      </div>
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
          @click="handleRemoveFriend(friend.friendUsername)"
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
  align-items: flex-start;
  position: relative;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background);
  color: white;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.suggestions-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  padding: 0;
  list-style: none;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.suggestion-item {
  padding: 10px;
  cursor: pointer;
  color: white;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.2s;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background-color: var(--color-background-mute);
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

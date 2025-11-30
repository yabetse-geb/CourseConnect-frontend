<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  getAllIncomingFriendRequestsBySession,
  acceptFriend,
  rejectFriend,
} from "@/api/concepts/FriendingAPI";
import { getUsername, getAllUsers } from "@/api/syncs/auth";

interface Props {
  session: string | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (event: "friend-updated"): void;
}>();
const authStore = useAuthStore();

interface FriendRequest {
  requesterId: string;
  requesterUsername: string;
}

const requests = ref<FriendRequest[]>([]);
const searchQuery = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

// Autocomplete state - following CourseSearch.vue pattern
const allUsersWithUsernames = ref<{ userId: string; username: string }[]>([]);
const loadingSuggestions = ref(false);
const showSuggestions = ref(false);

async function loadRequests() {
  if (!props.session) {
    console.log("FriendRequestsList: No session available");
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    console.log(
      "FriendRequestsList: Loading requests with session:",
      props.session
    );
    const response = await getAllIncomingFriendRequestsBySession(props.session);
    console.log("FriendRequestsList: API response:", response);

    // Handle different possible response formats
    // Based on GetAllIncomingFriendRequestsResponseSuccess sync: returns { requesters: string[] }
    let requesterIds: string[] = [];

    if (Array.isArray(response)) {
      // Response is directly an array
      requesterIds = response;
    } else if (response && typeof response === "object") {
      // Response is an object - check for requesters property (from sync)
      if ("requesters" in response && Array.isArray(response.requesters)) {
        requesterIds = response.requesters;
      } else if (
        "requestees" in response &&
        Array.isArray(response.requestees)
      ) {
        // Fallback for old format
        requesterIds = response.requestees;
      } else if ("requestee" in response && Array.isArray(response.requestee)) {
        requesterIds = response.requestee;
      } else if ("requester" in response && Array.isArray(response.requester)) {
        requesterIds = response.requester;
      }
    }

    // Filter and normalize: handle case where array contains objects instead of strings
    requesterIds = requesterIds
      .map((item: any) => {
        // If it's already a string, use it
        if (typeof item === "string" && item.length > 0) {
          return item;
        }
        // If it's an object, try to extract user ID from common property names
        if (typeof item === "object" && item !== null) {
          // Try common property names
          if (item.requester && typeof item.requester === "string") {
            return item.requester;
          }
          if (item.user && typeof item.user === "string") {
            return item.user;
          }
          if (item.id && typeof item.id === "string") {
            return item.id;
          }
          // If object has only one property, use that value
          const keys = Object.keys(item);
          if (keys.length === 1) {
            const firstKey = keys[0];
            if (firstKey && typeof item[firstKey] === "string") {
              return item[firstKey];
            }
          }
        }
        // Return null for invalid items (will be filtered out)
        return null;
      })
      .filter((id): id is string => id !== null && typeof id === "string");

    console.log("FriendRequestsList: Extracted requester IDs:", requesterIds);
    console.log("FriendRequestsList: Number of requests:", requesterIds.length);

    // Fetch usernames for each requester
    const requestsWithUsernames = await Promise.all(
      requesterIds.map(async (requesterId: string) => {
        try {
          const username = await getUsername(requesterId);
          console.log(
            `FriendRequestsList: Fetched username for ${requesterId}:`,
            username
          );
          if (!username) {
            console.warn(
              `FriendRequestsList: No username found for ${requesterId}`
            );
          }
          return {
            requesterId,
            requesterUsername: username || "Unknown User",
          };
        } catch (e) {
          console.error(
            `FriendRequestsList: Error fetching username for ${requesterId}:`,
            e
          );
          return {
            requesterId,
            requesterUsername: "Unknown User",
          };
        }
      })
    );

    console.log(
      "FriendRequestsList: Final requests array:",
      requestsWithUsernames
    );
    requests.value = requestsWithUsernames;
  } catch (e: any) {
    error.value = e.message || "Failed to load friend requests";
    console.error("FriendRequestsList: Error loading friend requests:", e);
  } finally {
    loading.value = false;
  }
}

// Computed property for filtered requests
const filteredRequests = computed(() => {
  if (!searchQuery.value.trim()) {
    return requests.value;
  }
  const query = searchQuery.value.toLowerCase().trim();
  return requests.value.filter((r) =>
    r.requesterUsername.toLowerCase().includes(query)
  );
});

// Computed property for autocomplete suggestions - following CourseSearch.vue pattern
const filteredSuggestions = computed(() => {
  if (!searchQuery.value.trim()) {
    return [];
  }

  const query = searchQuery.value.toLowerCase().trim();
  return allUsersWithUsernames.value
    .filter((user) => {
      const username = user.username.toLowerCase();
      return username.includes(query) && username !== "unknown user";
    })
    .map((user) => user.username)
    .slice(0, 10); // Limit to 10 suggestions
});

// Load all users for autocomplete - following CourseSearch.vue pattern
async function loadAllUsers() {
  const session = props.session || authStore.session;
  if (!session || allUsersWithUsernames.value.length > 0) {
    return;
  }

  loadingSuggestions.value = true;
  error.value = null;

  try {
    const userIds = await getAllUsers(session);

    // Fetch usernames for all users
    const usersWithUsernames = await Promise.all(
      userIds.map(async (userId: string) => {
        try {
          const username = await getUsername(userId);
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
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load users";
    allUsersWithUsernames.value = [];
  } finally {
    loadingSuggestions.value = false;
  }
}

// Handle search input - following CourseSearch.vue pattern
async function handleSearch() {
  // Ensure users are loaded if not already
  if (allUsersWithUsernames.value.length === 0) {
    const session = props.session || authStore.session;
    if (session) {
      await loadAllUsers();
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
    } else {
      showSuggestions.value = false;
    }
  }
);

function selectSuggestion(username: string) {
  searchQuery.value = username;
  showSuggestions.value = false;
}

function handleInputFocus() {
  if (searchQuery.value && searchQuery.value.trim().length > 0) {
    showSuggestions.value = filteredSuggestions.value.length > 0;
  }
}

function handleInputBlur() {
  setTimeout(() => {
    showSuggestions.value = false;
  }, 200);
}

async function handleAccept(requesterUsername: string) {
  if (!authStore.session) return;

  loading.value = true;
  error.value = null;
  try {
    await acceptFriend(authStore.session, requesterUsername);
    await loadRequests(); // Reload list after accepting
    emit("friend-updated");
  } catch (e: any) {
    error.value = e.message || "Failed to accept friend request";
    console.error("Error accepting friend request:", e);
  } finally {
    loading.value = false;
  }
}

async function handleReject(requesterUsername: string) {
  if (!authStore.session) return;

  loading.value = true;
  error.value = null;
  try {
    await rejectFriend(authStore.session, requesterUsername);
    await loadRequests(); // Reload list after rejecting
    emit("friend-updated");
  } catch (e: any) {
    error.value = e.message || "Failed to reject friend request";
    console.error("Error rejecting friend request:", e);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.session,
  (newSession) => {
    if (newSession) {
      loadRequests();
      loadAllUsers(); // Load all users for autocomplete when session becomes available
    }
  },
  { immediate: true }
);

onMounted(() => {
  const session = props.session || authStore.session;
  if (session) {
    loadRequests();
    loadAllUsers(); // Load all users for autocomplete - following CourseSearch.vue pattern
  }
});
</script>

<template>
  <div class="requests-box">
    <h2>FRIEND REQUESTS</h2>

    <div class="search-section">
      <div class="search-input-wrapper">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search:"
          class="search-input"
          @input="handleSearch"
          @focus="handleInputFocus"
          @blur="handleInputBlur"
        />
        <ul
          v-if="showSuggestions && filteredSuggestions.length > 0"
          class="suggestions-list"
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
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="loading && filteredRequests.length === 0" class="loading">
      Loading...
    </div>

    <ul v-else class="requests-list">
      <li
        v-for="request in filteredRequests"
        :key="request.requesterId"
        class="request-item"
      >
        <div class="request-info">
          <span class="request-username">{{ request.requesterUsername }}</span>
          <span class="request-label">wants to be your friend</span>
        </div>
        <div class="request-actions">
          <button
            class="accept-button"
            @click="handleAccept(request.requesterUsername)"
            :disabled="loading"
            title="Accept friend request"
          >
            Accept
          </button>
          <button
            class="reject-button"
            @click="handleReject(request.requesterUsername)"
            :disabled="loading"
            title="Reject friend request"
          >
            Reject
          </button>
        </div>
      </li>
      <li v-if="filteredRequests.length === 0" class="empty-message">
        No pending friend requests
      </li>
    </ul>
  </div>
</template>

<style scoped>
.requests-box {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-height: 400px;
}

.requests-box h2 {
  margin: 0 0 10px 0;
  font-size: 1.2rem;
  text-align: center;
  color: white;
}

.search-section {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  position: relative;
  margin-bottom: 15px;
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

.requests-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.request-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.2s;
}

.request-item:hover {
  background-color: var(--color-background-mute);
}

.request-item:last-child {
  border-bottom: none;
}

.request-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.request-username {
  font-weight: bold;
  color: white;
  font-size: 1rem;
}

.request-label {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.request-actions {
  display: flex;
  gap: 10px;
}

.accept-button,
.reject-button {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.accept-button {
  background-color: var(--color-button);
  color: var(--color-button-text);
}

.accept-button:hover:not(:disabled) {
  background-color: var(--color-button-hover);
}

.reject-button {
  background-color: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.reject-button:hover:not(:disabled) {
  background-color: var(--color-background-mute);
}

.accept-button:disabled,
.reject-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-message {
  text-align: center;
  padding: 40px 20px;
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
  padding: 40px 20px;
  color: var(--color-text-muted);
}
</style>

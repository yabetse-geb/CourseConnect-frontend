<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { getAllOutgoingFriendRequestsBySession } from "@/api/concepts/FriendingAPI";
import { getUsername, getAllUsers } from "@/api/syncs/auth";

interface Props {
  session: string | null;
}

const props = defineProps<Props>();
const authStore = useAuthStore();

interface OutgoingRequest {
  requesteeId: string;
  requesteeUsername: string;
}

const outgoingRequests = ref<OutgoingRequest[]>([]);
const searchQuery = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

// Autocomplete state - following CourseSearch.vue pattern
const allUsersWithUsernames = ref<{ userId: string; username: string }[]>([]);
const loadingSuggestions = ref(false);
const showSuggestions = ref(false);

// Computed property for filtered outgoing requests
const filteredOutgoingRequests = computed(() => {
  if (!searchQuery.value.trim()) {
    return outgoingRequests.value;
  }
  const query = searchQuery.value.toLowerCase().trim();
  return outgoingRequests.value.filter((r) =>
    r.requesteeUsername.toLowerCase().includes(query)
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

async function loadOutgoingRequests() {
  const session = props.session || authStore.session;
  if (!session) {
    console.log("OutgoingFriendRequestsList: No session available");
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    console.log(
      "OutgoingFriendRequestsList: Loading outgoing requests with session:",
      session
    );
    const response = await getAllOutgoingFriendRequestsBySession(session);
    console.log("OutgoingFriendRequestsList: API response:", response);

    // Extract requestee IDs from response
    // Based on GetAllOutgoingFriendRequestsResponseSuccess sync: returns { requestees: string[] }
    let requesteeIds: string[] = [];

    if (Array.isArray(response)) {
      requesteeIds = response;
    } else if (response && typeof response === "object") {
      if ("requestees" in response && Array.isArray(response.requestees)) {
        requesteeIds = response.requestees;
      } else if ("requestee" in response && Array.isArray(response.requestee)) {
        requesteeIds = response.requestee;
      }
    }

    // Filter and normalize: handle case where array contains objects instead of strings
    requesteeIds = requesteeIds
      .map((item: any) => {
        if (typeof item === "string" && item.length > 0) {
          return item;
        }
        if (typeof item === "object" && item !== null) {
          if (item.requestee && typeof item.requestee === "string") {
            return item.requestee;
          }
          if (item.user && typeof item.user === "string") {
            return item.user;
          }
          if (item.id && typeof item.id === "string") {
            return item.id;
          }
          const keys = Object.keys(item);
          if (keys.length === 1) {
            const firstKey = keys[0];
            if (firstKey && typeof item[firstKey] === "string") {
              return item[firstKey];
            }
          }
        }
        return null;
      })
      .filter((id): id is string => id !== null && typeof id === "string");

    console.log(
      "OutgoingFriendRequestsList: Extracted requestee IDs:",
      requesteeIds
    );

    // Fetch usernames for each requestee
    const requestsWithUsernames = await Promise.all(
      requesteeIds.map(async (requesteeId: string) => {
        try {
          const username = await getUsername(requesteeId);
          return {
            requesteeId,
            requesteeUsername: username || "Unknown User",
          };
        } catch (e) {
          console.error(
            `OutgoingFriendRequestsList: Error fetching username for ${requesteeId}:`,
            e
          );
          return {
            requesteeId,
            requesteeUsername: "Unknown User",
          };
        }
      })
    );

    console.log(
      "OutgoingFriendRequestsList: Final outgoing requests array:",
      requestsWithUsernames
    );
    outgoingRequests.value = requestsWithUsernames;
  } catch (e: any) {
    error.value = e.message || "Failed to load outgoing friend requests";
    console.error("OutgoingFriendRequestsList: Error loading requests:", e);
  } finally {
    loading.value = false;
  }
}

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

// Watch for session changes
watch(
  () => props.session,
  (newSession) => {
    if (newSession) {
      loadOutgoingRequests();
      loadAllUsers(); // Load all users for autocomplete when session becomes available
    }
  },
  { immediate: true }
);

// Optimistically add an outgoing request without reloading
function addRequestOptimistically(username: string) {
  // Check if already in the list
  const exists = outgoingRequests.value.some(
    (req) => req.requesteeUsername.toLowerCase() === username.toLowerCase()
  );
  if (exists) {
    return; // Already in list, don't add duplicate
  }

  // Find the user ID from our cached users list
  const user = allUsersWithUsernames.value.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (user) {
    // Add immediately to the list (optimistic update)
    outgoingRequests.value.push({
      requesteeId: user.userId,
      requesteeUsername: username,
    });
    console.log(
      `OutgoingFriendRequestsList: Optimistically added ${username} to outgoing requests`
    );
  } else {
    // If user not in cache, fetch the user ID
    // We'll need to get it from the API - for now, use a placeholder and reload
    console.log(
      `OutgoingFriendRequestsList: User ${username} not in cache, will reload silently`
    );
    loadOutgoingRequestsSilently();
  }
}

// Load requests silently without showing loading indicator
async function loadOutgoingRequestsSilently() {
  const session = props.session || authStore.session;
  if (!session) {
    return;
  }

  error.value = null;
  try {
    const response = await getAllOutgoingFriendRequestsBySession(session);

    let requesteeIds: string[] = [];

    if (Array.isArray(response)) {
      requesteeIds = response;
    } else if (response && typeof response === "object") {
      if ("requestees" in response && Array.isArray(response.requestees)) {
        requesteeIds = response.requestees;
      } else if ("requestee" in response && Array.isArray(response.requestee)) {
        requesteeIds = response.requestee;
      }
    }

    requesteeIds = requesteeIds
      .map((item: any) => {
        if (typeof item === "string" && item.length > 0) {
          return item;
        }
        if (typeof item === "object" && item !== null) {
          if (item.requestee && typeof item.requestee === "string") {
            return item.requestee;
          }
          if (item.user && typeof item.user === "string") {
            return item.user;
          }
          if (item.id && typeof item.id === "string") {
            return item.id;
          }
          const keys = Object.keys(item);
          if (keys.length === 1) {
            const firstKey = keys[0];
            if (firstKey && typeof item[firstKey] === "string") {
              return item[firstKey];
            }
          }
        }
        return null;
      })
      .filter((id): id is string => id !== null && typeof id === "string");

    const requestsWithUsernames = await Promise.all(
      requesteeIds.map(async (requesteeId: string) => {
        try {
          const username = await getUsername(requesteeId);
          return {
            requesteeId,
            requesteeUsername: username || "Unknown User",
          };
        } catch (e) {
          console.error(
            `OutgoingFriendRequestsList: Error fetching username for ${requesteeId}:`,
            e
          );
          return {
            requesteeId,
            requesteeUsername: "Unknown User",
          };
        }
      })
    );

    outgoingRequests.value = requestsWithUsernames.filter(
      (req) => req.requesteeUsername !== "Unknown User"
    );
  } catch (e: any) {
    console.error(
      "OutgoingFriendRequestsList: Error silently loading requests:",
      e
    );
    // Don't set error.value to avoid showing error message
  }
}

// Remove refreshKey prop since we're using optimistic updates instead
// The refreshKey watcher is no longer needed

onMounted(() => {
  const session = props.session || authStore.session;
  if (session) {
    loadOutgoingRequests();
    loadAllUsers(); // Load all users for autocomplete - following CourseSearch.vue pattern
  }
});

// Expose method for parent to call optimistically add requests
defineExpose({
  addRequestOptimistically,
});
</script>

<template>
  <div class="outgoing-requests-box">
    <h2>SENT REQUESTS</h2>

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

    <div v-if="loading" class="loading">Loading...</div>

    <ul v-else class="outgoing-requests-list">
      <li
        v-for="request in filteredOutgoingRequests"
        :key="request.requesteeId"
        class="outgoing-request-item"
      >
        <span>{{ request.requesteeUsername }}</span>
      </li>
      <li v-if="filteredOutgoingRequests.length === 0" class="empty-message">
        No outgoing friend requests
      </li>
    </ul>
  </div>
</template>

<style scoped>
.outgoing-requests-box {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-height: 400px;
}

.outgoing-requests-box h2 {
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

.outgoing-requests-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.outgoing-request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--color-border);
}

.outgoing-request-item span {
  flex: 1;
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

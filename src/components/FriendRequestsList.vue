<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  getAllIncomingFriendRequestsBySession,
  acceptFriend,
  rejectFriend,
} from "@/api/concepts/FriendingAPI";
import { getUsername } from "@/api/syncs/auth";

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
const loading = ref(false);
const error = ref<string | null>(null);

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

onMounted(() => {
  loadRequests();
});
</script>

<template>
  <div class="requests-box">
    <h2>FRIEND REQUESTS</h2>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="loading && requests.length === 0" class="loading">
      Loading...
    </div>

    <ul v-else class="requests-list">
      <li
        v-for="request in requests"
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
      <li v-if="requests.length === 0" class="empty-message">
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

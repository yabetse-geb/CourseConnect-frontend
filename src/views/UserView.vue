<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { getUsername, getAllUsers } from "@/api/syncs/auth";
import { apiCall } from "@/api/api";
import {
  getAllFriendsBySession,
  requestFriend,
} from "@/api/concepts/FriendingAPI";
import { getBlockedUsersBySession } from "@/api/concepts/BlockingAPI";
import FriendsList from "@/components/FriendsList.vue";
import BlockedListView from "@/components/BlockedListView.vue";
import GroupsList from "@/components/GroupsList.vue";
import GroupMem from "@/components/GroupMem.vue";
import FriendRequestsList from "@/components/FriendRequestsList.vue";
import OutgoingFriendRequestsList from "@/components/OutgoingFriendRequestsList.vue";

const outgoingRequestsListRef = ref<InstanceType<
  typeof OutgoingFriendRequestsList
> | null>(null);

const authStore = useAuthStore();

const loadingUsername = ref(false);
const username = ref("");

const currentUserId = ref<string | null>(authStore.user || null);
const friendListRefreshKey = ref(0);
const groupsRefreshKey = ref(0);
const pendingRequestsCounts = ref<Record<string, number>>({});
const selectedGroupId = ref<string | null>(null);
const selectedGroupName = ref<string | null>(null);

// State for showing/hiding modals
const showFriendsList = ref(false);
const showFriendRequests = ref(false);
const showBlockedList = ref(false);

// Friend count
const friendCount = ref(0);
const loadingFriendCount = ref(false);

// Blocked count
const blockedCount = ref(0);
const loadingBlockedCount = ref(false);

// Add friend functionality for friend requests modal
const addFriendQuery = ref("");
const allUsersWithUsernames = ref<{ userId: string; username: string }[]>([]);
const showAddFriendSuggestions = ref(false);
const loadingAddFriendSuggestions = ref(false);
const addingFriend = ref(false);
const addFriendError = ref<string | null>(null);

function handleFriendUpdates() {
  friendListRefreshKey.value += 1;
  loadFriendCount(); // Reload friend count when friends are updated
}

function handleBlockedUpdates() {
  loadBlockedCount(); // Reload blocked count when blocked users are updated
}

// Add friend functionality
const filteredAddFriendSuggestions = computed(() => {
  if (!addFriendQuery.value.trim()) {
    return [];
  }

  const query = addFriendQuery.value.toLowerCase().trim();
  return allUsersWithUsernames.value
    .filter((user) => {
      const username = user.username.toLowerCase();
      return username.includes(query) && username !== "unknown user";
    })
    .map((user) => user.username)
    .slice(0, 10);
});

async function loadAllUsersForAddFriend() {
  const session = authStore.session;
  if (!session || allUsersWithUsernames.value.length > 0) {
    return;
  }

  loadingAddFriendSuggestions.value = true;
  try {
    const userIds = await getAllUsers(session);
    const usersWithUsernames = await Promise.all(
      userIds.map(async (userId: string) => {
        try {
          const username = await getUsername(userId);
          if (!username) {
            return null;
          }
          return { userId, username };
        } catch (e) {
          console.error(`Error fetching username for ${userId}:`, e);
          return null;
        }
      })
    );

    allUsersWithUsernames.value = usersWithUsernames.filter(
      (user): user is { userId: string; username: string } => user !== null
    );
  } catch (err) {
    console.error("Error loading users for add friend:", err);
  } finally {
    loadingAddFriendSuggestions.value = false;
  }
}

async function handleAddFriendSearch() {
  if (allUsersWithUsernames.value.length === 0) {
    await loadAllUsersForAddFriend();
  }
  showAddFriendSuggestions.value =
    addFriendQuery.value.trim().length > 0 &&
    filteredAddFriendSuggestions.value.length > 0;
}

function selectAddFriendSuggestion(username: string) {
  addFriendQuery.value = username;
  showAddFriendSuggestions.value = false;
}

function handleAddFriendInputFocus() {
  if (addFriendQuery.value && addFriendQuery.value.trim().length > 0) {
    showAddFriendSuggestions.value =
      filteredAddFriendSuggestions.value.length > 0;
  }
}

function handleAddFriendInputBlur() {
  setTimeout(() => {
    showAddFriendSuggestions.value = false;
  }, 200);
}

async function handleSendFriendRequest() {
  if (!authStore.session || !addFriendQuery.value.trim()) return;

  const usernameToAdd = addFriendQuery.value.trim();
  addingFriend.value = true;
  addFriendError.value = null;
  showAddFriendSuggestions.value = false;

  try {
    await requestFriend(authStore.session, usernameToAdd);
    addFriendQuery.value = "";
    // Add the request optimistically
    handleFriendRequestSent(usernameToAdd);
    // Reload friend count in case they accepted immediately
    await loadFriendCount();
  } catch (e: any) {
    addFriendError.value = e.message || "Failed to send friend request";
    console.error("Error sending friend request:", e);
  } finally {
    addingFriend.value = false;
  }
}

async function loadFriendCount() {
  const session = authStore.session;
  if (!session) {
    return;
  }

  loadingFriendCount.value = true;
  try {
    const response = await getAllFriendsBySession(session);
    let friends: string[] = [];

    if (Array.isArray(response)) {
      friends = response;
    } else if (response && typeof response === "object") {
      if ("friends" in response && Array.isArray(response.friends)) {
        friends = response.friends;
      }
    }

    friendCount.value = friends.length;
  } catch (e: any) {
    console.error("Error loading friend count:", e);
    friendCount.value = 0;
  } finally {
    loadingFriendCount.value = false;
  }
}

async function loadBlockedCount() {
  const session = authStore.session;
  if (!session) {
    return;
  }

  loadingBlockedCount.value = true;
  try {
    const response = await getBlockedUsersBySession(session);
    let blocked: string[] = [];

    if (Array.isArray(response)) {
      blocked = response;
    } else if (response && typeof response === "object") {
      if ("blockedUsers" in response && Array.isArray(response.blockedUsers)) {
        blocked = response.blockedUsers;
      } else if ("user" in response && Array.isArray(response.user)) {
        blocked = response.user;
      }
    }

    blockedCount.value = blocked.length;
  } catch (e: any) {
    console.error("Error loading blocked count:", e);
    blockedCount.value = 0;
  } finally {
    loadingBlockedCount.value = false;
  }
}

function toggleFriendsList() {
  showFriendsList.value = !showFriendsList.value;
  if (showFriendsList.value) {
    showFriendRequests.value = false;
  }
}

function toggleFriendRequests() {
  showFriendRequests.value = !showFriendRequests.value;
  if (showFriendRequests.value) {
    showFriendsList.value = false;
    showBlockedList.value = false;
  }
}

function toggleBlockedList() {
  showBlockedList.value = !showBlockedList.value;
  if (showBlockedList.value) {
    showFriendsList.value = false;
    showFriendRequests.value = false;
  }
}

function handleFriendRequestSent(username: string) {
  // Add the request optimistically (immediately without loading indicator)
  outgoingRequestsListRef.value?.addRequestOptimistically(username);
}

function handleGroupSelected(groupId: string, groupName: string) {
  selectedGroupId.value = groupId;
  selectedGroupName.value = groupName;
}

function handleRequestsUpdated() {
  groupsRefreshKey.value += 1;
}

function handlePendingCountsUpdated(counts: Record<string, number>) {
  pendingRequestsCounts.value = { ...pendingRequestsCounts.value, ...counts };
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
      await loadFriendCount();
      await loadBlockedCount();
    }
  }
);

// Watch refreshKey to update friend count when friends list is refreshed
watch(
  () => friendListRefreshKey.value,
  () => {
    loadFriendCount();
  }
);

// Watch for friend requests modal to load users when opened
watch(
  () => showFriendRequests.value,
  (isOpen) => {
    if (isOpen) {
      loadAllUsersForAddFriend();
    }
  }
);

// Watch for blocked list modal to reload count when opened
watch(
  () => showBlockedList.value,
  (isOpen) => {
    if (isOpen) {
      loadBlockedCount();
    }
  }
);

// Watch add friend query for suggestions
watch(
  () => addFriendQuery.value,
  () => {
    const query = addFriendQuery.value.trim();
    if (query.length > 0) {
      const hasSuggestions = filteredAddFriendSuggestions.value.length > 0;
      showAddFriendSuggestions.value = hasSuggestions;
    } else {
      showAddFriendSuggestions.value = false;
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
  // Load friend count
  await loadFriendCount();
  // Load blocked count
  await loadBlockedCount();
});
</script>

<template>
  <div class="user-page">
    <header class="page-header">
      <h1 class="page-title">Welcome Back</h1>
      <p class="page-subtitle">Manage your profile and connections</p>
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

        <div class="friends-section">
          <span class="friends-label">Friends</span>
          <div class="friends-actions">
            <button
              class="friend-count-button"
              @click="toggleFriendsList"
              :disabled="loadingFriendCount"
            >
              {{ loadingFriendCount ? "..." : friendCount }}
            </button>
            <button
              class="friend-requests-icon-button"
              @click="toggleFriendRequests"
              title="Friend Requests"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="8"
                  r="3"
                  stroke="currentColor"
                  stroke-width="2"
                  fill="none"
                />
                <path
                  d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"
                  stroke="currentColor"
                  stroke-width="2"
                  fill="none"
                />
                <line
                  x1="19"
                  y1="8"
                  x2="19"
                  y2="4"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <line
                  x1="17"
                  y1="6"
                  x2="21"
                  y2="6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="blocked-section">
          <span class="blocked-label">Blocked</span>
          <button
            class="blocked-count-button"
            @click="toggleBlockedList"
            :disabled="loadingBlockedCount"
          >
            {{ loadingBlockedCount ? "..." : blockedCount }}
          </button>
        </div>
      </div>
    </div>

    <!-- Friends List Modal -->
    <div
      v-if="showFriendsList"
      class="modal-overlay"
      @click.self="showFriendsList = false"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2>Friends</h2>
          <button class="close-button" @click="showFriendsList = false">
            ×
          </button>
        </div>
        <FriendsList
          v-if="authStore.session"
          :session="authStore.session"
          :refreshKey="friendListRefreshKey"
          :showAddFriend="false"
        />
      </div>
    </div>

    <!-- Friend Requests Modal -->
    <div
      v-if="showFriendRequests"
      class="modal-overlay"
      @click.self="showFriendRequests = false"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2>Friend Requests</h2>
          <button class="close-button" @click="showFriendRequests = false">
            ×
          </button>
        </div>
        <div class="add-friend-section">
          <h3>Add Friend</h3>
          <div class="add-friend-search-wrapper">
            <div class="search-input-wrapper">
              <input
                v-model="addFriendQuery"
                type="text"
                placeholder="Search username to add..."
                class="search-input"
                @input="handleAddFriendSearch"
                @keyup.enter="handleSendFriendRequest"
                @focus="handleAddFriendInputFocus"
                @blur="handleAddFriendInputBlur"
              />
              <ul
                v-if="
                  showAddFriendSuggestions &&
                  filteredAddFriendSuggestions.length > 0
                "
                class="suggestions-list"
              >
                <li
                  v-for="(suggestion, index) in filteredAddFriendSuggestions"
                  :key="index"
                  class="suggestion-item"
                  @mousedown.prevent="selectAddFriendSuggestion(suggestion)"
                >
                  {{ suggestion }}
                </li>
              </ul>
            </div>
            <button
              class="add-button"
              @click="handleSendFriendRequest"
              :disabled="addingFriend || !addFriendQuery.trim()"
            >
              {{ addingFriend ? "Sending..." : "Add" }}
            </button>
          </div>
          <div v-if="addFriendError" class="error-message">
            {{ addFriendError }}
          </div>
        </div>
        <div class="requests-container">
          <FriendRequestsList
            v-if="authStore.session"
            :session="authStore.session"
            @friend-updated="handleFriendUpdates"
          />
          <OutgoingFriendRequestsList
            v-if="authStore.session"
            ref="outgoingRequestsListRef"
            :session="authStore.session"
          />
        </div>
      </div>
    </div>

    <!-- Blocked List Modal -->
    <div
      v-if="showBlockedList"
      class="modal-overlay"
      @click.self="showBlockedList = false"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2>Blocked Users</h2>
          <button class="close-button" @click="showBlockedList = false">
            ×
          </button>
        </div>
        <BlockedListView
          v-if="authStore.session"
          :session="authStore.session"
          @blocked-updated="handleBlockedUpdates"
        />
      </div>
    </div>

    <div class="row-2" v-if="authStore.session">
      <GroupsList
        :session="authStore.session"
        :refreshKey="groupsRefreshKey"
        :pendingRequestsCounts="pendingRequestsCounts"
        @group-selected="handleGroupSelected"
      />
      <GroupMem
        :session="authStore.session"
        :selectedGroupId="selectedGroupId"
        :selectedGroupName="selectedGroupName"
        @requests-updated="handleRequestsUpdated"
        @pending-counts-updated="handlePendingCountsUpdated"
      />
    </div>
  </div>
</template>

<style scoped>
.user-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
}

.page-header {
  text-align: center;
  margin-bottom: 50px;
  padding: 20px 0;
}

.page-title {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 10px;
  color: white;
  background: linear-gradient(
    135deg,
    #ffffff 0%,
    rgba(255, 255, 255, 0.8) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 400;
  margin: 0;
}

.user-profile-section {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.03) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 50px 40px;
  margin-bottom: 40px;
  display: flex;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.profile-details {
  display: flex;
  align-items: flex-start;
  gap: 80px;
  justify-content: center;
  flex-wrap: wrap;
  text-align: center;
  width: 100%;
}

.username-block {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
}

.username-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.username-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  padding: 18px 32px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.06) 100%
  );
  min-width: 280px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.username-value:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.2);
}

.friends-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
}

.friends-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.friends-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.friend-count-button {
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
  padding: 16px 28px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.06) 100%
  );
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 90px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.friend-count-button::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  transition: left 0.5s;
}

.friend-count-button:hover:not(:disabled)::before {
  left: 100%;
}

.friend-count-button:hover:not(:disabled) {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.18) 0%,
    rgba(255, 255, 255, 0.1) 100%
  );
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.25);
}

.friend-count-button:active:not(:disabled) {
  transform: translateY(-1px) scale(0.98);
}

.friend-count-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.friend-requests-icon-button {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.06) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  padding: 12px;
  cursor: pointer;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 52px;
  height: 52px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.friend-requests-icon-button svg {
  transition: transform 0.3s ease;
}

.friend-requests-icon-button:hover {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.18) 0%,
    rgba(255, 255, 255, 0.1) 100%
  );
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.25);
}

.friend-requests-icon-button:hover svg {
  transform: scale(1.1);
}

.friend-requests-icon-button:active {
  transform: translateY(-1px) scale(1.02);
}

.blocked-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
  text-align: center;
}

.blocked-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.blocked-count-button {
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
  padding: 16px 28px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.06) 100%
  );
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 90px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.blocked-count-button::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  transition: left 0.5s;
}

.blocked-count-button:hover:not(:disabled)::before {
  left: 100%;
}

.blocked-count-button:hover:not(:disabled) {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.18) 0%,
    rgba(255, 255, 255, 0.1) 100%
  );
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.25);
}

.blocked-count-button:active:not(:disabled) {
  transform: translateY(-1px) scale(0.98);
}

.blocked-count-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-content :deep(.friends-box),
.modal-content :deep(.requests-box),
.modal-content :deep(.outgoing-requests-box),
.modal-content :deep(.blocked-box) {
  min-height: auto;
  border: none;
  border-radius: 0;
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}

.modal-header h2 {
  margin: 0;
  color: white;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.close-button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1.75rem;
  cursor: pointer;
  padding: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition: all 0.2s ease;
  line-height: 1;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.add-friend-section {
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.add-friend-section h3 {
  margin: 0 0 15px 0;
  color: white;
  font-size: 1.2rem;
  font-weight: 600;
}

.add-friend-search-wrapper {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  position: relative;
}

.add-friend-section .search-input-wrapper {
  flex: 1;
  position: relative;
}

.add-friend-section .search-input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background);
  color: white;
}

.add-friend-section .search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.add-friend-section .suggestions-list {
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

.add-friend-section .suggestion-item {
  padding: 10px;
  cursor: pointer;
  color: white;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.2s;
}

.add-friend-section .suggestion-item:last-child {
  border-bottom: none;
}

.add-friend-section .suggestion-item:hover {
  background-color: var(--color-background-mute);
}

.add-friend-section .add-button {
  padding: 8px 16px;
  background-color: var(--color-button);
  color: var(--color-button-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.add-friend-section .add-button:hover:not(:disabled) {
  background-color: var(--color-button-hover);
}

.add-friend-section .add-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.add-friend-section .error-message {
  color: var(--color-error, #ff4444);
  padding: 10px;
  background-color: var(--color-background-mute);
  border-radius: 4px;
  font-size: 0.9rem;
  margin-top: 10px;
}

.requests-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.row-2 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 20px;
}

@media (max-width: 1024px) {
  .row-2 {
    grid-template-columns: 1fr;
  }

  .profile-details {
    gap: 40px;
  }

  .page-title {
    font-size: 2.5rem;
  }
}

@media (max-width: 768px) {
  .user-page {
    padding: 20px 15px;
  }

  .page-title {
    font-size: 2rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }

  .user-profile-section {
    padding: 30px 20px;
  }

  .profile-details {
    gap: 30px;
    flex-direction: column;
  }

  .username-value {
    font-size: 2rem;
    min-width: 200px;
  }

  .friend-count-button,
  .blocked-count-button {
    font-size: 1.5rem;
    padding: 14px 24px;
  }
}
</style>

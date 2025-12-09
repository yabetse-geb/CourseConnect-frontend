<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  getUserGroups,
  getAllGroups,
  getGroupName,
  createGroup,
  requestToJoin,
  getUserRequests,
  isGroupAdmin,
  getGroupRequests,
} from "@/api/concepts/GroupingAPI";

interface Props {
  session: string | null;
  refreshKey?: number;
  pendingRequestsCounts?: Record<string, number>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "group-selected", groupId: string, groupName: string): void;
}>();

const authStore = useAuthStore();

interface Group {
  groupId: string;
  groupName: string;
  hasPendingRequests?: boolean;
}

interface PendingRequest {
  groupId: string;
  groupName: string;
}

const groups = ref<Group[]>([]);
const pendingRequests = ref<PendingRequest[]>([]);
const searchQuery = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

// Autocomplete state - following FriendsList.vue pattern
const allGroupsWithNames = ref<Group[]>([]);
const loadingSuggestions = ref(false);
const showSuggestions = ref(false);

const filteredGroups = computed(() => {
  if (!searchQuery.value) return groups.value;
  const query = searchQuery.value.toLowerCase();
  // Only filter user's actual groups, not all groups
  return groups.value.filter((g) => g.groupName.toLowerCase().includes(query));
});

// Computed property for autocomplete suggestions
const filteredSuggestions = computed(() => {
  if (!searchQuery.value.trim()) {
    return [];
  }

  const query = searchQuery.value.toLowerCase().trim();
  const filtered = allGroupsWithNames.value
    .filter((group) => {
      const name = group.groupName.toLowerCase();
      return name.includes(query) && name !== "";
    })
    .map((group) => group.groupName)
    .slice(0, 10); // Limit to 10 suggestions

  return filtered;
});

async function loadUserGroups() {
  const session = props.session || authStore.session;
  if (!session) {
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    const groupIds = await getUserGroups();

    // Ensure groupIds is an array
    if (!Array.isArray(groupIds)) {
      console.warn(
        "GroupsList: getUserGroups did not return an array:",
        groupIds
      );
      groups.value = [];
      return;
    }

    // Fetch names for each group
    const groupsWithNames = await Promise.all(
      groupIds.map(async (groupId: string) => {
        try {
          const response = await getGroupName(groupId);
          const groupName = response?.name?.trim() || `Group ${groupId}`;
          const hasPendingRequests =
            (props.pendingRequestsCounts?.[groupId] || 0) > 0;
          return {
            groupId,
            groupName,
            hasPendingRequests,
          };
        } catch (e) {
          console.error(`GroupsList: Error fetching name for ${groupId}:`, e);
          return {
            groupId,
            groupName: `Group ${groupId}`,
            hasPendingRequests: false,
          };
        }
      })
    );

    groups.value = groupsWithNames;
  } catch (e: any) {
    error.value = e.message || "Failed to load groups";
    console.error("Error loading groups:", e);
  } finally {
    loading.value = false;
  }
}

// Load pending join requests
async function loadPendingRequests() {
  const session = props.session || authStore.session;
  if (!session) {
    return;
  }

  try {
    const response = await getUserRequests();

    // Backend returns [{group: "id"}, ...], so extract the group property from each object
    const groupIds: string[] = response
      .map((item: any) => item.group)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (groupIds.length === 0) {
      pendingRequests.value = [];
      return;
    }

    // Fetch names for each pending request
    const requestsWithNames = await Promise.all(
      groupIds.map(async (groupId: string) => {
        try {
          const response = await getGroupName(groupId);
          const groupName = response?.name?.trim() || `Group ${groupId}`;
          return {
            groupId,
            groupName,
          };
        } catch (e) {
          console.error(
            `GroupsList: Error fetching name for pending request ${groupId}:`,
            e
          );
          return {
            groupId,
            groupName: `Group ${groupId}`,
          };
        }
      })
    );

    pendingRequests.value = requestsWithNames;
  } catch (e: any) {
    console.error("Error loading pending requests:", e);
    pendingRequests.value = [];
  }
}

// Load all groups for autocomplete
async function loadAllGroups() {
  const session = props.session || authStore.session;

  if (!session) {
    return;
  }

  if (allGroupsWithNames.value.length > 0) {
    return;
  }

  loadingSuggestions.value = true;
  error.value = null;

  try {
    const groupIds = await getAllGroups();

    // Ensure groupIds is an array
    if (!Array.isArray(groupIds)) {
      console.warn(
        "GroupsList: getAllGroups did not return an array:",
        groupIds
      );
      allGroupsWithNames.value = [];
      return;
    }

    // Fetch names for all groups
    const groupsWithNames = await Promise.all(
      groupIds.map(async (groupId: string) => {
        try {
          const response = await getGroupName(groupId);
          const groupName = response.name || `Group ${groupId}`;
          if (!groupName) {
            return null;
          }
          return {
            groupId,
            groupName,
          };
        } catch (e) {
          console.error(
            `GroupsList (loadAllGroups): Error fetching name for ${groupId}:`,
            e
          );
          return null;
        }
      })
    );

    // Filter out null entries
    allGroupsWithNames.value = groupsWithNames.filter(
      (group): group is Group => group !== null
    );
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load groups";
    allGroupsWithNames.value = [];
    console.error("GroupsList: Error loading groups:", err);
  } finally {
    loadingSuggestions.value = false;
  }
}

// Handle search input
async function handleSearch() {
  // Ensure groups are loaded if not already
  if (allGroupsWithNames.value.length === 0) {
    const session = props.session || authStore.session;
    if (session) {
      await loadAllGroups();
    } else {
      console.warn("GroupsList: handleSearch - No session available!");
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

function selectSuggestion(groupName: string) {
  searchQuery.value = groupName;
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

async function handleCreateGroup() {
  if (!authStore.session || !searchQuery.value.trim()) return;

  const groupName = searchQuery.value.trim();
  loading.value = true;
  error.value = null;
  showSuggestions.value = false;

  try {
    const result = await createGroup(groupName);
    const newGroupId = result.group;
    searchQuery.value = "";

    // Optimistically add the group with the name we know
    const newGroup = {
      groupId: newGroupId,
      groupName: groupName,
    };

    // Check if group already exists in the list
    const existingIndex = groups.value.findIndex(
      (g) => g.groupId === newGroupId
    );
    if (existingIndex === -1) {
      groups.value.push(newGroup);
    } else {
      // Update existing entry with correct name
      groups.value[existingIndex] = newGroup;
    }

    // Reload to ensure consistency
    await loadUserGroups();
  } catch (e: any) {
    error.value = e.message || "Failed to create group";
    console.error("Error creating group:", e);
  } finally {
    loading.value = false;
  }
}

async function handleRequestToJoin() {
  if (!authStore.session || !searchQuery.value.trim()) return;

  const groupName = searchQuery.value.trim();
  loading.value = true;
  error.value = null;
  showSuggestions.value = false;

  try {
    // Find the group ID from the name
    const group = allGroupsWithNames.value.find(
      (g) => g.groupName.toLowerCase() === groupName.toLowerCase()
    );

    if (!group) {
      error.value = `Group "${groupName}" not found`;
      return;
    }

    await requestToJoin(group.groupId);

    // Optimistically add to pending requests
    const pendingRequest: PendingRequest = {
      groupId: group.groupId,
      groupName: group.groupName,
    };

    // Check if already in pending requests
    const existingIndex = pendingRequests.value.findIndex(
      (r) => r.groupId === group.groupId
    );
    if (existingIndex === -1) {
      pendingRequests.value.push(pendingRequest);
    }

    searchQuery.value = "";
    // Reload user groups in case the request was auto-accepted
    await loadUserGroups();
    // Reload pending requests to ensure consistency
    await loadPendingRequests();
  } catch (e: any) {
    error.value = e.message || "Failed to request to join group";
    console.error("Error requesting to join group:", e);
  } finally {
    loading.value = false;
  }
}

function handleGroupClick(group: Group) {
  emit("group-selected", group.groupId, group.groupName);
}

// Watch for session changes
watch(
  () => props.session,
  (newSession) => {
    if (newSession) {
      loadUserGroups();
      loadAllGroups();
      loadPendingRequests();
    }
  },
  { immediate: true }
);

// Watch for refresh key changes
watch(
  () => props.refreshKey,
  () => {
    loadUserGroups();
  }
);

// Watch for pending requests counts changes
watch(
  () => props.pendingRequestsCounts,
  (newCounts) => {
    if (newCounts) {
      groups.value = groups.value.map((group) => ({
        ...group,
        hasPendingRequests: (newCounts[group.groupId] || 0) > 0,
      }));
    }
  },
  { deep: true }
);

onMounted(() => {
  const session = props.session || authStore.session;
  if (session) {
    loadUserGroups();
    loadAllGroups();
    loadPendingRequests();
  }
});
</script>

<template>
  <div class="groups-box">
    <h2>GROUPS</h2>

    <div class="search-section">
      <div class="search-input-wrapper">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search or create:"
          class="search-input"
          @input="handleSearch"
          @keyup.enter="handleRequestToJoin"
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
      <div class="button-group">
        <button class="create-button" @click="handleCreateGroup">Create</button>
        <button class="join-button" @click="handleRequestToJoin">Join</button>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <!-- Pending Join Requests Section -->
    <div v-if="pendingRequests.length > 0" class="pending-requests-section">
      <h3 class="pending-requests-header">PENDING JOIN REQUESTS</h3>
      <ul class="pending-requests-list">
        <li
          v-for="request in pendingRequests"
          :key="request.groupId"
          class="pending-request-item"
        >
          <span class="pending-request-name">{{ request.groupName }}</span>
          <span class="pending-label">Pending</span>
        </li>
      </ul>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <ul v-else class="groups-list">
      <li
        v-for="group in filteredGroups"
        :key="group.groupId"
        class="group-item"
        @click="handleGroupClick(group)"
      >
        <span class="group-name">{{ group.groupName }}</span>
        <span
          v-if="group.hasPendingRequests"
          class="pending-indicator"
          title="Pending join requests"
          >!</span
        >
      </li>
      <li v-if="filteredGroups.length === 0" class="empty-message">
        No groups yet
      </li>
    </ul>
  </div>
</template>

<style scoped>
.groups-box {
  background-color: #a31f34;
  border: 1px solid #a31f34;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-height: 400px;
}

.groups-box h2 {
  margin: 0 0 10px 0;
  font-size: 1.2rem;
  text-align: center;
  color: #ffffff;
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
  border: 1px solid #a31f34;
  border-radius: 4px;
  background-color: #8a8b8c;
  color: #ffffff;
}

.search-input::placeholder {
  color: #ffffff;
  opacity: 0.7;
}

.suggestions-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  padding: 0;
  list-style: none;
  background-color: #0f0f0f;
  border: 1px solid #a31f34;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
}

.suggestion-item {
  padding: 10px;
  cursor: pointer;
  color: #ffffff;
  border-bottom: 1px solid #a31f34;
  transition: background-color 0.2s;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background-color: #a31f34;
}

.button-group {
  display: flex;
  gap: 5px;
}

.create-button {
  padding: 8px 16px;
  background-color: #8a8b8c;
  color: #ffffff;
  border: 1px solid #a31f34;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.create-button:hover {
  background-color: #8a8b8c;
  transform: scale(1.05);
}

.join-button {
  padding: 8px 16px;
  background-color: #8a8b8c;
  color: #ffffff;
  border: 1px solid #a31f34;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.join-button:hover {
  background-color: #8a8b8c;
  transform: scale(1.05);
}

.groups-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #a31f34;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #ffffff;
}

.group-item:hover {
  background-color: rgba(163, 31, 52, 0.3);
  transform: scale(1.02);
}

.pending-indicator {
  color: #fdd835;
  font-weight: bold;
  font-size: 1.1rem;
  margin-left: 10px;
  flex-shrink: 0;
}

.group-name {
  flex: 1;
}

.empty-message {
  text-align: center;
  padding: 20px;
  color: #8a8b8c;
  font-style: italic;
}

.error-message {
  color: #ffffff;
  padding: 10px;
  background-color: #a31f34;
  border: 1px solid #a31f34;
  border-radius: 4px;
  font-size: 0.9rem;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #8a8b8c;
}

.pending-requests-section {
  margin-top: 10px;
  margin-bottom: 10px;
}

.pending-requests-header {
  font-size: 0.9rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 10px 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pending-requests-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.pending-request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #a31f34;
  background-color: #8a8b8c;
  border-radius: 4px;
  margin-bottom: 5px;
}

.pending-request-name {
  flex: 1;
  color: #ffffff;
}

.pending-label {
  font-size: 0.85rem;
  color: #ffffff;
  font-style: italic;
  padding: 2px 8px;
  background-color: #0f0f0f;
  border-radius: 3px;
}
</style>

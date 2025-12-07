<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { getAllFriendsBySession } from "@/api/concepts/FriendingAPI";
import { getUserGroups, getGroupName, getMembers } from "@/api/concepts/GroupingAPI";
import { getUsername } from "@/api/syncs/auth";

interface Props {
  session: string | null;
  selectedFriendIds?: string[]; // Array of selected friend IDs (up to 2)
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "friend-selected", friendId: string, friendUsername: string): void;
  (e: "friend-deselected", friendId: string): void;
}>();

const authStore = useAuthStore();

interface Member {
  memberId: string;
  memberUsername: string;
}

interface Group {
  groupId: string;
  groupName: string;
}

// Special identifier for the "All" option
const ALL_TAB_ID = "__ALL__";

const currentTab = ref<string>(ALL_TAB_ID); // Default to "All" tab
const groups = ref<Group[]>([]);
const friends = ref<Member[]>([]);
const groupMembers = ref<Record<string, Member[]>>({});
const searchQuery = ref("");
const loading = ref(false);
const error = ref<string | null>(null);
const showDropdown = ref(false);

// Computed property for current tab's members
const currentMembers = computed(() => {
  if (currentTab.value === ALL_TAB_ID) {
    // Combine all friends and all group members, removing duplicates
    const allMembersMap = new Map<string, Member>();
    
    // Add all friends
    friends.value.forEach((friend) => {
      allMembersMap.set(friend.memberId, friend);
    });
    
    // Add all group members (duplicates will be overwritten, keeping the first occurrence)
    Object.values(groupMembers.value).forEach((members) => {
      members.forEach((member) => {
        if (!allMembersMap.has(member.memberId)) {
          allMembersMap.set(member.memberId, member);
        }
      });
    });
    
    return Array.from(allMembersMap.values());
  }
  
  if (currentTab.value === "Friends") {
    return friends.value;
  }
  
  return groupMembers.value[currentTab.value] || [];
});

// Filtered members based on search query (only within current tab)
const filteredMembers = computed(() => {
  if (!searchQuery.value) return currentMembers.value;
  const query = searchQuery.value.toLowerCase();
  return currentMembers.value.filter((m) =>
    m.memberUsername.toLowerCase().includes(query)
  );
});

// Computed property for current selection display name
const currentSelectionName = computed(() => {
  if (currentTab.value === ALL_TAB_ID) return "All";
  if (currentTab.value === "Friends") return "Friends";
  const group = groups.value.find((g) => g.groupId === currentTab.value);
  return group?.groupName || "Select...";
});

// Load user's groups
async function loadUserGroups() {
  const session = props.session || authStore.session;
  if (!session) {
    return;
  }

  try {
    const groupIds = await getUserGroups();

    if (!Array.isArray(groupIds)) {
      console.warn("GroupScheduleList: getUserGroups did not return an array:", groupIds);
      groups.value = [];
      return;
    }

    // Fetch names for each group
    const groupsWithNames = await Promise.all(
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
            `GroupScheduleList: Error fetching name for ${groupId}:`,
            e
          );
          return {
            groupId,
            groupName: `Group ${groupId}`,
          };
        }
      })
    );

    groups.value = groupsWithNames;
    
    // Load members for each group
    for (const group of groupsWithNames) {
      await loadGroupMembers(group.groupId);
    }
  } catch (e: any) {
    error.value = e.message || "Failed to load groups";
    console.error("Error loading groups:", e);
  }
}

// Load friends
async function loadFriends() {
  const session = props.session || authStore.session;
  if (!session) {
    console.log("GroupScheduleList: No session available");
    return;
  }

  try {
    const response = await getAllFriendsBySession(session);

    // Extract friend IDs from response
    let friendIds: string[] = [];

    if (Array.isArray(response)) {
      friendIds = response;
    } else if (response && typeof response === "object") {
      if ("friends" in response && Array.isArray(response.friends)) {
        friendIds = response.friends;
      } else if ("friend" in response && Array.isArray(response.friend)) {
        friendIds = response.friend;
      }
    }

    // Filter and normalize
    friendIds = friendIds
      .map((item: any) => {
        if (typeof item === "string" && item.length > 0) {
          return item;
        }
        if (typeof item === "object" && item !== null) {
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

    // Fetch usernames for each friend
    const friendsWithUsernames = await Promise.all(
      friendIds.map(async (friendId: string) => {
        try {
          const username = await getUsername(friendId);
          return {
            memberId: friendId,
            memberUsername: username || "Unknown User",
          };
        } catch (e) {
          console.error(
            `GroupScheduleList: Error fetching username for ${friendId}:`,
            e
          );
          return {
            memberId: friendId,
            memberUsername: "Unknown User",
          };
        }
      })
    );

    // Filter out the current user
    const currentUserId = authStore.user;
    friends.value = friendsWithUsernames.filter(
      (friend) => friend.memberId !== currentUserId
    );
  } catch (e: any) {
    error.value = e.message || "Failed to load friends";
    console.error("Error loading friends:", e);
  }
}

// Load members for a specific group
async function loadGroupMembers(groupId: string) {
  const session = props.session || authStore.session;
  if (!session) {
    return;
  }

  try {
    const membersResponse = await getMembers(groupId);

    // Extract member IDs
    const memberIds: string[] = membersResponse
      .map((item: { member: string }) => item.member)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    // Fetch usernames for each member
    const membersWithUsernames = await Promise.all(
      memberIds.map(async (memberId: string) => {
        try {
          const username = await getUsername(memberId);
          return {
            memberId,
            memberUsername: username || "Unknown User",
          };
        } catch (e) {
          console.error(
            `GroupScheduleList: Error fetching username for member ${memberId}:`,
            e
          );
          return {
            memberId,
            memberUsername: "Unknown User",
          };
        }
      })
    );

    // Filter out the current user
    const currentUserId = authStore.user;
    groupMembers.value[groupId] = membersWithUsernames.filter(
      (member) => member.memberId !== currentUserId
    );
  } catch (e: any) {
    console.error(`Error loading members for group ${groupId}:`, e);
    groupMembers.value[groupId] = [];
  }
}

// Switch tabs
function switchTab(tabId: string) {
  currentTab.value = tabId;
  searchQuery.value = ""; // Clear search when switching tabs
}

// Toggle dropdown
function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

// Select option from dropdown
function selectOption(tabId: string) {
  switchTab(tabId);
  showDropdown.value = false;
}

// Handle click outside to close dropdown
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const dropdownContainer = target.closest(".dropdown-container");
  if (!dropdownContainer && showDropdown.value) {
    showDropdown.value = false;
  }
}

// Handle member click for selection
function handleMemberClick(member: Member) {
  const selectedIds = props.selectedFriendIds || [];
  const isSelected = selectedIds.includes(member.memberId);

  if (isSelected) {
    // Deselect if clicking a selected member
    emit("friend-deselected", member.memberId);
  } else {
    // Select the member (parent will handle limiting to 2)
    emit("friend-selected", member.memberId, member.memberUsername);
  }
}

// Watch for session changes
watch(
  () => props.session,
  (newSession) => {
    if (newSession) {
      loadFriends();
      loadUserGroups();
    }
  },
  { immediate: true }
);

onMounted(() => {
  const session = props.session || authStore.session;
  if (session) {
    loading.value = true;
    Promise.all([loadFriends(), loadUserGroups()]).finally(() => {
      loading.value = false;
    });
  }
  
  // Add click outside listener
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="group-schedule-box">
    <h2>GROUPS & FRIENDS</h2>

    <!-- Dropdown Selector -->
    <div class="dropdown-container">
      <button
        class="dropdown-button"
        @click.stop="toggleDropdown"
      >
        <span>{{ currentSelectionName }}</span>
        <span class="caret">v</span>
      </button>
      <ul v-if="showDropdown" class="dropdown-menu">
        <li
          class="dropdown-item"
          :class="{ active: currentTab === ALL_TAB_ID }"
          @click.stop="selectOption(ALL_TAB_ID)"
        >
          All
        </li>
        <li
          class="dropdown-item"
          :class="{ active: currentTab === 'Friends' }"
          @click.stop="selectOption('Friends')"
        >
          Friends
        </li>
        <li
          v-for="group in groups"
          :key="group.groupId"
          class="dropdown-item"
          :class="{ active: currentTab === group.groupId }"
          @click.stop="selectOption(group.groupId)"
        >
          {{ group.groupName }}
        </li>
      </ul>
    </div>

    <!-- Search Section -->
    <div class="search-section">
      <div class="search-input-wrapper">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search:"
          class="search-input"
        />
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="loading" class="loading">Loading...</div>

    <ul v-else class="members-list">
      <li
        v-for="member in filteredMembers"
        :key="member.memberId"
        class="member-item"
        :class="{
          selected: props.selectedFriendIds?.includes(member.memberId),
          'selected-first': props.selectedFriendIds?.[0] === member.memberId,
          'selected-second': props.selectedFriendIds?.[1] === member.memberId,
        }"
        @click="handleMemberClick(member)"
      >
        <span>{{ member.memberUsername }}</span>
      </li>
      <li v-if="filteredMembers.length === 0" class="empty-message">
        No members found
      </li>
    </ul>
  </div>
</template>

<style scoped>
.group-schedule-box {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-height: 400px;
}

.group-schedule-box h2 {
  margin: 0 0 10px 0;
  font-size: 1.2rem;
  text-align: center;
}

.dropdown-container {
  position: relative;
  margin-bottom: 10px;
}

.dropdown-button {
  width: 100%;
  padding: 8px 12px;
  background-color: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.dropdown-button:hover {
  background-color: var(--color-background-mute);
}

.caret {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  transition: transform 0.2s;
}

.dropdown-menu {
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

.dropdown-item {
  padding: 10px 12px;
  cursor: pointer;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.2s;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: var(--color-background-mute);
}

.dropdown-item.active {
  background-color: hsla(200, 100%, 50%, 0.15);
  color: var(--color-button);
  font-weight: 600;
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

.members-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background-color 0.2s;
}

.member-item:hover {
  background-color: var(--color-background-mute);
}

.member-item.selected {
  background-color: hsla(160, 100%, 37%, 0.2);
}

.member-item.selected-first {
  border-left: 3px solid #64b5f6;
  background-color: hsla(200, 100%, 50%, 0.15);
}

.member-item.selected-first:hover {
  background-color: hsla(200, 100%, 50%, 0.25);
}

.member-item.selected-second {
  border-left: 3px solid #f06292;
  background-color: hsla(340, 100%, 50%, 0.15);
}

.member-item.selected-second:hover {
  background-color: hsla(340, 100%, 50%, 0.25);
}

.member-item span {
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


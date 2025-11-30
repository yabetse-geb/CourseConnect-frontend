<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  getMembers,
  getGroupRequests,
  isGroupAdmin,
  confirmRequest,
  declineRequest,
  removeMember,
  adjustRole,
  getAdmins,
} from "@/api/concepts/GroupingAPI";
import { getUsername } from "@/api/syncs/auth";

interface Props {
  session: string | null;
  selectedGroupId: string | null;
  selectedGroupName: string | null;
}

const props = defineProps<Props>();

const authStore = useAuthStore();

interface Member {
  memberId: string;
  memberUsername: string;
  role: "ADMIN" | "MEMBER";
}

interface JoinRequest {
  requesterId: string;
  requesterUsername: string;
}

const members = ref<Member[]>([]);
const joinRequests = ref<JoinRequest[]>([]);
const isAdmin = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadGroupData() {
  if (!props.selectedGroupId || !props.session) {
    members.value = [];
    joinRequests.value = [];
    isAdmin.value = false;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const session = props.session || authStore.session;
    if (!session) {
      console.log("GroupMem: No session available");
      return;
    }

    // Check if user is admin
    isAdmin.value = await isGroupAdmin(props.selectedGroupId);
    console.log("GroupMem: User is admin:", isAdmin.value);

    // Load members
    let membersResponse: { member: string }[] = [];
    try {
      membersResponse = await getMembers(props.selectedGroupId);
      console.log("GroupMem: Got members response:", membersResponse);
    } catch (e: any) {
      console.error("GroupMem: Error loading members:", e);
      error.value = `Failed to load members: ${e.message || "Unknown error"}`;
      // Continue with empty members array so other data can still load
      membersResponse = [];
    }

    // Fetch usernames for members
    const membersWithUsernames = await Promise.all(
      membersResponse.map(async (item: { member: string }) => {
        try {
          const username = await getUsername(item.member);
          return {
            memberId: item.member,
            memberUsername: username || "Unknown User",
            role: "MEMBER" as const,
          };
        } catch (e) {
          console.error(
            `GroupMem: Error fetching username for ${item.member}:`,
            e
          );
          return {
            memberId: item.member,
            memberUsername: "Unknown User",
            role: "MEMBER" as const,
          };
        }
      })
    );

    // Get admins and update roles
    const admins = await getAdmins(props.selectedGroupId);
    console.log("GroupMem: Got admins:", admins);

    // Update member roles
    members.value = membersWithUsernames.map((member) => ({
      ...member,
      role: admins.includes(member.memberId) ? ("ADMIN" as const) : ("MEMBER" as const),
    }));

    console.log("GroupMem: Final members array:", members.value);

    // If admin, load join requests
    if (isAdmin.value) {
      const requestsResponse = await getGroupRequests(props.selectedGroupId);
      console.log("GroupMem: Got join requests response:", requestsResponse);

      // Fetch usernames for requesters
      const requestsWithUsernames = await Promise.all(
        requestsResponse.map(async (item: { joinRequester: string }) => {
          try {
            const username = await getUsername(item.joinRequester);
            return {
              requesterId: item.joinRequester,
              requesterUsername: username || "Unknown User",
            };
          } catch (e) {
            console.error(
              `GroupMem: Error fetching username for ${item.joinRequester}:`,
              e
            );
            return {
              requesterId: item.joinRequester,
              requesterUsername: "Unknown User",
            };
          }
        })
      );

      joinRequests.value = requestsWithUsernames;
      console.log("GroupMem: Final join requests array:", joinRequests.value);
    } else {
      joinRequests.value = [];
    }
  } catch (e: any) {
    error.value = e.message || "Failed to load group data";
    console.error("Error loading group data:", e);
  } finally {
    loading.value = false;
  }
}

async function handleConfirmRequest(requesterId: string) {
  if (!props.selectedGroupId || !props.session) return;

  if (!confirm("Accept this join request?")) return;

  loading.value = true;
  error.value = null;

  try {
    await confirmRequest(props.selectedGroupId, requesterId);
    await loadGroupData();
  } catch (e: any) {
    error.value = e.message || "Failed to confirm request";
    console.error("Error confirming request:", e);
  } finally {
    loading.value = false;
  }
}

async function handleDeclineRequest(requesterId: string) {
  if (!props.selectedGroupId || !props.session) return;

  if (!confirm("Decline this join request?")) return;

  loading.value = true;
  error.value = null;

  try {
    await declineRequest(props.selectedGroupId, requesterId);
    await loadGroupData();
  } catch (e: any) {
    error.value = e.message || "Failed to decline request";
    console.error("Error declining request:", e);
  } finally {
    loading.value = false;
  }
}

async function handleRemoveMember(memberId: string) {
  if (!props.selectedGroupId || !props.session) return;

  const member = members.value.find((m) => m.memberId === memberId);
  if (!member) return;

  if (!confirm(`Remove ${member.memberUsername} from the group?`)) return;

  loading.value = true;
  error.value = null;

  try {
    await removeMember(props.selectedGroupId, memberId);
    await loadGroupData();
  } catch (e: any) {
    error.value = e.message || "Failed to remove member";
    console.error("Error removing member:", e);
  } finally {
    loading.value = false;
  }
}

async function handleAdjustRole(memberId: string) {
  if (!props.selectedGroupId || !props.session) return;

  const member = members.value.find((m) => m.memberId === memberId);
  if (!member) return;

  const newRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
  const action = newRole === "ADMIN" ? "make admin" : "remove admin";

  if (!confirm(`${action} for ${member.memberUsername}?`)) return;

  loading.value = true;
  error.value = null;

  try {
    await adjustRole(props.selectedGroupId, memberId, newRole);
    await loadGroupData();
  } catch (e: any) {
    error.value = e.message || "Failed to adjust role";
    console.error("Error adjusting role:", e);
  } finally {
    loading.value = false;
  }
}

// Watch for selected group changes
watch(
  () => props.selectedGroupId,
  () => {
    loadGroupData();
  },
  { immediate: true }
);

// Watch for session changes
watch(
  () => props.session,
  () => {
    if (props.selectedGroupId) {
      loadGroupData();
    }
  }
);

onMounted(() => {
  if (props.selectedGroupId) {
    loadGroupData();
  }
});
</script>

<template>
  <div class="group-mem-box">
    <h2>GROUP MEMBERS</h2>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="!selectedGroupId" class="empty-message">
      Select a group to view members
    </div>

    <div v-else class="group-content">
      <div v-if="selectedGroupName" class="group-name-header">
        {{ selectedGroupName }}
      </div>

      <!-- Join Requests Section (Admin only) -->
      <div v-if="isAdmin && joinRequests.length > 0" class="requests-section">
        <h3 class="section-title">Join Requests</h3>
        <ul class="requests-list">
          <li
            v-for="request in joinRequests"
            :key="request.requesterId"
            class="request-item"
          >
            <span>{{ request.requesterUsername }}</span>
            <div class="request-actions">
              <button
                class="accept-button"
                @click="handleConfirmRequest(request.requesterId)"
              >
                Accept
              </button>
              <button
                class="decline-button"
                @click="handleDeclineRequest(request.requesterId)"
              >
                Decline
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Members Section -->
      <div class="members-section">
        <h3 class="section-title">Members</h3>
        <ul class="members-list">
          <li
            v-for="member in members"
            :key="member.memberId"
            class="member-item"
          >
            <div class="member-info">
              <span class="member-name">{{ member.memberUsername }}</span>
              <span class="member-role">{{ member.role }}</span>
            </div>
            <div v-if="isAdmin" class="member-actions">
              <button
                v-if="member.role !== 'ADMIN'"
                class="make-admin-button"
                @click="handleAdjustRole(member.memberId)"
              >
                Make Admin
              </button>
              <button
                v-else
                class="remove-admin-button"
                @click="handleAdjustRole(member.memberId)"
              >
                Remove Admin
              </button>
              <button
                class="remove-button"
                @click="handleRemoveMember(member.memberId)"
                title="Remove member"
              >
                ×
              </button>
            </div>
          </li>
          <li v-if="members.length === 0" class="empty-message">
            No members found
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group-mem-box {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-height: 400px;
}

.group-mem-box h2 {
  margin: 0 0 10px 0;
  font-size: 1.2rem;
  text-align: center;
}

.group-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
}

.group-name-header {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  padding: 10px;
  background-color: var(--color-background-mute);
  border-radius: 4px;
  text-align: center;
}

.requests-section {
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 15px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: white;
  margin: 0 0 10px 0;
}

.requests-list,
.members-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.request-item,
.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--color-border);
}

.request-item:last-child,
.member-item:last-child {
  border-bottom: none;
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.member-name {
  color: white;
  font-weight: 500;
}

.member-role {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.request-actions,
.member-actions {
  display: flex;
  gap: 5px;
  align-items: center;
}

.accept-button,
.decline-button,
.make-admin-button,
.remove-admin-button {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
}

.accept-button {
  background-color: #4caf50;
  color: white;
}

.accept-button:hover {
  background-color: #45a049;
}

.decline-button {
  background-color: #f44336;
  color: white;
}

.decline-button:hover {
  background-color: #da190b;
}

.make-admin-button {
  background-color: var(--color-button);
  color: var(--color-button-text);
}

.make-admin-button:hover {
  background-color: var(--color-button-hover);
}

.remove-admin-button {
  background-color: #ff9800;
  color: white;
}

.remove-admin-button:hover {
  background-color: #e68900;
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


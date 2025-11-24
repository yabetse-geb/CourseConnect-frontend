<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { getBlockedUsers, unblockUser } from "@/api/concepts/BlockingAPI";

interface Props {
  userId: string | null;
}

const props = defineProps<Props>();

const blockedUsers = ref<{ target: string }[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadBlockedUsers() {
  if (!props.userId) return;

  loading.value = true;
  error.value = null;
  try {
    blockedUsers.value = await getBlockedUsers(props.userId);
  } catch (e: any) {
    error.value = e.message || "Failed to load blocked users";
    console.error("Error loading blocked users:", e);
  } finally {
    loading.value = false;
  }
}

async function handleUnblock(targetId: string) {
  if (!props.userId) return;

  if (!confirm("Are you sure you want to unblock this user?")) return;

  loading.value = true;
  error.value = null;
  try {
    await unblockUser(props.userId, targetId);
    await loadBlockedUsers();
  } catch (e: any) {
    error.value = e.message || "Failed to unblock user";
    console.error("Error unblocking user:", e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadBlockedUsers();
});

// Expose method to be called from parent when a friend is moved to blocked
defineExpose({
  loadBlockedUsers,
});
</script>

<template>
  <div class="blocked-box">
    <h2>FOES</h2>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="loading" class="loading">Loading...</div>

    <ul v-else class="blocked-list">
      <li
        v-for="blocked in blockedUsers"
        :key="blocked.target"
        class="blocked-item"
      >
        <span>{{ blocked.target }}</span>
        <button
          class="unblock-button"
          @click="handleUnblock(blocked.target)"
          title="Unblock user"
        >
          Unblock
        </button>
      </li>
      <li v-if="blockedUsers.length === 0" class="empty-message">
        No blocked users
      </li>
    </ul>
  </div>
</template>

<style scoped>
.blocked-box {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-height: 400px;
}

.blocked-box h2 {
  margin: 0 0 10px 0;
  font-size: 1.2rem;
  text-align: center;
}

.blocked-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.blocked-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--color-border);
}

.blocked-item span {
  flex: 1;
}

.unblock-button {
  padding: 6px 12px;
  background-color: var(--color-button);
  color: var(--color-button-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.unblock-button:hover {
  background-color: var(--color-button-hover);
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

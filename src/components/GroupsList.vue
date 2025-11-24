<script setup lang="ts">
import { ref, onMounted } from "vue";

interface Props {
  userId: string | null;
}

const props = defineProps<Props>();

const groups = ref<string[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadGroups() {
  if (!props.userId) return;

  loading.value = true;
  error.value = null;
  try {
    // TODO: Implement Groups API when available
    // For now, using placeholder data
    groups.value = [];
  } catch (e: any) {
    error.value = e.message || "Failed to load groups";
    console.error("Error loading groups:", e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadGroups();
});
</script>

<template>
  <div class="groups-box">
    <h2>GROUPS</h2>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="loading" class="loading">Loading...</div>

    <ul v-else class="groups-list">
      <li v-for="group in groups" :key="group" class="group-item">
        {{ group }}
      </li>
      <li v-if="groups.length === 0" class="empty-message">No groups yet</li>
    </ul>
  </div>
</template>

<style scoped>
.groups-box {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
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
}

.groups-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.group-item {
  padding: 10px;
  border-bottom: 1px solid var(--color-border);
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

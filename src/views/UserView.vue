<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import FriendsList from "@/components/FriendsList.vue";
import BlockedUsersList from "@/components/BlockedUsersList.vue";
import GroupsList from "@/components/GroupsList.vue";

const authStore = useAuthStore();

const isEditing = ref(false);
const userProfile = ref({
  name: "",
  kerb: "",
  course: "",
  gradDate: "",
  username: "",
  password: "",
});

const currentUserId = ref<string | null>(authStore.user);

onMounted(() => {
  // TODO: Fetch user profile data from API
  // For now, using placeholder data
  if (currentUserId.value) {
    // Load user profile
  }
});

function handleEdit() {
  isEditing.value = !isEditing.value;
  if (!isEditing.value) {
    // TODO: Save changes to API
  }
}
</script>

<template>
  <div class="user-page">
    <header class="page-header">
      <h1>USER PAGE</h1>
      <nav class="top-nav">
        <div class="nav-left"></div>
        <div class="nav-right">
          <a href="#" class="nav-link">Link 1</a>
          <a href="#" class="nav-link">Link 2</a>
          <a href="#" class="nav-link">Link 3</a>
        </div>
        <div class="profile-icon"></div>
      </nav>
    </header>

    <div class="user-profile-section">
      <div class="profile-picture-area"></div>

      <div class="profile-details">
        <div class="detail-column">
          <div class="detail-item">
            <label>NAME</label>
            <input v-if="isEditing" v-model="userProfile.name" type="text" />
            <span v-else>{{ userProfile.name || "Not set" }}</span>
          </div>
          <div class="detail-item">
            <label>KERB</label>
            <input v-if="isEditing" v-model="userProfile.kerb" type="text" />
            <span v-else>{{ userProfile.kerb || "Not set" }}</span>
          </div>
        </div>

        <div class="detail-column">
          <div class="detail-item">
            <label>COURSE</label>
            <input v-if="isEditing" v-model="userProfile.course" type="text" />
            <span v-else>{{ userProfile.course || "Not set" }}</span>
          </div>
          <div class="detail-item">
            <label>GRAD DATE</label>
            <input
              v-if="isEditing"
              v-model="userProfile.gradDate"
              type="text"
            />
            <span v-else>{{ userProfile.gradDate || "Not set" }}</span>
          </div>
        </div>

        <div class="detail-column">
          <div class="detail-item">
            <label>Username</label>
            <input
              v-if="isEditing"
              v-model="userProfile.username"
              type="text"
            />
            <span v-else>{{ userProfile.username || "Not set" }}</span>
          </div>
          <div class="detail-item">
            <label>Password</label>
            <input
              v-if="isEditing"
              v-model="userProfile.password"
              type="password"
            />
            <span v-else>••••••••</span>
          </div>
        </div>
      </div>

      <button class="edit-button" @click="handleEdit">
        {{ isEditing ? "Save" : "Edit" }}
      </button>
    </div>

    <div class="lists-section">
      <FriendsList :userId="currentUserId" />
      <BlockedUsersList :userId="currentUserId" />
      <GroupsList :userId="currentUserId" />
    </div>
  </div>
</template>

<style scoped>
.user-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 2rem;
  margin-bottom: 15px;
}

.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}

.nav-left {
  width: 200px;
  height: 20px;
  background-color: var(--color-border);
}

.nav-right {
  display: flex;
  gap: 15px;
}

.nav-link {
  text-decoration: none;
  color: var(--color-text);
  padding: 5px 10px;
}

.profile-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--color-border);
}

.user-profile-section {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  position: relative;
  display: flex;
  gap: 20px;
}

.profile-picture-area {
  width: 120px;
  height: 120px;
  background-color: var(--color-border);
  border-radius: 4px;
  flex-shrink: 0;
}

.profile-details {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.detail-column {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-item label {
  font-weight: bold;
  font-size: 0.9rem;
  color: var(--color-text);
}

.detail-item input,
.detail-item span {
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background);
}

.detail-item input {
  width: 100%;
}

.edit-button {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 8px 16px;
  background-color: var(--color-button);
  color: var(--color-button-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.edit-button:hover {
  background-color: var(--color-button-hover);
}

.lists-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 1024px) {
  .lists-section {
    grid-template-columns: 1fr;
  }

  .profile-details {
    grid-template-columns: 1fr;
  }
}
</style>

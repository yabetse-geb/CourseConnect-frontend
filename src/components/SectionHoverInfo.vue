<template>
  <div class="section-hover-info">
    <div v-if="!eventId" class="empty-state">
      <p>Hover over a section to see friends</p>
    </div>
    
    <div v-else class="section-details">
      <div class="section-header">
        <h3 class="section-title">{{ displayCourseName }}</h3>
        <div class="section-type">{{ displaySectionType }}</div>
      </div>

      <div class="group-filter-section">
        <label for="group-filter" class="group-filter-label">Show members of group:</label>
        <select 
          id="group-filter"
          v-model="selectedGroupFilter" 
          class="group-filter-select"
        >
          <option :value="null">All</option>
          <option 
            v-for="group in availableGroupOptions" 
            :key="group.id" 
            :value="group.id"
          >
            {{ group.name }}
          </option>
        </select>
      </div>

      <!-- Friends section - using exact groups pattern -->
      <div class="group-members-section">
        <h4 class="section-subtitle">Friends</h4>
        <div v-if="loadingFriends" class="loading-state">
          Loading friends...
        </div>
        <div v-else-if="friendsError" class="error-state">
          {{ friendsError }}
        </div>
        <div v-else class="group-members-list">
          <template v-if="eventId">
            <div v-if="getFriendsForEvent(eventId).length > 0" class="group-members-item">
              {{ getFriendsForEvent(eventId).length }} {{ getFriendsForEvent(eventId).length === 1 ? 'friend' : 'friends' }}: {{ getFriendsForEvent(eventId).join(', ') }}
            </div>
            <div v-else class="no-group-members">
              No friends enrolled
            </div>
          </template>
        </div>
      </div>

      <div class="group-members-section">
        <h4 class="section-subtitle">Group Members</h4>
        <div v-if="loadingGroupMembers" class="loading-state">
          Loading group members...
        </div>
        <div v-else-if="groupMembersError" class="error-state">
          {{ groupMembersError }}
        </div>
        <div v-else class="group-members-list">
          <template v-if="eventId" v-for="[groupId, members] in getGroupMembersForEvent(eventId)" :key="groupId">
            <div v-if="members.length > 0" class="group-members-item">
              Group {{ getGroupNameById(groupId) }}: {{ members.join(', ') }}
            </div>
          </template>
          <div v-if="eventId && getGroupMembersForEvent(eventId).length === 0" class="no-group-members">
            No group members enrolled
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { getEventFriends, type EventFriendsResult } from '@/api/syncs/friendsInEvents'
import { getUserGroups, getMembersInEvents, getGroupName } from '@/api/concepts/GroupingAPI'
import { getUsername } from '@/api/syncs/auth'
import { useAuthStore } from '@/stores/auth'

interface Props {
  eventId: string | null
  courseName: string | null
  sectionType: string | null
  session: string | null
}

const props = defineProps<Props>()

const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user)

// Extract course code from full course name (e.g., "8.02: Physics II" -> "8.02")
const displayCourseName = computed(() => {
  if (!props.courseName) return ''
  const colonIndex = props.courseName.indexOf(':')
  return colonIndex >= 0 ? props.courseName.substring(0, colonIndex).trim() : props.courseName
})

// Extract section type (e.g., "Lecture: L01" -> "Lecture")
const displaySectionType = computed(() => {
  if (!props.sectionType) return ''
  const colonIndex = props.sectionType.indexOf(':')
  return colonIndex >= 0 ? props.sectionType.substring(0, colonIndex).trim() : props.sectionType
})

// Friends data state
const friendsByEventId = ref<Map<string, string[]>>(new Map())
const loadingFriends = ref(false)
const friendsError = ref<string | null>(null)

// Group members data state
const groupMembersByEventId = ref<Map<string, Map<string, string[]>>>(new Map())
const groupNamesByGroupId = ref<Map<string, string>>(new Map())
const loadingGroupMembers = ref(false)
const groupMembersError = ref<string | null>(null)

// Group filter state
const selectedGroupFilter = ref<string | null>(null)

// Flag to track if component is mounted (for cleanup)
let isMounted = true

// Friends helper function - used directly in template (same pattern as getGroupMembersForEvent)

// Fetch friends when eventId changes
watch(() => props.eventId, async (eventId) => {
  if (!isMounted) {
    return
  }
  
  if (!eventId) {
    friendsByEventId.value = new Map()
    return
  }

  loadingFriends.value = true
  friendsError.value = null

  try {
    const results: EventFriendsResult[] = await getEventFriends([eventId])
    
    const newMap = new Map<string, string[]>()
    
    // Initialize with empty array
    newMap.set(eventId, [])
    
    // Populate with results
    results.forEach((result) => {
      const usernames = result.friends
        .map((f) => f.username)
        .filter((u): u is string => !!u)
        .sort()
      
      newMap.set(result.event, [...usernames])
    })
    
    // Replace the entire Map reference to ensure Vue detects the change
    if (isMounted) {
      friendsByEventId.value = newMap
    }
  } catch (err: any) {
    console.error('Error fetching friends for event:', err)
    if (isMounted) {
      friendsError.value = err.message || 'Failed to load friends'
    }
  } finally {
    if (isMounted) {
      loadingFriends.value = false
    }
  }
}, { immediate: true })

// Helper to get friends for a specific event
const getFriendsForEvent = (eventId: string): string[] => {
  return friendsByEventId.value.get(eventId) || []
}

// Helper function to fetch group members for events
async function fetchGroupMembersForEvent(eventId: string) {
  if (!eventId || !isMounted) {
    if (isMounted) {
      groupMembersByEventId.value = new Map()
      groupNamesByGroupId.value = new Map()
    }
    return
  }

  loadingGroupMembers.value = true
  groupMembersError.value = null

  try {
    // Get all groups the user is in
    const groupIds = await getUserGroups()
    
    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      if (isMounted) {
        groupMembersByEventId.value = new Map()
        groupNamesByGroupId.value = new Map()
      }
      return
    }

    // Call the API to get members in events (returns event -> group -> user IDs)
    const result = await getMembersInEvents(groupIds, [eventId])

    // Initialize the event map
    const eventMap = new Map<string, Map<string, string[]>>()
    
    // Collect all unique user IDs to convert to usernames in batch
    const allUserIds = new Set<string>()
    const eventGroups = result[eventId] || {}
    eventMap.set(eventId, new Map<string, string[]>())
    for (const groupId of Object.keys(eventGroups)) {
      const userIds = eventGroups[groupId] || []
      userIds.forEach(userId => allUserIds.add(userId))
    }

    // Convert all user IDs to usernames
    const usernameMap = new Map<string, string>()
    const usernamePromises = Array.from(allUserIds).map(async (userId) => {
      const username = await getUsername(userId)
      if (username) {
        usernameMap.set(userId, username)
      }
    })
    await Promise.all(usernamePromises)

    // Fetch group names for display
    const groupNamePromises = groupIds.map(async (groupId: string) => {
      if (!isMounted) return
      try {
        const groupNameResponse = await getGroupName(groupId)
        const groupName = groupNameResponse?.name?.trim() || `Group ${groupId}`
        if (isMounted) {
          groupNamesByGroupId.value.set(groupId, groupName)
        }
      } catch (err) {
        if (isMounted) {
          console.warn(`Error fetching group name for ${groupId}:`, err)
          groupNamesByGroupId.value.set(groupId, `Group ${groupId}`)
        }
      }
    })
    await Promise.all(groupNamePromises)

    // Build the final mapping: event -> group -> usernames
    // Filter out the current user from all groups
    const currentUserIdValue = currentUserId.value
    const eventGroupMap = new Map<string, string[]>()
    
    for (const groupId of Object.keys(eventGroups)) {
      const userIds = eventGroups[groupId] || []
      // Filter out the current user before converting to usernames
      const otherUserIds = currentUserIdValue 
        ? userIds.filter(userId => userId !== currentUserIdValue)
        : userIds
      
      const usernames = otherUserIds
        .map(userId => usernameMap.get(userId))
        .filter((u): u is string => !!u)
        .sort()
      
      // Only include groups that have at least one member after filtering out current user
      if (usernames.length > 0) {
        eventGroupMap.set(groupId, usernames)
      }
    }
    
    if (isMounted) {
      eventMap.set(eventId, eventGroupMap)
      groupMembersByEventId.value = eventMap
    }
  } catch (err: any) {
    if (isMounted) {
      groupMembersError.value = err.message || 'Failed to load group members'
      console.error('Error fetching group members for event:', err)
    }
  } finally {
    if (isMounted) {
      loadingGroupMembers.value = false
    }
  }
}

// Watch for eventId changes to fetch group members
watch(() => props.eventId, async (eventId) => {
  if (!isMounted) return
  
  if (eventId) {
    await fetchGroupMembersForEvent(eventId)
  } else {
    if (isMounted) {
      groupMembersByEventId.value = new Map()
      groupNamesByGroupId.value = new Map()
    }
  }
}, { immediate: true })

// Cleanup on unmount
onBeforeUnmount(() => {
  isMounted = false
})

// Computed property for available group options
const availableGroupOptions = computed(() => {
  const groups: Array<{ id: string; name: string }> = []
  groupNamesByGroupId.value.forEach((name, id) => {
    groups.push({ id, name })
  })
  return groups.sort((a, b) => a.name.localeCompare(b.name))
})

// Helper to get group members for a specific event as array of entries
// Filters based on selectedGroupFilter if set
const getGroupMembersForEvent = (eventId: string): Array<[string, string[]]> => {
  const groupMap = groupMembersByEventId.value.get(eventId) || new Map()
  
  // If no filter is selected, return all groups
  if (!selectedGroupFilter.value) {
    return Array.from(groupMap.entries())
  }
  
  // Otherwise, only return the selected group if it has members for this event
  const filteredEntries: Array<[string, string[]]> = []
  const selectedGroupMembers = groupMap.get(selectedGroupFilter.value)
  if (selectedGroupMembers && selectedGroupMembers.length > 0) {
    filteredEntries.push([selectedGroupFilter.value, selectedGroupMembers])
  }
  return filteredEntries
}

// Helper to get group name by group ID
const getGroupNameById = (groupId: string): string => {
  return groupNamesByGroupId.value.get(groupId) || `Group ${groupId}`
}
</script>

<style scoped>
.section-hover-info {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  transition: opacity 0.2s;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--color-text-soft);
  text-align: center;
  font-style: italic;
}

.section-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.section-title {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-heading);
}

.section-type {
  font-size: 0.875rem;
  color: var(--color-text-soft);
}

.group-filter-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.group-filter-label {
  color: var(--color-text);
  font-size: 0.875rem;
  white-space: nowrap;
}

.group-filter-select {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
  min-width: 150px;
  flex: 1;
}

.group-filter-select:hover {
  border-color: var(--color-heading);
}

.group-filter-select:focus {
  outline: none;
  border-color: hsla(160, 100%, 37%, 1);
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.friends-section,
.group-members-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-subtitle {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-heading);
}

.friends-list,
.group-members-list {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
}

.no-friends,
.no-group-members {
  font-style: italic;
  color: var(--color-text-soft);
  opacity: 0.7;
}

.group-members-item {
  margin-top: 0.25rem;
}

.loading-state,
.error-state {
  font-size: 0.875rem;
  color: var(--color-text-soft);
  font-style: italic;
}

.error-state {
  color: var(--color-error, #ff4444);
}
</style>


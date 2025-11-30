<template>
  <div class="course-info">
    <div v-if="!course" class="empty-state">
      <p>Select a course to view details</p>
    </div>
    
    <div v-else class="course-details">
      <h2 class="course-title">{{ course.name }}</h2>
      
      <div 
        class="events-container" 
        :style="{ '--grid-columns': eventTypeColumns.length, gridTemplateColumns: `repeat(${eventTypeColumns.length}, minmax(150px, 1fr))` }"
      >
        <div 
          v-for="column in eventTypeColumns" 
          :key="column.type"
          class="events-column"
        >
          <h3 class="events-header">{{ column.label }}</h3>
          <div v-if="column.events.length === 0" class="no-events">
            <p>No {{ column.label.toLowerCase() }} scheduled</p>
          </div>
          <ul v-else class="events-list">
            <li 
              v-for="event in column.events" 
              :key="event.event" 
              :class="['event-item', { 'event-scheduled': isEventScheduled(event.event) }]"
              @click="handleEventClick(event)"
            >
              <div class="radio-button" :class="{ 'radio-selected': isEventScheduled(event.event) }"></div>
              <div class="event-content">
                <div class="event-days">{{ formatDays(event.times.days) }}</div>
                <div class="event-time">{{ formatTimeRange(event.times.startTime, event.times.endTime) }}</div>
                <div v-if="loadingFriends" class="event-friends">
                  Loading friends...
                </div>
                <div v-else class="event-friends">
                  <span v-if="getFriendsForEvent(event.event).length > 0">
                    {{ getFriendsForEvent(event.event).length }} {{ getFriendsForEvent(event.event).length === 1 ? 'friend' : 'friends' }}: {{ getFriendsForEvent(event.event).join(', ') }}
                  </span>
                  <span v-else class="no-friends">
                    No friends enrolled
                  </span>
                </div>
              </div>
              <div class="event-actions" @click.stop>
                <button 
                  v-if="isEventScheduled(event.event)"
                  @click.stop="handleRemoveEvent(event.event)"
                  class="btn btn-remove btn-small"
                >
                  Remove
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Course, CourseEvent } from '@/api/concepts/CourseCatalog'
import { getEventFriends, type EventFriendsResult } from '@/api/syncs/friendsInEvents'

const props = defineProps<{
  course: Course | null
  scheduledEventIds?: Set<string>
}>()

const emit = defineEmits<{
  (e: 'event-selected', event: CourseEvent, courseName: string): void
  (e: 'add-event', eventId: string): void
  (e: 'remove-event', eventId: string): void
}>()

// Event type configuration with fixed order
const eventTypeConfigs = [
  { type: 'lecture', label: 'Lectures', keywords: ['lecture'] },
  { type: 'recitation', label: 'Recitations', keywords: ['recitation'] },
  { type: 'lab', label: 'Labs', keywords: ['lab', 'laboratory'] },
  { type: 'design', label: 'Design', keywords: ['design'] },
]

// Helper function to check if an event matches a type
const matchesEventType = (event: CourseEvent, keywords: string[]): boolean => {
  const eventTypeLower = event.type.toLowerCase()
  return keywords.some(keyword => eventTypeLower.includes(keyword))
}

// Create dynamic columns based on what event types exist
const eventTypeColumns = computed(() => {
  if (!props.course) return []
  
  return eventTypeConfigs
    .map(config => ({
      type: config.type,
      label: config.label,
      events: props.course!.events.filter(event => 
        matchesEventType(event, config.keywords)
      )
    }))
    .filter(column => column.events.length > 0) // Only include columns with events
})

// Get all event IDs from the course (lectures + recitations)
const allEventIds = computed(() => {
  if (!props.course) return []
  return props.course.events.map(event => event.event)
})

// Friends data state
const friendsByEventId = ref<Map<string, string[]>>(new Map())
const loadingFriends = ref(false)
const friendsError = ref<string | null>(null)

// Fetch friends when event IDs change
watch(allEventIds, async (eventIds) => {
  if (eventIds.length === 0) {
    friendsByEventId.value = new Map()
    return
  }

  loadingFriends.value = true
  friendsError.value = null

  try {
    const results: EventFriendsResult[] = await getEventFriends(eventIds)
    const newMap = new Map<string, string[]>()
    
    // Initialize with empty arrays
    eventIds.forEach(id => newMap.set(id, []))
    
    // Populate with results
    results.forEach(result => {
      const usernames = result.friends
        .map(f => f.username)
        .filter((u): u is string => !!u)
        .sort()
      newMap.set(result.event, usernames)
    })
    
    friendsByEventId.value = newMap
  } catch (err: any) {
    friendsError.value = err.message || 'Failed to load friends'
    console.error('Error fetching friends for events:', err)
  } finally {
    loadingFriends.value = false
  }
}, { immediate: true })

// Helper to get friends for a specific event
const getFriendsForEvent = (eventId: string): string[] => {
  return friendsByEventId.value.get(eventId) || []
}

// Find which event is currently scheduled for each event type
const scheduledEventsByType = computed(() => {
  if (!props.course || !props.scheduledEventIds) return new Map<string, string>()
  
  const scheduledMap = new Map<string, string>()
  
  eventTypeConfigs.forEach(config => {
    const matchingEvents = props.course!.events.filter(event => 
      matchesEventType(event, config.keywords)
    )
    const scheduled = matchingEvents.find(event => 
      props.scheduledEventIds?.has(event.event)
    )
    if (scheduled) {
      scheduledMap.set(config.type, scheduled.event)
    }
  })
  
  return scheduledMap
})

// Helper function to get scheduled event ID for a given event type
const getScheduledEventId = (eventType: string): string | null => {
  return scheduledEventsByType.value.get(eventType) ?? null
}

// Helper functions for formatting
const formatDays = (days: string[]): string => {
  return days.join(', ')
}

const formatTimeRange = (startTime: string, endTime: string): string => {
  const format12Hour = (time: string): string => {
    const parts = time.split(':').map(Number)
    const hours = parts[0] ?? 0
    const minutes = parts[1] ?? 0
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
  }
  
  return `${format12Hour(startTime)} - ${format12Hour(endTime)}`
}

const handleEventClick = (event: CourseEvent) => {
  console.log('handleEventClick called', event)
  if (!props.course) {
    console.log('No course selected')
    return
  }
  
  // Determine which event type this event belongs to
  const eventType = eventTypeConfigs.find(config => 
    matchesEventType(event, config.keywords)
  )?.type
  
  const isCurrentlyScheduled = isEventScheduled(event.event)
  
  console.log('Event details:', { eventType, isCurrentlyScheduled, eventId: event.event })
  
  // Emit event-selected for calendar preview
  emit('event-selected', event, props.course.name)
  
  // If already scheduled, do nothing (user can use Remove button)
  if (isCurrentlyScheduled) {
    console.log('Event already scheduled, not adding')
    return
  }
  
  // If not scheduled, automatically add it
  // But first, remove any existing event of the same type (mutual exclusivity)
  if (eventType) {
    const existingScheduledId = getScheduledEventId(eventType)
    if (existingScheduledId && existingScheduledId !== event.event) {
      // Remove the currently scheduled event of the same type
      console.log(`Removing existing ${eventType}:`, existingScheduledId)
      emit('remove-event', existingScheduledId)
    }
  }
  
  // Add the new event
  console.log('Emitting add-event for:', event.event)
  emit('add-event', event.event)
}

const isEventScheduled = (eventId: string): boolean => {
  return props.scheduledEventIds?.has(eventId) ?? false
}

const handleRemoveEvent = (eventId: string) => {
  emit('remove-event', eventId)
}
</script>

<style scoped>
.course-info {
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  min-height: 400px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: var(--color-text-soft);
  text-align: center;
}

.course-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.course-title {
  color: var(--color-heading);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

.btn-add {
  background-color: hsla(160, 100%, 37%, 1);
  color: white;
}

.btn-add:hover {
  background-color: hsla(160, 100%, 32%, 1);
}

.btn-remove {
  background-color: #e57373;
  color: white;
}

.btn-remove:hover {
  background-color: #ef5350;
}

.btn-small {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.events-container {
  display: grid;
  gap: 2rem;
  overflow-x: auto;
}

.events-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.events-header {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.no-events {
  color: var(--color-text-soft);
  font-size: 0.875rem;
  padding: 0.5rem 0;
}

.events-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.event-item {
  padding: 0.75rem;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s, border-color 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.radio-button {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  background-color: var(--color-background);
  flex-shrink: 0;
  transition: all 0.2s;
  cursor: pointer;
}

.radio-button.radio-selected {
  border-color: hsla(160, 100%, 37%, 1);
  background-color: hsla(160, 100%, 37%, 1);
  position: relative;
}

.radio-button.radio-selected::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: white;
}

.event-item:hover {
  background-color: var(--color-background-soft);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.event-item.event-scheduled {
  background-color: rgba(76, 175, 80, 0.1);
  border: 2px solid #4caf50;
}

.event-item.event-scheduled:hover {
  background-color: rgba(76, 175, 80, 0.15);
}

.event-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.event-actions {
  display: flex;
  gap: 0.5rem;
}

.event-days {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.event-time {
  font-size: 0.875rem;
  color: var(--color-text-soft);
}

.event-friends {
  font-size: 0.75rem;
  color: var(--color-text-soft);
  margin-top: 0.25rem;
  line-height: 1.3;
}

.event-friends .no-friends {
  font-style: italic;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .events-container {
    grid-template-columns: 1fr !important;
    gap: 1.5rem;
  }
  
  .course-info {
    max-width: 100%;
  }
}
</style>


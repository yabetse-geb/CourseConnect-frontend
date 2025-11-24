<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Schedule from '../components/Schedule.vue'
import CourseSearch from '../components/CourseSearch.vue'
import CourseInfo from '../components/CourseInfo.vue'
import type { Course, CourseEvent, EventInfo } from '@/api/concepts/CourseCatalog'
import { scheduleEvent, unscheduleEvent, getUserSchedule } from '@/api/concepts/SchedulingAPI'
import { getEventInfo } from '@/api/concepts/CourseCatalog'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const selectedCourse = ref<Course | null>(null)
const temporaryEvent = ref<{ event: CourseEvent; courseName: string } | null>(null)

// Track scheduled events from backend
const scheduledEvents = ref<EventInfo[]>([])

// Create a Set of scheduled event IDs for efficient lookup
const scheduledEventIds = computed(() => {
  return new Set(scheduledEvents.value.map(se => se.event))
})

// Fetch schedule from backend
const fetchSchedule = async () => {
  try {
    const session = authStore.session
    if (!session) {
      console.warn('No session found, cannot fetch schedule')
      scheduledEvents.value = []
      return
    }

    // Get event IDs from user's schedule (pass session as user parameter)
    const eventIdsResponse = await getUserSchedule(session)
    const eventIds = eventIdsResponse.map(item => item.event)

    // Fetch full event details for each event ID
    const eventDetailsPromises = eventIds.map(eventId => getEventInfo(eventId))
    const eventDetailsArrays = await Promise.all(eventDetailsPromises)
    
    // Flatten the arrays (getEventInfo returns EventInfo[])
    const events: EventInfo[] = eventDetailsArrays.flat()
    scheduledEvents.value = events
  } catch (err) {
    console.error('Failed to fetch schedule:', err)
    scheduledEvents.value = []
  }
}

// Refresh schedule
const refreshSchedule = async () => {
  await fetchSchedule()
}

const handleCourseSelected = (course: Course) => {
  selectedCourse.value = course
  // Clear temporary event when selecting a new course
  temporaryEvent.value = null
}

const handleEventSelected = (event: CourseEvent, courseName: string) => {
  // Replace temporary event with the newly clicked one
  temporaryEvent.value = { event, courseName }
}

const handleAddEvent = async (eventId: string) => {
  console.log('handleAddEvent called with eventId:', eventId)
  try {
    console.log('Calling scheduleEvent API...')
    await scheduleEvent(eventId)
    console.log('scheduleEvent API call successful')
    // Refresh schedule after adding
    await refreshSchedule()
  } catch (err) {
    console.error('Failed to add event to schedule:', err)
    // Still refresh to get current state
    await refreshSchedule()
  }
}

const handleRemoveEvent = async (eventId: string) => {
  try {
    await unscheduleEvent(eventId)
    // Refresh schedule after removing
    await refreshSchedule()
  } catch (err) {
    console.error('Failed to remove event from schedule:', err)
    // Still refresh to get current state
    await refreshSchedule()
  }
}

// Fetch schedule on mount
onMounted(() => {
  fetchSchedule()
})

</script>

<template>
  <div class="scheduling-view">
    <div class="schedule-row">
      <Schedule 
        :temporary-event="temporaryEvent"
        :scheduled-events="scheduledEvents"
      />
    </div>
    <div class="courses-row">
      <div class="left-column">
        <CourseSearch @course-selected="handleCourseSelected" />
      </div>
      <div class="right-column">
        <CourseInfo 
          :course="selectedCourse" 
          :scheduled-event-ids="scheduledEventIds"
          @event-selected="handleEventSelected"
          @add-event="handleAddEvent"
          @remove-event="handleRemoveEvent"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.scheduling-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 2rem;
  gap: 2rem;
}

.schedule-row {
  width: 100%;
  max-height: 50vh;
  overflow: hidden;
  flex-shrink: 0;
}

.courses-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
}

@media (max-width: 1024px) {
  .courses-row {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}
</style>


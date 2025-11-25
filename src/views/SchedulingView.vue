<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import WeekCalendar from '../components/WeekCalendar.vue'
import CourseSearch from '../components/CourseSearch.vue'
import CourseInfo from '../components/CourseInfo.vue'
import type { Course, CourseEvent, EventInfo } from '@/api/concepts/CourseCatalog'
import { scheduleEvent, unscheduleEvent, getUserSchedule } from '@/api/concepts/SchedulingAPI'
import { getEventInfo, getAllCourses } from '@/api/concepts/CourseCatalog'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const selectedCourse = ref<Course | null>(null)
const temporaryEvent = ref<{ event: CourseEvent; courseName: string } | null>(null)

// Track scheduled events from backend
const scheduledEvents = ref<EventInfo[]>([])

// Track hidden event IDs
const hiddenEventIds = ref<Set<string>>(new Set())

// Get unique course names from scheduled events for the toggle buttons
const scheduledCourseNames = computed(() => {
  const names = new Set<string>()
  scheduledEvents.value.forEach(event => names.add(event.name))
  return Array.from(names).sort()
})

// Create a Set of scheduled event IDs for efficient lookup
const scheduledEventIds = computed(() => {
  return new Set(scheduledEvents.value.map(se => se.event))
})

// Fetch schedule from backend
const fetchSchedule = async () => {
  try {
    console.log('Fetching schedule...')
    const user = authStore.user
    if (!user) {
      console.warn('No user found, cannot fetch schedule')
      scheduledEvents.value = []
      return
    }

    // Get event information from user's schedule (pass session as user parameter)
    const eventInfo = await getUserSchedule(user)
    console.log('Fetched schedule from API:', eventInfo)
    // eventInfo is already an array of EventInfo, so use it directly
    const events: EventInfo[] = eventInfo
    scheduledEvents.value = events
    console.log('Updated scheduledEvents.value:', scheduledEvents.value)
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

const handleBlockClick = async (courseName: string) => {
  try {
    // Get all courses and find the one matching the name
    const courses = await getAllCourses()
    const course = courses.find(c => c.name === courseName)
    if (course) {
      selectedCourse.value = course
    }
  } catch (err) {
    console.error('Failed to load course from block click:', err)
  }
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
    console.log('Removing event:', eventId)
    console.log('Current scheduled events before removal:', scheduledEvents.value)
    await unscheduleEvent(eventId)
    console.log('unscheduleEvent API call successful')
    // Refresh schedule after removing
    await refreshSchedule()
    console.log('Schedule refreshed, new scheduled events:', scheduledEvents.value)
    // Remove from hidden events if it was hidden
    hiddenEventIds.value.delete(eventId)
  } catch (err) {
    console.error('Failed to remove event from schedule:', err)
    // Still refresh to get current state
    await refreshSchedule()
  }
}

const handleHideEvent = (eventId: string) => {
  hiddenEventIds.value.add(eventId)
}

const handleShowCourse = (courseName: string) => {
  // Find all events for this course and remove them from hidden set
  scheduledEvents.value.forEach(event => {
    if (event.name === courseName) {
      hiddenEventIds.value.delete(event.event)
    }
  })
}

// Fetch schedule on mount
onMounted(() => {
  fetchSchedule()
})

</script>

<template>
  <div class="scheduling-view">
    <div class="schedule-row">
      <div class="calendar-container">
        <div v-if="scheduledCourseNames.length > 0" class="course-toggle-buttons">
          <button 
            v-for="courseName in scheduledCourseNames"
            :key="courseName"
            @click="handleShowCourse(courseName)"
            class="course-toggle-btn"
          >
            {{ courseName }}
          </button>
        </div>
        <WeekCalendar 
          :scheduled-events="scheduledEvents"
          :hidden-event-ids="hiddenEventIds"
          @block-clicked="handleBlockClick"
          @hide-event="handleHideEvent"
        />
      </div>
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

.calendar-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.course-toggle-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.course-toggle-btn {
  padding: 0.375rem 0.75rem;
  background: hsla(160, 100%, 37%, 1);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.course-toggle-btn:hover {
  background: hsla(160, 100%, 32%, 1);
  transform: translateY(-1px);
}

.course-toggle-btn:active {
  transform: translateY(0);
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


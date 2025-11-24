<template>
  <div class="course-info">
    <div v-if="!course" class="empty-state">
      <p>Select a course to view details</p>
    </div>
    
    <div v-else class="course-details">
      <h2 class="course-title">{{ course.name }}</h2>
      
      <div class="events-container">
        <div class="events-column">
          <h3 class="events-header">Lectures</h3>
          <div v-if="lectureEvents.length === 0" class="no-events">
            <p>No lectures scheduled</p>
          </div>
          <ul v-else class="events-list">
            <li 
              v-for="event in lectureEvents" 
              :key="event.event" 
              :class="['event-item', { 'event-scheduled': isEventScheduled(event.event) }]"
              @click="handleEventClick(event)"
            >
              <div class="radio-button" :class="{ 'radio-selected': isEventScheduled(event.event) }"></div>
              <div class="event-content">
                <div class="event-days">{{ formatDays(event.times.days) }}</div>
                <div class="event-time">{{ formatTimeRange(event.times.startTime, event.times.endTime) }}</div>
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
        
        <div class="events-column">
          <h3 class="events-header">Recitations</h3>
          <div v-if="recitationEvents.length === 0" class="no-events">
            <p>No recitations scheduled</p>
          </div>
          <ul v-else class="events-list">
            <li 
              v-for="event in recitationEvents" 
              :key="event.event" 
              :class="['event-item', { 'event-scheduled': isEventScheduled(event.event) }]"
              @click="handleEventClick(event)"
            >
              <div class="radio-button" :class="{ 'radio-selected': isEventScheduled(event.event) }"></div>
              <div class="event-content">
                <div class="event-days">{{ formatDays(event.times.days) }}</div>
                <div class="event-time">{{ formatTimeRange(event.times.startTime, event.times.endTime) }}</div>
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
import { computed } from 'vue'
import type { Course, CourseEvent } from '@/api/concepts/CourseCatalog'

const props = defineProps<{
  course: Course | null
  scheduledEventIds?: Set<string>
}>()

const emit = defineEmits<{
  (e: 'event-selected', event: CourseEvent, courseName: string): void
  (e: 'add-event', eventId: string): void
  (e: 'remove-event', eventId: string): void
}>()

// Filter events by type
const lectureEvents = computed(() => {
  if (!props.course) return []
  return props.course.events.filter(event => 
    event.type.toLowerCase().includes('lecture')
  )
})

const recitationEvents = computed(() => {
  if (!props.course) return []
  return props.course.events.filter(event => 
    event.type.toLowerCase().includes('recitation')
  )
})

// Find which lecture/recitation is currently scheduled for this course
const scheduledLectureId = computed(() => {
  if (!props.course || !props.scheduledEventIds) return null
  const scheduled = lectureEvents.value.find(event => 
    props.scheduledEventIds?.has(event.event)
  )
  return scheduled?.event ?? null
})

const scheduledRecitationId = computed(() => {
  if (!props.course || !props.scheduledEventIds) return null
  const scheduled = recitationEvents.value.find(event => 
    props.scheduledEventIds?.has(event.event)
  )
  return scheduled?.event ?? null
})

// Helper functions for formatting
const formatDays = (days: string[]): string => {
  return days.join(', ')
}

const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${startTime} - ${endTime}`
}

const handleEventClick = (event: CourseEvent) => {
  console.log('handleEventClick called', event)
  if (!props.course) {
    console.log('No course selected')
    return
  }
  
  const isLecture = event.type.toLowerCase().includes('lecture')
  const isRecitation = event.type.toLowerCase().includes('recitation')
  const isCurrentlyScheduled = isEventScheduled(event.event)
  
  console.log('Event details:', { isLecture, isRecitation, isCurrentlyScheduled, eventId: event.event })
  
  // Emit event-selected for calendar preview
  emit('event-selected', event, props.course.name)
  
  // If already scheduled, do nothing (user can use Remove button)
  if (isCurrentlyScheduled) {
    console.log('Event already scheduled, not adding')
    return
  }
  
  // If not scheduled, automatically add it
  // But first, remove any existing lecture/recitation of the same type
  if (isLecture && scheduledLectureId.value && scheduledLectureId.value !== event.event) {
    // Remove the currently scheduled lecture
    console.log('Removing existing lecture:', scheduledLectureId.value)
    emit('remove-event', scheduledLectureId.value)
  } else if (isRecitation && scheduledRecitationId.value && scheduledRecitationId.value !== event.event) {
    // Remove the currently scheduled recitation
    console.log('Removing existing recitation:', scheduledRecitationId.value)
    emit('remove-event', scheduledRecitationId.value)
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
  max-width: 600px;
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
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
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

@media (max-width: 768px) {
  .events-container {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .course-info {
    max-width: 100%;
  }
}
</style>


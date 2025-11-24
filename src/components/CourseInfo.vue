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
              class="event-item"
              @click="handleEventClick(event)"
            >
              <div class="event-days">{{ formatDays(event.times.days) }}</div>
              <div class="event-time">{{ formatTimeRange(event.times.startTime, event.times.endTime) }}</div>
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
              class="event-item"
              @click="handleEventClick(event)"
            >
              <div class="event-days">{{ formatDays(event.times.days) }}</div>
              <div class="event-time">{{ formatTimeRange(event.times.startTime, event.times.endTime) }}</div>
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
}>()

const emit = defineEmits<{
  (e: 'event-selected', event: CourseEvent, courseName: string): void
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

// Helper functions for formatting
const formatDays = (days: string[]): string => {
  return days.join(', ')
}

const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${startTime} - ${endTime}`
}

const handleEventClick = (event: CourseEvent) => {
  if (props.course) {
    emit('event-selected', event, props.course.name)
  }
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
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s;
}

.event-item:hover {
  background-color: var(--color-background-soft);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.event-days {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
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


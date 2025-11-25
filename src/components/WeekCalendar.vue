<template>
  <div class="schedule-container">
    <div class="calendar">
      <!-- Time labels column -->
      <div class="time-column">
        <div class="time-header"></div>
        <div v-for="hour in hours" :key="hour" class="time-label">
          {{ formatHour(hour) }}
        </div>
      </div>

      <!-- Day columns -->
      <div
        v-for="day in weekDays"
        :key="day"
        class="day-column"
      >
        <div class="day-header">{{ day }}</div>
        <div class="day-grid">
          <!-- Grid lines for hours -->
          <div
            v-for="hour in hours"
            :key="`${day}-${hour}`"
            class="hour-slot"
          ></div>

          <!-- Class blocks -->
          <EventBlock
            v-for="block in getBlocksForDay(day)"
            :key="block.id"
            :code="block.code"
            :start-time="block.startTime"
            :duration="block.duration"
            :color="block.color"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EventBlock from './EventBlock.vue'
import type { CourseEvent, EventInfo } from '@/api/concepts/CourseCatalog'

interface ClassBlock {
  id: string
  code: string
  day: string
  startTime: number // in hours (e.g., 9.5 for 9:30 AM)
  duration: number // in hours
  color: 'red' | 'green' | 'pink' | 'gray' | 'blue'
}

interface TemporaryEvent {
  event: CourseEvent
  courseName: string
}

const props = defineProps<{
  temporaryEvent?: TemporaryEvent | null
  scheduledEvents: EventInfo[]
}>()

const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI']
const hours = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]

// Convert "HH:MM" string to decimal hours
const timeToHours = (timeStr: string): number => {
  const parts = timeStr.split(':')
  const hours = Number(parts[0]) || 0
  const minutes = Number(parts[1]) || 0
  return hours + minutes / 60
}

// Calculate duration in hours from start and end time strings
const calculateDuration = (startTime: string, endTime: string): number => {
  return timeToHours(endTime) - timeToHours(startTime)
}

// Convert temporary event to schedule blocks
const temporaryBlocks = computed<ClassBlock[]>(() => {
  if (!props.temporaryEvent) return []
  
  const { event, courseName } = props.temporaryEvent
  const startTime = timeToHours(event.times.startTime)
  const duration = calculateDuration(event.times.startTime, event.times.endTime)
  
  // Create a separate block for each day with blue color
  return event.times.days.map((day) => ({
    id: `temp-${event.event}-${day}`,
    code: courseName,
    day: day,
    startTime: startTime,
    duration: duration,
    color: 'blue' as const
  }))
})

// Convert scheduled events to schedule blocks
const scheduledBlocks = computed<ClassBlock[]>(() => {
  if (!props.scheduledEvents || props.scheduledEvents.length === 0) return []
  
  const blocks: ClassBlock[] = []
  props.scheduledEvents.forEach((eventInfo) => {
    const startTime = timeToHours(eventInfo.times.startTime)
    const duration = calculateDuration(eventInfo.times.startTime, eventInfo.times.endTime)
    
    // Create a separate block for each day with green color
    eventInfo.times.days.forEach((day) => {
      blocks.push({
        id: `scheduled-${eventInfo.event}-${day}`,
        code: eventInfo.name,
        day: day,
        startTime: startTime,
        duration: duration,
        color: 'green' as const
      })
    })
  })
  
  return blocks
})

// All blocks (temporary events + scheduled events)
const allBlocks = computed<ClassBlock[]>(() => {
  return [...scheduledBlocks.value, ...temporaryBlocks.value]
})

const getBlocksForDay = (day: string) => {
  return allBlocks.value.filter(block => block.day === day)
}

const formatHour = (hour: number) => {
  if (hour === 0 || hour === 24) return 'midnight'
  if (hour === 12) return 'noon'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}
</script>

<style scoped>
.schedule-container {
  width: 100%;
  padding: 20px;
  background: white;
  max-height: 50vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.calendar {
  display: grid;
  grid-template-columns: 60px repeat(5, 1fr);
  gap: 1px;
  background: #e0e0e0;
  border: 1px solid #e0e0e0;
}

.time-column {
  display: flex;
  flex-direction: column;
  background: white;
}

.time-header {
  height: 40px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
}

.time-label {
  height: 50px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-right: 8px;
  padding-top: 4px;
  font-size: 11px;
  color: #666;
  background: white;
  border-bottom: 1px solid #f0f0f0;
}

.day-column {
  display: flex;
  flex-direction: column;
  background: white;
  min-width: 0;
}

.day-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.day-grid {
  position: relative;
  flex: 1;
}

.hour-slot {
  height: 50px;
  border-bottom: 1px solid #f0f0f0;
}
</style>

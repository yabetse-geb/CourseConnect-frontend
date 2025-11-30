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
            :type="block.type"
            :course-name="block.courseName"
            :event-id="block.eventId"
            :start-time="block.startTime"
            :duration="block.duration"
            :color="block.color"
            :column-index="block.columnIndex"
            :total-columns="block.totalColumns"
            @block-clicked="(courseName) => emit('block-clicked', courseName)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EventBlock from './EventBlock.vue'
import type { EventInfo } from '@/api/concepts/CourseCatalog'

interface ClassBlock {
  id: string
  code: string
  type: string
  courseName: string
  eventId: string
  day: string
  startTime: number // in hours (e.g., 9.5 for 9:30 AM)
  duration: number // in hours
  color: 'red' | 'green' | 'pink' | 'gray' | 'blue'
}

interface ClassBlockWithLayout extends ClassBlock {
  columnIndex: number
  totalColumns: number
}

const props = defineProps<{
  scheduledEvents: EventInfo[]
  friend1Events?: EventInfo[]
  friend2Events?: EventInfo[]
}>()

const emit = defineEmits<{
  (e: 'block-clicked', courseName: string): void
}>()

const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI']
const hours = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]

// Convert full day name to abbreviated format (e.g., "Monday" -> "MON")
const convertDayName = (day: string): string => {
  const dayMap: Record<string, string> = {
    'Monday': 'MON',
    'Tuesday': 'TUE',
    'Wednesday': 'WED',
    'Thursday': 'THU',
    'Friday': 'FRI',
    'Saturday': 'SAT',
    'Sunday': 'SUN'
  }
  return dayMap[day] || day.toUpperCase().slice(0, 3)
}

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

// Convert scheduled events to schedule blocks
const scheduledBlocks = computed<ClassBlock[]>(() => {
  if (!props.scheduledEvents || props.scheduledEvents.length === 0) return []
  
  console.log('WeekCalendar - Converting scheduledEvents to blocks:', props.scheduledEvents)
  const blocks: ClassBlock[] = []
  props.scheduledEvents.forEach((eventInfo) => {
    const startTime = timeToHours(eventInfo.times.startTime)
    const duration = calculateDuration(eventInfo.times.startTime, eventInfo.times.endTime)
    
    console.log(`Processing event ${eventInfo.event}: ${eventInfo.name} (${eventInfo.type})`)
    
    // Create a separate block for each day with green color
    eventInfo.times.days.forEach((day) => {
      const block = {
        id: `scheduled-${eventInfo.event}-${day}`,
        code: eventInfo.name,
        type: eventInfo.type,
        courseName: eventInfo.name,
        eventId: eventInfo.event,
        day: convertDayName(day),
        startTime: startTime,
        duration: duration,
        color: 'green' as const
      }
      console.log('Created block:', block)
      blocks.push(block)
    })
  })
  
  console.log('WeekCalendar - Total blocks created:', blocks)
  return blocks
})

// Convert friend 1 events to schedule blocks with blue color
const friend1Blocks = computed<ClassBlock[]>(() => {
  if (!props.friend1Events || props.friend1Events.length === 0) return []
  
  console.log('WeekCalendar - Converting friend1Events to blocks:', props.friend1Events)
  const blocks: ClassBlock[] = []
  props.friend1Events.forEach((eventInfo) => {
    const startTime = timeToHours(eventInfo.times.startTime)
    const duration = calculateDuration(eventInfo.times.startTime, eventInfo.times.endTime)
    
    // Create a separate block for each day with blue color for friend 1's schedule
    eventInfo.times.days.forEach((day) => {
      const block = {
        id: `friend1-${eventInfo.event}-${day}`,
        code: eventInfo.name,
        type: eventInfo.type,
        courseName: eventInfo.name,
        eventId: eventInfo.event,
        day: convertDayName(day),
        startTime: startTime,
        duration: duration,
        color: 'blue' as const
      }
      blocks.push(block)
    })
  })
  
  console.log('WeekCalendar - Friend 1 blocks created:', blocks)
  return blocks
})

// Convert friend 2 events to schedule blocks with pink color
const friend2Blocks = computed<ClassBlock[]>(() => {
  if (!props.friend2Events || props.friend2Events.length === 0) return []
  
  console.log('WeekCalendar - Converting friend2Events to blocks:', props.friend2Events)
  const blocks: ClassBlock[] = []
  props.friend2Events.forEach((eventInfo) => {
    const startTime = timeToHours(eventInfo.times.startTime)
    const duration = calculateDuration(eventInfo.times.startTime, eventInfo.times.endTime)
    
    // Create a separate block for each day with pink color for friend 2's schedule
    eventInfo.times.days.forEach((day) => {
      const block = {
        id: `friend2-${eventInfo.event}-${day}`,
        code: eventInfo.name,
        type: eventInfo.type,
        courseName: eventInfo.name,
        eventId: eventInfo.event,
        day: convertDayName(day),
        startTime: startTime,
        duration: duration,
        color: 'pink' as const
      }
      blocks.push(block)
    })
  })
  
  console.log('WeekCalendar - Friend 2 blocks created:', blocks)
  return blocks
})

// All blocks (user's scheduled events + both friends' events)
const allBlocks = computed<ClassBlock[]>(() => {
  const blocks = [...scheduledBlocks.value, ...friend1Blocks.value, ...friend2Blocks.value]
  console.log('WeekCalendar - All event blocks:', blocks)
  console.log('WeekCalendar - Scheduled blocks:', scheduledBlocks.value)
  console.log('WeekCalendar - Friend 1 blocks:', friend1Blocks.value)
  console.log('WeekCalendar - Friend 2 blocks:', friend2Blocks.value)
  return blocks
})

// Check if two blocks overlap in time
const blocksOverlap = (a: ClassBlock, b: ClassBlock): boolean => {
  const aEnd = a.startTime + a.duration
  const bEnd = b.startTime + b.duration
  return a.startTime < bEnd && b.startTime < aEnd
}

// Assign column positions to overlapping blocks
const assignColumnPositions = (blocks: ClassBlock[]): ClassBlockWithLayout[] => {
  if (blocks.length === 0) return []
  
  // Sort blocks by start time
  const sorted = [...blocks].sort((a, b) => a.startTime - b.startTime)
  
  // Find overlapping groups
  const groups: ClassBlock[][] = []
  let currentGroup: ClassBlock[] = []
  
  sorted.forEach((block) => {
    if (currentGroup.length === 0) {
      currentGroup.push(block)
    } else {
      // Check if this block overlaps with any in the current group
      const overlapsWithGroup = currentGroup.some(b => blocksOverlap(b, block))
      if (overlapsWithGroup) {
        currentGroup.push(block)
      } else {
        // Start a new group
        groups.push(currentGroup)
        currentGroup = [block]
      }
    }
  })
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }
  
  // Assign columns within each group
  const result: ClassBlockWithLayout[] = []
  
  groups.forEach((group) => {
    const totalColumns = group.length
    group.forEach((block, index) => {
      result.push({
        ...block,
        columnIndex: index,
        totalColumns
      })
    })
  })
  
  return result
}

const getBlocksForDay = (day: string): ClassBlockWithLayout[] => {
  const dayBlocks = allBlocks.value.filter(block => block.day === day)
  return assignColumnPositions(dayBlocks)
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

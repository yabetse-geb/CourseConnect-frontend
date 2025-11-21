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
          <ScheduleBlock
            v-for="block in getBlocksForDay(day)"
            :key="block.id"
            :code="block.code"
            :room="block.room"
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
import { ref } from 'vue'
import ScheduleBlock from './ScheduleBlock.vue'

interface ClassBlock {
  id: string
  code: string
  room: string
  day: string
  startTime: number // in hours (e.g., 9.5 for 9:30 AM)
  duration: number // in hours
  color: 'red' | 'green' | 'pink' | 'gray'
}

const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI']
const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

// Dummy schedule data
const scheduleBlocks = ref<ClassBlock[]>([
  // Monday
  {
    id: '1',
    code: '7.012 lec',
    room: '10-250',
    day: 'MON',
    startTime: 10,
    duration: 1,
    color: 'gray'
  },
  {
    id: '2',
    code: '8.02 Physics',
    room: '26-100',
    day: 'MON',
    startTime: 13,
    duration: 1.5,
    color: 'green'
  },
  // Tuesday
  {
    id: '3',
    code: '7.012 rec',
    room: '26-204',
    day: 'TUE',
    startTime: 9,
    duration: 1,
    color: 'gray'
  },
  {
    id: '4',
    code: '18.03 Differential equations',
    room: '10-250',
    day: 'TUE',
    startTime: 13,
    duration: 1.5,
    color: 'pink'
  },
  // Wednesday
  {
    id: '5',
    code: '7.012 lec',
    room: '10-250',
    day: 'WED',
    startTime: 10,
    duration: 1,
    color: 'gray'
  },
  {
    id: '6',
    code: '8.02 Physics',
    room: '26-100',
    day: 'WED',
    startTime: 13,
    duration: 1.5,
    color: 'green'
  },
  // Thursday
  {
    id: '7',
    code: '7.012 rec',
    room: '26-204',
    day: 'THU',
    startTime: 9,
    duration: 1,
    color: 'gray'
  },
  {
    id: '8',
    code: '18.03 Differential equations',
    room: '10-250',
    day: 'THU',
    startTime: 13,
    duration: 1.5,
    color: 'pink'
  },
  // Friday
  {
    id: '9',
    code: '7.012 lec',
    room: '10-250',
    day: 'FRI',
    startTime: 10,
    duration: 1,
    color: 'gray'
  }
])

const getBlocksForDay = (day: string) => {
  return scheduleBlocks.value.filter(block => block.day === day)
}

const formatHour = (hour: number) => {
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
  height: 60px;
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
  height: 60px;
  border-bottom: 1px solid #f0f0f0;
}
</style>

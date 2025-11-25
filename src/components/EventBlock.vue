<template>
  <div
    class="class-block"
    :class="[color, { 'is-hidden': isHidden }]"
    :style="blockStyle"
    @click="handleClick"
  >
    <button 
      class="eye-button"
      @click.stop="handleHide"
      title="Hide event"
    >
      👁️
    </button>
    <div class="block-code">{{ code }}</div>
    <div class="block-type">{{ type }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  code: string
  type: string
  courseName: string
  eventId: string
  startTime: number // in hours (e.g., 9.5 for 9:30 AM)
  duration: number // in hours
  color: 'red' | 'green' | 'pink' | 'gray' | 'blue'
  isHidden?: boolean
  startHour?: number // First hour in the grid (default: 8)
  hourHeight?: number // Height of each hour slot in pixels (default: 60)
}

const props = withDefaults(defineProps<Props>(), {
  startHour: 5,
  hourHeight: 50,
  isHidden: false
})

const emit = defineEmits<{
  (e: 'block-clicked', courseName: string): void
  (e: 'hide-event', eventId: string): void
}>()

const blockStyle = computed(() => {
  const top = (props.startTime - props.startHour) * props.hourHeight
  const height = props.duration * props.hourHeight
  
  return {
    top: `${top}px`,
    height: `${height}px`
  }
})

const handleClick = () => {
  emit('block-clicked', props.courseName)
}

const handleHide = () => {
  emit('hide-event', props.eventId)
}
</script>

<style scoped>
.class-block {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 11px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.2s;
}

.class-block.is-hidden {
  opacity: 0;
  pointer-events: none;
}

.eye-button {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 10px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}

.class-block:hover .eye-button {
  opacity: 1;
}

.eye-button:hover {
  background: rgba(0, 0, 0, 0.5);
}

.class-block:hover {
  transform: scale(1.02);
  z-index: 10;
}

.block-code {
  font-weight: 600;
  color: white;
}

.block-type {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 1px;
}

/* Color classes */
.class-block.red {
  background: #e57373;
  border: 1px solid #d32f2f;
}

.class-block.green {
  background: #66bb6a;
  border: 1px solid #388e3c;
}

.class-block.pink {
  background: #f06292;
  border: 1px solid #c2185b;
}

.class-block.gray {
  background: #90a4ae;
  border: 1px solid #607d8b;
}

.class-block.blue {
  background: #64b5f6;
  border: 1px solid #1976d2;
}
</style>

<template>
  <div
    class="class-block"
    :class="color"
    :style="blockStyle"
  >
    <div class="block-code">{{ code }}</div>
    <div class="block-room">{{ room }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  code: string
  room: string
  startTime: number // in hours (e.g., 9.5 for 9:30 AM)
  duration: number // in hours
  color: 'red' | 'green' | 'pink' | 'gray'
  startHour?: number // First hour in the grid (default: 8)
  hourHeight?: number // Height of each hour slot in pixels (default: 60)
}

const props = withDefaults(defineProps<Props>(), {
  startHour: 8,
  hourHeight: 60
})

const blockStyle = computed(() => {
  const top = (props.startTime - props.startHour) * props.hourHeight
  const height = props.duration * props.hourHeight
  
  return {
    top: `${top}px`,
    height: `${height}px`
  }
})
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
  transition: transform 0.1s;
}

.class-block:hover {
  transform: scale(1.02);
  z-index: 10;
}

.block-code {
  font-weight: 600;
  margin-bottom: 2px;
  color: white;
}

.block-room {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.95);
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
</style>

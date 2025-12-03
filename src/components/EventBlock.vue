<template>
  <div
    class="class-block"
    :class="[color]"
    :style="blockStyle"
    @click="handleClick"
  >
    <div v-if="preferenceColor" class="preference-indicator" :style="{ backgroundColor: preferenceColor }"></div>
    <div class="block-code">{{ displayCode }}</div>
    <div class="block-type">{{ displayType }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  code: string;
  type: string;
  courseName: string;
  eventId: string;
  startTime: number; // in hours (e.g., 9.5 for 9:30 AM)
  duration: number; // in hours
  color: "red" | "green" | "pink" | "gray" | "blue";
  preference?: number; // 0=not likely (red), 1=maybe (yellow), 2=likely (green)
  startHour?: number; // First hour in the grid (default: 8)
  hourHeight?: number; // Height of each hour slot in pixels (default: 60)
  columnIndex?: number; // For side-by-side display of overlapping events
  totalColumns?: number; // Total number of overlapping events
}

const props = withDefaults(defineProps<Props>(), {
  startHour: 8,
  hourHeight: 50,
  columnIndex: 0,
  totalColumns: 1,
});

const emit = defineEmits<{
  (e: "block-clicked", courseName: string): void;
}>();

const displayCode = computed(() => {
  const colonIndex = props.code.indexOf(':')
  return colonIndex !== -1 ? props.code.substring(0, colonIndex) : props.code
})

const displayType = computed(() => {
  const colonIndex = props.type.indexOf(':')
  return colonIndex !== -1 ? props.type.substring(0, colonIndex) : props.type
})

const preferenceColor = computed(() => {
  if (props.preference === undefined) return null;
  if (props.preference === 0) return '#e57373'; // red - not likely
  if (props.preference === 1) return '#fdd835'; // yellow - maybe
  if (props.preference === 2) return '#66bb6a'; // green - likely
  return null;
})

const blockStyle = computed(() => {
  const top = (props.startTime - props.startHour) * props.hourHeight;
  const height = props.duration * props.hourHeight;

  // Calculate width and left position for side-by-side display
  const widthPercent = 100 / props.totalColumns;
  const leftPercent = props.columnIndex * widthPercent;

  return {
    top: `${top}px`,
    height: `${height}px`,
    left: `calc(${leftPercent}% + 2px)`,
    width: `calc(${widthPercent}% - 4px)`,
  };
});

const handleClick = () => {
  emit("block-clicked", props.courseName);
};
</script>

<style scoped>
.class-block {
  position: absolute;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 11px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.1s;
  box-sizing: border-box;
}

.class-block:hover {
  transform: scale(1.02);
  z-index: 10;
}

.preference-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  z-index: 5;
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

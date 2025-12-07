<template>
  <div
    class="class-block"
    :class="[colors.length === 1 ? colors[0] : 'multi-color']"
    :style="blockStyle"
    @click="handleClick"
  >
    <!-- Multi-color background stripes -->
    <div v-if="colors.length > 1" class="color-stripes">
      <div
        v-for="(color, index) in colors"
        :key="index"
        class="color-stripe"
        :class="[color]"
        :style="{ width: `${100 / colors.length}%` }"
      >
        <div
          v-if="preferenceColors[index]"
          class="preference-indicator"
          :style="{ backgroundColor: preferenceColors[index] }"
        ></div>
      </div>
    </div>
    <!-- Single color preference indicator -->
    <div
      v-if="colors.length === 1 && preferenceColors[0]"
      class="preference-indicator"
      :style="{ backgroundColor: preferenceColors[0] }"
    ></div>
    <div class="block-content">
      <div class="block-code">{{ displayCode }}</div>
      <div class="block-type">{{ displayType }}</div>
    </div>
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
  colors: ("red" | "green" | "pink" | "gray" | "blue")[]; // Support multiple colors
  preferences: (number | undefined)[]; // Multiple preferences for merged blocks
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

const getPreferenceColor = (preference: number | undefined): string | null => {
  if (preference === undefined) return null;
  if (preference === 0) return '#ff5722'; // deep orange - not likely
  if (preference === 1) return '#fdd835'; // yellow - maybe
  if (preference === 2) return '#00bcd4'; // cyan - likely
  return null;
};

const preferenceColors = computed(() => {
  return props.preferences.map((pref) => getPreferenceColor(pref));
});

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

.color-stripes {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  border-radius: 4px;
  overflow: hidden;
}

.color-stripe {
  height: 100%;
  position: relative;
}

.color-stripe .preference-indicator {
  position: absolute;
  bottom: 4px;
  right: 4px;
}

.color-stripe.red {
  background: #e57373;
}

.color-stripe.green {
  background: #66bb6a;
}

.color-stripe.pink {
  background: #f06292;
}

.color-stripe.gray {
  background: #90a4ae;
}

.color-stripe.blue {
  background: #9575cd;
}

.block-content {
  position: relative;
  padding: 6px 8px;
  z-index: 1;
}

.class-block.multi-color {
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.preference-indicator {
  position: absolute;
  bottom: 4px;
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
  background: #9575cd;
  border: 1px solid #7e57c2;
}
</style>

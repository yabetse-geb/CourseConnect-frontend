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
      <div v-for="day in weekDays" :key="day" class="day-column">
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
            :colors="block.colors"
            :preferences="block.preferences"
            :start-hour="hours[0]"
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
import { computed } from "vue";
import EventBlock from "./EventBlock.vue";
import type { EventInfo } from "@/api/concepts/CourseCatalog";
import type { EventInfoWithScore } from "@/api/concepts/SchedulingAPI";

type BlockColor = "red" | "green" | "pink" | "gray" | "blue";

interface ClassBlock {
  id: string;
  code: string;
  type: string;
  courseName: string;
  eventId: string;
  day: string;
  startTime: number; // in hours (e.g., 9.5 for 9:30 AM)
  duration: number; // in hours
  color: BlockColor;
  preference?: number; // 0=not likely (red), 1=maybe (yellow), 2=likely (green)
}

interface MergedClassBlock {
  id: string;
  code: string;
  type: string;
  courseName: string;
  eventId: string;
  day: string;
  startTime: number;
  duration: number;
  colors: BlockColor[]; // Multiple colors for merged blocks
  preferences: (number | undefined)[]; // Multiple preferences for merged blocks
}

interface ClassBlockWithLayout extends MergedClassBlock {
  columnIndex: number;
  totalColumns: number;
}

const props = defineProps<{
  scheduledEvents: EventInfo[];
  friend1Events?: EventInfoWithScore[];
  friend2Events?: EventInfoWithScore[];
  coursePreferences?: Map<string, number>; // Map of courseId to preference score (0=not likely, 1=maybe, 2=likely)
}>();

const emit = defineEmits<{
  (e: "block-clicked", courseName: string): void;
}>();

const weekDays = ["MON", "TUE", "WED", "THU", "FRI"];
const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

// Convert full day name to abbreviated format (e.g., "Monday" -> "MON")
const convertDayName = (day: string): string => {
  const dayMap: Record<string, string> = {
    Monday: "MON",
    Tuesday: "TUE",
    Wednesday: "WED",
    Thursday: "THU",
    Friday: "FRI",
    Saturday: "SAT",
    Sunday: "SUN",
  };
  return dayMap[day] || day.toUpperCase().slice(0, 3);
};

// Convert "HH:MM" string to decimal hours
const timeToHours = (timeStr: string): number => {
  const parts = timeStr.split(":");
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  return hours + minutes / 60;
};

// Calculate duration in hours from start and end time strings
const calculateDuration = (startTime: string, endTime: string): number => {
  return timeToHours(endTime) - timeToHours(startTime);
};

// Get preference for a course by its name
const getPreference = (courseName: string): number | undefined => {
  if (!props.coursePreferences) return undefined;
  return props.coursePreferences.get(courseName);
};

// Convert scheduled events to schedule blocks
const scheduledBlocks = computed<ClassBlock[]>(() => {
  if (!props.scheduledEvents || props.scheduledEvents.length === 0) return [];

  console.log(
    "WeekCalendar - Converting scheduledEvents to blocks:",
    props.scheduledEvents
  );
  const blocks: ClassBlock[] = [];
  props.scheduledEvents.forEach((eventInfo) => {
    const startTime = timeToHours(eventInfo.times.startTime);
    const duration = calculateDuration(
      eventInfo.times.startTime,
      eventInfo.times.endTime
    );

    console.log(
      `Processing event ${eventInfo.event}: ${eventInfo.name} (${eventInfo.type})`
    );

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
        color: "green" as const,
        preference: getPreference(eventInfo.name),
      };
      console.log("Created block:", block);
      blocks.push(block);
    });
  });

  console.log("WeekCalendar - Total blocks created:", blocks);
  return blocks;
});

// Convert friend 1 events to schedule blocks with blue color
const friend1Blocks = computed<ClassBlock[]>(() => {
  if (!props.friend1Events || props.friend1Events.length === 0) return [];

  console.log(
    "WeekCalendar - Converting friend1Events to blocks:",
    props.friend1Events
  );
  const blocks: ClassBlock[] = [];
  props.friend1Events.forEach((eventInfo) => {
    const startTime = timeToHours(eventInfo.times.startTime);
    const duration = calculateDuration(
      eventInfo.times.startTime,
      eventInfo.times.endTime
    );

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
        color: "blue" as const,
        preference: eventInfo.score ?? undefined,
      };
      blocks.push(block);
    });
  });

  console.log("WeekCalendar - Friend 1 blocks created:", blocks);
  return blocks;
});

// Convert friend 2 events to schedule blocks with pink color
const friend2Blocks = computed<ClassBlock[]>(() => {
  if (!props.friend2Events || props.friend2Events.length === 0) return [];

  console.log(
    "WeekCalendar - Converting friend2Events to blocks:",
    props.friend2Events
  );
  const blocks: ClassBlock[] = [];
  props.friend2Events.forEach((eventInfo) => {
    const startTime = timeToHours(eventInfo.times.startTime);
    const duration = calculateDuration(
      eventInfo.times.startTime,
      eventInfo.times.endTime
    );

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
        color: "pink" as const,
        preference: eventInfo.score ?? undefined,
      };
      blocks.push(block);
    });
  });

  console.log("WeekCalendar - Friend 2 blocks created:", blocks);
  return blocks;
});

// All blocks (user's scheduled events + both friends' events)
const allBlocks = computed<ClassBlock[]>(() => {
  const blocks = [
    ...scheduledBlocks.value,
    ...friend1Blocks.value,
    ...friend2Blocks.value,
  ];
  console.log("WeekCalendar - All event blocks:", blocks);
  console.log("WeekCalendar - Scheduled blocks:", scheduledBlocks.value);
  console.log("WeekCalendar - Friend 1 blocks:", friend1Blocks.value);
  console.log("WeekCalendar - Friend 2 blocks:", friend2Blocks.value);
  return blocks;
});

// Merge blocks that have the same course at the same time
const mergeMatchingBlocks = (blocks: ClassBlock[]): MergedClassBlock[] => {
  const merged: MergedClassBlock[] = [];
  const processed = new Set<string>();

  blocks.forEach((block) => {
    if (processed.has(block.id)) return;

    // Find all blocks with the same course, day, start time and duration
    const matching = blocks.filter(
      (b) =>
        b.courseName === block.courseName &&
        b.day === block.day &&
        b.startTime === block.startTime &&
        b.duration === block.duration
    );

    // Mark all matching blocks as processed
    matching.forEach((b) => processed.add(b.id));

    // Create merged block with all unique colors and their corresponding preferences
    const colorPreferencePairs: { color: BlockColor; preference: number | undefined }[] = [];
    const seenColors = new Set<BlockColor>();
    
    matching.forEach((b) => {
      if (!seenColors.has(b.color)) {
        seenColors.add(b.color);
        colorPreferencePairs.push({ color: b.color, preference: b.preference });
      }
    });
    
    merged.push({
      id: matching.map((b) => b.id).join("-"),
      code: block.code,
      type: block.type,
      courseName: block.courseName,
      eventId: block.eventId,
      day: block.day,
      startTime: block.startTime,
      duration: block.duration,
      colors: colorPreferencePairs.map((p) => p.color),
      preferences: colorPreferencePairs.map((p) => p.preference),
    });
  });

  return merged;
};

// Check if two blocks overlap in time
const blocksOverlap = (a: MergedClassBlock, b: MergedClassBlock): boolean => {
  const aEnd = a.startTime + a.duration;
  const bEnd = b.startTime + b.duration;
  return a.startTime < bEnd && b.startTime < aEnd;
};

// Assign column positions to overlapping blocks
const assignColumnPositions = (
  blocks: MergedClassBlock[]
): ClassBlockWithLayout[] => {
  if (blocks.length === 0) return [];

  // Sort blocks by start time
  const sorted = [...blocks].sort((a, b) => a.startTime - b.startTime);

  // Find overlapping groups
  const groups: MergedClassBlock[][] = [];
  let currentGroup: MergedClassBlock[] = [];

  sorted.forEach((block) => {
    if (currentGroup.length === 0) {
      currentGroup.push(block);
    } else {
      // Check if this block overlaps with any in the current group
      const overlapsWithGroup = currentGroup.some((b) =>
        blocksOverlap(b, block)
      );
      if (overlapsWithGroup) {
        currentGroup.push(block);
      } else {
        // Start a new group
        groups.push(currentGroup);
        currentGroup = [block];
      }
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Assign columns within each group
  const result: ClassBlockWithLayout[] = [];

  groups.forEach((group) => {
    const totalColumns = group.length;
    group.forEach((block, index) => {
      result.push({
        ...block,
        columnIndex: index,
        totalColumns,
      });
    });
  });

  return result;
};

const getBlocksForDay = (day: string): ClassBlockWithLayout[] => {
  const dayBlocks = allBlocks.value.filter((block) => block.day === day);
  const mergedBlocks = mergeMatchingBlocks(dayBlocks);
  return assignColumnPositions(mergedBlocks);
};

const formatHour = (hour: number) => {
  if (hour === 0 || hour === 24) return "midnight";
  if (hour === 12) return "noon";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
};
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

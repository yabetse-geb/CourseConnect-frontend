<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import WeekCalendar from "../components/WeekCalendar.vue";
import CourseSearch from "../components/CourseSearch.vue";
import CourseInfo from "../components/CourseInfo.vue";
import GroupScheduleList from "../components/GroupScheduleList.vue";
import SectionHoverInfo from "../components/SectionHoverInfo.vue";
import type {
  Course,
  CourseEvent,
  EventInfo,
} from "@/api/concepts/CourseCatalog";
import {
  scheduleEvent,
  unscheduleEvent,
  getUserSchedule,
  type EventInfoWithScore,
} from "@/api/concepts/SchedulingAPI";
import { getEventInfo, getAllCourses } from "@/api/concepts/CourseCatalog";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();

const selectedCourse = ref<Course | null>(null);
const courseInfoRef = ref<HTMLElement | null>(null);
const temporaryEvent = ref<{ event: CourseEvent; courseName: string } | null>(
  null
);

// Track scheduled events from backend
const scheduledEvents = ref<EventInfo[]>([]);

// Track course preferences (courseId -> preference score)
const coursePreferences = ref<Map<string, number>>(new Map());

// Store course name to ID mapping for preferences
const courseNameToId = ref<Map<string, string>>(new Map());

// Computed: preferences indexed by course name for WeekCalendar
const preferencesByCourseName = computed(() => {
  const prefs = new Map<string, number>();
  courseNameToId.value.forEach((courseId, courseName) => {
    const score = coursePreferences.value.get(courseId);
    if (score !== undefined) {
      prefs.set(courseName, score);
    }
  });
  return prefs;
});

// Track selected friends for schedule comparison (up to 2)
interface SelectedFriend {
  id: string;
  username: string;
  schedule: EventInfoWithScore[];
}
const selectedFriends = ref<SelectedFriend[]>([]);

// Computed properties for template
const selectedFriendIds = computed(() =>
  selectedFriends.value.map((f) => f.id)
);
const friend1Schedule = computed(
  () => selectedFriends.value[0]?.schedule || []
);
const friend2Schedule = computed(
  () => selectedFriends.value[1]?.schedule || []
);

// Get unique course names from scheduled events for the toggle buttons
const scheduledCourseNames = computed(() => {
  const names = new Set<string>();
  scheduledEvents.value.forEach((event) => names.add(event.name));
  return Array.from(names).sort();
});

// Create a Set of scheduled event IDs for efficient lookup
const scheduledEventIds = computed(() => {
  return new Set(scheduledEvents.value.map((se) => se.event));
});

// Track hovered section for SectionHoverInfo component
const hoveredSection = ref<{
  eventId: string;
  courseName: string;
  type: string;
} | null>(null);

const handleSectionHover = (eventId: string, courseName: string, type: string) => {
  hoveredSection.value = { eventId, courseName, type };
};

// Fetch the user's own schedule from backend
// This schedule is always displayed in the calendar (green blocks)
// This is why the current user is filtered out from GroupScheduleList - their schedule is always visible
const fetchSchedule = async () => {
  try {
    console.log("Fetching schedule...");
    const user = authStore.user;
    if (!user) {
      console.warn("No user found, cannot fetch schedule");
      scheduledEvents.value = [];
      coursePreferences.value = new Map();
      return;
    }

    // Get event information from user's schedule (now includes preference scores)
    const eventInfo = await getUserSchedule(user);
    console.log("Fetched schedule from API:", eventInfo);
    
    // Get all courses to map course names to IDs
    const allCourses = await getAllCourses();
    const nameToId = new Map<string, string>();
    allCourses.forEach(course => {
      nameToId.set(course.name, course.course);
    });
    courseNameToId.value = nameToId;
    
    // Extract preferences from the schedule response, mapping to course IDs
    const prefs = new Map<string, number>();
    eventInfo.forEach((event) => {
      if (event.score !== null && event.score !== undefined) {
        const courseId = nameToId.get(event.name);
        if (courseId) {
          prefs.set(courseId, event.score);
        }
      }
    });
    coursePreferences.value = prefs;
    console.log("Extracted preferences from schedule:", prefs);
    
    // Store events
    scheduledEvents.value = eventInfo;
    console.log("Updated scheduledEvents.value:", scheduledEvents.value);
  } catch (err) {
    console.error("Failed to fetch schedule:", err);
    scheduledEvents.value = [];
    coursePreferences.value = new Map();
  }
};

// Refresh schedule
const refreshSchedule = async () => {
  await fetchSchedule();
};

// Get preference for selected course
const selectedCoursePreference = computed(() => {
  if (!selectedCourse.value) return null;
  const courseId = selectedCourse.value.course; // Use course ID
  return coursePreferences.value.get(courseId) ?? null;
});

// Handle preference change from CourseInfo
const handlePreferenceChanged = async (courseId: string, score: number) => {
  coursePreferences.value.set(courseId, score);
  console.log(`Preference updated: ${courseId} = ${score}`);
  // Refresh schedule to get updated preferences for all events
  await fetchSchedule();
};

// Handle preference clear from CourseInfo
const handlePreferenceCleared = async (courseId: string) => {
  coursePreferences.value.delete(courseId);
  console.log(`Preference cleared: ${courseId}`);
  // Refresh schedule to get updated preferences for all events
  await fetchSchedule();
};

const handleCourseSelected = (course: Course) => {
  selectedCourse.value = course;
  // Clear temporary event when selecting a new course
  temporaryEvent.value = null;
  scrollToCourseInfo();
};

const handleBlockClick = async (courseName: string) => {
  try {
    // Get all courses and find the one matching the name
    const courses = await getAllCourses();
    const course = courses.find((c) => c.name === courseName);
    if (course) {
      selectedCourse.value = course;
      scrollToCourseInfo();
    }
  } catch (err) {
    console.error("Failed to load course from block click:", err);
  }
};

const handleEventSelected = (event: CourseEvent, courseName: string) => {
  // Replace temporary event with the newly clicked one
  temporaryEvent.value = { event, courseName };
};

const handleAddEvent = async (eventId: string) => {
  console.log("handleAddEvent called with eventId:", eventId);
  try {
    console.log("Calling scheduleEvent API...");
    await scheduleEvent(eventId);
    console.log("scheduleEvent API call successful");
    // Refresh schedule after adding
    await refreshSchedule();
  } catch (err) {
    console.error("Failed to add event to schedule:", err);
    // Still refresh to get current state
    await refreshSchedule();
  }
};

const handleRemoveEvent = async (eventId: string) => {
  try {
    console.log("Removing event:", eventId);
    console.log(
      "Current scheduled events before removal:",
      scheduledEvents.value
    );
    await unscheduleEvent(eventId);
    console.log("unscheduleEvent API call successful");
    // Refresh schedule after removing
    await refreshSchedule();
    console.log(
      "Schedule refreshed, new scheduled events:",
      scheduledEvents.value
    );
  } catch (err) {
    console.error("Failed to remove event from schedule:", err);
    // Still refresh to get current state
    await refreshSchedule();
  }
};

const handleFriendSelected = async (
  friendId: string,
  friendUsername: string
) => {
  // Check if already selected
  if (selectedFriends.value.some((f) => f.id === friendId)) {
    return;
  }

  // Limit to 2 friends
  if (selectedFriends.value.length >= 2) {
    // Remove the first one to make room
    selectedFriends.value.shift();
  }

  try {
    const friendEvents = await getUserSchedule(friendId);
    selectedFriends.value.push({
      id: friendId,
      username: friendUsername,
      schedule: friendEvents,
    });
    console.log("Fetched friend schedule:", friendEvents);
  } catch (err) {
    console.error("Failed to fetch friend schedule:", err);
  }
};

const handleFriendDeselected = (friendId: string) => {
  selectedFriends.value = selectedFriends.value.filter(
    (f) => f.id !== friendId
  );
};

const clearAllFriends = () => {
  selectedFriends.value = [];
};

const handleShowCourse = (courseName: string) => {
  // This function was used to show hidden courses, but hiding is no longer supported
  console.log("Show course:", courseName);
};

// Scroll to CourseInfo component with custom smooth animation
const scrollToCourseInfo = () => {
  // Start immediately - element always exists in DOM
  if (!courseInfoRef.value) {
    // Fallback: if element doesn't exist, wait for next tick (shouldn't happen normally)
    nextTick().then(() => {
      if (courseInfoRef.value) {
        startScrollAnimation(courseInfoRef.value);
      }
    });
    return;
  }
  
  startScrollAnimation(courseInfoRef.value);
};

const startScrollAnimation = (element: HTMLElement) => {
  const startPosition = window.scrollY;
  const elementRect = element.getBoundingClientRect();
  const targetPosition = elementRect.top + startPosition - 60; // 60px offset for navigation bar
  const distance = targetPosition - startPosition;
  const duration = 900; // 900ms for slower, more visible scroll
  const startTime = performance.now(); // Initialize immediately
  
  // Easing function: ease-in-out
  const easeInOut = (t: number): number => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  };
  
  const animateScroll = (currentTime: number) => {
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const easedProgress = easeInOut(progress);
    
    window.scrollTo(0, startPosition + distance * easedProgress);
    
    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  };
  
  // Start immediately instead of waiting for next frame
  animateScroll(performance.now());
};

// Fetch schedule on mount
onMounted(() => {
  fetchSchedule();
});
</script>

<template>
  <div class="scheduling-view">
    <div class="schedule-row">
      <div class="friends-column">
        <GroupScheduleList
          :session="authStore.session"
          :selected-friend-ids="selectedFriendIds"
          @friend-selected="handleFriendSelected"
          @friend-deselected="handleFriendDeselected"
        />
        <SectionHoverInfo
          :event-id="hoveredSection?.eventId ?? null"
          :course-name="hoveredSection?.courseName ?? null"
          :section-type="hoveredSection?.type ?? null"
          :session="authStore.session"
        />
      </div>
      <div class="calendar-container">
        <div
          v-if="scheduledCourseNames.length > 0"
          class="course-toggle-buttons"
        >
          <button
            v-for="courseName in scheduledCourseNames"
            :key="courseName"
            @click="handleShowCourse(courseName)"
            class="course-toggle-btn"
          >
            {{ courseName.split(':')[0] }}
          </button>
        </div>
        <div class="comparison-header">
          <div class="legend">
            <span class="legend-item"
              ><span class="legend-color user-color"></span> Your schedule</span
            >
            <span v-if="selectedFriends[0]" class="legend-item"
              ><span class="legend-color friend1-color"></span>
              {{ selectedFriends[0].username }}</span
            >
            <span v-if="selectedFriends[1]" class="legend-item"
              ><span class="legend-color friend2-color"></span>
              {{ selectedFriends[1].username }}</span
            >
          </div>
          <div v-if="selectedFriends.length > 0" class="comparison-info">
            Comparing with:
            <strong
              v-for="(friend, index) in selectedFriends"
              :key="friend.id"
              :class="`friend-name-${index + 1}`"
            >
              {{ friend.username
              }}<span v-if="index < selectedFriends.length - 1">, </span>
            </strong>
          </div>
          <button
            v-if="selectedFriends.length > 0"
            class="clear-comparison-btn"
            @click="clearAllFriends"
          >
            Clear All
          </button>
        </div>
        <div class="preference-legend">
          <span class="preference-legend-title">Preference:</span>
          <span class="preference-legend-item">
            <span class="preference-indicator likely"></span>
            Likely
          </span>
          <span class="preference-legend-item">
            <span class="preference-indicator maybe"></span>
            Maybe
          </span>
          <span class="preference-legend-item">
            <span class="preference-indicator not-likely"></span>
            Not likely
          </span>
        </div>
        <!-- User's own schedule (always displayed as green blocks) -->
        <!-- This is why the current user is filtered out from GroupScheduleList -->
        <WeekCalendar
          :scheduled-events="scheduledEvents"
          :friend1-events="friend1Schedule"
          :friend2-events="friend2Schedule"
          :course-preferences="preferencesByCourseName"
          @block-clicked="handleBlockClick"
          @section-hover="handleSectionHover"
        />
      </div>
    </div>
    <div class="courses-row">
      <div class="left-column">
        <CourseSearch @course-selected="handleCourseSelected" />
      </div>
      <div class="middle-column" ref="courseInfoRef">
        <CourseInfo
          :course="selectedCourse"
          :scheduled-event-ids="scheduledEventIds"
          :current-preference="selectedCoursePreference"
          @event-selected="handleEventSelected"
          @add-event="handleAddEvent"
          @remove-event="handleRemoveEvent"
          @preference-changed="handlePreferenceChanged"
          @preference-cleared="handlePreferenceCleared"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.scheduling-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 2rem;
  gap: 2rem;
}

.schedule-row {
  display: flex;
  gap: 1.5rem;
  width: 100%;
  flex-shrink: 0;
}

.friends-column {
  width: 280px;
  flex-shrink: 0;
  max-height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.friends-column :deep(.friends-box) {
  height: 100%;
  min-height: unset;
  max-height: 100%;
  overflow: hidden;
}

.friends-column :deep(.friends-list) {
  max-height: calc(100% - 120px);
  overflow-y: auto;
}

.calendar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}

.comparison-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: hsla(200, 100%, 50%, 0.15);
  border: 1px solid hsla(200, 100%, 50%, 0.3);
  border-radius: 4px;
  font-size: 0.875rem;
  color: var(--color-text);
  flex-wrap: wrap;
}

.comparison-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.comparison-header strong {
  color: hsla(200, 100%, 60%, 1);
}

.legend {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-color.user-color {
  background: #66bb6a;
  border: 1px solid #388e3c;
}

.legend-color.friend1-color {
  background: #9575cd;
  border: 1px solid #7e57c2;
}

.legend-color.friend2-color {
  background: #f06292;
  border: 1px solid #c2185b;
}

.friend-name-1 {
  color: #9575cd;
}

.friend-name-2 {
  color: #f06292;
}

.clear-comparison-btn {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.clear-comparison-btn:hover {
  background: var(--color-background-mute);
}

.preference-legend {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  background: hsla(160, 30%, 50%, 0.1);
  border: 1px solid hsla(160, 30%, 50%, 0.25);
  border-radius: 4px;
  font-size: 0.875rem;
  color: var(--color-text);
}

.preference-legend-title {
  font-weight: 500;
  margin-right: 0.25rem;
}

.preference-legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
}

.preference-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.preference-indicator.likely {
  background: #00bcd4;
}

.preference-indicator.maybe {
  background: #fdd835;
}

.preference-indicator.not-likely {
  background: #ff5722;
}

.course-toggle-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.course-toggle-btn {
  padding: 0.375rem 0.75rem;
  background: hsla(160, 100%, 37%, 1);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.course-toggle-btn:hover {
  background: hsla(160, 100%, 32%, 1);
  transform: translateY(-1px);
}

.course-toggle-btn:active {
  transform: translateY(0);
}

.courses-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
}

@media (max-width: 1024px) {
  .schedule-row {
    flex-direction: column;
    max-height: none;
  }

  .friends-column {
    width: 100%;
    max-height: 300px;
  }

  .courses-row {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}
</style>

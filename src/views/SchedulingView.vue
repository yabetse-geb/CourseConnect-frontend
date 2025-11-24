<script setup lang="ts">
import { ref, computed } from 'vue'
import Schedule from '../components/Schedule.vue'
import CourseSearch from '../components/CourseSearch.vue'
import CourseInfo from '../components/CourseInfo.vue'
import type { Course, CourseEvent } from '@/api/concepts/CourseCatalog'

const selectedCourse = ref<Course | null>(null)
const temporaryEvent = ref<{ event: CourseEvent; courseName: string } | null>(null)

const handleCourseSelected = (course: Course) => {
  selectedCourse.value = course
  // Clear temporary event when selecting a new course
  temporaryEvent.value = null
}

const handleEventSelected = (event: CourseEvent, courseName: string) => {
  // Replace temporary event with the newly clicked one
  temporaryEvent.value = { event, courseName }
}

</script>

<template>
  <div class="scheduling-view">
    <div class="schedule-row">
      <Schedule 
        :temporary-event="temporaryEvent"
      />
    </div>
    <div class="courses-row">
      <div class="left-column">
        <CourseSearch @course-selected="handleCourseSelected" />
      </div>
      <div class="right-column">
        <CourseInfo 
          :course="selectedCourse" 
          @event-selected="handleEventSelected"
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
  width: 100%;
  max-height: 50vh;
  overflow: hidden;
  flex-shrink: 0;
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
  .courses-row {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}
</style>


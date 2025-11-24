<template>
  <div class="courses-view">
    <div class="courses-container">
      <div class="left-column">
        <CourseSearch @course-selected="handleCourseSelected" />
      </div>
      <div class="right-column">
        <CourseInfo :course="selectedCourse" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CourseSearch from '../components/CourseSearch.vue'
import CourseInfo from '../components/CourseInfo.vue'
import type { Course } from '@/api/concepts/CourseCatalog'

const selectedCourse = ref<Course | null>(null)

const handleCourseSelected = (course: Course) => {
  selectedCourse.value = course
}
</script>

<style scoped>
.courses-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 2rem;
}

h1 {
  color: var(--color-heading);
  margin-bottom: 2rem;
  font-size: 2rem;
}

.courses-container {
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
  .courses-container {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}
</style>


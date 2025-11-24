<template>
  <div class="course-search">
    <div class="search-container">
      <div class="search-input-wrapper">
        <input
          v-model="filters.searchQuery"
          type="text"
          class="search-input"
          placeholder="Search courses by name..."
          @input="handleSearch"
        />
      </div>
      <!-- Future filters area - ready for expansion -->
      <div class="filters-area">
        <!-- Additional filters (units, lab, humanities, etc.) will go here -->
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      Loading courses...
    </div>

    <div v-else-if="error" class="error-state">
      Error: {{ error }}
    </div>

    <div v-else class="results-container">
      <div v-if="filteredCourses.length === 0" class="no-results">
        <p v-if="filters.searchQuery">
          No courses found matching "{{ filters.searchQuery }}"
        </p>
        <p v-else>No courses available</p>
      </div>

      <ul v-else class="courses-list">
        <li
          v-for="course in filteredCourses"
          :key="course.course"
          class="course-item"
          @click="handleCourseClick(course)"
        >
          <div class="course-name">{{ course.name }}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { getAllCourses, type Course } from '@/api/concepts/CourseCatalog'

// Emits
const emit = defineEmits<{
  (e: 'course-selected', course: Course): void
}>()

// Reactive state
const courses = ref<Course[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Filters object - extensible for future filters
const filters = reactive({
  searchQuery: ''
})

// Dummy course data for development fallback
const dummyCourses: Course[] = [
  {
    course: 'course-1',
    name: '6.0001',
    events: [
      {
        event: 'event-1',
        type: 'Lecture',
        times: {
          days: ['MON', 'WED', 'FRI'],
          startTime: '10:00',
          endTime: '11:00'
        }
      },
      {
        event: 'event-2',
        type: 'Recitation',
        times: {
          days: ['TUE'],
          startTime: '14:00',
          endTime: '15:00'
        }
      }
    ]
  },
  {
    course: 'course-2',
    name: '6.006',
    events: [
      {
        event: 'event-3',
        type: 'Lecture',
        times: {
          days: ['TUE', 'THU'],
          startTime: '11:00',
          endTime: '12:30'
        }
      }
    ]
  },
  {
    course: 'course-3',
    name: '18.06',
    events: [
      {
        event: 'event-4',
        type: 'Lecture',
        times: {
          days: ['MON', 'WED', 'FRI'],
          startTime: '13:00',
          endTime: '14:00'
        }
      }
    ]
  },
  {
    course: 'course-4',
    name: '6.034',
    events: [
      {
        event: 'event-5',
        type: 'Lecture',
        times: {
          days: ['TUE', 'THU'],
          startTime: '10:00',
          endTime: '11:30'
        }
      }
    ]
  },
  {
    course: 'course-5',
    name: '6.813',
    events: [
      {
        event: 'event-6',
        type: 'Lecture',
        times: {
          days: ['MON', 'WED'],
          startTime: '14:00',
          endTime: '15:30'
        }
      },
      {
        event: 'event-7',
        type: 'Lab',
        times: {
          days: ['FRI'],
          startTime: '10:00',
          endTime: '12:00'
        }
      }
    ]
  },
  {
    course: 'course-6',
    name: '14.01',
    events: [
      {
        event: 'event-8',
        type: 'Lecture',
        times: {
          days: ['TUE', 'THU'],
          startTime: '09:00',
          endTime: '10:30'
        }
      }
    ]
  }
]

// Computed property for filtered courses
const filteredCourses = computed(() => {
  if (!filters.searchQuery.trim()) {
    return courses.value
  }

  const query = filters.searchQuery.toLowerCase().trim()
  return courses.value.filter(course =>
    course.name.toLowerCase().includes(query)
  )
})

// Methods
const fetchCourses = async () => {
  loading.value = true
  error.value = null

  try {
    const fetchedCourses = await getAllCourses()
    // Use dummy data if API returns empty array, otherwise use fetched courses
    courses.value = fetchedCourses.length > 0 ? fetchedCourses : dummyCourses
  } catch (err) {
    // On error, fall back to dummy data for development
    console.warn('API call failed, using dummy data:', err)
    courses.value = dummyCourses
    error.value = null // Clear error so UI doesn't show error state
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  // Search is handled by computed property
  // This method can be extended for debouncing if needed
}

const handleCourseClick = (course: Course) => {
  emit('course-selected', course)
}

// Lifecycle
onMounted(() => {
  fetchCourses()
})
</script>

<style scoped>
.course-search {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.search-container {
  margin-bottom: 1.5rem;
}

.search-input-wrapper {
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background);
  color: var(--color-text);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: hsla(160, 100%, 37%, 1);
  box-shadow: 0 0 0 3px hsla(160, 100%, 37%, 0.1);
}

.search-input::placeholder {
  color: var(--color-text-soft);
}

.filters-area {
  /* Reserved for future filters */
  min-height: 0;
}

.loading-state,
.error-state,
.no-results {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-soft);
}

.error-state {
  color: #e57373;
}

.results-container {
  width: 100%;
}

.courses-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.course-item {
  padding: 1rem;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s;
}

.course-item:hover {
  background-color: var(--color-background);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.course-name {
  font-size: 1rem;
  color: var(--color-text);
}

@media (min-width: 768px) {
  .course-search {
    padding: 0 1rem;
  }
}
</style>


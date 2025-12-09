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
        <div class="filter-buttons">
          <button
            v-for="tag in filterTags"
            :key="tag"
            :class="[
              'filter-btn',
              { active: filters.selectedTags.includes(tag) },
            ]"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-state">Loading courses...</div>

    <div v-else-if="error" class="error-state">Error: {{ error }}</div>

    <div v-else class="results-container">
      <div v-if="filteredCourses.length === 0" class="no-results">
        <p v-if="filters.searchQuery">
          No courses found matching "{{ filters.searchQuery }}"
        </p>
        <p v-else>No courses available</p>
      </div>

      <ul v-else class="courses-list">
        <li
          v-for="course in visibleCourses"
          :key="course.course"
          class="course-item"
          @click="handleCourseClick(course)"
        >
          <div class="course-name">{{ course.name }}</div>
        </li>
      </ul>

      <div
        v-if="filteredCourses.length > PAGE_SIZE"
        class="pagination-controls"
      >
        <button class="nav-button" :disabled="!canShowPrev" @click="showPrev">
          Previous
        </button>
        <button class="nav-button" :disabled="!canShowNext" @click="showNext">
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { getAllCourses, type Course } from "@/api/concepts/CourseCatalog";

const PAGE_SIZE = 5;

// Filter tags
const filterTags = ["HASS", "CI-M", "CI-H"];

// Emits
const emit = defineEmits<{
  (e: "course-selected", course: Course): void;
}>();

// Reactive state
const courses = ref<Course[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Filters object - extensible for future filters
const filters = reactive({
  searchQuery: "",
  selectedTags: [] as string[],
});

// Computed property for filtered courses
const filteredCourses = computed(() => {
  let filtered = courses.value;

  // Filter by tags
  if (filters.selectedTags.length > 0) {
    filtered = filtered.filter((course) => {
      // Use the tags array from the course object
      const courseTags = course.tags || [];
      return filters.selectedTags.every((tag) => courseTags.includes(tag));
    });
  }

  // Filter by search query
  if (filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter((course) =>
      course.name.toLowerCase().includes(query)
    );
  }

  return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
});

const visibleStart = ref(0);
const visibleCourses = computed(() =>
  filteredCourses.value.slice(
    visibleStart.value,
    visibleStart.value + PAGE_SIZE
  )
);
const canShowPrev = computed(() => visibleStart.value > 0);
const canShowNext = computed(
  () => visibleStart.value + PAGE_SIZE < filteredCourses.value.length
);

const showPrev = () => {
  visibleStart.value = Math.max(0, visibleStart.value - PAGE_SIZE);
};

const showNext = () => {
  if (!canShowNext.value) return;
  const remaining =
    filteredCourses.value.length - (visibleStart.value + PAGE_SIZE);
  const step = Math.min(PAGE_SIZE, Math.max(remaining, 0));
  visibleStart.value += step;
};

watch(
  () => filters.searchQuery,
  () => {
    visibleStart.value = 0;
  }
);

watch(
  () => filters.selectedTags,
  () => {
    visibleStart.value = 0;
  },
  { deep: true }
);

watch(filteredCourses, (newList) => {
  if (visibleStart.value >= newList.length && newList.length > 0) {
    visibleStart.value = Math.max(
      0,
      Math.floor((newList.length - 1) / PAGE_SIZE) * PAGE_SIZE
    );
  }
});

// Methods
const fetchCourses = async () => {
  loading.value = true;
  error.value = null;

  try {
    const fetchedCourses = await getAllCourses();
    courses.value = fetchedCourses;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to fetch courses";
    courses.value = [];
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  // Search is handled by computed property
  // This method can be extended for debouncing if needed
};

const handleCourseClick = (course: Course) => {
  emit("course-selected", course);
};

const toggleTag = (tag: string) => {
  const index = filters.selectedTags.indexOf(tag);
  if (index === -1) {
    filters.selectedTags.push(tag);
  } else {
    filters.selectedTags.splice(index, 1);
  }
};

// Lifecycle
onMounted(() => {
  fetchCourses();
});
</script>

<style scoped>
.course-search {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  background-color: #a31f34;
  border: 1px solid #a31f34;
  border-radius: 8px;
  padding: 20px;
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
  border: 1px solid #a31f34;
  border-radius: 4px;
  background-color: #8a8b8c;
  color: #ffffff;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #a31f34;
  box-shadow: 0 0 0 3px rgba(163, 31, 52, 0.3);
}

.search-input::placeholder {
  color: #ffffff;
  opacity: 0.7;
}

.filters-area {
  /* Reserved for future filters */
  min-height: 0;
}

.filter-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #a31f34;
  border-radius: 4px;
  background-color: #8a8b8c;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-btn:hover {
  background-color: #8a8b8c;
  transform: scale(1.05);
}

.filter-btn.active {
  background-color: #a31f34;
  color: #ffffff;
  border-color: #a31f34;
}

.loading-state,
.error-state,
.no-results {
  text-align: center;
  padding: 2rem;
  color: #8a8b8c;
}

.error-state {
  color: #ffffff;
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

.pagination-controls {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
  gap: 0.75rem;
}

.nav-button {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #a31f34;
  border-radius: 4px;
  background-color: #8a8b8c;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.nav-button:not(:disabled):hover {
  background-color: #8a8b8c;
  transform: scale(1.05);
}

.course-item {
  padding: 1rem;
  background-color: #8a8b8c;
  border: 1px solid #a31f34;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.course-item:hover {
  background-color: rgba(163, 31, 52, 0.3);
  transform: scale(1.02);
}

.course-name {
  font-size: 1rem;
  color: #ffffff;
}

@media (min-width: 768px) {
  .course-search {
    padding: 0 1rem;
  }
}
</style>

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
            v-for="tag in defaultFilterTags"
            :key="tag"
            :class="[
              'filter-btn',
              { active: filters.selectedTags.includes(tag) },
            ]"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
          
          <template v-if="showMoreFilters">
            <button
              v-for="tag in additionalFilterTags"
              :key="tag"
              :class="[
                'filter-btn',
                { active: filters.selectedTags.includes(tag) },
              ]"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          </template>
          
          <button
            class="more-filters-btn"
            @click="showMoreFilters = !showMoreFilters"
          >
            {{ showMoreFilters ? 'Less Filters' : 'More Filters' }}
          </button>
          
          <button
            class="sort-btn"
            @click="toggleRatingSort"
            title="Sort by Rating"
          >
            Rating {{ ratingSortDirection === 'asc' ? '\u2193' : ratingSortDirection === 'desc' ? '\u2191' : '\u2212' }}
          </button>
          
          <button
            class="sort-btn"
            @click="toggleHoursSort"
            title="Sort by Hours"
          >
            Hours {{ hoursSortDirection === 'asc' ? '\u2193' : hoursSortDirection === 'desc' ? '\u2191' : '\u2212' }}
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
          <div class="course-stats">
            <div v-if="extractRating(course.tags)" class="course-rating">
              Rating: {{ extractRating(course.tags) }}
            </div>
            <div v-if="extractHours(course.tags)" class="course-hours">
              Hours: {{ extractHours(course.tags) }}
            </div>
          </div>
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

// Filter tags - default filters shown initially
const defaultFilterTags = ["HASS", "CI-H", "CI-M"];

// Additional filters shown when expanded
const additionalFilterTags = [
  "HASS-H",
  "HASS-A",
  "HASS-S",
  "CI-HW",
  "Not CI-H",
  "No Final",
  "No Prereq",
  "U",
  "G",
  "<= 9 Units",
  "REST",
  "Lab"
];

// State for showing additional filters
const showMoreFilters = ref(false);

// Sorting state
type SortDirection = 'asc' | 'desc' | null;
const ratingSortDirection = ref<SortDirection>(null);
const hoursSortDirection = ref<SortDirection>(null);

// Helper functions to extract rating and hours from tags
const extractRating = (tags: string[]): string | null => {
  const ratingTag = tags.find(tag => tag.startsWith('Rating:'));
  return ratingTag ? ratingTag.replace('Rating:', '').trim() : null;
};

const extractHours = (tags: string[]): string | null => {
  const hoursTag = tags.find(tag => tag.startsWith('Hours:'));
  return hoursTag ? hoursTag.replace('Hours:', '').trim() : null;
};

// Toggle rating sort direction
const toggleRatingSort = () => {
  if (ratingSortDirection.value === null) {
    ratingSortDirection.value = 'desc'; // Start with descending (high to low, arrow up)
  } else if (ratingSortDirection.value === 'desc') {
    ratingSortDirection.value = 'asc'; // Then ascending (low to high, arrow down)
  } else {
    ratingSortDirection.value = null;
  }
};

// Toggle hours sort direction
const toggleHoursSort = () => {
  if (hoursSortDirection.value === null) {
    hoursSortDirection.value = 'desc'; // Start with descending (high to low, arrow up)
  } else if (hoursSortDirection.value === 'desc') {
    hoursSortDirection.value = 'asc'; // Then ascending (low to high, arrow down)
  } else {
    hoursSortDirection.value = null;
  }
};

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

  // Filter by tags (excluding Rating and Hours tags from filter matching)
  if (filters.selectedTags.length > 0) {
    filtered = filtered.filter((course) => {
      // Use the tags array from the course object, but exclude Rating and Hours tags
      const courseTags = (course.tags || []).filter(
        tag => !tag.startsWith('Rating:') && !tag.startsWith('Hours:')
      );
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

  return [...filtered].sort((a, b) => {
    // Apply rating sort if active
    if (ratingSortDirection.value) {
      const aRatingStr = extractRating(a.tags);
      const bRatingStr = extractRating(b.tags);
      
      // Handle courses without ratings based on sort direction
      if (!aRatingStr && !bRatingStr) return a.name.localeCompare(b.name);
      if (!aRatingStr) return ratingSortDirection.value === 'desc' ? -1 : 1; // desc: non-rated at top, asc: at bottom
      if (!bRatingStr) return ratingSortDirection.value === 'desc' ? 1 : -1;
      
      const aRating = parseFloat(aRatingStr);
      const bRating = parseFloat(bRatingStr);
      const ratingDiff = ratingSortDirection.value === 'asc' ? aRating - bRating : bRating - aRating;
      if (ratingDiff !== 0) return ratingDiff;
    }
    
    // Apply hours sort if active
    if (hoursSortDirection.value) {
      const aHoursStr = extractHours(a.tags);
      const bHoursStr = extractHours(b.tags);
      
      // Handle courses without hours based on sort direction
      if (!aHoursStr && !bHoursStr) return a.name.localeCompare(b.name);
      if (!aHoursStr) return hoursSortDirection.value === 'desc' ? -1 : 1; // desc: non-hours at top, asc: at bottom
      if (!bHoursStr) return hoursSortDirection.value === 'desc' ? 1 : -1;
      
      const aHours = parseFloat(aHoursStr);
      const bHours = parseFloat(bHoursStr);
      const hoursDiff = hoursSortDirection.value === 'asc' ? aHours - bHours : bHours - aHours;
      if (hoursDiff !== 0) return hoursDiff;
    }
    
    // Default: sort by name
    return a.name.localeCompare(b.name);
  });
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

.more-filters-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #a31f34;
  border-radius: 4px;
  background-color: #2c2c2c;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.more-filters-btn:hover {
  background-color: #3c3c3c;
  transform: scale(1.05);
}

.sort-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #a31f34;
  border-radius: 4px;
  background-color: #2c2c2c;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.sort-btn:hover {
  background-color: #3c3c3c;
  transform: scale(1.05);
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.course-item:hover {
  background-color: rgba(163, 31, 52, 0.3);
  transform: scale(1.02);
}

.course-name {
  font-size: 1rem;
  color: #ffffff;
  flex: 1;
}

.course-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #ffffff;
  flex-shrink: 0;
}

.course-rating,
.course-hours {
  padding: 0.25rem 0.5rem;
  background-color: rgba(163, 31, 52, 0.2);
  border-radius: 4px;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .course-search {
    padding: 0 1rem;
  }
}
</style>

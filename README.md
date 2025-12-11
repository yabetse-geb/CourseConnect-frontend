# CourseConnect Frontend

[Course Connect](https://courseconnect-yena.onrender.com/), A Vue 3 + TypeScript application for collaborative course scheduling. CourseConnect allows students to view their course schedule, compare schedules with friends, and manage course preferences.

## Features

- **Interactive Schedule Calendar**: View courses across the week with an hourly grid layout
- **Multi-User Scheduling**: Display schedules for the user and up to 2 friends side-by-side
- **Merged Course Blocks**: When multiple students take the same course at the same time, the block displays color stripes for each student
- **Preference Indicators**: Visual indicators for course preferences (not likely, maybe, likely) displayed on each course block
- **Course Preferences**: Rate courses by preference level with visual feedback
- **Friend Comparison**: Compare your schedule with friends to find common free time
- **Course Search & Catalog**: Browse and search available courses
- **Friend Management**: Add friends and manage friend requests
- **Group Scheduling**: Create and view group schedules with multiple members

## Color Scheme

### Student Colors
- **Green**: Your courses
- **Purple**: Friend 1 courses
- **Pink**: Friend 2 courses

### Preference Indicator Colors
- **Deep Orange**: Not likely (0)
- **Yellow**: Maybe (1)
- **Cyan**: Likely (2)

## Tech Stack

- **Framework**: Vue 3 with Composition API
- **Language**: TypeScript
- **Build Tool**: Vite
- **Testing**: Vitest

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) 
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Project Structure

- `src/components/`: Reusable Vue components (WeekCalendar, EventBlock, CourseSearch, etc.)
- `src/views/`: Page-level components (AuthView, ScheduleView, UserView)
- `src/api/`: API integration and data fetching
- `src/stores/`: Pinia state management
- `src/router/`: Vue Router configuration

import { apiCall } from '../api';

export interface TimeSlot {
  days: string[];
  startTime: string;
  endTime: string;
}

export interface CourseEventInput {
  type: string;
  times: TimeSlot;
}

export interface CourseEvent extends CourseEventInput {
  event: string;
}

export interface Course {
  course: string;
  name: string;
  events: CourseEvent[];
}

export interface CourseInfo {
  name: string;
  events: CourseEvent[];
}

export interface EventInfo {
  event: string;
  name: string;
  type: string;
  times: TimeSlot;
}

/**
 * Creates a new course with its associated event information.
 */
export async function defineCourse(name: string, events: CourseEventInput[]): Promise<{ course: string }> {
  return (await apiCall('/CourseCatalog/defineCourse', { name, events }, 'Define Course')) as { course: string };
}

/**
 * Removes a specified course and all of its associated events from the catalog.
 */
export async function removeCourse(courseId: string): Promise<void> {
  await apiCall('/CourseCatalog/removeCourse', { course: courseId }, 'Remove Course');
}

/**
 * Retrieves detailed information for all courses in the catalog.
 */
export async function getAllCourses(): Promise<Course[]> {
  return (await apiCall('/CourseCatalog/_getAllCourses', {}, 'Get All Courses')) as Course[];
}

/**
 * Retrieves detailed information for a specific list of courses.
 */
export async function getCourseInfo(courseIds: string[]): Promise<CourseInfo[]> {
  return (await apiCall('/CourseCatalog/_getCourseInfo', { courses: courseIds }, 'Get Course Info')) as CourseInfo[];
}

/**
 * Retrieves detailed information for a single event, including its course name.
 */
export async function getEventInfo(eventId: string): Promise<EventInfo[]> {
  return (await apiCall('/CourseCatalog/_getEventInfo', { event: eventId }, 'Get Event Info')) as EventInfo[];
}

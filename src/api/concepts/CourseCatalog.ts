import { apiCall } from '../api';

/**
 * CourseCatalog Concept API Functions
 * Based on API spec in CourseCatalog.md
 */

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
 * API Spec: POST /api/CourseCatalog/defineCourse
 * Requirements:
 * - For each meeting time provided, startTime must be less than endTime
 * - A course with the given name must not already exist
 * @param name - The name of the course
 * @param events - Array of course event information (type and times)
 * @returns Object containing the ID of the newly created course
 */
export async function defineCourse(name: string, events: CourseEventInput[]): Promise<{ course: string }> {
  return (await apiCall('/CourseCatalog/defineCourse', { name, events }, 'Define Course')) as { course: string };
}

/**
 * Removes a specified course and all of its associated events from the catalog.
 * API Spec: POST /api/CourseCatalog/removeCourse
 * Requirements:
 * - The course with the given ID must exist
 * @param courseId - The ID of the course to remove
 * @returns Empty object on success
 */
export async function removeCourse(courseId: string): Promise<Record<string, never>> {
  return (await apiCall('/CourseCatalog/removeCourse', { course: courseId }, 'Remove Course')) as Record<string, never>;
}

/**
 * Retrieves detailed information for all courses in the catalog.
 * API Spec: POST /api/CourseCatalog/_getAllCourses
 * @returns Array of all courses with their names and associated events
 */
export async function getAllCourses(): Promise<Course[]> {
  return (await apiCall('/CourseCatalog/_getAllCourses', {}, 'Get All Courses')) as Course[];
}

/**
 * Retrieves detailed information for a specific list of courses.
 * API Spec: POST /api/CourseCatalog/_getCourseInfo
 * Requirements:
 * - All courses in the input array must exist
 * @param courseIds - Array of course IDs to retrieve information for
 * @returns Array of course information objects for each valid course ID
 */
export async function getCourseInfo(courseIds: string[]): Promise<CourseInfo[]> {
  return (await apiCall('/CourseCatalog/_getCourseInfo', { courses: courseIds }, 'Get Course Info')) as CourseInfo[];
}

/**
 * Retrieves detailed information for a single event, including its course name.
 * API Spec: POST /api/CourseCatalog/_getEventInfo
 * Requirements:
 * - The event with the given ID must exist
 * @param eventId - The ID of the event to retrieve
 * @returns Array containing the information for the specified event (empty if not found)
 */
export async function getEventInfo(eventId: string): Promise<EventInfo[]> {
  return (await apiCall('/CourseCatalog/_getEventInfo', { event: eventId }, 'Get Event Info')) as EventInfo[];
}

/**
 * CourseCatalog API - All functions exported together
 */
export const CourseCatalogAPI = {
  defineCourse,
  removeCourse,
  getAllCourses,
  getCourseInfo,
  getEventInfo,
};

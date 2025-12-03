import { apiCall } from "../api";
import { useAuthStore } from "@/stores/auth";
import type { TimeSlot, EventInfo } from "./CourseCatalog";

/**
 * Scheduling Concept API Functions
 * Based on API spec in SchedulingAPI.md
 *
 * Note: The concept server creates endpoints based on method names from the backend implementation.
 * All ID types (User, Event, Schedule) are represented as strings.
 */

/**
 * Extended EventInfo that includes preference score from the GetUserSchedule sync
 */
export interface EventInfoWithScore extends EventInfo {
  score?: number | null; // Preference score if available (0=not likely, 1=maybe, 2=likely)
}

/**
 * Course info returned from getScheduleCourses
 */
export interface ScheduleCourseInfo {
  course: string;
  name: string;
  tags: string[];
  info: string;
}

/**
 * Helper function to get the current session token from the auth store
 */
function getSessionToken(): string {
  const authStore = useAuthStore();
  const session = authStore.session;
  if (!session) {
    throw new Error("No active session. Please log in.");
  }
  return session;
}

/**
 * Creates a new, empty schedule for a specified user.
 * API Spec: POST /api/Scheduling/createSchedule
 * @returns Object containing the new schedule's identifier
 */
export async function createSchedule(): Promise<{ schedule: string }> {
  const session = getSessionToken();
  const response = await apiCall(
    "/Scheduling/createSchedule",
    { session },
    "createSchedule"
  );
  return response as { schedule: string };
}

/**
 * Adds an event to a user's schedule.
 * API Spec: POST /api/Scheduling/scheduleEvent
 * @param event - The event ID to add to the schedule
 * @returns Empty object on success, throws error on failure
 */
export async function scheduleEvent(
  event: string
): Promise<Record<string, never>> {
  const session = getSessionToken();
  return (await apiCall(
    "/Scheduling/scheduleEvent",
    { session, event },
    "scheduleEvent"
  )) as Record<string, never>;
}

/**
 * Removes an event from a user's schedule.
 * API Spec: POST /api/Scheduling/unscheduleEvent
 * @param event - The event ID to remove from the schedule
 * @returns Empty object on success, throws error on failure
 */
export async function unscheduleEvent(
  event: string
): Promise<Record<string, never>> {
  const session = getSessionToken();
  return (await apiCall(
    "/Scheduling/unscheduleEvent",
    { session, event },
    "unscheduleEvent"
  )) as Record<string, never>;
}

/**
 * Retrieves all event information from a user's schedule.
 * API Spec: POST /api/Scheduling/_getUserSchedule
 * @param targetUser - The user whose schedule to retrieve
 * @returns Array of objects containing event details (event, name, type, times, score)
 */
export async function getUserSchedule(targetUser: string): Promise<EventInfoWithScore[]> {
  const session = getSessionToken();
  const response = await apiCall(
    "/Scheduling/_getUserSchedule",
    { targetUser, session },
    "getUserSchedule"
  );
  return response.results as EventInfoWithScore[];
}

/**
 * Retrieves unique course information from a user's schedule.
 * API Spec: POST /api/Scheduling/_getScheduleCourses
 * @param targetUser - The user whose schedule courses to retrieve
 * @returns Array of unique courses with details (course, name, tags, info)
 */
export async function getScheduleCourses(targetUser: string): Promise<ScheduleCourseInfo[]> {
  const session = getSessionToken();
  const response = await apiCall(
    "/Scheduling/_getScheduleCourses",
    { targetUser, session },
    "getScheduleCourses"
  );
  return response.results as ScheduleCourseInfo[];
}

/**
 * Returns the common event IDs between the schedules of two users.
 * API Spec: POST /api/Scheduling/_getScheduleComparison
 * @param user2 - The second user
 * @returns Array of objects containing event details (event, name, type, times)
 */
export async function getScheduleComparison(
  user2: string
): Promise<{ event: string, name: string; type: string; times: TimeSlot }[]> {
  const session = getSessionToken();
  const response = await apiCall(
    "/Scheduling/_getScheduleComparison",
    { session, user2 },
    "getScheduleComparison"
  );
  return response.results as { event: string, name: string; type: string; times: TimeSlot }[];
}

// Export all functions as a bundle
export const SchedulingAPI = {
  createSchedule,
  scheduleEvent,
  unscheduleEvent,
  getUserSchedule,
  getScheduleCourses,
  getScheduleComparison,
};

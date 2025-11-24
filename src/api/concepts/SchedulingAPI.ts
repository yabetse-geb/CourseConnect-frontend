import { apiCall } from "../api";
import { useAuthStore } from "@/stores/auth";

/**
 * Scheduling Concept API Functions
 * Based on API spec in SchedulingAPI.md
 *
 * Note: The concept server creates endpoints based on method names from the backend implementation.
 * All ID types (User, Event, Schedule) are represented as strings.
 */

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
 * @param user - The user for whom to create a schedule
 * @returns Object containing the new schedule's identifier
 */
export async function createSchedule(user: string): Promise<{ schedule: string }> {
  const session = getSessionToken();
  const response = await apiCall(
    "/api/Scheduling/createSchedule",
    { session },
    "createSchedule"
  );
  return response as { schedule: string };
}

/**
 * Adds an event to a user's schedule.
 * API Spec: POST /api/Scheduling/scheduleEvent
 * @param user - The user whose schedule to modify
 * @param event - The event ID to add to the schedule
 * @returns Empty object on success, throws error on failure
 */
export async function scheduleEvent(
  event: string
): Promise<Record<string, never>> {
  const session = getSessionToken();
  return (await apiCall(
    "/api/Scheduling/scheduleEvent",
    { session, event },
    "scheduleEvent"
  )) as Record<string, never>;
}

/**
 * Removes an event from a user's schedule.
 * API Spec: POST /api/Scheduling/unscheduleEvent
 * @param user - The user whose schedule to modify
 * @param event - The event ID to remove from the schedule
 * @returns Empty object on success, throws error on failure
 */
export async function unscheduleEvent(
  event: string
): Promise<Record<string, never>> {
  const session = getSessionToken();
  return (await apiCall(
    "/api/Scheduling/unscheduleEvent",
    { session, event },
    "unscheduleEvent"
  )) as Record<string, never>;
}

/**
 * Retrieves all event IDs from a user's schedule.
 * API Spec: POST /api/Scheduling/_getUserSchedule
 * @param user - The user whose schedule to retrieve
 * @returns Array of objects containing event IDs
 */
export async function getUserSchedule(user: string): Promise<{ event: string }[]> {
  const session = getSessionToken();
  const response = await apiCall(
    "/api/Scheduling/_getUserSchedule",
    { user, session },
    "getUserSchedule"
  );
  return response as { event: string }[];
}

/**
 * Returns the common event IDs between the schedules of two users.
 * API Spec: POST /api/Scheduling/_getScheduleComparison
 * @param user1 - The first user
 * @param user2 - The second user
 * @returns Array of objects containing common event IDs
 */
export async function getScheduleComparison(
  user1: string,
  user2: string
): Promise<{ event: string }[]> {
  const session = getSessionToken();
  const response = await apiCall(
    "/api/Scheduling/_getScheduleComparison",
    { user1, user2, session },
    "getScheduleComparison"
  );
  return response as { event: string }[];
}

// Export all functions as a bundle
export const SchedulingAPI = {
  createSchedule,
  scheduleEvent,
  unscheduleEvent,
  getUserSchedule,
  getScheduleComparison,
};

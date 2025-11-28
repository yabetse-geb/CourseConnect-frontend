import { apiCall } from "../api";
import { useAuthStore } from "@/stores/auth";

/**
 * Friends in Events Sync API Functions
 * Based on eventFriends.sync.ts in the backend
 *
 * These syncs allow users to see which friends are attending specific events
 * and to get a full list of friends' scheduled events.
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
 * Friend info object returned by the API
 */
export interface FriendInfo {
  friend: string;
  username: string;
}

/**
 * Result object for getEventFriends - maps friends to a specific event
 */
export interface EventFriendsResult {
  friends: FriendInfo[];
  event: string;
}

/**
 * Result object for getFriendsEvents - maps friends to their events
 */
export interface FriendsEventsResult {
  friends: FriendInfo[];
  event: string;
}

/**
 * Retrieves a list of friends who are attending specific events.
 * Uses sync endpoint: /getEventFriends
 * Sync: GetEventFriends
 *
 * Flow:
 * 1. Authenticates user via session
 * 2. Gets all friends of the authenticated user
 * 3. For each friend, checks if they are attending any of the specified events
 * 4. Returns list of friends attending each event
 *
 * @param events - Array of event IDs to check for friend attendance
 * @returns Array of results, each containing an event and the friends attending it
 */
export async function getEventFriends(
  events: string[]
): Promise<EventFriendsResult[]> {
  const session = getSessionToken();
  const response = await apiCall(
    "/getEventFriends",
    { session, events },
    "Get Event Friends"
  );
  return (response.results ?? response) as EventFriendsResult[];
}

/**
 * Retrieves a list of all friends and the events they are attending.
 * Uses sync endpoint: /getFriendsEvents
 * Sync: GetFriendsEvents
 *
 * Flow:
 * 1. Authenticates user via session
 * 2. Gets all friends of the authenticated user
 * 3. For each friend, gets their scheduled events
 * 4. Returns list of friends and their events
 *
 * @returns Array of results, each containing friends and the event they're attending
 */
export async function getFriendsEvents(): Promise<FriendsEventsResult[]> {
  const session = getSessionToken();
  const response = await apiCall(
    "/getFriendsEvents",
    { session },
    "Get Friends Events"
  );
  return (response.results ?? response) as FriendsEventsResult[];
}

// Export all functions as a bundle
export const FriendsInEventsAPI = {
  getEventFriends,
  getFriendsEvents,
};

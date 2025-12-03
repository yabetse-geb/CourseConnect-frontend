import { apiCall } from "../api";

/**
 * Preferencing Concept API Functions
 * Based on API spec in PreferencingAPI.md
 *
 * Purpose: To allow a user to assign a personal numerical score to a single item at a time, and to query this score.
 * 
 * Score meanings for courses:
 * - 2: Likely taking it (green indicator)
 * - 1: Maybe taking it (yellow indicator)
 * - 0: Not likely taking it (red indicator)
 */

/**
 * Assigns a score to an item for a user.
 * API Spec: POST /api/Preferencing/addScore
 * @param session - The session token
 * @param item - The item ID (e.g., course ID)
 * @param score - The numerical score (0 = not likely, 1 = maybe, 2 = likely)
 * @returns Empty object on success
 */
export async function addScore(
  session: string,
  item: string,
  score: number
): Promise<Record<string, never>> {
  return (await apiCall(
    "/Preferencing/addScore",
    { session, item, score },
    "addScore"
  )) as Record<string, never>;
}

/**
 * Removes a user's score preference for an item.
 * API Spec: POST /api/Preferencing/removeScore
 * @param session - The session token
 * @param item - The item ID (e.g., course ID)
 * @returns Empty object on success
 */
export async function removeScore(
  session: string,
  item: string
): Promise<Record<string, never>> {
  return (await apiCall(
    "/Preferencing/removeScore",
    { session, item },
    "removeScore"
  )) as Record<string, never>;
}

/**
 * Retrieves all items that a user has scored.
 * API Spec: POST /api/Preferencing/_getAllItems
 * @param user - The user ID
 * @returns Array of item IDs
 */
export async function getAllItems(user: string): Promise<string[]> {
  const response = await apiCall(
    "/Preferencing/_getAllItems",
    { user },
    "getAllItems"
  );
  const results = (response.results ?? []) as Array<{ items: string[] }>;
  return results[0]?.items ?? [];
}

// Export all functions as a bundle
export const PreferencingAPI = {
  addScore,
  removeScore,
  getAllItems,
};

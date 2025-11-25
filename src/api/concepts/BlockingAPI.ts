import { apiCall } from "../api";

/**
 * Blocking Concept API Functions
 * Based on API spec in blocking-api-generation.md and implementation in BlockingConcept.ts
 *
 * Note: The concept server creates endpoints based on method names from BlockingConcept.ts.
 * If the backend uses different endpoint names than the spec, these will need to be adjusted.
 */

/**
 * Allows a user to block a specific target.
 * API Spec: POST /api/Blocking/block
 * Implementation: blockUser method expects { blocker, userToBlock }
 * @param user - The user who is blocking (from API spec)
 * @param target - The target being blocked (from API spec)
 * @returns Empty object on success, throws error on failure
 */
export async function blockUser(user: string, target: string): Promise<void> {
  await apiCall(
    "/Blocking/blockUser",
    { blocker: user, userToBlock: target },
    "blockUser"
  );
}

/**
 * Blocks a user using the session-authenticated sync.
 * Uses sync endpoint: /blocking/block
 * @param session - Session token of the blocker
 * @param targetUsername - Username of the user to block
 * @returns Response with request and status ("blocked")
 */
export async function blockUserBySession(
  session: string,
  targetUsername: string
): Promise<{ request: string; status: string }> {
  return (await apiCall(
    "/blocking/block",
    { session, targetUsername },
    "Block User"
  )) as { request: string; status: string };
}

/**
 * Allows a user to unblock a previously blocked target.
 * API Spec: POST /api/Blocking/unblock
 * Implementation: unblockUser method expects { blocker, userToUnblock }
 * @param user - The user who is unblocking (from API spec)
 * @param target - The target being unblocked (from API spec)
 * @returns Empty object on success, throws error on failure
 */
export async function unblockUser(user: string, target: string): Promise<void> {
  await apiCall(
    "/Blocking/unblockUser",
    { blocker: user, userToUnblock: target },
    "unblockUser"
  );
}

/**
 * Unblocks a user using the session-authenticated sync.
 * Uses sync endpoint: /blocking/unblock
 * @param session - Session token of the blocker
 * @param targetUsername - Username of the user to unblock
 * @returns Response with request and status ("unblocked")
 */
export async function unblockUserBySession(
  session: string,
  targetUsername: string
): Promise<{ request: string; status: string }> {
  return (await apiCall(
    "/blocking/unblock",
    { session, targetUsername },
    "Unblock User"
  )) as { request: string; status: string };
}

/**
 * Checks if a user has blocked a specific target.
 * API Spec: POST /api/Blocking/_isBlocked
 * Implementation: _isUserBlocked method expects { primaryUser, secondaryUser }
 * Note: The API spec returns { isBlocked: boolean }[] but implementation returns { result: boolean }[]
 * @param user - The user to check (from API spec)
 * @param target - The target to check (from API spec)
 * @returns Array with single object containing isBlocked boolean
 */
export async function isUserBlocked(
  user: string,
  target: string
): Promise<{ isBlocked: boolean }[]> {
  const response = await apiCall(
    "/Blocking/_isUserBlocked",
    { primaryUser: user, secondaryUser: target },
    "isUserBlocked"
  );
  // Map implementation response { result: boolean }[] to API spec format { isBlocked: boolean }[]
  const result = response as { result: boolean }[];
  return result.map((item) => ({ isBlocked: item.result }));
}

/**
 * Checks if the authenticated user has blocked the target username.
 * Uses sync endpoint: /Blocking/_isUserBlocked
 * @param session - Session token of the user performing the check
 * @param targetUsername - Username to check against
 * @returns Response with isBlocked boolean
 */
export async function isUserBlockedBySession(
  session: string,
  targetUsername: string
): Promise<{ isBlocked: boolean }> {
  const response = await apiCall(
    "/Blocking/_isUserBlocked",
    { session, targetUsername },
    "Is User Blocked"
  );
  if (response && typeof response === "object" && "isBlocked" in response) {
    return { isBlocked: response.isBlocked as boolean };
  }
  if (Array.isArray(response) && response.length > 0) {
    const first = response[0] as { isBlocked?: boolean; result?: boolean };
    return { isBlocked: (first.isBlocked ?? first.result ?? false) as boolean };
  }
  return { isBlocked: false };
}

/**
 * Retrieves a list of all targets that a user has blocked.
 * API Spec: POST /api/Blocking/_getBlocked
 * Implementation: _blockedUsers method expects { user }
 * Note: The API spec returns { target: Target }[] but implementation returns { user: User }[]
 * @param user - The user whose blocked list to retrieve
 * @returns Array of objects containing target IDs
 */
export async function getBlockedUsers(
  user: string
): Promise<{ target: string }[]> {
  const response = await apiCall(
    "/Blocking/_blockedUsers",
    { user },
    "getBlockedUsers"
  );
  // Map implementation response { user: User }[] to API spec format { target: Target }[]
  const result = response as { user: string }[];
  return result.map((item) => ({ target: item.user }));
}

/**
 * Retrieves blocked users for authenticated session.
 * Uses sync endpoint: /Blocking/_blockedUsers
 * @param session - Session token
 * @returns Response with blockedUsers array (user IDs)
 */
export async function getBlockedUsersBySession(
  session: string
): Promise<{ blockedUsers: string[] }> {
  const response = await apiCall(
    "/Blocking/_blockedUsers",
    { session },
    "Get Blocked Users"
  );
  if (response && typeof response === "object" && "blockedUsers" in response) {
    return { blockedUsers: response.blockedUsers as string[] };
  }
  if (Array.isArray(response)) {
    return { blockedUsers: response as string[] };
  }
  if (response && typeof response === "object" && "user" in response) {
    const users = (response.user as string[]) ?? [];
    return { blockedUsers: users };
  }
  return { blockedUsers: [] };
}

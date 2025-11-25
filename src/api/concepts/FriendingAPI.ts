import { apiCall } from "../api";

/**
 * Friending Concept API Functions
 * Based on API spec in friending-api-generation.md and implementation in FriendingConcept.ts
 *
 * Note: requestFriend, acceptFriend, and rejectFriend use sync endpoints.
 * Other functions use concept endpoints.
 */

/**
 * Sends a friend request from one user to another.
 * Uses sync endpoint: /friending/request
 * Sync: SendFriendRequest -> SendFriendResponse
 * @param session - The session token of the user sending the request
 * @param targetUsername - The username of the user receiving the friend request
 * @returns Response with request and status ("sent"), throws error on failure
 */
export async function requestFriend(
  session: string,
  targetUsername: string
): Promise<{ request: string; status: string }> {
  return (await apiCall(
    "/friending/request",
    { session, targetUsername },
    "Send Friend Request"
  )) as { request: string; status: string };
}

/**
 * Accepts an existing friend request, creating a friendship.
 * Uses sync endpoint: /friending/accept
 * Sync: AcceptFriendRequest -> AcceptFriendResponse
 * @param session - The session token of the user accepting the request
 * @param requesterUsername - The username of the user who sent the friend request
 * @returns Response with request and status ("accepted"), throws error on failure
 */
export async function acceptFriend(
  session: string,
  requesterUsername: string
): Promise<{ request: string; status: string }> {
  return (await apiCall(
    "/friending/accept",
    { session, requesterUsername },
    "Accept Friend Request"
  )) as { request: string; status: string };
}

/**
 * Rejects and deletes an existing friend request.
 * Uses sync endpoint: /friending/reject
 * Sync: RejectFriendRequest -> RejectFriendResponse
 * @param session - The session token of the user rejecting the request
 * @param requesterUsername - The username of the user who sent the friend request
 * @returns Response with request and status ("rejected"), throws error on failure
 */
export async function rejectFriend(
  session: string,
  requesterUsername: string
): Promise<{ request: string; status: string }> {
  return (await apiCall(
    "/friending/reject",
    { session, requesterUsername },
    "Reject Friend Request"
  )) as { request: string; status: string };
}

/**
 * Removes an existing friendship between two users.
 * API Spec: POST /api/Friending/remove
 * Implementation: removeFriend method expects { remover, removed }
 * @param u1 - First user (from API spec)
 * @param u2 - Second user (from API spec)
 * @returns Empty object on success, throws error on failure
 */
export async function removeFriend(
  u1: string,
  u2: string
): Promise<Record<string, never>> {
  return (await apiCall(
    "/Friending/removeFriend",
    { remover: u1, removed: u2 },
    "removeFriend"
  )) as Record<string, never>;
}

/**
 * Checks if two users are friends.
 * API Spec: POST /api/Friending/_areFriends
 * Implementation: _areTheyFriends method expects { user1, user2 }
 * @param u1 - First user (from API spec)
 * @param u2 - Second user (from API spec)
 * @returns Array with single object containing areFriends boolean
 */
export async function areTheyFriends(
  u1: string,
  u2: string
): Promise<{ areFriends: boolean }[]> {
  const response = await apiCall(
    "/Friending/_areTheyFriends",
    { user1: u1, user2: u2 },
    "areTheyFriends"
  );
  return response as { areFriends: boolean }[];
}

/**
 * Retrieves a list of all friends for a given user.
 * API Spec: POST /api/Friending/_getFriends
 * Implementation: _getAllFriends method expects { user }
 * @param user - The user whose friends list to retrieve
 * @returns Array of objects containing friend IDs
 */
export async function getAllFriends(
  user: string
): Promise<{ friend: string }[]> {
  const response = await apiCall(
    "/Friending/_getAllFriends",
    { user },
    "getAllFriends"
  );
  return response as { friend: string }[];
}

/**
 * Retrieves all pending friend requests sent to the authenticated user.
 * Uses sync endpoint: /Friending/_getAllIncomingFriendRequests
 * Sync: GetAllIncomingFriendRequestsResponseSuccess -> GetAllIncomingFriendRequestsResponseError
 * @param session - The session token of the authenticated user
 * @returns Response with requesters array (user IDs who sent requests to the authenticated user)
 */
export async function getAllIncomingFriendRequestsBySession(
  session: string
): Promise<{ requesters: string[] }> {
  const response = await apiCall(
    "/Friending/_getAllIncomingFriendRequests",
    { session },
    "Get All Incoming Friend Requests"
  );
  return response as { requesters: string[] };
}

/**
 * Retrieves all pending friend requests sent by a given user.
 * API Spec: POST /api/Friending/_getOutgoingRequests
 * Implementation: _getAllIncomingFriendRequests method (user is requester)
 * Note: The API spec uses "outgoing" to mean requests sent BY the user.
 * The implementation method name is reversed - it uses _getAllIncomingFriendRequests for this.
 * @param user - The user whose outgoing friend requests to retrieve
 * @returns Array of objects containing requestee IDs (users the specified user sent requests to)
 */
export async function getAllOutgoingFriendRequests(
  user: string
): Promise<{ requestee: string }[]> {
  const response = await apiCall(
    "/Friending/_getAllOutgoingFriendRequests",
    { user },
    "getAllOutgoingFriendRequests"
  );
  return response as { requestee: string }[];
}

/**
 * Retrieves all pending friend requests sent by the authenticated user.
 * Uses sync endpoint: /Friending/_getAllOutgoingFriendRequests
 * Sync: GetAllOutgoingFriendRequestsResponseSuccess -> GetAllOutgoingFriendRequestsResponseError
 * @param session - The session token of the authenticated user
 * @returns Response with requestees array (user IDs who received requests from the authenticated user)
 */
export async function getAllOutgoingFriendRequestsBySession(
  session: string
): Promise<{ requestees: string[] }> {
  const response = await apiCall(
    "/Friending/_getAllOutgoingFriendRequests",
    { session },
    "Get All Outgoing Friend Requests"
  );
  return response as { requestees: string[] };
}


import { apiCall } from "../api";
import { useAuthStore } from "@/stores/auth";

type Group = string;
type User = string;
type Role = "ADMIN" | "MEMBER";

/**
 * Grouping Concept API Functions
 * Based on API spec in GroupingAPI.md
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
 * Creates a new group with the authenticated user as the first admin.
 * @param name - The name for the new group.
 */
export async function createGroup(name: string): Promise<{ group: Group }> {
  const session = getSessionToken();
  return (await apiCall(
    "/Grouping/createGroup",
    { session, name },
    "createGroup",
  )) as { group: Group };
}

/**
 * Deletes a group. Requires admin privileges.
 * @param group - The ID of the group to delete.
 */
export async function deleteGroup(
  group: Group,
): Promise<Record<string, never>> {
  const session = getSessionToken();
  return (await apiCall(
    "/Grouping/deleteGroup",
    { session, group },
    "deleteGroup",
  )) as Record<string, never>;
}

/**
 * Renames a group. Requires admin privileges.
 * @param group - The ID of the group to rename.
 * @param newName - The new name for the group.
 */
export async function renameGroup(
  group: Group,
  newName: string,
): Promise<Record<string, never>> {
  const session = getSessionToken();
  return (await apiCall(
    "/Grouping/renameGroup",
    { session, group, newName },
    "renameGroup",
  )) as Record<string, never>;
}

/**
 * The authenticated user requests to join a group.
 * @param group - The ID of the group to join.
 */
export async function requestToJoin(
  group: Group,
): Promise<Record<string, never>> {
  const session = getSessionToken();
  return (await apiCall(
    "/Grouping/requestToJoin",
    { session, group },
    "requestToJoin",
  )) as Record<string, never>;
}

/**
 * An admin confirms a user's request to join a group.
 * @param group - The ID of the group.
 * @param requester - The ID of the user whose request is being confirmed.
 */
export async function confirmRequest(
  group: Group,
  requester: User,
): Promise<Record<string, never>> {
  const session = getSessionToken();
  return (await apiCall(
    "/Grouping/confirmRequest",
    { session, group, requester },
    "confirmRequest",
  )) as Record<string, never>;
}

/**
 * An admin declines a user's request to join a group.
 * @param group - The ID of the group.
 * @param requester - The ID of the user whose request is being declined.
 */
export async function declineRequest(
  group: Group,
  requester: User,
): Promise<Record<string, never>> {
  const session = getSessionToken();
  return (await apiCall(
    "/Grouping/declineRequest",
    { session, group, requester },
    "declineRequest",
  )) as Record<string, never>;
}

/**
 * An admin removes a member from a group.
 * @param group - The ID of the group.
 * @param member - The ID of the member to remove.
 */
export async function removeMember(
  group: Group,
  member: User,
): Promise<Record<string, never>> {
  const session = getSessionToken();
  return (await apiCall(
    "/Grouping/removeMember",
    { session, group, member },
    "removeMember",
  )) as Record<string, never>;
}

/**
 * An admin changes the role of a group member.
 * @param group - The ID of the group.
 * @param member - The ID of the member whose role is being adjusted.
 * @param newRole - The new role for the member ("ADMIN" or "MEMBER").
 */
export async function adjustRole(
  group: Group,
  member: User,
  newRole: Role,
): Promise<Record<string, never>> {
  const session = getSessionToken();
  return (await apiCall(
    "/Grouping/adjustRole",
    { session, group, member, newRole },
    "adjustRole",
  )) as Record<string, never>;
}

/**
 * Retrieves all groups that the authenticated user is a member of.
 */
export async function getUserGroups(): Promise<Group[]> {
  const session = getSessionToken();
  const response = await apiCall(
    "/Grouping/_getUserGroups",
    { session },
    "getUserGroups",
  );
  return response.groups as Group[];
}

/**
 * Retrieves all members of a specific group. Requires membership.
 * @param group - The ID of the group.
 */
export async function getMembers(group: Group): Promise<{ member: User }[]> {
  const session = getSessionToken();
  try {
    const response = await apiCall(
      "/Grouping/_getMembers",
      { session, group },
      "getMembers",
    );
    
    // Handle different response formats
    if (Array.isArray(response)) {
      return response as { member: User }[];
    } else if (response && typeof response === "object" && "members" in response) {
      return response.members as { member: User }[];
    } else {
      console.warn(`getMembers: Unexpected response format:`, response);
      return [];
    }
  } catch (error: any) {
    console.error(`getMembers: Error calling API:`, error);
    throw error;
  }
}

/**
 * Retrieves all pending join requests for a group. Requires admin privileges.
 * @param group - The ID of the group.
 */
export async function getGroupRequests(
  group: Group,
): Promise<{ joinRequester: User }[]> {
  const session = getSessionToken();
  const response = await apiCall(
    "/Grouping/_getGroupRequests",
    { session, group },
    "getGroupRequests",
  );
  return response.requests as { joinRequester: User }[];
}

/**
 * Retrieves all groups that the authenticated user has requested to join.
 */
export async function getUserRequests(): Promise<Group[]> {
  const session = getSessionToken();
  const response = await apiCall(
    "/Grouping/_getUserRequests",
    { session },
    "getUserRequests",
  );
  return response.groups as Group[];
}

/**
 * Retrieves all admins of a specific group. Requires membership.
 * @param group - The ID of the group.
 */
export async function getAdmins(group: Group): Promise<User[]> {
  const session = getSessionToken();
  const response = await apiCall(
    "/Grouping/_getAdmins",
    { session, group },
    "getAdmins",
  );
  return response.admins as User[];
}

/**
 * Checks if the authenticated user is a member of a specific group.
 * @param group - The ID of the group.
 */
export async function isGroupMember(group: Group): Promise<boolean> {
  const session = getSessionToken();
  const response = await apiCall(
    "/Grouping/_isGroupMember",
    { session, group },
    "isGroupMember",
  );
  return response.inGroup as boolean;
}

/**
 * Checks if the authenticated user is an admin of a specific group.
 * @param group - The ID of the group.
 */
export async function isGroupAdmin(group: Group): Promise<boolean> {
  const session = getSessionToken();
  const response = await apiCall(
    "/Grouping/_isGroupAdmin",
    { session, group },
    "isGroupAdmin",
  );
  return response.isAdmin as boolean;
}

/**
 * Retrieves a group's name by its ID. Public query.
 * @param group - The ID of the group.
 */
export async function getGroupName(group: Group): Promise<{ name: string }> {
  const response = await apiCall(
    "/Grouping/_getGroupName",
    { group },
    "getGroupName",
  );
  
  // Handle array response format (API returns [{name: "..."}] instead of {name: "..."})
  let nameValue: string = "";
  if (Array.isArray(response) && response.length > 0) {
    const firstItem = response[0];
    if (firstItem && typeof firstItem === "object" && "name" in firstItem) {
      nameValue = firstItem.name as string;
    }
  } else if (response && typeof response === "object" && "name" in response) {
    // Handle object format (if API spec is correct in the future)
    nameValue = response.name as string;
  }
  
  return { name: nameValue };
}

/**
 * Retrieves a list of all groups. Public query.
 */
export async function getAllGroups(): Promise<Group[]> {
  // Assuming a sync exists for _getGroups as per the prompt
  const response = await apiCall(
    "/Grouping/_getGroups",
    {},
    "getAllGroups",
  );
  
  // Backend returns: [{ groups: ["id1", "id2", ...] }]
  // Extract group IDs from the array format
  if (Array.isArray(response) && response.length > 0) {
    const firstItem = response[0];
    if (firstItem && typeof firstItem === "object" && "groups" in firstItem) {
      const groups = (firstItem as any).groups;
      if (Array.isArray(groups)) {
        return groups as Group[];
      }
    }
    // Fallback: if it's a flat array of strings, return it directly
    if (typeof response[0] === "string") {
      return response as Group[];
    }
  }
  
  // Handle object format: { groups: [...] }
  if (response && typeof response === "object" && "groups" in response) {
    const groups = (response as any).groups;
    if (Array.isArray(groups)) {
      return groups as Group[];
    }
  }
  
  console.warn("getAllGroups: Unexpected response format:", response);
  return [];
}


// Export all functions as a bundle
export const GroupingAPI = {
  createGroup,
  deleteGroup,
  renameGroup,
  requestToJoin,
  confirmRequest,
  declineRequest,
  removeMember,
  adjustRole,
  getUserGroups,
  getMembers,
  getGroupRequests,
  getUserRequests,
  getAdmins,
  isGroupMember,
  isGroupAdmin,
  getGroupName,
  getAllGroups,
};
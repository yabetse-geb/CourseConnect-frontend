import { apiCall } from "../api";

// Per-session cache storage
const usernameCache = new Map<string, string | null>();
let allUsersCache: string[] | null = null;

export const authApi = {
  /**
   * Register a new user
   * Path: /UserAuthentication/register
   */
  register: async (username: string, password: string) => {
    return await apiCall(
      "/UserAuthentication/register",
      { username, password },
      "User Registration"
    );
  },

  /**
   * Login user and create session
   * Path: /login
   * Returns session token
   */
  login: async (username: string, password: string) => {
    return await apiCall("/login", { username, password }, "User Login");
  },

  /**
   * Logout user
   * Path: /logout
   */
  logout: async (session: string) => {
    return await apiCall("/logout", { session }, "User Logout");
  },
};

/**
 * Get username for a user ID (with per-session caching)
 * Uses concept endpoint: /UserAuthentication/_getUsername
 * Based on GetUsernameResponseSuccess sync: [Requesting.respond, { request, username }]
 * The HTTP response should be { username: string } (request ID is internal to engine)
 * @param userId - The user ID
 * @returns Username string or null if not found
 */
export async function getUsername(userId: string): Promise<string | null> {
  // Check cache first
  if (usernameCache.has(userId)) {
    const cachedUsername = usernameCache.get(userId);
    console.log(`getUsername: Cache hit for ${userId}:`, cachedUsername);
    return cachedUsername ?? null;
  }

  try {
    const response = await apiCall(
      "/UserAuthentication/_getUsername",
      { user: userId },
      "Get Username"
    );
    console.log(`getUsername response for user ${userId}:`, response);

    let username: string | null = null;

    // Based on GetUsernameResponseSuccess sync: then: actions([Requesting.respond, { request, username }])
    // The HTTP response should be { username: string } (request field is not sent to client)
    if (response && typeof response === "object") {
      if ("username" in response) {
        const fetchedUsername = response.username as string;
        if (fetchedUsername) {
          username = fetchedUsername;
          console.log(`getUsername: Found username for ${userId}:`, username);
        } else {
          console.warn(
            `getUsername: Username field exists but is empty for user ${userId}`
          );
        }
      }
    }

    // Fallback for array format (legacy support)
    if (!username && Array.isArray(response)) {
      const result = response as { username: string }[];
      if (result.length > 0 && result[0]?.username) {
        username = result[0].username;
        console.log(
          `getUsername: Found username in array format for ${userId}:`,
          username
        );
      }
    }

    // Cache the result (including null for "not found")
    usernameCache.set(userId, username);
    if (username) {
      console.log(`getUsername: Cached username for ${userId}`);
    } else {
      console.log(`getUsername: Cached "not found" for ${userId}`);
    }

    if (!username) {
      console.warn(
        `getUsername: No username found in response for user ${userId}, response:`,
        response
      );
    }

    return username;
  } catch (e: any) {
    console.error(`Error getting username for user ${userId}:`, e);
    // Cache null on error to avoid repeated failed requests
    usernameCache.set(userId, null);
    return null;
  }
}

/**
 * Get all users in the system (with per-session caching)
 * Uses sync endpoint: /UserAuthentication/_getAllUsers
 * Based on GetAllUsersResponseSuccess sync: [Requesting.respond, { request, users }]
 * @param session - The session token of the authenticated user
 * @returns Array of user IDs, or empty array on error
 */
export async function getAllUsers(session: string): Promise<string[]> {
  // Check cache first
  if (allUsersCache !== null) {
    console.log(`getAllUsers: Cache hit, returning ${allUsersCache.length} users`);
    return allUsersCache;
  }

  try {
    const response = await apiCall(
      "/UserAuthentication/_getAllUsers",
      { session },
      "Get All Users"
    );
    console.log("getAllUsers raw response:", response);
    console.log("getAllUsers response type:", typeof response);
    console.log("getAllUsers is array:", Array.isArray(response));
    if (response && typeof response === "object") {
      console.log("getAllUsers response keys:", Object.keys(response));
      console.log("getAllUsers has 'users' key:", "users" in response);
      if ("users" in response) {
        console.log("getAllUsers response.users:", response.users);
        console.log(
          "getAllUsers response.users is array:",
          Array.isArray(response.users)
        );
      }
    }

    let userIds: string[] = [];

    // Based on GetAllUsersResponseSuccess sync: returns { users: [{ user: string }, ...] }
    if (response && typeof response === "object") {
      if ("users" in response && Array.isArray(response.users)) {
        // Extract user IDs from objects like { user: "user-id" }
        userIds = response.users
          .map((item: any) => {
            if (typeof item === "object" && item !== null && "user" in item) {
              return item.user;
            }
            // Fallback: if item is already a string
            if (typeof item === "string") {
              return item;
            }
            return null;
          })
          .filter(
            (id): id is string => typeof id === "string" && id.length > 0
          );
        console.log(
          `getAllUsers: Found ${userIds.length} users from response.users`
        );
      }
    }

    // Fallback for array format
    if (userIds.length === 0 && Array.isArray(response)) {
      userIds = response.filter(
        (id): id is string => typeof id === "string" && id.length > 0
      );
      console.log(`getAllUsers: Found ${userIds.length} users (array format)`);
    }

    // Cache the result
    allUsersCache = userIds;
    console.log(`getAllUsers: Cached ${userIds.length} users`);

    if (userIds.length === 0) {
      console.warn(
        "getAllUsers: No users found in response, response:",
        response
      );
    }

    return userIds;
  } catch (e: any) {
    console.error("Error getting all users:", e);
    // Cache empty array on error to avoid repeated failed requests
    allUsersCache = [];
    return [];
  }
}


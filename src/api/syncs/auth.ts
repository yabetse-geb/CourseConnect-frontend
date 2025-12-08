import { apiCall } from "../api";

// SessionStorage keys
const USERNAME_CACHE_KEY = "auth_username_cache";
const ALL_USERS_CACHE_KEY = "auth_all_users_cache";

// Per-session cache storage (in-memory for fast access)
const usernameCache = new Map<string, string | null>();
let allUsersCache: string[] | null = null;

// Track in-flight requests to prevent duplicate API calls
const inFlightUsernameRequests = new Map<string, Promise<string | null>>();
let inFlightAllUsersRequest: Promise<string[]> | null = null;

/**
 * Helper function to safely retrieve and parse data from sessionStorage
 * @param key - The sessionStorage key
 * @returns Parsed data or null if not found/invalid
 */
function getFromSessionStorage<T>(key: string): T | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      console.warn("sessionStorage not available, falling back to in-memory cache");
      return null;
    }

    const item = sessionStorage.getItem(key);
    if (item === null) {
      return null;
    }

    const parsed = JSON.parse(item) as T;
    return parsed;
  } catch (e: any) {
    // Handle corrupted data or JSON parse errors
    console.warn(`Error reading from sessionStorage key "${key}":`, e);
    try {
      // Clear corrupted data
      if (typeof window !== "undefined" && window.sessionStorage) {
        sessionStorage.removeItem(key);
      }
    } catch (clearError) {
      console.error("Error clearing corrupted sessionStorage:", clearError);
    }
    return null;
  }
}

/**
 * Helper function to safely stringify and store data in sessionStorage
 * @param key - The sessionStorage key
 * @param value - The value to store
 */
function setToSessionStorage<T>(key: string, value: T): void {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      console.warn("sessionStorage not available, using in-memory cache only");
      return;
    }

    const serialized = JSON.stringify(value);
    sessionStorage.setItem(key, serialized);
  } catch (e: any) {
    // Handle quota exceeded or other storage errors
    if (e.name === "QuotaExceededError" || e.code === 22) {
      console.warn("sessionStorage quota exceeded, falling back to in-memory cache only");
    } else {
      console.warn(`Error writing to sessionStorage key "${key}":`, e);
    }
    // Continue with in-memory cache only - don't throw
  }
}

/**
 * Helper function to remove an item from sessionStorage
 * @param key - The sessionStorage key
 */
function clearSessionStorage(key: string): void {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      sessionStorage.removeItem(key);
    }
  } catch (e: any) {
    console.warn(`Error clearing sessionStorage key "${key}":`, e);
  }
}

/**
 * Clears all authentication caches (in-memory and sessionStorage)
 * Should be called on logout or when cache needs to be invalidated
 */
export function clearAuthCache(): void {
  // Clear in-memory caches
  usernameCache.clear();
  allUsersCache = null;
  
  // Clear in-flight requests
  inFlightUsernameRequests.clear();
  inFlightAllUsersRequest = null;
  
  // Clear sessionStorage caches
  clearSessionStorage(USERNAME_CACHE_KEY);
  clearSessionStorage(ALL_USERS_CACHE_KEY);
  
  console.log("Auth cache cleared (in-memory + sessionStorage + in-flight requests)");
}

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
    const result = await apiCall("/login", { username, password }, "User Login");
    // Clear cache on login in case user data has changed
    clearAuthCache();
    return result;
  },

  /**
   * Logout user
   * Path: /logout
   */
  logout: async (session: string) => {
    const result = await apiCall("/logout", { session }, "User Logout");
    // Clear cache on logout
    clearAuthCache();
    return result;
  },
};

/**
 * Get username for a user ID (with per-session caching using in-memory and sessionStorage)
 * Uses concept endpoint: /UserAuthentication/_getUsername
 * Based on GetUsernameResponseSuccess sync: [Requesting.respond, { request, username }]
 * The HTTP response should be { username: string } (request ID is internal to engine)
 * @param userId - The user ID
 * @returns Username string or null if not found
 */
export async function getUsername(userId: string): Promise<string | null> {
  // 1. Check in-memory cache first (fastest)
  if (usernameCache.has(userId)) {
    const cachedUsername = usernameCache.get(userId);
    console.log(`getUsername: In-memory cache hit for ${userId}:`, cachedUsername);
    return cachedUsername ?? null;
  }

  // 2. Check if in-flight request exists for this userId
  if (inFlightUsernameRequests.has(userId)) {
    console.log(`getUsername: Reusing in-flight request for ${userId}`);
    return await inFlightUsernameRequests.get(userId)!;
  }

  // 3. Check sessionStorage
  const sessionCache = getFromSessionStorage<Record<string, string | null>>(USERNAME_CACHE_KEY);
  if (sessionCache && userId in sessionCache) {
    const cachedUsername = sessionCache[userId] ?? null;
    console.log(`getUsername: SessionStorage cache hit for ${userId}:`, cachedUsername);
    // Populate in-memory cache for faster future access
    usernameCache.set(userId, cachedUsername);
    return cachedUsername;
  }

  // 4. Create and track the API request promise
  const requestPromise = (async () => {
    try {
      const response = await apiCall(
        "/UserAuthentication/_getUsername",
        { user: userId },
        "Get Username"
      );
      let username: string | null = null;

      // Based on GetUsernameResponseSuccess sync: then: actions([Requesting.respond, { request, username }])
      // The HTTP response should be { username: string } (request field is not sent to client)
      if (response && typeof response === "object") {
        if ("username" in response) {
          const fetchedUsername = response.username as string;
          if (fetchedUsername) {
            username = fetchedUsername;
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
        }
      }

      // Store in both in-memory and sessionStorage
      usernameCache.set(userId, username);
      
      // Update sessionStorage cache
      const updatedSessionCache = getFromSessionStorage<Record<string, string | null>>(USERNAME_CACHE_KEY) || {};
      updatedSessionCache[userId] = username;
      setToSessionStorage(USERNAME_CACHE_KEY, updatedSessionCache);

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
      
      // Update sessionStorage cache with null
      const updatedSessionCache = getFromSessionStorage<Record<string, string | null>>(USERNAME_CACHE_KEY) || {};
      updatedSessionCache[userId] = null;
      setToSessionStorage(USERNAME_CACHE_KEY, updatedSessionCache);
      
      return null;
    } finally {
      // Remove from in-flight tracking when done
      inFlightUsernameRequests.delete(userId);
    }
  })();

  // Store the promise so other concurrent callers can reuse it
  inFlightUsernameRequests.set(userId, requestPromise);
  return await requestPromise;
}

/**
 * Get all users in the system (with per-session caching using in-memory and sessionStorage)
 * Uses sync endpoint: /UserAuthentication/_getAllUsers
 * Based on GetAllUsersResponseSuccess sync: [Requesting.respond, { request, users }]
 * @param session - The session token of the authenticated user
 * @returns Array of user IDs, or empty array on error
 */
export async function getAllUsers(session: string): Promise<string[]> {
  // 1. Check in-memory cache first (fastest)
  if (allUsersCache !== null) {
    console.log(`getAllUsers: In-memory cache hit, returning ${allUsersCache.length} users`);
    return allUsersCache;
  }

  // 2. Check if in-flight request exists
  if (inFlightAllUsersRequest !== null) {
    console.log(`getAllUsers: Reusing in-flight request`);
    return await inFlightAllUsersRequest;
  }

  // 3. Check sessionStorage
  const sessionCachedUsers = getFromSessionStorage<string[]>(ALL_USERS_CACHE_KEY);
  if (sessionCachedUsers !== null) {
    console.log(`getAllUsers: SessionStorage cache hit, returning ${sessionCachedUsers.length} users`);
    // Populate in-memory cache for faster future access
    allUsersCache = sessionCachedUsers;
    return sessionCachedUsers;
  }

  // 4. Create and track the API request promise
  const requestPromise = (async () => {
    try {
      const response = await apiCall(
        "/UserAuthentication/_getAllUsers",
        { session },
        "Get All Users"
      );

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
        }
      }

      // Fallback for array format
      if (userIds.length === 0 && Array.isArray(response)) {
        userIds = response.filter(
          (id): id is string => typeof id === "string" && id.length > 0
        );
      }

      // Store in both in-memory and sessionStorage
      allUsersCache = userIds;
      setToSessionStorage(ALL_USERS_CACHE_KEY, userIds);

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
      setToSessionStorage(ALL_USERS_CACHE_KEY, []);
      return [];
    } finally {
      // Remove from in-flight tracking when done
      inFlightAllUsersRequest = null;
    }
  })();

  // Store the promise so other concurrent callers can reuse it
  inFlightAllUsersRequest = requestPromise;
  return await requestPromise;
}


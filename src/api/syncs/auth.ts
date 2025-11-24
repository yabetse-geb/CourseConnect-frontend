import { apiCall } from "../api";

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
 * Get username for a user ID
 * Uses concept endpoint: /UserAuthentication/_getUsername
 * @param userId - The user ID
 * @returns Username string or null if not found
 */
export async function getUsername(userId: string): Promise<string | null> {
  try {
    const response = await apiCall(
      "/UserAuthentication/_getUsername",
      { user: userId },
      "Get Username"
    );
    // Handle both array and object response formats
    if (Array.isArray(response)) {
      const result = response as { username: string }[];
      if (result.length > 0 && result[0].username) {
        return result[0].username;
      }
    } else if (response && typeof response === "object") {
      // Response is an object like {username: 'YabTest'}
      if ("username" in response && response.username) {
        return response.username as string;
      }
    }
    return null;
  } catch (e: any) {
    console.error("Error getting username:", e);
    return null;
  }
}

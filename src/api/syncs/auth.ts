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
 * Based on GetUsernameResponseSuccess sync: [Requesting.respond, { request, username }]
 * The HTTP response should be { username: string } (request ID is internal to engine)
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
    console.log(`getUsername response for user ${userId}:`, response);

    // Based on GetUsernameResponseSuccess sync: then: actions([Requesting.respond, { request, username }])
    // The HTTP response should be { username: string } (request field is not sent to client)
    if (response && typeof response === "object") {
      if ("username" in response) {
        const username = response.username as string;
        if (username) {
          console.log(`getUsername: Found username for ${userId}:`, username);
          return username;
        } else {
          console.warn(
            `getUsername: Username field exists but is empty for user ${userId}`
          );
        }
      }
    }

    // Fallback for array format (legacy support)
    if (Array.isArray(response)) {
      const result = response as { username: string }[];
      if (result.length > 0 && result[0]?.username) {
        const username = result[0].username;
        console.log(
          `getUsername: Found username in array format for ${userId}:`,
          username
        );
        return username;
      }
    }

    console.warn(
      `getUsername: No username found in response for user ${userId}, response:`,
      response
    );
    return null;
  } catch (e: any) {
    console.error(`Error getting username for user ${userId}:`, e);
    return null;
  }
}

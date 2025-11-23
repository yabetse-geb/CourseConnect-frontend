import { apiCall } from '../api';

export const authApi = {
  /**
   * Register a new user
   * Path: /UserAuthentication/register
   */
  register: async (username: string, password: string) => {
    return await apiCall(
      '/UserAuthentication/register',
      { username, password },
      'User Registration'
    );
  },

  /**
   * Login user and create session
   * Path: /login
   * Returns session token
   */
  login: async (username: string, password: string) => {
    return await apiCall(
      '/login',
      { username, password },
      'User Login'
    );
  },

  /**
   * Logout user
   * Path: /logout
   */
  logout: async (session: string) => {
    return await apiCall(
      '/logout',
      { session },
      'User Logout'
    );
  }
};

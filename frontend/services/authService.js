import api from './api';

const USER_KEY = 'recruitment_user';

export const authService = {
  /**
   * Perform login with email and password.
   * On success: stores recruitment_user in localStorage and returns user.
   */
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    const user = response.data;

    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    return user;
  },

  /**
   * Log out user: removes recruitment_user and redirects to /login.
   */
  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_KEY);
      window.location.href = '/login';
    }
  },

  /**
   * Get currently authenticated user from localStorage.
   */
  getCurrentUser() {
    if (typeof window === 'undefined') return null;
    try {
      const userStr = localStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  /**
   * Check if user is currently authenticated.
   */
  isAuthenticated() {
    return Boolean(this.getCurrentUser());
  },

  /**
   * Check if current user has specified role (HR or COMPANY).
   */
  hasRole(role) {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  },
};

export default authService;

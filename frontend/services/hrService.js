import api from './api';

/**
 * Service for HR-specific API interactions
 */
const hrService = {
  /**
   * Fetch live HR dashboard statistics
   * @param {number|string} hrId - Logged-in HR user ID
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getDashboardStats(hrId) {
    const response = await api.get('/hr/dashboard/stats', {
      params: { hr_id: hrId },
    });
    return response.data;
  },

  /**
   * Fetch recent candidates
   * @param {number} limit - Maximum number of candidates to return
   * @returns {Promise<Array>} List of candidates sorted newest first
   */
  async getRecentCandidates(limit = 5) {
    const response = await api.get('/candidates');
    const candidates = Array.isArray(response.data) ? response.data : [];
    return candidates.slice(0, limit);
  },

  /**
   * Fetch recent jobs
   * @param {number} limit - Maximum number of jobs to return
   * @returns {Promise<Array>} List of jobs sorted newest first
   */
  async getRecentJobs(limit = 5) {
    const response = await api.get('/jobs');
    const jobs = Array.isArray(response.data) ? response.data : [];
    return jobs.slice(0, limit);
  },
};

export default hrService;

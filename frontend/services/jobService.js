import api from './api';

/**
 * Service for Job and Job Description management
 */
const jobService = {
  /**
   * Retrieve all jobs sorted by newest first
   * @returns {Promise<Array>} List of jobs
   */
  async getJobs() {
    const response = await api.get('/jobs');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Retrieve a single job by ID
   * @param {number|string} id - Job ID
   * @returns {Promise<Object>} Job details
   */
  async getJobById(id) {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  /**
   * Create a new job
   * @param {Object} jobData - { title, department, description, required_skills, experience_required, location, created_by }
   * @returns {Promise<Object>} Created job
   */
  async createJob(jobData) {
    const response = await api.post('/jobs', jobData);
    return response.data;
  },

  /**
   * Update an existing job
   * @param {number|string} id - Job ID
   * @param {Object} updateData - Partial job fields
   * @param {number|string} hrId - Optional HR User ID for authorization
   * @returns {Promise<Object>} Updated job
   */
  async updateJob(id, updateData, hrId) {
    const params = hrId ? { hr_id: hrId } : {};
    const response = await api.put(`/jobs/${id}`, updateData, { params });
    return response.data;
  },

  /**
   * Delete a job by ID
   * @param {number|string} id - Job ID
   * @param {number|string} hrId - Optional HR User ID for authorization
   * @returns {Promise<Object>} Deletion result
   */
  async deleteJob(id, hrId) {
    const params = hrId ? { hr_id: hrId } : {};
    const response = await api.delete(`/jobs/${id}`, { params });
    return response.data;
  },
};

export default jobService;

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
    const payload = {
      ...jobData,
      required_skills: Array.isArray(jobData.required_skills)
        ? jobData.required_skills.join(', ')
        : jobData.required_skills,
    };
    const response = await api.post('/jobs', payload);
    return response.data;
  },

  /**
   * Generate a complete structured Job Description using AI based on role & experience.
   * @param {Object} params - { job_title, experience_years, department, location }
   * @param {number|string} hrId - Optional HR User ID for authorization
   * @returns {Promise<Object>} { success: true, data: { ... } }
   */
  async generateJobWithAI(params, hrId) {
    const queryParams = hrId ? { hr_id: hrId } : {};
    const response = await api.post('/ai/jobs/generate', params, {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Extract and structure an existing Job Description (plain text or PDF/DOCX file upload).
   * @param {Object|FormData} payload - { jd_text } or FormData with 'file'
   * @param {number|string} hrId - Optional HR User ID for authorization
   * @returns {Promise<Object>} { success: true, data: { ... } }
   */
  async parseJobDescription(payload, hrId) {
    const queryParams = hrId ? { hr_id: hrId } : {};
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
    const config = {
      params: queryParams,
      headers: isFormData ? { 'Content-Type': undefined } : {},
    };
    const response = await api.post('/ai/jobs/parse', payload, config);
    return response.data;
  },

  /**
   * Redesigns and polishes a Job Description using AI.
   * @param {Object} payload - { title, description, department }
   * @param {number|string} hrId - Optional HR User ID
   * @returns {Promise<Object>} { success: true, data: { enhanced_description } }
   */
  async enhanceJobDescription(payload, hrId) {
    const queryParams = hrId ? { hr_id: hrId } : {};
    const response = await api.post('/ai/jobs/enhance-description', payload, {
      params: queryParams,
    });
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

import api from './api';

let candidatesCache = null;

/**
 * Service for Candidate and Screening management
 */
const candidateService = {
  /**
   * Get cached candidate screening list synchronously if available
   */
  getCachedCandidatesWithScreening() {
    return candidatesCache;
  },

  /**
   * Invalidate client-side cache
   */
  clearCache() {
    candidatesCache = null;
  },

  /**
   * Retrieve all candidates
   * @returns {Promise<Array>} List of candidates
   */
  async getCandidates() {
    const response = await api.get('/candidates');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Retrieve all candidates with pre-calculated JD matching details
   * Uses client caching to ensure instantaneous renders
   * @returns {Promise<Array>} List of candidates with match metrics
   */
  async getCandidatesWithScreening(forceRefresh = false) {
    if (!forceRefresh && candidatesCache) {
      // Fire background revalidation
      api.get('/candidates/with-screening').then((res) => {
        if (Array.isArray(res.data)) {
          candidatesCache = res.data;
        }
      }).catch(() => {});
      return candidatesCache;
    }

    const response = await api.get('/candidates/with-screening');
    const data = Array.isArray(response.data) ? response.data : [];
    candidatesCache = data;
    return data;
  },

  /**
   * Retrieve single candidate details by ID
   * @param {number|string} id - Candidate ID
   * @returns {Promise<Object>} Candidate details
   */
  async getCandidateById(id) {
    const response = await api.get(`/candidates/${id}`);
    return response.data;
  },

  /**
   * Retrieve candidate JD skills match calculation
   * @param {number|string} id - Candidate ID
   * @returns {Promise<Object>} Match results
   */
  async getCandidateMatch(id) {
    const response = await api.get(`/candidates/${id}/match`);
    return response.data;
  },

  /**
   * Retrieve candidate screening overview (candidate, job, match, evaluation)
   * @param {number|string} id - Candidate ID
   * @returns {Promise<Object>} Screening details
   */
  async getCandidateScreening(id) {
    const response = await api.get(`/candidates/${id}/screening`);
    return response.data;
  },

  /**
   * Trigger AI Resume Screening for a candidate
   * @param {number|string} id - Candidate ID
   * @returns {Promise<Object>} Screening calculation details
   */
  async screenCandidate(id) {
    candidatesCache = null;
    const response = await api.post(`/candidates/${id}/screen`);
    return response.data;
  },

  /**
   * Create a new candidate for an open job
   * @param {Object} candidateData - { name, email, phone, skills, resume_url, job_id }
   * @returns {Promise<Object>} Created candidate
   */
  async createCandidate(candidateData) {
    candidatesCache = null;
    const response = await api.post('/candidates', candidateData);
    return response.data;
  },

  /**
   * Update candidate information
   * @param {number|string} id - Candidate ID
   * @param {Object} updateData - Partial fields
   * @param {number|string} hrId - Optional HR User ID
   * @returns {Promise<Object>} Updated candidate
   */
  async updateCandidate(id, updateData, hrId) {
    candidatesCache = null;
    const params = hrId ? { hr_id: hrId } : {};
    const response = await api.put(`/candidates/${id}`, updateData, { params });
    return response.data;
  },

  /**
   * Delete candidate by ID
   * @param {number|string} id - Candidate ID
   * @param {number|string} hrId - Optional HR User ID
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteCandidate(id, hrId) {
    candidatesCache = null;
    const params = hrId ? { hr_id: hrId } : {};
    const response = await api.delete(`/candidates/${id}`, { params });
    return response.data;
  },

  /**
   * Submit evaluated candidate to company
   * @param {number|string} id - Candidate ID
   * @param {number|string} hrId - HR User ID
   * @returns {Promise<Object>} Submission confirmation
   */
  async submitCandidate(id, hrId) {
    candidatesCache = null;
    const response = await api.post(`/candidates/${id}/submit`, { hr_id: hrId });
    return response.data;
  },

  /**
   * Retrieve candidate by ID for company review
   * @param {number|string} id - Candidate ID
   * @returns {Promise<Object>} Candidate submission review details
   */
  async getSubmittedCandidateById(id) {
    const response = await api.get(`/candidates/submitted/${id}`);
    return response.data;
  },
};

export default candidateService;

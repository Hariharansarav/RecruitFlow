import api from './api';

/**
 * Service for Interview Evaluation management
 */
const interviewEvaluationService = {
  /**
   * Retrieve all interview evaluations
   * @returns {Promise<Array>} List of evaluations
   */
  async getEvaluations() {
    const response = await api.get('/interview-evaluations');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Retrieve a single interview evaluation by ID
   * @param {number|string} id - Evaluation ID
   * @returns {Promise<Object>} Evaluation record
   */
  async getEvaluationById(id) {
    const response = await api.get(`/interview-evaluations/${id}`);
    return response.data;
  },

  /**
   * Retrieve interview evaluation for a specific candidate
   * @param {number|string} candidateId - Candidate ID
   * @returns {Promise<Object>} Evaluation record
   */
  async getEvaluationByCandidate(candidateId) {
    const response = await api.get(`/interview-evaluations/candidate/${candidateId}`);
    return response.data;
  },

  /**
   * Create or update candidate interview evaluation
   * @param {Object} data - { candidate_id, hr_id, score, notes }
   * @returns {Promise<Object>} Created or updated evaluation
   */
  async createEvaluation(data) {
    const response = await api.post('/interview-evaluations', data);
    return response.data;
  },

  /**
   * Update existing interview evaluation score and notes
   * @param {number|string} id - Evaluation ID
   * @param {Object} data - { score, notes }
   * @returns {Promise<Object>} Updated evaluation
   */
  async updateEvaluation(id, data) {
    const response = await api.put(`/interview-evaluations/${id}`, data);
    return response.data;
  },

  /**
   * Delete an interview evaluation by ID
   * @param {number|string} id - Evaluation ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteEvaluation(id) {
    const response = await api.delete(`/interview-evaluations/${id}`);
    return response.data;
  },
};

export default interviewEvaluationService;

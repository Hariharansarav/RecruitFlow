import api from './api';

export const interviewInvitationService = {
  /**
   * Create or retrieve an existing valid interview invitation for a candidate
   * @param {number|string} candidateId
   * @returns {Promise<Object>}
   */
  async createOrGetInvitation(candidateId) {
    const response = await api.post('/interview-invitations', {
      candidate_id: Number(candidateId),
    });
    return response.data;
  },

  /**
   * Fetch interview invitation for a specific candidate
   * @param {number|string} candidateId
   * @returns {Promise<Object|null>}
   */
  async getInvitationByCandidateId(candidateId) {
    const response = await api.get(`/interview-invitations/candidate/${candidateId}`);
    return response.data;
  },

  /**
   * Fetch interview invitation and verification details by evaluation token
   * @param {string} token
   * @returns {Promise<Object>}
   */
  async getInvitationByToken(token) {
    const response = await api.get(`/interview-invitations/token/${token}`);
    return response.data;
  },

  /**
   * Submit technical evaluation by Tech Lead via secure token
   * @param {string} token
   * @param {Object} evaluationData - { notes: string, skills: Array<{ skill: string, score: number }> }
   * @returns {Promise<Object>}
   */
  async submitEvaluationByToken(token, evaluationData) {
    const response = await api.post(
      `/interview-evaluations/token/${token}`,
      evaluationData
    );
    return response.data;
  },
};

export default interviewInvitationService;

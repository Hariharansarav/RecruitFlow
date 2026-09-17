import api from './api';

/**
 * Service for Company dashboard, review, and candidate decisioning
 */
const companyService = {
  /**
   * Retrieve company dashboard statistics
   * @param {number|string} companyId - Logged-in Company User ID
   * @returns {Promise<Object>} { total_submitted, pending_review, accepted, rejected }
   */
  async getCompanyDashboard(companyId) {
    const response = await api.get('/company/dashboard', {
      params: { company_id: companyId },
    });
    return response.data;
  },

  /**
   * Retrieve all candidates submitted to the company
   * @param {number|string} companyId - Logged-in Company User ID
   * @returns {Promise<Array>} List of submitted candidates
   */
  async getCompanyCandidates(companyId) {
    const response = await api.get('/company/candidates', {
      params: { company_id: companyId },
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Retrieve full details of a single candidate submitted to the company
   * @param {number|string} candidateId - Candidate ID
   * @param {number|string} companyId - Logged-in Company User ID
   * @returns {Promise<Object>} Candidate, job, JD match, evaluation, and reviewer info
   */
  async getCompanyCandidateById(candidateId, companyId) {
    const response = await api.get(`/company/candidates/${candidateId}`, {
      params: { company_id: companyId },
    });
    return response.data;
  },

  /**
   * Submit an ACCEPT or REJECT decision for a submitted candidate
   * @param {number|string} candidateId - Candidate ID
   * @param {number|string} companyId - Logged-in Company User ID
   * @param {'ACCEPT'|'REJECT'} decision - Hiring decision
   * @returns {Promise<Object>} Decision result { message, candidate, email_sent }
   */
  async decideCandidate(candidateId, companyId, decision) {
    const response = await api.patch(
      `/company/candidates/${candidateId}/decision`,
      {
        company_id: Number(companyId),
        decision,
      },
    );
    return response.data;
  },
};

export default companyService;

import api from './api';

/**
 * Service for Tech Lead management (external interviewers)
 */
const techLeadService = {
  /**
   * Retrieve all Tech Leads, optionally filtered by status
   * @param {string} [status] - Optional status filter ('ACTIVE' or 'INACTIVE')
   * @returns {Promise<Array>} List of Tech Leads
   */
  async getTechLeads(status) {
    const params = status ? { status } : {};
    const response = await api.get('/tech-leads', { params });
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Retrieve only ACTIVE Tech Leads for candidate dropdown assignment
   * @returns {Promise<Array>} List of active Tech Leads
   */
  async getActiveTechLeads() {
    const response = await api.get('/tech-leads?status=ACTIVE');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Retrieve a single Tech Lead by ID
   * @param {number|string} id - Tech Lead ID
   * @returns {Promise<Object>} Tech Lead details
   */
  async getTechLeadById(id) {
    const response = await api.get(`/tech-leads/${id}`);
    return response.data;
  },

  /**
   * Create a new Tech Lead
   * @param {Object} data - { name, email }
   * @returns {Promise<Object>} Created Tech Lead
   */
  async createTechLead(data) {
    const response = await api.post('/tech-leads', data);
    return response.data;
  },

  /**
   * Update Tech Lead details (name, email, status)
   * @param {number|string} id - Tech Lead ID
   * @param {Object} data - { name, email, status }
   * @returns {Promise<Object>} Updated Tech Lead
   */
  async updateTechLead(id, data) {
    const response = await api.patch(`/tech-leads/${id}`, data);
    return response.data;
  },

  /**
   * Delete or deactivate Tech Lead
   * If assigned to candidates, the backend marks them INACTIVE
   * @param {number|string} id - Tech Lead ID
   * @returns {Promise<Object>} Result confirmation
   */
  async deleteTechLead(id) {
    const response = await api.delete(`/tech-leads/${id}`);
    return response.data;
  },
};

export default techLeadService;

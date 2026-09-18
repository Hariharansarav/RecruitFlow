'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  Filter,
  CheckCircle2,
  Mail,
  Calendar,
  Power,
  ShieldAlert,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import techLeadService from '@/services/techLeadService';
import authService from '@/services/authService';
import { formatDate } from '@/utils/dateUtils';

export default function HrTechLeadsPage() {
  const [user, setUser] = useState(null);
  const [techLeads, setTechLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Add Tech Lead Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({ name: '', email: '' });
  const [addErrors, setAddErrors] = useState({});
  const [addServerError, setAddServerError] = useState(null);
  const [addLoading, setAddLoading] = useState(false);

  // Edit Tech Lead Modal state
  const [editingTechLead, setEditingTechLead] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    status: 'ACTIVE',
  });
  const [editErrors, setEditErrors] = useState({});
  const [editServerError, setEditServerError] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Deletion / Deactivation confirmation modal state
  const [techLeadToDelete, setTechLeadToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  // Fetch Tech Leads list
  const fetchTechLeads = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await techLeadService.getTechLeads();
      setTechLeads(data);
    } catch (err) {
      console.error('Failed to load tech leads:', err);
      setError('Unable to load technical interviewers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    fetchTechLeads();
  }, [fetchTechLeads]);

  // Statistics
  const stats = useMemo(() => {
    const total = techLeads.length;
    const active = techLeads.filter((t) => t.status === 'ACTIVE').length;
    const inactive = techLeads.filter((t) => t.status === 'INACTIVE').length;
    return { total, active, inactive };
  }, [techLeads]);

  // Filtered Tech Leads
  const filteredTechLeads = useMemo(() => {
    return techLeads.filter((lead) => {
      if (statusFilter !== 'ALL' && lead.status !== statusFilter) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nameMatch = lead.name?.toLowerCase().includes(query);
        const emailMatch = lead.email?.toLowerCase().includes(query);
        return nameMatch || emailMatch;
      }

      return true;
    });
  }, [techLeads, searchTerm, statusFilter]);

  // Email validation helper
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle Add Form Field Validation
  const validateAddForm = () => {
    const errs = {};
    const trimmedName = addFormData.name.trim();
    const trimmedEmail = addFormData.email.trim();

    if (!trimmedName) {
      errs.name = 'Tech Lead name is required.';
    } else if (trimmedName.length < 2) {
      errs.name = 'Name must be at least 2 characters long.';
    } else if (trimmedName.length > 100) {
      errs.name = 'Name cannot exceed 100 characters.';
    }

    if (!trimmedEmail) {
      errs.email = 'Tech Lead email is required.';
    } else if (!validateEmail(trimmedEmail)) {
      errs.email = 'Please enter a valid email address.';
    } else if (trimmedEmail.length > 150) {
      errs.email = 'Email cannot exceed 150 characters.';
    }

    setAddErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Add Tech Lead
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddServerError(null);

    if (!validateAddForm()) return;

    setAddLoading(true);
    try {
      await techLeadService.createTechLead({
        name: addFormData.name.trim(),
        email: addFormData.email.trim(),
      });

      setToast({
        message: 'Tech Lead created successfully.',
        type: 'success',
      });
      setIsAddModalOpen(false);
      setAddFormData({ name: '', email: '' });
      await fetchTechLeads(true);
    } catch (err) {
      console.error('Failed to create tech lead:', err);
      const msg =
        err.response?.data?.message || 'Failed to create Tech Lead. Please try again.';
      setAddServerError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setAddLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (lead) => {
    setEditingTechLead(lead);
    setEditFormData({
      name: lead.name,
      email: lead.email,
      status: lead.status || 'ACTIVE',
    });
    setEditErrors({});
    setEditServerError(null);
  };

  // Validate Edit Form
  const validateEditForm = () => {
    const errs = {};
    const trimmedName = editFormData.name.trim();
    const trimmedEmail = editFormData.email.trim();

    if (!trimmedName) {
      errs.name = 'Tech Lead name is required.';
    } else if (trimmedName.length < 2) {
      errs.name = 'Name must be at least 2 characters long.';
    } else if (trimmedName.length > 100) {
      errs.name = 'Name cannot exceed 100 characters.';
    }

    if (!trimmedEmail) {
      errs.email = 'Tech Lead email is required.';
    } else if (!validateEmail(trimmedEmail)) {
      errs.email = 'Please enter a valid email address.';
    } else if (trimmedEmail.length > 150) {
      errs.email = 'Email cannot exceed 150 characters.';
    }

    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Edit Tech Lead
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTechLead) return;
    setEditServerError(null);

    if (!validateEditForm()) return;

    setEditLoading(true);
    try {
      await techLeadService.updateTechLead(editingTechLead.id, {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        status: editFormData.status,
      });

      setToast({
        message: 'Tech Lead updated successfully.',
        type: 'success',
      });
      setEditingTechLead(null);
      await fetchTechLeads(true);
    } catch (err) {
      console.error('Failed to update tech lead:', err);
      const msg =
        err.response?.data?.message || 'Failed to update Tech Lead. Please try again.';
      setEditServerError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setEditLoading(false);
    }
  };

  // Quick Toggle Status (Active <-> Inactive)
  const handleToggleStatus = async (lead) => {
    const nextStatus = lead.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await techLeadService.updateTechLead(lead.id, { status: nextStatus });
      setToast({
        message: `Tech Lead status updated to ${nextStatus}.`,
        type: 'success',
      });
      await fetchTechLeads(true);
    } catch (err) {
      console.error('Failed to update status:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to toggle status.',
        type: 'error',
      });
    }
  };

  // Handle Delete / Deactivate confirmation
  const handleDeleteConfirm = async () => {
    if (!techLeadToDelete) return;
    setDeleteLoading(true);

    try {
      const res = await techLeadService.deleteTechLead(techLeadToDelete.id);
      setToast({
        message: res.message || 'Action completed successfully.',
        type: res.status === 'INACTIVE' ? 'info' : 'success',
      });
      setTechLeadToDelete(null);
      await fetchTechLeads(true);
    } catch (err) {
      console.error('Failed to delete tech lead:', err);
      setToast({
        message: err.response?.data?.message || 'Failed to delete Tech Lead.',
        type: 'error',
      });
      setTechLeadToDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'ALL';

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete / Deactivate Modal */}
      {techLeadToDelete && (
        <Modal
          isOpen={true}
          title="Delete or Deactivate Tech Lead?"
          message={`Are you sure you want to remove '${techLeadToDelete.name}' (${techLeadToDelete.email})? If this interviewer is already assigned to candidates, they will be marked INACTIVE to protect historical interview records.`}
          confirmText="Confirm Removal"
          confirmVariant="danger"
          isLoading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onClose={() => setTechLeadToDelete(null)}
        />
      )}

      {/* Add Tech Lead Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-tech-lead-title"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 text-slate-900 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h2
                  id="add-tech-lead-title"
                  className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
                >
                  Add Tech Lead
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Register an external interviewer for candidate evaluation.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                disabled={addLoading}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addServerError && (
              <div className="p-3.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs sm:text-sm flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{addServerError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4" noValidate>
              <div className="space-y-1">
                <label
                  htmlFor="add_tech_lead_name"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Tech Lead Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="add_tech_lead_name"
                  name="name"
                  type="text"
                  value={addFormData.name}
                  onChange={(e) =>
                    setAddFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Arun Kumar"
                  maxLength={100}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                    addErrors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                      : 'border-slate-200 focus:border-zinc-950 focus:ring-zinc-200 bg-white hover:border-slate-300 text-slate-900'
                  }`}
                />
                {addErrors.name && (
                  <p className="text-xs font-medium text-red-600 mt-0.5">
                    {addErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="add_tech_lead_email"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Tech Lead Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="add_tech_lead_email"
                  name="email"
                  type="email"
                  value={addFormData.email}
                  onChange={(e) =>
                    setAddFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="e.g. arun@example.com"
                  maxLength={150}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                    addErrors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                      : 'border-slate-200 focus:border-zinc-950 focus:ring-zinc-200 bg-white hover:border-slate-300 text-slate-900'
                  }`}
                />
                {addErrors.email && (
                  <p className="text-xs font-medium text-red-600 mt-0.5">
                    {addErrors.email}
                  </p>
                )}
                <p className="text-[11px] text-zinc-400 mt-1">
                  External interview invitations and evaluation links will be routed to this email address.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={addLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={addLoading}
                  disabled={addLoading}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{addLoading ? 'Adding...' : 'Add Tech Lead'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tech Lead Modal */}
      {editingTechLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-tech-lead-title"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 text-slate-900 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h2
                  id="edit-tech-lead-title"
                  className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
                >
                  Edit Tech Lead
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Update interviewer profile information and active status.
                </p>
              </div>
              <button
                onClick={() => setEditingTechLead(null)}
                disabled={editLoading}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editServerError && (
              <div className="p-3.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs sm:text-sm flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{editServerError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
              <div className="space-y-1">
                <label
                  htmlFor="edit_tech_lead_name"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Tech Lead Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit_tech_lead_name"
                  name="name"
                  type="text"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  maxLength={100}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                    editErrors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                      : 'border-slate-200 focus:border-zinc-950 focus:ring-zinc-200 bg-white hover:border-slate-300 text-slate-900'
                  }`}
                />
                {editErrors.name && (
                  <p className="text-xs font-medium text-red-600 mt-0.5">
                    {editErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="edit_tech_lead_email"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Tech Lead Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit_tech_lead_email"
                  name="email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  maxLength={150}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                    editErrors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20 text-slate-900'
                      : 'border-slate-200 focus:border-zinc-950 focus:ring-zinc-200 bg-white hover:border-slate-300 text-slate-900'
                  }`}
                />
                {editErrors.email && (
                  <p className="text-xs font-medium text-red-600 mt-0.5">
                    {editErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="edit_tech_lead_status"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Status
                </label>
                <select
                  id="edit_tech_lead_status"
                  name="status"
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 bg-white text-zinc-900 font-medium"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Only ACTIVE Tech Leads are eligible for selection when assigning candidates.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingTechLead(null)}
                  disabled={editLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={editLoading}
                  disabled={editLoading}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editLoading ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
            Tech Leads
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage technical interviewers and assign them to candidates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setAddFormData({ name: '', email: '' });
              setAddErrors({});
              setAddServerError(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Tech Lead</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Total Tech Leads
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-950 mt-1">
              {stats.total}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Active Interviewers
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-950 mt-1">
              {stats.active}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Inactive
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-950 mt-1">
              {stats.inactive}
            </h3>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-zinc-50 text-zinc-500 flex items-center justify-center font-bold border border-zinc-200">
            <Power className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by Tech Lead name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 bg-zinc-50/50 hover:border-zinc-300 text-zinc-900 transition-all placeholder:text-zinc-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { label: 'All', value: 'ALL', count: stats.total },
              { label: 'Active', value: 'ACTIVE', count: stats.active },
              { label: 'Inactive', value: 'INACTIVE', count: stats.inactive },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab.value
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
                className="text-xs font-semibold text-zinc-900 hover:text-zinc-600 flex items-center gap-1 transition-colors whitespace-nowrap ml-2"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Table / Content Section */}
      {loading ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-8 h-8 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Loading Tech Leads...
          </p>
        </div>
      ) : techLeads.length === 0 ? (
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-zinc-100 text-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-200 shadow-xs">
            <UserCheck className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-zinc-950 mb-1">
            No Tech Leads yet.
          </h2>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-6">
            Add technical interviewers who will conduct candidate evaluations.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              setAddFormData({ name: '', email: '' });
              setAddErrors({});
              setAddServerError(null);
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Tech Lead
          </Button>
        </div>
      ) : filteredTechLeads.length === 0 ? (
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-10 text-center shadow-xs">
          <div className="w-12 h-12 bg-zinc-100 text-zinc-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-950 mb-1">
            No Tech Leads match your search.
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            Try searching for a different name or clearing your status filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-zinc-200/90 bg-white shadow-xs">
            <table className="w-full min-w-[760px] text-left text-sm divide-y divide-zinc-200">
              <thead className="bg-zinc-50/90 text-xs font-semibold uppercase tracking-wider text-zinc-500 select-none">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap min-w-[220px]">
                    Name
                  </th>
                  <th className="px-5 py-3.5 whitespace-nowrap min-w-[240px]">
                    Email
                  </th>
                  <th className="px-5 py-3.5 whitespace-nowrap min-w-[130px]">
                    Status
                  </th>
                  <th className="px-5 py-3.5 whitespace-nowrap min-w-[140px]">
                    Created Date
                  </th>
                  <th className="px-5 py-3.5 whitespace-nowrap text-right min-w-[160px]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredTechLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-zinc-50/70 transition-colors group"
                  >
                    <td className="px-5 py-3.5 font-semibold text-zinc-950 min-w-[220px]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800 font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                          {lead.name ? lead.name[0].toUpperCase() : 'T'}
                        </div>
                        <span className="truncate max-w-[180px]" title={lead.name}>
                          {lead.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 text-xs min-w-[240px]">
                      <span className="flex items-center gap-1.5 truncate max-w-[220px]" title={lead.email}>
                        <Mail className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                        {lead.email}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 min-w-[130px]">
                      <Badge status={lead.status}>
                        {lead.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs whitespace-nowrap min-w-[140px]">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap min-w-[160px]">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleOpenEdit(lead)}
                          className="text-xs font-medium px-2.5 py-1"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleToggleStatus(lead)}
                          className={`text-xs font-medium px-2 py-1 ${
                            lead.status === 'ACTIVE'
                              ? 'text-zinc-600 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={
                            lead.status === 'ACTIVE'
                              ? 'Mark as Inactive'
                              : 'Mark as Active'
                          }
                        >
                          <Power className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => setTechLeadToDelete(lead)}
                          className="text-xs font-medium px-2 py-1 text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                          title="Delete / Deactivate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {filteredTechLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {lead.name ? lead.name[0].toUpperCase() : 'T'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-zinc-950 text-sm truncate">
                        {lead.name}
                      </h4>
                      <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 text-zinc-400" />
                        {lead.email}
                      </p>
                    </div>
                  </div>
                  <Badge status={lead.status}>
                    {lead.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs text-zinc-400">
                  <span>Added {formatDate(lead.created_at)}</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => handleOpenEdit(lead)}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => setTechLeadToDelete(lead)}
                      className="text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

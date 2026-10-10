import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getUserDisplayName } from '../utils/user';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [editPlan, setEditPlan] = useState('FREE');
  const [editRole, setEditRole] = useState('free');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('admin/users/');
      setUsers(res.data.results || res.data || []);
    } catch (err) {
      toast.error('Failed to load user management details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.post(`admin/users/${selectedUser.id}/update_plan/`, { plan: editPlan, role: editRole });
      toast.success('User updated successfully!');
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user parameters.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await api.delete(`admin/users/${id}/`);
      setUsers(users.filter(u => u.id !== id));
      toast.success('User deleted.');
    } catch (err) {
      toast.error('Failed to delete user.');
    }
  };

  const filtered = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const displayName = getUserDisplayName(u).toLowerCase();
    return (
      displayName.includes(term) ||
      u.username?.toLowerCase().includes(term) ||
      u.first_name?.toLowerCase().includes(term) ||
      u.last_name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted text-sm">Assign subscription levels, set system roles, and audit credentials.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 text-subtle" size={18} />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-raised/40 border border-line/50 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-fg"
        />
      </div>

      {/* Users List */}
      <div className="bg-surface/80 backdrop-blur-md border border-line rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-subtle text-sm">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-inset text-muted font-semibold border-b border-line">
                  <th className="p-4">USER</th>
                  <th className="p-4">PLAN</th>
                  <th className="p-4">ROLE</th>
                  <th className="p-4">VERIFIED</th>
                  <th className="p-4">JOINED</th>
                  <th className="p-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft/60">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-raised/20 text-muted">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-fg">{getUserDisplayName(u)}</p>
                        <p className="text-[10px] text-subtle mt-0.5">{u.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-extrabold rounded-full uppercase">
                        {u.profile?.subscription_plan || 'FREE'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 font-extrabold rounded-full uppercase">
                        {u.profile?.role || 'FREE'}
                      </span>
                    </td>
                    <td className="p-4">
                      {u.profile?.email_verified ? (
                        <span className="text-emerald-400 font-bold">Yes</span>
                      ) : (
                        <span className="text-subtle">No</span>
                      )}
                    </td>
                    <td className="p-4">
                      {u.profile?.created_at ? new Date(u.profile.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setEditPlan(u.profile?.subscription_plan || 'FREE');
                            setEditRole(u.profile?.role || 'free');
                          }}
                          className="p-1.5 bg-raised hover:bg-raised-hover text-muted hover:text-fg rounded-lg border border-line/50"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 bg-raised hover:bg-raised-hover text-muted hover:text-rose-400 rounded-lg border border-line/50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 glass-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-inset border border-line max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <h3 className="text-sm font-bold">Manage Account: {getUserDisplayName(selectedUser)}</h3>
              <button onClick={() => setSelectedUser(null)} className="text-muted hover:text-fg text-xs">Cancel</button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs text-muted font-semibold mb-2">SUBSCRIPTION PLAN</label>
                <select
                  value={editPlan}
                  onChange={e => setEditPlan(e.target.value)}
                  className="w-full px-4 py-2.5 bg-inset border border-line rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors text-fg"
                >
                  <option value="FREE">Free</option>
                  <option value="PRO">Pro</option>
                  <option value="BUSINESS">Business</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted font-semibold mb-2">PLATFORM ROLE</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-inset border border-line rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors text-fg"
                >
                  <option value="free">Free User</option>
                  <option value="premium">Premium User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 transition-colors font-medium rounded-xl text-sm"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;

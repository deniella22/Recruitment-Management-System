import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserPlus,
  ShieldCheck,
  Mail,
  User as UserIcon,
  Lock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Shield,
  Trash2,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { fetchUsers, createUser, updateUser, deleteUser } from '../lib/api';

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New User Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Recruitment Staff');
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!fullName || !email || !username || !password) {
      setError('All fields are required.');
      return;
    }

    try {
      setSubmitting(true);
      await createUser({
        fullName,
        email,
        username,
        password,
        role,
      });
      setSuccessMsg(`User account '${username}' created successfully.`);
      setShowAddForm(false);
      setFullName('');
      setEmail('');
      setUsername('');
      setPassword('');
      setRole('Recruitment Staff');
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    setError(null);
    setSuccessMsg(null);
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateUser(user.id, { status: newStatus });
      setSuccessMsg(`Status of ${user.username} updated to ${newStatus}.`);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user status.');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete user account '${user.username}'?`)) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      await deleteUser(user.id);
      setSuccessMsg(`User account '${user.username}' deleted.`);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#1E3A8A]">
            <UserCheck className="w-5 h-5" />
            <h2 className="font-extrabold text-lg text-gray-900">User & Staff Management</h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage authorized Sisters, recruitment personnel, and system access roles.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer w-fit uppercase tracking-wider"
        >
          <UserPlus className="w-4 h-4 text-blue-200" />
          <span>{showAddForm ? 'Cancel Form' : '+ CREATE STAFF ACCOUNT'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Create User Form Panel */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-md p-6 animate-in fade-in zoom-in duration-200">
          <h3 className="font-bold text-sm text-[#1E3A8A] uppercase tracking-wider mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            <span>Create New Authorized Staff Account</span>
          </h3>

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sister Maria Santos"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sister.maria@som-girlstown.edu.ph"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Unique username"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-gray-700 uppercase mb-1">System Access Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              >
                <option value="Recruitment Staff">Recruitment Staff (Encode, Edit, Search, Export)</option>
                <option value="Super Administrator">Super Administrator (Full System Control & Settings)</option>
                <option value="Viewer">Viewer (Read-Only Access & Export)</option>
              </select>
            </div>

            <div className="sm:col-span-2 pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white font-bold rounded-xl shadow-xs cursor-pointer uppercase tracking-wider"
              >
                {submitting ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500 font-medium">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1E3A8A] text-white font-bold uppercase border-b border-[#172554]">
                <tr>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Username</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{u.fullName}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-gray-800">{u.username}</td>
                    <td className="py-3.5 px-4 text-gray-600">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-xs text-gray-800">
                        <Shield className="w-3.5 h-3.5 text-[#1E3A8A]" />
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.status === 'Active' ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[11px]">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-red-50 text-red-800 border border-red-200 rounded-full font-bold text-[11px]">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer"
                        >
                          {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
};

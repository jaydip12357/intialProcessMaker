import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Users, PlusCircle, Edit2, Trash2, Loader2, AlertCircle, X, Search } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'student' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { fetchUsers(); }, [roleFilter]);

    const fetchUsers = async () => {
        try {
            const response = await adminApi.getUsers(roleFilter);
            setUsers(response.data);
        } catch (err) { setError('Failed to fetch users'); }
        finally { setLoading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await adminApi.createUser(newUser);
            setShowModal(false);
            setNewUser({ email: '', password: '', first_name: '', last_name: '', role: 'student' });
            fetchUsers();
        } catch (err) { setError(err.response?.data?.detail || 'Failed to create user'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this user?')) return;
        try { await adminApi.deleteUser(id); setUsers(users.filter(u => u.id !== id)); }
        catch (err) { setError('Failed to delete user'); }
    };

    const filtered = users.filter(u =>
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.first_name?.toLowerCase().includes(search.toLowerCase())
    );

    const roleColors = {
        student: 'bg-blue-100 text-blue-700',
        professor: 'bg-purple-100 text-purple-700',
        university_admin: 'bg-emerald-100 text-emerald-700',
        evaluator: 'bg-amber-100 text-amber-700',
        system_admin: 'bg-red-100 text-red-700',
    };

    if (loading) return <div className="flex justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;

    return (
        <div className="animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-600 mt-1">Manage system users and roles</p>
                </div>
                <button onClick={() => setShowModal(true)} className="mt-4 sm:mt-0 btn-primary inline-flex items-center">
                    <PlusCircle className="w-5 h-5 mr-2" />Add User
                </button>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3" /><p className="text-red-700">{error}</p>
            </div>}

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none">
                        <option value="">All Roles</option>
                        <option value="student">Student</option>
                        <option value="professor">Professor</option>
                        <option value="university_admin">University Admin</option>
                        <option value="evaluator">Evaluator</option>
                        <option value="system_admin">System Admin</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-semibold">User</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold">Email</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold">Role</th>
                            <th className="text-right px-6 py-4 text-sm font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-12 text-slate-600">No users found</td></tr>
                        ) : filtered.map((user) => (
                            <tr key={user.id} className="border-b hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium">{user.first_name} {user.last_name}</td>
                                <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-slate-100'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-400 hover:text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-semibold">Add New User</h2>
                            <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="First Name" value={newUser.first_name} onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                                    className="px-4 py-2 border rounded-lg" required />
                                <input type="text" placeholder="Last Name" value={newUser.last_name} onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                                    className="px-4 py-2 border rounded-lg" required />
                            </div>
                            <input type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg" required />
                            <input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg" required />
                            <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                                <option value="student">Student</option>
                                <option value="professor">Professor</option>
                                <option value="university_admin">University Admin</option>
                                <option value="evaluator">Evaluator</option>
                                <option value="system_admin">System Admin</option>
                            </select>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;

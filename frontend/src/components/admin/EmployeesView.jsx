import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Phone, 
  Trash2, 
  X, 
  Key, 
  Eye, 
  EyeOff, 
  Check, 
  Clock, 
  IndianRupee, 
  ShieldCheck, 
  UserCheck, 
  Activity, 
  Filter,
  Search,
  Edit2,
  Sparkles,
  Shield,
  Lock,
  Copy,
  CheckCircle
} from 'lucide-react';
import { getTranslation } from '../../lib/translations';

// High-entropy memorable strong password generator
export const generateStrongPassword = () => {
  const words = ['Atmiya', 'Dosa', 'Kitchen', 'Spice', 'Royal', 'Chef', 'Super', 'Golden', 'Master', 'Hub'];
  const symbols = ['@', '#', '$', '!', '&', '*'];
  const word1 = words[Math.floor(Math.random() * words.length)];
  const word2 = words[Math.floor(Math.random() * words.length)];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word1}${symbol}${word2}${num}`;
};

// Password strength evaluator (length, mixed-case, numbers, special characters)
export const getPasswordStrength = (pass) => {
  if (!pass) return { score: 0, label: 'Empty', color: 'slate', bg: 'bg-slate-300', percent: 0 };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 10) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pass)) score += 1;

  if (score <= 2) return { score, label: 'Weak (too simple)', color: 'rose', bg: 'bg-rose-500', percent: 33 };
  if (score <= 4) return { score, label: 'Good & Secure', color: 'amber', bg: 'bg-amber-500', percent: 66 };
  return { score, label: 'Strong & High Entropy', color: 'emerald', bg: 'bg-emerald-500', percent: 100 };
};

export default function EmployeesView({ 
  employees = [], 
  activity = [], 
  onAddEmployee, 
  onUpdateEmployee,
  onDeleteEmployee, 
  currentLang 
}) {
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' or 'activity'
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('All');
  const [searchActivity, setSearchActivity] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [newShowPassword, setNewShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const [newEmp, setNewEmp] = useState({
    name: '',
    username: '',
    password: '',
    role: 'Cashier & POS Lead',
    phone: '',
    shift: 'Morning Shift'
  });

  const t = (key) => getTranslation(currentLang, key);

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyPassword = (empId, pass) => {
    if (!pass) return;
    navigator.clipboard?.writeText(pass);
    setCopiedId(empId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNameChange = (name) => {
    const suggestedUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    setNewEmp(prev => ({
      ...prev,
      name,
      username: prev.username ? prev.username : suggestedUsername
    }));
  };

  const handleNewGeneratePassword = () => {
    const gen = generateStrongPassword();
    setNewEmp(prev => ({ ...prev, password: gen }));
    setNewShowPassword(true);
  };

  const handleEditGeneratePassword = () => {
    if (!editingEmp) return;
    const gen = generateStrongPassword();
    setEditingEmp(prev => ({ ...prev, password: gen }));
    setEditShowPassword(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.password) return;

    if (onAddEmployee) {
      onAddEmployee({
        id: `emp_${Date.now()}`,
        name: newEmp.name.trim(),
        username: (newEmp.username || newEmp.name.toLowerCase().replace(/\s+/g, '_')).trim(),
        password: newEmp.password,
        role: newEmp.role,
        phone: newEmp.phone.trim() || '+91 98000 00000',
        shift: newEmp.shift,
        active: true,
        createdAt: new Date().toISOString().split('T')[0]
      });
    }

    setShowModal(false);
    setNewEmp({
      name: '',
      username: '',
      password: '',
      role: 'Cashier & POS Lead',
      phone: '',
      shift: 'Morning Shift'
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingEmp || !editingEmp.name) return;

    if (onUpdateEmployee) {
      onUpdateEmployee({
        ...editingEmp,
        name: editingEmp.name.trim(),
        username: (editingEmp.username || '').trim(),
        phone: (editingEmp.phone || '').trim(),
        role: editingEmp.role || 'Staff',
        shift: editingEmp.shift || 'Full Day',
        password: editingEmp.password || 'password123'
      });
    }

    setEditingEmp(null);
  };

  // Filter activities for Section 1.2
  const filteredActivities = activity.filter(act => {
    const matchesStaff = selectedStaffFilter === 'All' || act.employeeName === selectedStaffFilter;
    const matchesSearch = !searchActivity || 
      (act.details && act.details.toLowerCase().includes(searchActivity.toLowerCase())) ||
      (act.tableNumber && String(act.tableNumber).toLowerCase().includes(searchActivity.toLowerCase()));
    return matchesStaff && matchesSearch;
  });

  const editStrength = getPasswordStrength(editingEmp?.password);
  const newStrength = getPasswordStrength(newEmp?.password);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-[#F3F4F6] shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF7ED] text-[#F97316] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1F2937] font-heading">
                Staff Credentials & Permissions Management
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Edit and customize admin profile, phone numbers, passwords, generate secure credentials, and track live activity logs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#F3F4F6] p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'roster' 
                  ? 'bg-white text-[#1F2937] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4 text-[#F97316]" />
              <span>Staff Credentials ({employees.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'activity' 
                  ? 'bg-white text-[#1F2937] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Activity Log ({activity.length})</span>
            </button>
          </div>

          {activeTab === 'roster' && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 transition flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Credentials</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: EMPLOYEE CREDENTIALS ROSTER */}
      {activeTab === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {employees.map(emp => {
            const isAdmin = emp.username === 'admin' || String(emp.role || '').toLowerCase().includes('admin');
            const initials = (emp.name || 'Staff').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

            return (
              <div 
                key={emp.id} 
                className={`bg-white p-5 rounded-3xl border shadow-sm transition space-y-4 flex flex-col justify-between ${
                  isAdmin 
                    ? 'border-orange-200/90 ring-2 ring-orange-500/10 hover:border-orange-300' 
                    : 'border-[#F3F4F6] hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-2xl font-black flex items-center justify-center font-heading text-base shadow-sm shrink-0 ${
                        isAdmin 
                          ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white ring-2 ring-orange-400/20' 
                          : 'bg-[#FFF7ED] text-[#F97316] border border-orange-100'
                      }`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-black text-[#1F2937] font-heading truncate">{emp.name}</h3>
                          {isAdmin && (
                            <span className="text-[10px] font-bold text-orange-600 bg-orange-100/70 px-1.5 py-0.2 rounded border border-orange-200">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-[#F97316] truncate">{emp.role}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{emp.shift}</div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                      Active
                    </span>
                  </div>

                  {/* Credentials Box */}
                  <div className="mt-4 p-3 rounded-2xl bg-[#F3F4F6] border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold">Username:</span>
                      <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {emp.username || emp.name.toLowerCase().replace(/\s+/g, '_')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold">Password:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {visiblePasswords[emp.id] ? (emp.password || 'password123') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(emp.id)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          title={visiblePasswords[emp.id] ? "Hide Password" : "Show Password"}
                        >
                          {visiblePasswords[emp.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(emp.id, emp.password || 'password123')}
                          className="text-slate-400 hover:text-orange-600 p-0.5 cursor-pointer"
                          title="Copy password to clipboard"
                        >
                          {copiedId === emp.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold">Phone:</span>
                      <span className="font-mono text-slate-700 text-[11px] font-semibold">{emp.phone || '+91 98000 00000'}</span>
                    </div>

                    {/* Waiter specific ID/PIN */}
                    {(emp.waiter_id || emp.pin) && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500 font-bold">Waiter ID:</span>
                        <span className="font-mono font-bold text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">
                          {emp.waiter_id || emp.id} {emp.pin ? `(PIN: ${emp.pin})` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons (Edit Credential / Admin Profile & Delete) */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-mono">ID: {emp.id}</span>
                  
                  <div className="flex items-center gap-1.5">
                    {/* EDIT CREDENTIAL BUTTON - AVAILABLE FOR ALL EMPLOYEES INCLUDING ADMIN */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEmp({ ...emp });
                        setEditShowPassword(false);
                      }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        isAdmin
                          ? 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                      title={isAdmin ? 'Change Admin Name, Phone, and Password' : `Edit credentials for ${emp.name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-orange-500" />
                      <span>{isAdmin ? 'Edit Admin Profile' : 'Edit Credential'}</span>
                    </button>

                    {/* DELETE BUTTON (Non-admin staff only) */}
                    {!isAdmin && emp.username !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => onDeleteEmployee(emp.id, emp.name)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition border border-rose-200 cursor-pointer"
                        title="Delete employee credentials when staff member leaves"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: REAL-TIME ACTIVITY TRACKING (Section 1.2 of Admin.txt) */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          {/* Activity Filters */}
          <div className="bg-white p-4 rounded-2xl border border-[#F3F4F6] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5 text-[#F97316]" />
                Filter by Employee:
              </span>
              <select
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#F3F4F6] border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#F97316]"
              >
                <option value="All">All Employees</option>
                {employees.map(e => <option key={e.id} value={e.name}>{e.name} ({e.role})</option>)}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchActivity}
                onChange={(e) => setSearchActivity(e.target.value)}
                placeholder="Search table, order, cash payment..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#F3F4F6] border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#F97316]"
              />
            </div>
          </div>

          {/* Activity Table / Feed */}
          <div className="bg-white rounded-3xl border border-[#F3F4F6] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Time</th>
                    <th className="p-4">Employee</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Table #</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Detailed Audit Event Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                        No activity records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map((act, idx) => (
                      <tr key={`${act.id || act.time}-${idx}`} className="hover:bg-slate-50/70 transition">
                        <td className="p-4 font-mono font-bold text-slate-500 whitespace-nowrap">
                          {act.time}
                        </td>
                        <td className="p-4 font-black text-[#1F2937] whitespace-nowrap">
                          {act.employeeName}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF7ED] text-[#F97316] border border-orange-200">
                            {act.employeeRole}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold whitespace-nowrap">
                          {act.tableNumber ? (
                            <span className="px-2 py-0.5 rounded bg-orange-600 text-white text-[11px] font-bold">
                              {act.tableNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            act.actionType?.includes('PAYMENT') || act.type === 'payment'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : act.actionType?.includes('CANCEL')
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                          }`}>
                            {act.actionType || act.type}
                          </span>
                        </td>
                        <td className="p-4 font-black font-heading whitespace-nowrap">
                          {act.amount ? (
                            <span className="text-emerald-600">₹{act.amount}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-700 font-medium max-w-md">
                          {act.details || act.text}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CREDENTIALS MODAL */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-100/70 text-orange-600 flex items-center justify-center border border-orange-200">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">
                    {editingEmp.username === 'admin' ? 'Edit Admin Profile & Security' : 'Edit Staff Credentials'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Modify display name, username, phone number, and password
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditingEmp(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name {editingEmp.username === 'admin' && <span className="text-orange-600">(Admin Display Name)</span>}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Restaurant Owner / Admin Name"
                  value={editingEmp.name || ''}
                  onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Login Username</label>
                <input
                  type="text"
                  required
                  value={editingEmp.username || ''}
                  onChange={(e) => setEditingEmp({ ...editingEmp, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Password Section with Live Strength & Generator */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-orange-500" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleEditGeneratePassword}
                    className="text-[11px] font-black text-orange-600 hover:text-orange-700 bg-orange-100/70 hover:bg-orange-100 px-2 py-0.5 rounded-lg border border-orange-200/80 transition flex items-center gap-1 cursor-pointer"
                    title="Generate a high-security random password"
                  >
                    <Sparkles className="w-3 h-3 text-orange-500" />
                    <span>⚡ Generate Strong Password</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={editShowPassword ? 'text' : 'password'}
                    required
                    value={editingEmp.password || ''}
                    onChange={(e) => setEditingEmp({ ...editingEmp, password: e.target.value })}
                    className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-none focus:border-orange-500"
                    placeholder="Enter or generate a good password"
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPassword(!editShowPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {editShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Live Password Strength Meter */}
                {editingEmp.password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-500">Strength:</span>
                      <span className={
                        editStrength.color === 'emerald' ? 'text-emerald-700' :
                        editStrength.color === 'amber' ? 'text-amber-700' : 'text-rose-600'
                      }>
                        {editStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${editStrength.bg}`}
                        style={{ width: `${editStrength.percent}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Phone Number {editingEmp.username === 'admin' && <span className="text-orange-600">(Admin Mobile)</span>}</span>
                </label>
                <input
                  type="text"
                  placeholder="+91 98000 00000"
                  value={editingEmp.phone || ''}
                  onChange={(e) => setEditingEmp({ ...editingEmp, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Role & Shift */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={editingEmp.role || 'Cashier & POS Lead'}
                    onChange={(e) => setEditingEmp({ ...editingEmp, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                  >
                    <option value="Admin / Owner">Admin / Owner</option>
                    <option value="Head Chef">Head Chef</option>
                    <option value="Senior Waiter">Senior Waiter</option>
                    <option value="Waiter">Floor Waiter</option>
                    <option value="Cashier & POS Lead">Cashier & POS Lead</option>
                    <option value="Kitchen Helper">Kitchen Staff</option>
                    <option value="Floor Manager">Floor Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift</label>
                  <select
                    value={editingEmp.shift || 'Full Day'}
                    onChange={(e) => setEditingEmp({ ...editingEmp, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                  >
                    <option value="Full Day">Full Day</option>
                    <option value="Morning Shift">Morning Shift</option>
                    <option value="Evening Shift">Evening Shift</option>
                    <option value="Night Shift">Night Shift</option>
                  </select>
                </div>
              </div>

              {/* Waiter specific PIN / ID */}
              {(String(editingEmp.role || '').toLowerCase().includes('waiter') || editingEmp.waiter_id) && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Waiter ID</label>
                    <input
                      type="text"
                      placeholder="e.g. WTR-101"
                      value={editingEmp.waiter_id || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, waiter_id: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Quick Switch PIN</label>
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="e.g. 1001"
                      value={editingEmp.pin || ''}
                      onChange={(e) => setEditingEmp({ ...editingEmp, pin: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATE CREDENTIALS MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#1F2937] font-heading">Generate Staff Credentials</h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newEmp.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="ramesh_pos"
                  value={newEmp.username}
                  onChange={(e) => setNewEmp({ ...newEmp, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-[#F97316]"
                />
              </div>

              {/* Password with Generator & Strength */}
              <div className="space-y-1.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Set Password</label>
                  <button
                    type="button"
                    onClick={handleNewGeneratePassword}
                    className="text-[10px] font-black text-orange-600 hover:text-orange-700 bg-orange-100/70 hover:bg-orange-100 px-2 py-0.5 rounded-lg border border-orange-200/80 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-orange-500" />
                    <span>⚡ Generate Strong</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={newShowPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter or generate password"
                    value={newEmp.password}
                    onChange={(e) => setNewEmp({ ...newEmp, password: e.target.value })}
                    className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-[#F97316] bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setNewShowPassword(!newShowPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {newShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {newEmp.password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-500">Strength:</span>
                      <span className={
                        newStrength.color === 'emerald' ? 'text-emerald-700' :
                        newStrength.color === 'amber' ? 'text-amber-700' : 'text-rose-600'
                      }>
                        {newStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${newStrength.bg}`}
                        style={{ width: `${newStrength.percent}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={newEmp.role}
                    onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#F97316] bg-white"
                  >
                    <option value="Cashier & POS Lead">Cashier & POS</option>
                    <option value="Head Chef">Head Chef</option>
                    <option value="Senior Waiter">Senior Waiter</option>
                    <option value="Waiter">Floor Waiter</option>
                    <option value="Kitchen Helper">Kitchen Staff</option>
                    <option value="Floor Manager">Floor Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift</label>
                  <select
                    value={newEmp.shift}
                    onChange={(e) => setNewEmp({ ...newEmp, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#F97316] bg-white"
                  >
                    <option value="Morning Shift">Morning Shift</option>
                    <option value="Evening Shift">Evening Shift</option>
                    <option value="Full Day">Full Day</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98980 12345"
                  value={newEmp.phone}
                  onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
              >
                <Key className="w-4 h-4" />
                <span>Save & Generate Credential</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

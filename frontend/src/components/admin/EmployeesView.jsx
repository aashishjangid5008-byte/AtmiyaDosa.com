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
  Search
} from 'lucide-react';
import { getTranslation } from '../../lib/translations';

export default function EmployeesView({ 
  employees, 
  activity = [], 
  onAddEmployee, 
  onDeleteEmployee, 
  currentLang 
}) {
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' or 'activity'
  const [showModal, setShowModal] = useState(false);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('All');
  const [searchActivity, setSearchActivity] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});

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

  const handleNameChange = (name) => {
    const suggestedUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    setNewEmp(prev => ({
      ...prev,
      name,
      username: prev.username ? prev.username : suggestedUsername
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.password) return;

    onAddEmployee({
      id: `emp_${Date.now()}`,
      name: newEmp.name,
      username: newEmp.username || newEmp.name.toLowerCase().replace(/\s+/g, '_'),
      password: newEmp.password,
      role: newEmp.role,
      phone: newEmp.phone || '+91 98000 00000',
      shift: newEmp.shift,
      active: true,
      createdAt: new Date().toISOString().split('T')[0]
    });

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

  // Filter activities for Section 1.2
  const filteredActivities = activity.filter(act => {
    const matchesStaff = selectedStaffFilter === 'All' || act.employeeName === selectedStaffFilter;
    const matchesSearch = !searchActivity || 
      (act.details && act.details.toLowerCase().includes(searchActivity.toLowerCase())) ||
      (act.tableNumber && String(act.tableNumber).toLowerCase().includes(searchActivity.toLowerCase()));
    return matchesStaff && matchesSearch;
  });

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
                Employee Credentials & Real-Time Activity Tracking
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Generate and delete staff login credentials, and track live cashier payments and table actions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#F3F4F6] p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
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
              className="px-4 py-2.5 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 transition flex items-center space-x-2 shrink-0"
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
          {employees.map(emp => (
            <div 
              key={emp.id} 
              className="bg-white p-5 rounded-3xl border border-[#F3F4F6] shadow-sm hover:border-slate-300 transition space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#F97316] font-black flex items-center justify-center font-heading text-base border border-orange-100 shadow-sm">
                      {emp.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#1F2937] font-heading">{emp.name}</h3>
                      <div className="text-[11px] font-bold text-[#F97316]">{emp.role}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{emp.shift}</div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
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
                        onClick={() => togglePasswordVisibility(emp.id)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        title={visiblePasswords[emp.id] ? "Hide Password" : "Show Password"}
                      >
                        {visiblePasswords[emp.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold">Phone:</span>
                    <span className="font-mono text-slate-700 text-[11px]">{emp.phone}</span>
                  </div>
                </div>
              </div>

              {/* Delete Credential Button (Section 1 of Admin.txt) */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">ID: {emp.id}</span>
                {emp.username !== 'admin' && (
                  <button
                    onClick={() => onDeleteEmployee(emp.id, emp.name)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition border border-rose-200"
                    title="Delete employee credentials when staff member leaves"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Credential</span>
                  </button>
                )}
              </div>
            </div>
          ))}
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

      {/* GENERATE CREDENTIALS MODAL (Section 1 of Admin.txt) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#1F2937] font-heading">Generate Staff Credentials</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anjali Patel"
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
                  placeholder="anjali_pos"
                  value={newEmp.username}
                  onChange={(e) => setNewEmp({ ...newEmp, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Set Password</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. anjali@2026"
                  value={newEmp.password}
                  onChange={(e) => setNewEmp({ ...newEmp, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={newEmp.role}
                    onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#F97316]"
                  >
                    <option value="Cashier & POS Lead">Cashier & POS</option>
                    <option value="Head Chef">Head Chef</option>
                    <option value="Senior Waiter">Senior Waiter</option>
                    <option value="Kitchen Helper">Kitchen Staff</option>
                    <option value="Floor Manager">Floor Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift</label>
                  <select
                    value={newEmp.shift}
                    onChange={(e) => setNewEmp({ ...newEmp, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#F97316]"
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
                className="w-full py-2.5 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 mt-2"
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

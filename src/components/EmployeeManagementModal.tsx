import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  Check,
  X,
  Briefcase,
  DollarSign,
  Award,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Employee, EmployeeRole, EmployeeShift, EmployeeStatus } from '../types/employee';
import { apiClient } from '../services/apiClient';

interface EmployeeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onUpdateEmployees: (employees: Employee[]) => void;
  isAdmin?: boolean;
}

const ROLE_LABELS: Record<EmployeeRole, string> = {
  CNC_MACHINIST: 'CNC Machinist',
  ASSEMBLY_TECH: 'Assembly Technician',
  QC_INSPECTOR: 'QC Metrologist / Inspector',
  MAINTENANCE_ENGINEER: 'Predictive Maintenance Engineer',
  MATERIAL_HANDLER: 'Material Infeed Specialist',
  LINE_SUPERVISOR: 'Production Line Supervisor',
};

const SHIFT_LABELS: Record<EmployeeShift, string> = {
  SHIFT_1_DAY: 'Shift 1: Morning (08:00 - 16:00)',
  SHIFT_2_SWING: 'Shift 2: Swing (16:00 - 00:00)',
  SHIFT_3_NIGHT: 'Shift 3: Night (00:00 - 08:00)',
};

export const EmployeeManagementModal: React.FC<EmployeeManagementModalProps> = ({
  isOpen,
  onClose,
  employees,
  onUpdateEmployees,
  isAdmin = false,
}) => {
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('ALL');

  // Form state for add / edit
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    employeeId: '',
    role: 'CNC_MACHINIST',
    assignedStationId: 'cnc_lathe',
    shift: 'SHIFT_1_DAY',
    skillCertification: '',
    hourlyWage: 35.0,
    efficiencyRating: 1.0,
    status: 'ACTIVE',
  });

  if (!isOpen) return null;

  const handleStartAdd = () => {
    if (!isAdmin) {
      alert('Only System Administrators (Sayandip Mallick, Nilesh Banik, Soumyajit Chakraborty, Chitrayan Biswas) are authorized to add new employees to the plant roster.');
      return;
    }
    setIsAddingNew(true);
    setEditingEmployeeId(null);
    setFormData({
      id: `emp-${Date.now()}`,
      employeeId: `ME-OPR-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      role: 'CNC_MACHINIST',
      assignedStationId: 'cnc_lathe',
      shift: 'SHIFT_1_DAY',
      skillCertification: 'NIMS Machining Certification',
      hourlyWage: 36.0,
      efficiencyRating: 1.0,
      status: 'ACTIVE',
      hireDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleStartEdit = (emp: Employee) => {
    if (!isAdmin) {
      alert('Only System Administrators can edit employee records.');
      return;
    }
    setEditingEmployeeId(emp.id);
    setIsAddingNew(false);
    setFormData({ ...emp });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!formData.name?.trim()) return;

    if (isAddingNew) {
      const newEmp: Employee = {
        id: formData.id || `emp-${Date.now()}`,
        employeeId: formData.employeeId || `ME-OPR-${Math.floor(1000 + Math.random() * 9000)}`,
        name: formData.name.trim(),
        role: (formData.role as EmployeeRole) || 'CNC_MACHINIST',
        assignedStationId: formData.assignedStationId || 'ALL',
        shift: (formData.shift as EmployeeShift) || 'SHIFT_1_DAY',
        skillCertification: formData.skillCertification || 'General Manufacturing Certified',
        hourlyWage: Number(formData.hourlyWage) || 350.0,
        efficiencyRating: Number(formData.efficiencyRating) || 1.0,
        status: (formData.status as EmployeeStatus) || 'ACTIVE',
        hireDate: formData.hireDate || new Date().toISOString().split('T')[0],
      };
      onUpdateEmployees([...employees, newEmp]);
      apiClient.updateEmployee(newEmp.id, newEmp).catch(() => {});
      setIsAddingNew(false);
    } else if (editingEmployeeId) {
      let savedEmp: Employee | null = null;
      const updated = employees.map(emp => {
        if (emp.id === editingEmployeeId) {
          savedEmp = {
            ...emp,
            ...formData,
            name: formData.name?.trim() || emp.name,
            hourlyWage: Number(formData.hourlyWage) || emp.hourlyWage,
            efficiencyRating: Number(formData.efficiencyRating) || emp.efficiencyRating,
          } as Employee;
          return savedEmp;
        }
        return emp;
      });
      onUpdateEmployees(updated);
      if (savedEmp) {
        apiClient.updateEmployee((savedEmp as Employee).id, savedEmp as Employee).catch(() => {});
      }
      setEditingEmployeeId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) {
      alert('Only System Administrators can remove employees.');
      return;
    }
    if (confirm('Are you sure you want to remove this employee from the plant roster?')) {
      onUpdateEmployees(employees.filter(e => e.id !== id));
      if (editingEmployeeId === id) setEditingEmployeeId(null);
    }
  };

  const filteredEmployees = employees.filter(e => {
    if (filterRole === 'ALL') return true;
    return e.role === filterRole;
  });

  const totalHourlyCost = employees
    .filter(e => e.status === 'ACTIVE')
    .reduce((sum, e) => sum + e.hourlyWage, 0);

  const activeCount = employees.filter(e => e.status === 'ACTIVE').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white rounded-xl shadow">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Workforce & Employee Setup
                <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full">
                  Labor Allocation & Payroll
                </span>
                {!isAdmin && (
                  <span className="text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full">
                    Read-Only (Admin Restricted)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Configure plant technicians, machinists, QC inspectors, wage rates, and station assignments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={handleStartAdd}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overview Stat Badges */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Total Workforce:</span>
              <strong className="text-white font-mono text-sm">{employees.length} Personnel</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Active on Shift:</span>
              <strong className="text-emerald-400 font-mono text-sm">{activeCount} Active</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Active Labor Payroll Run-rate:</span>
              <strong className="text-cyan-300 font-mono text-sm">₹{totalHourlyCost.toFixed(2)}/hr</strong>
            </div>
          </div>

          {/* Filter dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Filter Role:</span>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 font-medium"
            >
              <option value="ALL">All Roles ({employees.length})</option>
              <option value="CNC_MACHINIST">CNC Machinists</option>
              <option value="ASSEMBLY_TECH">Assembly Technicians</option>
              <option value="QC_INSPECTOR">QC Metrologists</option>
              <option value="MAINTENANCE_ENGINEER">Maintenance</option>
              <option value="LINE_SUPERVISOR">Supervisors</option>
            </select>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Add / Edit Form Drawer */}
          {(isAddingNew || editingEmployeeId) && (
            <form
              onSubmit={handleSaveForm}
              className="bg-slate-950/90 border border-cyan-500/50 rounded-xl p-5 shadow-xl space-y-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  {isAddingNew ? 'Add New Employee to Plant' : `Edit Details for ${formData.name}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingEmployeeId(null);
                  }}
                  className="text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jessica Taylor"
                    value={formData.name || ''}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="EMP-1044"
                    value={formData.employeeId || ''}
                    onChange={e => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Operational Role *</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as EmployeeRole }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  >
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Hourly Wage (₹/hr) *</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-500 font-mono">₹</span>
                    <input
                      type="number"
                      step="5"
                      min="100"
                      max="2500"
                      value={formData.hourlyWage || 350}
                      onChange={e => setFormData(prev => ({ ...prev, hourlyWage: Number(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Assigned Station / Line</label>
                  <select
                    value={formData.assignedStationId}
                    onChange={e => setFormData(prev => ({ ...prev, assignedStationId: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                  >
                    <option value="ALL">Plant-Wide (Float / Supervisor)</option>
                    <option value="cnc_lathe">CNC Lathe (RM1 Line)</option>
                    <option value="cnc_milling">CNC Milling (RM2 Line)</option>
                    <option value="cnc_shaping">CNC Shaping (RM3 Line)</option>
                    <option value="qc_rm1">Quality Control RM1</option>
                    <option value="qc_rm2">Quality Control RM2</option>
                    <option value="qc_rm3">Quality Control RM3</option>
                    <option value="final_assembly">Final Assembly Station</option>
                    <option value="packaging">Packaging & Shipping</option>
                    <option value="truck_rm1">Raw Material Infeed RM1</option>
                    <option value="truck_rm2">Raw Material Infeed RM2</option>
                    <option value="truck_rm3">Raw Material Infeed RM3</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Shift Assignment</label>
                  <select
                    value={formData.shift}
                    onChange={e => setFormData(prev => ({ ...prev, shift: e.target.value as EmployeeShift }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  >
                    {Object.entries(SHIFT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Skill Certification / Credentials</label>
                  <input
                    type="text"
                    placeholder="e.g. NIMS CNC Level II, ASQ CQI, Six Sigma Green Belt"
                    value={formData.skillCertification || ''}
                    onChange={e => setFormData(prev => ({ ...prev, skillCertification: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as EmployeeStatus }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  >
                    <option value="ACTIVE">ACTIVE (On Station)</option>
                    <option value="ON_BREAK">ON_BREAK (Lunch/Rest)</option>
                    <option value="TRAINING">TRAINING</option>
                    <option value="OFF_SHIFT">OFF_SHIFT</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingEmployeeId(null);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isAddingNew ? 'Create Employee' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Employee Roster Table */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-4">Employee</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Assigned Station</th>
                    <th className="py-2.5 px-4">Shift</th>
                    <th className="py-2.5 px-4">Hourly Wage</th>
                    <th className="py-2.5 px-4">Certification</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-900/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{emp.employeeId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-200">
                          {ROLE_LABELS[emp.role] || emp.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800">
                          {emp.assignedStationId}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-400">
                        {emp.shift === 'SHIFT_1_DAY' ? 'Day (1st)' : emp.shift === 'SHIFT_2_SWING' ? 'Swing (2nd)' : 'Night (3rd)'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        ₹{emp.hourlyWage.toFixed(2)}/hr
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-400 max-w-xs truncate" title={emp.skillCertification}>
                        <div className="flex items-center gap-1">
                          <Award className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{emp.skillCertification}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            emp.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : emp.status === 'ON_BREAK'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEdit(emp)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded transition"
                              title="Edit employee details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(emp.id)}
                              className="p-1.5 bg-slate-800 hover:bg-rose-950 text-rose-400 rounded transition"
                              title="Remove from roster"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Protected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No employees found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-800/80 border-t border-slate-700 flex justify-between items-center text-xs">
          <span className="text-slate-400">
            Wages dynamically calculate into the <strong>Per-Unit Economics & Finance</strong> cost stack.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Sliders,
  RotateCcw,
  Play,
  Pause,
  Calendar,
  AlertTriangle,
  UserCheck,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import { AdminAuditLog } from '../types/auth';
import { apiClient } from '../services/apiClient';

interface AuditTrailViewProps {
  initialLogs?: AdminAuditLog[];
  onRefresh?: () => void;
  title?: string;
  className?: string;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  initialLogs,
  onRefresh,
  title = 'System Audit Trail & Governance Log',
  className = '',
}) => {
  const [logs, setLogs] = useState<AdminAuditLog[]>(initialLogs || []);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const fresh = await apiClient.getAdminAuditLogs();
      setLogs(fresh || []);
      if (onRefresh) onRefresh();
    } catch (e) {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialLogs && initialLogs.length > 0) {
      setLogs(initialLogs);
    } else {
      fetchLogs();
    }
  }, [initialLogs]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'SIMULATION_START':
        return {
          icon: <Play className="w-3 h-3 text-emerald-400" />,
          label: 'SIMULATION START',
          bg: 'bg-emerald-950/80 border-emerald-800 text-emerald-300',
        };
      case 'SIMULATION_PAUSE':
        return {
          icon: <Pause className="w-3 h-3 text-amber-400" />,
          label: 'SIMULATION PAUSE',
          bg: 'bg-amber-950/80 border-amber-800 text-amber-300',
        };
      case 'SIMULATION_RESET':
        return {
          icon: <RotateCcw className="w-3 h-3 text-rose-400" />,
          label: 'SYSTEM RESET',
          bg: 'bg-rose-950/80 border-rose-800 text-rose-300',
        };
      case 'ADVANCE_DAY':
        return {
          icon: <Calendar className="w-3 h-3 text-indigo-400" />,
          label: 'ADVANCE DAY',
          bg: 'bg-indigo-950/80 border-indigo-800 text-indigo-300',
        };
      case 'PARAMETER_CHANGE_APPROVED':
      case 'PARAMETER_MODIFIED':
        return {
          icon: <Sliders className="w-3 h-3 text-cyan-400" />,
          label: 'PARAMETER CHANGE',
          bg: 'bg-cyan-950/80 border-cyan-800 text-cyan-300',
        };
      case 'USER_APPROVED':
        return {
          icon: <UserCheck className="w-3 h-3 text-emerald-400" />,
          label: 'USER APPROVED',
          bg: 'bg-emerald-950/80 border-emerald-800 text-emerald-300',
        };
      case 'USER_REJECTED':
        return {
          icon: <AlertTriangle className="w-3 h-3 text-rose-400" />,
          label: 'USER REJECTED',
          bg: 'bg-rose-950/80 border-rose-800 text-rose-300',
        };
      case 'EMPLOYEE_UPDATED':
        return {
          icon: <User className="w-3 h-3 text-purple-400" />,
          label: 'EMPLOYEE UPDATED',
          bg: 'bg-purple-950/80 border-purple-800 text-purple-300',
        };
      case 'PASSWORD_RESET_APPROVED':
        return {
          icon: <FileCheck className="w-3 h-3 text-amber-400" />,
          label: 'PASSWORD RESET',
          bg: 'bg-amber-950/80 border-amber-800 text-amber-300',
        };
      default:
        return {
          icon: <ShieldCheck className="w-3 h-3 text-slate-400" />,
          label: action,
          bg: 'bg-slate-900 border-slate-800 text-slate-300',
        };
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (log.adminEmail && log.adminEmail.toLowerCase().includes(term)) ||
      (log.adminBadge && log.adminBadge.toLowerCase().includes(term)) ||
      (log.details && log.details.toLowerCase().includes(term)) ||
      (log.targetId && log.targetId.toLowerCase().includes(term)) ||
      (log.action && log.action.toLowerCase().includes(term))
    );
  });

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-950/80 text-indigo-400 border border-indigo-800 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{title}</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-1.5 py-0.2 rounded">
                Read-Only
              </span>
            </h4>
            <span className="text-[10px] text-slate-400">
              Immutable forensic log of admin actions, parameter updates & asset controls
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 font-medium focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Actions ({logs.length})</option>
            <option value="SIMULATION_START">Starts</option>
            <option value="SIMULATION_PAUSE">Pauses</option>
            <option value="SIMULATION_RESET">Resets</option>
            <option value="ADVANCE_DAY">Day Advances</option>
            <option value="PARAMETER_CHANGE_APPROVED">Parameter Approvals</option>
            <option value="USER_APPROVED">User Approvals</option>
            <option value="EMPLOYEE_UPDATED">Employee Updates</option>
          </select>

          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Refresh Audit Trail"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/80">
            {isLoading ? 'Loading audit records...' : 'No audit records match the current filters.'}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getActionBadge(log.action);
            return (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${badge.bg}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                    {(log.targetName || log.targetId) && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Target: <strong className="text-slate-300">{log.targetName || log.targetId}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{log.timestampStr || new Date(log.timestamp || Date.now()).toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-200 leading-relaxed font-sans">
                  {log.details}
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900/80 flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-cyan-400" />
                    <span>Admin Actor:</span>
                    <strong className="text-slate-200">{log.adminEmail || 'System Admin'}</strong>
                    {log.adminBadge && (
                      <span className="text-slate-500 font-mono">({log.adminBadge})</span>
                    )}
                  </div>
                  <span className="font-mono text-[9px] text-slate-600">ID: {log.id}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

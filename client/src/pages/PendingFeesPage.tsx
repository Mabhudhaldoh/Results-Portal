import { useState, useEffect } from 'react';
import api from '../services/api';
import { DollarSign, AlertTriangle, Search, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PendingFeesPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const automaticAccessThreshold = 100;

  const fetchData = async () => {
    try {
      const res = await api.get('/headmaster/pending-fees');
      setPending(res.data.pending || []);
      // The access threshold is fixed at $100; individual exceptions require finance approval.
    } catch { }
    setLoading(false);
  };

  const setHeadmasterOverride = async (student: any, enabled: boolean) => {
    try {
      await api.patch(`/headmaster/${student.studentId}/results-access-override`, { enabled });
      toast.success(enabled ? 'Results access granted to this student' : 'Special results access revoked');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update access');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = pending.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.firstName?.toLowerCase().includes(q) || s.lastName?.toLowerCase().includes(q) || s.admissionNumber?.toLowerCase().includes(q);
  });

  const totalOutstanding = filtered.reduce((sum, s) => sum + (s.feesBalance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertTriangle size={24} className="text-amber-500" /> Pending Fees
        </h1>
        <div className="text-sm text-gray-500">
          Balances below <span className="font-bold text-mlk-red">$100</span> qualify automatically
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Students with Balance</p>
          <p className="text-2xl font-bold text-amber-600">{filtered.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Outstanding</p>
          <p className="text-2xl font-bold text-red-600">${totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Results Blocked</p>
          <p className="text-2xl font-bold text-red-600">{filtered.filter(s => !s.canViewResults).length}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="input-field pl-10" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Adm No.</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3 text-right">Required</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-right">Paid %</th>
                <th className="px-4 py-3">Results Access</th>
                <th className="px-4 py-3">Headmaster Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(9)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">No pending fees found</td></tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm font-mono">{s.admissionNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium">{s.firstName} {s.lastName}</td>
                    <td className="px-4 py-3 text-sm">{s.className?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">${(s.feesRequired || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">${(s.feesPaid || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-red-600">${(s.feesBalance || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div className={`h-2 rounded-full ${s.canViewResults ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(s.paidPercentage, 100)}%` }}></div>
                        </div>
                        <span className={`text-xs font-medium ${s.canViewResults ? 'text-green-600' : 'text-red-600'}`}>{s.paidPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.canViewResults ? (
                        <span className="badge badge-success flex items-center gap-1 w-fit"><Eye size={14} /> Allowed</span>
                      ) : (
                        <span className="badge badge-danger flex items-center gap-1 w-fit"><EyeOff size={14} /> Blocked</span>
                      )}
                      {s.financeResultsAccessApproved && !s.headmasterResultsAccessOverride && <p className="text-xs text-amber-600 mt-1">Finance approved</p>}
                    </td>
                    <td className="px-4 py-3">
                      {s.feesBalance < automaticAccessThreshold ? (
                        <span className="text-xs text-gray-500">Automatic access</span>
                      ) : s.financeResultsAccessApproved ? (
                        <button onClick={() => setHeadmasterOverride(s, !s.headmasterResultsAccessOverride)}
                          className={`text-xs px-3 py-2 rounded-lg font-semibold inline-flex items-center gap-1 ${s.headmasterResultsAccessOverride ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}>
                          {s.headmasterResultsAccessOverride ? <><EyeOff size={14} /> Revoke access</> : <><ShieldCheck size={14} /> Grant access</>}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">Waiting for finance</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

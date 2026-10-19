import { useState, useEffect } from 'react';
import api from '../services/api';
import { DollarSign, AlertTriangle, Search, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PendingFeesPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feesViewPercentage, setFeesViewPercentage] = useState(50);

  const fetchData = async () => {
    try {
      const res = await api.get('/headmaster/pending-fees');
      setPending(res.data.pending || []);
      setFeesViewPercentage(res.data.feesViewPercentage || 50);
    } catch { }
    setLoading(false);
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
          Students must pay <span className="font-bold text-mlk-red">{feesViewPercentage}%</span> to view results
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No pending fees found</td></tr>
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
                          <div className={`h-2 rounded-full ${s.paidPercentage >= feesViewPercentage ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(s.paidPercentage, 100)}%` }}></div>
                        </div>
                        <span className={`text-xs font-medium ${s.paidPercentage >= feesViewPercentage ? 'text-green-600' : 'text-red-600'}`}>{s.paidPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.canViewResults ? (
                        <span className="badge badge-success flex items-center gap-1 w-fit"><Eye size={14} /> Allowed</span>
                      ) : (
                        <span className="badge badge-danger flex items-center gap-1 w-fit"><EyeOff size={14} /> Blocked</span>
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

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Bell, Search, User, Moon, Sun, Lock } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function Navbar() {
  const { user, updateUser } = useAuth();
  const { dark, toggle } = useTheme();
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) return toast.error('Fill in all fields');
    if (pwForm.newPw !== pwForm.confirm) return toast.error('New passwords do not match');
    if (pwForm.newPw.length < 6) return toast.error('Password must be at least 6 characters');
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      toast.success('Password changed successfully');
      setShowChangePassword(false);
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <>
    <header className="app-navbar h-16 backdrop-blur border-b shadow-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1 ml-12 lg:ml-0">
        <div className="relative hidden md:flex flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search students, teachers, results..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-mlk-blue outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={toggle} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <div className="w-8 h-8 bg-mlk-blue rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </button>
          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button onClick={() => { setShowProfile(false); setShowChangePassword(true); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                <Lock size={16} /> Change Password
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    <AnimatePresence>
      {showChangePassword && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowChangePassword(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Change Password</h2>
              <button onClick={() => setShowChangePassword(false)} className="text-gray-400 hover:text-gray-600"><span className="sr-only">Close</span>&#10005;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input type="password" className="input-field" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} placeholder="Enter current password" />
              </div>
              <div>
                <label className="label">New Password</label>
                <input type="password" className="input-field" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} placeholder="Enter new password" />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input type="password" className="input-field" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="Confirm new password" />
              </div>
              <button onClick={handleChangePassword} disabled={pwLoading} className="btn-primary w-full justify-center">
                {pwLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

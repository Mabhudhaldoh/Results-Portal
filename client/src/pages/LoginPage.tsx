import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Shield } from 'lucide-react';

export default function LoginPage() {
  const { login, loginStudent } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'staff' | 'student'>('staff');
  const [email, setEmail] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'staff') {
        await login(email, password);
      } else {
        await loginStudent(admissionNumber, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mlk-red via-red-800 to-mlk-blue px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
            <img src="/school_logo.png" alt="MLK Logo" className="w-full h-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex'; }} />
            <span className="text-mlk-red font-black text-3xl hidden items-center justify-center">MLK</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Martin Luther King Jnr.</h1>
          <p className="text-red-200 text-sm">High School - Online Results System</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6">
            <button
              onClick={() => setTab('staff')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                tab === 'staff' ? 'bg-white dark:bg-gray-700 shadow text-mlk-red' : 'text-gray-500'
              }`}
            >
              <Shield size={16} /> Staff Login
            </button>
            <button
              onClick={() => setTab('student')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                tab === 'student' ? 'bg-white dark:bg-gray-700 shadow text-mlk-blue' : 'text-gray-500'
              }`}
            >
              <GraduationCap size={16} /> Student
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'staff' ? (
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input-field" placeholder="admin@mlk.eportal.com" required
                />
              </div>
            ) : (
              <div>
                <label className="label">Admission Number</label>
                <input
                  type="text" value={admissionNumber} onChange={e => setAdmissionNumber(e.target.value)}
                  className="input-field" placeholder="MLK-000-000" required
                />
              </div>
            )}

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10" placeholder="Enter password" required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-mlk-red text-white py-2.5 rounded-lg font-semibold hover:bg-red-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-500">
            <p className="font-medium mb-1">Welcome to the Online Results Portal</p>
            <p>This portal allows students, parents and teachers to access academic information in a safe and convenient manner.</p>
            <p>📖 Cambridge | ZIMSEC | HEXCO</p>
            <p>Keep your username and password confidential</p>
            <p>Contact the school ICT Office if you experience login difficulties.</p>
            <p>Created by: Mr President</p>
          </div>
        </div>
      </div>
    </div>
  );
}

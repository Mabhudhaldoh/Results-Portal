import { useAuth } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import { School, FileText } from 'lucide-react';

export default function MyClassesPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Classes</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NavLink to="/enter-marks" className="card hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-12 h-12 bg-mlk-red rounded-xl flex items-center justify-center"><FileText size={22} className="text-white" /></div>
          <div>
            <h3 className="font-bold">Enter Marks</h3>
            <p className="text-sm text-gray-500">Enter marks for your classes</p>
          </div>
        </NavLink>
        <NavLink to="/my-results" className="card hover:shadow-md transition-shadow flex items-center gap-4">
          <div className="w-12 h-12 bg-mlk-blue rounded-xl flex items-center justify-center"><School size={22} className="text-white" /></div>
          <div>
            <h3 className="font-bold">View Results</h3>
            <p className="text-sm text-gray-500">See submitted results</p>
          </div>
        </NavLink>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, School, FileText,
  BarChart3, Settings, LogOut, Moon, Sun, Menu, X, Bell, Search,
  ClipboardList, Award, Building2, ChevronDown, DollarSign, UserPlus,
  ShieldCheck, MessageSquare, Download, CalendarCheck, Megaphone,
  CalendarDays, UserCog
} from 'lucide-react';

const adminLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/students', icon: GraduationCap, label: 'Students' },
  { to: '/teachers', icon: Users, label: 'Teachers' },
  { to: '/classes', icon: School, label: 'Classes' },
  { to: '/subjects', icon: BookOpen, label: 'Subjects' },
  { to: '/departments', icon: Building2, label: 'Departments' },
  { to: '/results', icon: ClipboardList, label: 'Results' },
  { to: '/grading', icon: Award, label: 'Grading' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/report-card', icon: Award, label: 'Report Cards' },
  { to: '/bulk-reports', icon: Download, label: 'Bulk Reports' },
  { to: '/academic', icon: School, label: 'Academic Years' },
  { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
  { to: '/fees', icon: DollarSign, label: 'Fees Management' },
  { to: '/assign-teachers', icon: UserPlus, label: 'Assign Teachers' },
  { to: '/manage-users', icon: UserCog, label: 'Manage Accounts' },
  { to: '/assignments', icon: ClipboardList, label: 'Assignments' },
  { to: '/resources', icon: BookOpen, label: 'Learning Resources' },
  { to: '/notices', icon: Megaphone, label: 'Notices' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const teacherLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/my-classes', icon: School, label: 'My Classes' },
  { to: '/enter-marks', icon: ClipboardList, label: 'Enter Marks' },
  { to: '/my-results', icon: FileText, label: 'My Results' },
  { to: '/assignments', icon: ClipboardList, label: 'Homework & Assignments' },
  { to: '/resources', icon: BookOpen, label: 'Learning Resources' },
];

const studentLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/my-results', icon: FileText, label: 'My Results' },
  { to: '/report-card', icon: Award, label: 'Report Card' },
  { to: '/assignments', icon: ClipboardList, label: 'Homework & Assignments' },
  { to: '/resources', icon: BookOpen, label: 'Learning Resources' },
  { to: '/notices', icon: Megaphone, label: 'Notices' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
];

const headmasterLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/students', icon: GraduationCap, label: 'All Students' },
  { to: '/results', icon: ClipboardList, label: 'Results' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/pending-fees', icon: DollarSign, label: 'Pending Fees' },
  { to: '/approvals', icon: ShieldCheck, label: 'Approvals' },
  { to: '/feedback', icon: MessageSquare, label: 'Feedback' },
  { to: '/bulk-reports', icon: Download, label: 'Bulk Reports' },
  { to: '/assignments', icon: ClipboardList, label: 'Assignments' },
  { to: '/resources', icon: BookOpen, label: 'Learning Resources' },
  { to: '/notices', icon: Megaphone, label: 'Notices' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
];

const financeLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/fees', icon: DollarSign, label: 'Fees Management' },
  { to: '/finance-block', icon: ShieldCheck, label: 'Result Access Control' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/notices', icon: Megaphone, label: 'Notices' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = user?.role === 'admin' ? adminLinks : user?.role === 'teacher' ? teacherLinks : user?.role === 'headmaster' ? headmasterLinks : user?.role === 'finance' ? financeLinks : studentLinks;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg border border-[#d4af37] p-0.5 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
            <img src="/school_logo.png" alt="MLK" className="w-full h-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex'; }} />
            <span className="text-white font-bold text-lg hidden items-center justify-center">M</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-white truncate">MLK Family</h1>
              <p className="text-xs text-slate-400 truncate">Results System</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/dashboard'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
            }
          >
            <link.icon size={20} />
            {!collapsed && <span>{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700 bg-slate-950">
        <button onClick={toggle} className={`sidebar-link w-full ${collapsed ? 'justify-center px-2' : ''}`}>
          {dark ? <Sun size={20} /> : <Moon size={20} />}
          {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button onClick={() => { logout(); navigate('/login'); }} className={`sidebar-link w-full text-red-500 hover:text-red-600 ${collapsed ? 'justify-center px-2' : ''}`}>
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div className="w-64 h-full bg-slate-950 border-r border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-1">
              <X size={20} />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      <aside className={`hidden lg:block ${collapsed ? 'w-[70px]' : 'w-64'} bg-slate-950 border-r border-slate-800 shadow-xl transition-all duration-300 flex-shrink-0`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-4 -right-3 w-6 h-6 bg-slate-700 text-white rounded-full flex items-center justify-center text-xs hover:bg-mlk-red shadow-md hidden lg:flex"
        >
          {collapsed ? '>' : '<'}
        </button>
      </aside>
    </>
  );
}

import { NavLink, Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-bold text-brand">Sigma Sales System</div>
          <nav className="flex gap-2">
            <NavLink to="/" end className={navLinkClass}>Import</NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
            <NavLink to="/history" className={navLinkClass}>History</NavLink>
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </div>
  );
}

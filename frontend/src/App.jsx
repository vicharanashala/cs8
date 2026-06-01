import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { AuthProvider, useAuth } from './pages/LoginPage';
import { ToastProvider } from './components/common/Toast';
import FAQPage from './pages/FAQPage';
import RaiseQueryPage from './pages/RaiseQueryPage';
import QueryResolvePage from './pages/QueryResolvePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import LeaderboardPage from './pages/LeaderboardPage';
import FAQSearchPage from './pages/FAQSearchPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
// ── Theme Context ────────────────────────────────────────────────────────────
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('faq_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem('faq_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// ── NavBar ───────────────────────────────────────────────────────────────────
function NavBar() {
  const { admin, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`);
      setSearchQ('');
    }
  };

  return (
    <nav className="navbar">
      <a href="/" className="navbar-brand"><span>❓</span> <span>FAQ</span><span>Hub</span></a>
      <ul className="navbar-links">
        <li><NavLink to="/" end>FAQ</NavLink></li>
        <li><NavLink to="/raise">Raise Query</NavLink></li>
        <li><NavLink to="/resolve">Resolve</NavLink></li>
        {admin ? (
          <>
            <li><NavLink to="/admin">⚙️ Admin</NavLink></li>
            <li><NavLink to="/admin/analytics">📊 Analytics</NavLink></li>
            <li><button onClick={() => { logout(); navigate('/login'); }} className="btn btn-ghost btn-sm">Logout</button></li>
          </>
        ) : (
          <>
            <li><NavLink to="/login" className="btn-admin">🔐 Admin Login</NavLink></li>
          </>
        )}
      </ul>

      {/* Global semantic search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', marginLeft: 'auto', marginRight: '0.5rem' }}>
        <input
          type="search"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="🔍 Search…"
          aria-label="Global search"
          style={{
            fontSize: '0.82rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            background: 'var(--surface-secondary)',
            color: 'var(--text)',
            width: '180px',
            outline: 'none',
          }}
        />
      </form>

      {/* Theme toggle */}
      <button
        className="theme-toggle"
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
        <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </span>
      </button>
    </nav>
  );
}

// ── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { admin } = useAuth();
  return admin ? children : <Navigate to="/login" replace />;
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <NavBar />
            <div className="main-content">
              <Routes>
            <Route path="/"               element={<FAQPage />} />
            <Route path="/raise"          element={<RaiseQueryPage />} />
                <Route path="/resolve"        element={<QueryResolvePage />} />
                <Route path="/login"          element={<LoginPage />} />
                <Route path="/search"         element={<FAQSearchPage />} />
                <Route path="/faq/:id"        element={<FAQPage />} />
                <Route path="/admin"          element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
                <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalyticsPage /></ProtectedRoute>} />
                <Route path="/leaderboard"    element={<LeaderboardPage />} />
              </Routes>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
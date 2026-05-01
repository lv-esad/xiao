import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { Activity, Wallet, Bell, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Alerts from './pages/Alerts';

const PrivateRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div>Loading...</div>;
    return user ? children : <Navigate to="/login" />;
};

const BottomNav = () => {
    const location = useLocation();
    const { logout } = useContext(AuthContext);
    const { t } = useTranslation();
    
    return (
        <nav className="bottom-nav">
            <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
                <Activity size={24} />
                <span>{t('app.market')}</span>
            </Link>
            <Link to="/portfolio" className={`nav-item ${location.pathname === '/portfolio' ? 'active' : ''}`}>
                <Wallet size={24} />
                <span>{t('app.portfolio')}</span>
            </Link>
            <Link to="/alerts" className={`nav-item ${location.pathname === '/alerts' ? 'active' : ''}`}>
                <Bell size={24} />
                <span>{t('app.alerts')}</span>
            </Link>
            <button onClick={logout} className="nav-item" style={{background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit'}}>
                <LogOut size={24} />
                <span>{t('app.logout')}</span>
            </button>
        </nav>
    );
};

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const toggleLang = () => {
        i18n.changeLanguage(i18n.language === 'fr' ? 'zh' : 'fr');
    };
    return (
        <button onClick={toggleLang} style={{
            background: 'var(--color-accent)', color: '#ffffff',
            border: 'none', borderRadius: '20px', padding: '8px 16px', 
            cursor: 'pointer', fontWeight: 'bold',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
        }}>
            {i18n.language === 'fr' ? '🇨🇳 Passer en Chinois' : '🇫🇷 Passer en Français'}
        </button>
    );
};

const AppContent = () => {
    const { user, loading } = useContext(AuthContext);
    const { t } = useTranslation();

    if (loading) return <div style={{padding: '2rem', textAlign: 'center'}}>{t('app.loading')}</div>;

    return (
        <>
            <div className="app-container">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <LanguageSwitcher />
                </div>
                <Routes>
                    <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                    <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/portfolio" element={<PrivateRoute><Portfolio /></PrivateRoute>} />
                    <Route path="/alerts" element={<PrivateRoute><Alerts /></PrivateRoute>} />
                </Routes>
            </div>
            {user && <BottomNav />}
        </>
    );
};

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;

import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Login = () => {
    const { login, register } = useContext(AuthContext);
    const { t } = useTranslation();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await login(username, password);
            } else {
                await register(username, password);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Une erreur est survenue');
        }
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
            <div className="card">
                <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>{t('login.title')}</h1>
                
                {error && <div style={{ color: 'var(--color-down)', marginBottom: '1rem', textAlign: 'center' }}>{t('login.errorOccurred')}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>{t('login.username')}</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <label>{t('login.password')}</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        {isLogin ? t('login.login') : t('login.register')}
                    </button>
                </form>
                
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <span className="text-muted">
                        {isLogin ? t('login.noAccount') : t('login.hasAccount')}
                    </span>
                    <button 
                        onClick={() => setIsLogin(!isLogin)} 
                        style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {isLogin ? t('login.createAccount') : t('login.login')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;

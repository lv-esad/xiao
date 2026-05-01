import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BellRing, Info, Trash2, Plus, ArrowRightLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Alerts = () => {
    const { t } = useTranslation();
    const [rate, setRate] = useState(null);
    const [insights, setInsights] = useState({ eurToRmb: null, rmbToEur: null });
    const [alerts, setAlerts] = useState([]);
    
    // Form state
    const [condition, setCondition] = useState('GREATER_THAN');
    const [threshold, setThreshold] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const rateRes = await axios.get('/api/rates/latest');
                const currentRate = rateRes.data.rates.CNY;
                setRate(currentRate);

                const histRes = await axios.get('/api/rates/history');
                const ratesData = histRes.data.rates;
                const values = Object.values(ratesData).map(r => r.CNY);
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                
                // EUR to RMB (We want high rate)
                let eurToRmb;
                if (currentRate > avg + 0.05) {
                    eurToRmb = { type: 'excellent', key: 'eurStrong' };
                } else if (currentRate < avg - 0.05) {
                    eurToRmb = { type: 'poor', key: 'eurWeak' };
                } else {
                    eurToRmb = { type: 'neutral', key: 'stable' };
                }

                // RMB to EUR (We want low rate)
                let rmbToEur;
                if (currentRate < avg - 0.05) {
                    rmbToEur = { type: 'excellent', key: 'rmbStrong' };
                } else if (currentRate > avg + 0.05) {
                    rmbToEur = { type: 'poor', key: 'rmbWeak' };
                } else {
                    rmbToEur = { type: 'neutral', key: 'stable' };
                }

                setInsights({ eurToRmb, rmbToEur });

                // Fetch user alerts
                const alertsRes = await axios.get('/api/alerts');
                setAlerts(alertsRes.data);

            } catch (error) {
                console.error("Error fetching data", error);
            }
        };
        fetchInitialData();
    }, []);

    const enablePushNotifications = async () => {
        if (!('Notification' in window)) {
            alert(t('alerts.notSupported'));
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            alert(t('alerts.pushEnabled'));
        } else {
            alert(t('alerts.pushDenied'));
        }
    };

    const handleAddAlert = async (e) => {
        e.preventDefault();
        if (!threshold) return;
        setLoading(true);
        try {
            const res = await axios.post('/api/alerts', { condition, threshold: parseFloat(threshold) });
            setAlerts([...alerts, { id: res.data.id, condition, threshold: res.data.threshold }]);
            setThreshold('');
        } catch (error) {
            console.error(error);
            alert(t('alerts.addError'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAlert = async (id) => {
        try {
            await axios.delete(`/api/alerts/${id}`);
            setAlerts(alerts.filter(a => a.id !== id));
        } catch (error) {
            console.error(error);
            alert(t('alerts.deleteError'));
        }
    };

    return (
        <div className="animate-fade-in">
            <h1>{t('alerts.title')}</h1>

            <div className="card">
                <h2>{t('alerts.advisor')}</h2>
                
                {/* EUR -> RMB */}
                {insights.eurToRmb ? (
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        borderRadius: '8px',
                        backgroundColor: insights.eurToRmb.type === 'excellent' ? 'rgba(16, 185, 129, 0.1)' : 
                                       insights.eurToRmb.type === 'poor' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-light)',
                        borderLeft: `4px solid ${insights.eurToRmb.type === 'excellent' ? 'var(--color-up)' : 
                                                insights.eurToRmb.type === 'poor' ? 'var(--color-down)' : 'var(--color-neutral)'}`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            <ArrowRightLeft size={16} /> {t('alerts.eurToRmb')}
                        </div>
                        <p className="text-muted" style={{ lineHeight: '1.5' }}>{t(`alerts.${insights.eurToRmb.key}`)}</p>
                    </div>
                ) : <p>{t('alerts.analyzing')}</p>}

                {/* RMB -> EUR */}
                {insights.rmbToEur ? (
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        borderRadius: '8px',
                        backgroundColor: insights.rmbToEur.type === 'excellent' ? 'rgba(16, 185, 129, 0.1)' : 
                                       insights.rmbToEur.type === 'poor' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-light)',
                        borderLeft: `4px solid ${insights.rmbToEur.type === 'excellent' ? 'var(--color-up)' : 
                                                insights.rmbToEur.type === 'poor' ? 'var(--color-down)' : 'var(--color-neutral)'}`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            <ArrowRightLeft size={16} /> {t('alerts.rmbToEur')}
                        </div>
                        <p className="text-muted" style={{ lineHeight: '1.5' }}>{t(`alerts.${insights.rmbToEur.key}`)}</p>
                    </div>
                ) : null}
            </div>

            <div className="card">
                <h2>{t('alerts.myAlerts')}</h2>
                <p className="text-muted" style={{ marginBottom: '1rem' }}>
                    {t('alerts.notifyWhen')} {rate ? rate.toFixed(4) : '---'}
                </p>

                <form onSubmit={handleAddAlert} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                    <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>{t('alerts.condition')}</label>
                        <select 
                            value={condition} 
                            onChange={(e) => setCondition(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-color)', color: 'white', border: '1px solid var(--surface-light)' }}
                        >
                            <option value="GREATER_THAN">{t('alerts.greaterThan')}</option>
                            <option value="LESS_THAN">{t('alerts.lessThan')}</option>
                        </select>
                    </div>
                    <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>{t('alerts.target')}</label>
                        <input 
                            type="number" 
                            step="0.01"
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                            placeholder={t('alerts.targetPlaceholder')}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto', padding: '0.75rem' }}>
                        <Plus size={20} />
                    </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {alerts.length === 0 ? (
                        <div className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>{t('alerts.noAlerts')}</div>
                    ) : (
                        alerts.map(a => (
                            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--surface-light)' }}>
                                <div>
                                    {t('alerts.alertMeIf')} <strong style={{ color: a.condition === 'GREATER_THAN' ? 'var(--color-up)' : 'var(--color-down)' }}>
                                        {a.condition === 'GREATER_THAN' ? '>' : '<'} {a.threshold} RMB
                                    </strong>
                                </div>
                                <button onClick={() => handleDeleteAlert(a.id)} style={{ background: 'none', border: 'none', color: 'var(--color-down)', cursor: 'pointer' }}>
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="card">
                <h2>{t('alerts.pushIos')}</h2>
                <button className="btn" onClick={enablePushNotifications} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <BellRing size={20} />
                    {t('alerts.enablePush')}
                </button>
            </div>
        </div>
    );
};

export default Alerts;

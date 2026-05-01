import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Minus, TrendingUp, TrendingDown, Clock, Edit2, Trash2, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Portfolio = () => {
    const { t, i18n } = useTranslation();
    const [rate, setRate] = useState(null);
    const [historyRates, setHistoryRates] = useState({});
    const [portfolio, setPortfolio] = useState({ eur_balance: 0, rmb_balance: 0 });
    const [transactions, setTransactions] = useState([]);
    
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('EUR');
    const [type, setType] = useState('DEPOSIT');
    const [loading, setLoading] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ type: 'DEPOSIT', currency: 'EUR', amount: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const rateRes = await axios.get('/api/rates/latest');
            const currentRate = rateRes.data?.rates?.CNY;
            if (currentRate) setRate(currentRate);

            const histRes = await axios.get('/api/rates/history');
            if (histRes.data?.rates) setHistoryRates(histRes.data.rates);

            const [portRes, transRes] = await Promise.all([
                axios.get('/api/portfolio'),
                axios.get('/api/transactions')
            ]);
            
            setPortfolio(portRes.data);
            setTransactions(transRes.data);
        } catch (error) {
            console.error("Error fetching data", error);
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        if (!amount || isNaN(amount) || amount <= 0) return;
        setLoading(true);
        try {
            await axios.post('/api/transactions', {
                type,
                currency,
                amount: parseFloat(amount),
                rate_at_time: rate
            });
            setAmount('');
            fetchData();
        } catch (error) {
            console.error(error);
            alert(t('portfolio.addError'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTransaction = async (id) => {
        try {
            await axios.delete(`/api/transactions/${id}`);
            fetchData();
        } catch (error) {
            console.error(error);
            alert(t('portfolio.deleteError'));
        }
    };

    const startEditing = (t) => {
        setEditingId(t.id);
        setEditForm({ type: t.type, currency: t.currency, amount: t.amount });
    };

    const cancelEditing = () => setEditingId(null);

    const saveEdit = async (id) => {
        if (!editForm.amount || isNaN(editForm.amount) || editForm.amount <= 0) return;
        try {
            await axios.put(`/api/transactions/${id}`, {
                type: editForm.type,
                currency: editForm.currency,
                amount: parseFloat(editForm.amount)
            });
            setEditingId(null);
            fetchData();
        } catch (error) {
            console.error(error);
            alert(t('portfolio.editError'));
        }
    };

    // Calculate Data for Both Charts
    const generateCharts = () => {
        if (!rate || Object.keys(historyRates).length === 0) return { chartRmb: [], chartEur: [] };
        
        const sortedTrans = [...transactions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        if (sortedTrans.length === 0) return { chartRmb: [], chartEur: [] };

        let firstDate = sortedTrans[0].created_at.substring(0, 10);
        const allDates = Object.keys(historyRates).sort();
        const dates = allDates.filter(d => d >= firstDate);
        
        const chartRmb = [];
        const chartEur = [];
        
        let currentRmb = 0;
        let investedRmbInEur = 0; // Total EUR needed to buy these RMB at the time
        
        let currentEur = 0;
        let investedEurInRmb = 0; // Total RMB needed to buy these EUR at the time

        for (let date of dates) {
            const dayRate = historyRates[date]?.CNY;
            if (!dayRate) continue; // Skip days with missing rate data

            const dayTrans = sortedTrans.filter(t => t.created_at && t.created_at.substring(0, 10) <= date && !t.applied);
            
            for (let t of dayTrans) {
                const amt = t.type === 'DEPOSIT' ? t.amount : -t.amount;
                if (t.currency === 'RMB') {
                    currentRmb += amt;
                    investedRmbInEur += amt / (t.rate_at_time || dayRate);
                } else {
                    currentEur += amt;
                    investedEurInRmb += amt * (t.rate_at_time || dayRate);
                }
                t.applied = true; 
            }

            // RMB Portfolio: Plot its value in EUR
            chartRmb.push({
                date,
                displayDate: new Date(date).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'fr-FR', { month: 'short', day: 'numeric' }),
                Valeur: parseFloat((currentRmb / dayRate).toFixed(2)),
                Investi: parseFloat(investedRmbInEur.toFixed(2))
            });

            // EUR Portfolio: Plot its value in RMB
            chartEur.push({
                date,
                displayDate: new Date(date).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'fr-FR', { month: 'short', day: 'numeric' }),
                Valeur: parseFloat((currentEur * dayRate).toFixed(2)),
                Investi: parseFloat(investedEurInRmb.toFixed(2))
            });
        }
        
        sortedTrans.forEach(t => delete t.applied);
        return { chartRmb, chartEur };
    };

    const { chartRmb, chartEur } = generateCharts();
    
    // Performance RMB
    const lastRmb = chartRmb.length > 0 ? chartRmb[chartRmb.length - 1] : null;
    const currentRmbValEur = portfolio.rmb_balance / (rate || 1);
    const investedRmbEur = lastRmb ? lastRmb.Investi : 0;
    const gainLossRmb = currentRmbValEur - investedRmbEur;
    const gainLossPercentRmb = investedRmbEur > 0 ? (gainLossRmb / investedRmbEur) * 100 : 0;

    // Performance EUR
    const lastEur = chartEur.length > 0 ? chartEur[chartEur.length - 1] : null;
    const currentEurValRmb = portfolio.eur_balance * (rate || 1);
    const investedEurRmb = lastEur ? lastEur.Investi : 0;
    const gainLossEur = currentEurValRmb - investedEurRmb;
    const gainLossPercentEur = investedEurRmb > 0 ? (gainLossEur / investedEurRmb) * 100 : 0;

    const COLOR_VALEUR = "var(--color-accent)";
    const COLOR_INVESTI = "var(--text-secondary)";

    return (
        <div className="animate-fade-in">
            <h1>{t('portfolio.title')}</h1>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                {/* Carte RMB */}
                <div className="card" style={{ flex: '1 1 300px', margin: 0, padding: '1.5rem', textAlign: 'center' }}>
                    <div className="text-muted" style={{ marginBottom: '0.5rem' }}>{t('portfolio.rmbBalance')}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{portfolio.rmb_balance.toFixed(2)} ¥</div>
                    <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        ≈ {currentRmbValEur.toFixed(2)} €
                    </div>
                    {chartRmb.length > 0 && (
                        <div style={{ 
                            marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-color)', 
                            borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' 
                        }}>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>{t('portfolio.latentGainEur')}</div>
                            <div style={{ 
                                fontWeight: 'bold', color: gainLossRmb >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                                display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem'
                            }}>
                                {gainLossRmb >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                {gainLossRmb >= 0 ? '+' : ''}{gainLossRmb.toFixed(2)} € ({gainLossPercentRmb.toFixed(2)}%)
                            </div>
                        </div>
                    )}
                </div>

                {/* Carte EUR */}
                <div className="card" style={{ flex: '1 1 300px', margin: 0, padding: '1.5rem', textAlign: 'center' }}>
                    <div className="text-muted" style={{ marginBottom: '0.5rem' }}>{t('portfolio.eurBalance')}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{portfolio.eur_balance.toFixed(2)} €</div>
                    <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        ≈ {currentEurValRmb.toFixed(2)} ¥
                    </div>
                    {chartEur.length > 0 && (
                        <div style={{ 
                            marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-color)', 
                            borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' 
                        }}>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>{t('portfolio.latentGainRmb')}</div>
                            <div style={{ 
                                fontWeight: 'bold', color: gainLossEur >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                                display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem'
                            }}>
                                {gainLossEur >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                {gainLossEur >= 0 ? '+' : ''}{gainLossEur.toFixed(2)} ¥ ({gainLossPercentEur.toFixed(2)}%)
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Graphique RMB */}
            {chartRmb.length > 0 && (
                <div className="card">
                    <h2>{t('portfolio.chartRmbTitle')}</h2>
                    <div className="text-muted" style={{ marginBottom: '1rem' }}>{t('portfolio.chartRmbDesc')}</div>
                    <div style={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartRmb}>
                                <XAxis dataKey="displayDate" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} minTickGap={30} />
                                <YAxis domain={['auto', 'auto']} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} width={40} scale="linear" />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--surface-color)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Line type="monotone" dataKey="Valeur" stroke={COLOR_VALEUR} strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="Investi" stroke={COLOR_INVESTI} strokeDasharray="5 5" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Graphique EUR */}
            {chartEur.length > 0 && (
                <div className="card">
                    <h2>{t('portfolio.chartEurTitle')}</h2>
                    <div className="text-muted" style={{ marginBottom: '1rem' }}>{t('portfolio.chartEurDesc')}</div>
                    <div style={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartEur}>
                                <XAxis dataKey="displayDate" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} minTickGap={30} />
                                <YAxis domain={['auto', 'auto']} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} width={40} scale="linear" />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--surface-color)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Line type="monotone" dataKey="Valeur" stroke={COLOR_VALEUR} strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="Investi" stroke={COLOR_INVESTI} strokeDasharray="5 5" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Formulaire de transaction */}
            <div className="card">
                <h2>{t('portfolio.newTransaction')}</h2>
                <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
                    <div className="input-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
                        <label>{t('portfolio.type')}</label>
                        <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-color)', color: 'white', border: '1px solid var(--surface-light)' }}>
                            <option value="DEPOSIT">{t('portfolio.deposit')}</option>
                            <option value="WITHDRAWAL">{t('portfolio.withdrawal')}</option>
                        </select>
                    </div>
                    <div className="input-group" style={{ flex: '1 1 100px', marginBottom: 0 }}>
                        <label>{t('portfolio.currency')}</label>
                        <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-color)', color: 'white', border: '1px solid var(--surface-light)' }}>
                            <option value="EUR">EUR</option>
                            <option value="RMB">RMB</option>
                        </select>
                    </div>
                    <div className="input-group" style={{ flex: '2 1 200px', marginBottom: 0 }}>
                        <label>{t('portfolio.amount')}</label>
                        <input 
                            type="number" 
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={t('portfolio.amountPlaceholder')}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '0.75rem' }}>
                        {t('portfolio.save')}
                    </button>
                </form>
            </div>

            {/* Tableau des transactions */}
            <div className="card">
                <h2>{t('portfolio.history')}</h2>
                <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                    {transactions.length === 0 ? (
                        <div className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                            <Clock size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                            {t('portfolio.noTransaction')}
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--surface-light)' }}>
                                    <th style={{ padding: '0.75rem 0', color: 'var(--text-muted)' }}>{t('portfolio.date')}</th>
                                    <th style={{ padding: '0.75rem 0', color: 'var(--text-muted)' }}>{t('portfolio.type')}</th>
                                    <th style={{ padding: '0.75rem 0', color: 'var(--text-muted)', textAlign: 'right' }}>{t('portfolio.amount')}</th>
                                    <th style={{ padding: '0.75rem 0', textAlign: 'center' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(t => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--bg-color)' }}>
                                        <td style={{ padding: '1rem 0' }}>{new Date(t.created_at).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'fr-FR')}</td>
                                        
                                        {editingId === t.id ? (
                                            <td colSpan="2" style={{ padding: '0.5rem 0' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} style={{ background: 'var(--bg-color)', color: 'white', border: '1px solid var(--surface-light)', borderRadius: '4px', padding: '0.25rem' }}>
                                                        <option value="DEPOSIT">{t('portfolio.typeDeposit')}</option>
                                                        <option value="WITHDRAWAL">{t('portfolio.typeWithdrawal')}</option>
                                                    </select>
                                                    <select value={editForm.currency} onChange={e => setEditForm({...editForm, currency: e.target.value})} style={{ background: 'var(--bg-color)', color: 'white', border: '1px solid var(--surface-light)', borderRadius: '4px', padding: '0.25rem' }}>
                                                        <option value="EUR">EUR</option>
                                                        <option value="RMB">RMB</option>
                                                    </select>
                                                    <input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} style={{ background: 'var(--bg-color)', color: 'white', border: '1px solid var(--surface-light)', borderRadius: '4px', padding: '0.25rem', width: '80px' }} />
                                                </div>
                                            </td>
                                        ) : (
                                            <>
                                                <td style={{ padding: '1rem 0' }}>
                                                    <span style={{ 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        gap: '0.25rem',
                                                        color: t.type === 'DEPOSIT' ? 'var(--color-up)' : 'var(--text-muted)'
                                                    }}>
                                                        {t.type === 'DEPOSIT' ? <Plus size={14} /> : <Minus size={14} />}
                                                        {t.type === 'DEPOSIT' ? t('portfolio.typeDeposit') : t('portfolio.typeWithdrawal')}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold' }}>
                                                    {t.amount.toFixed(2)} {t.currency === 'RMB' ? '¥' : '€'}
                                                </td>
                                            </>
                                        )}
                                        
                                        <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                                            {editingId === t.id ? (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button onClick={() => saveEdit(t.id)} style={{ background: 'none', border: 'none', color: 'var(--color-up)', cursor: 'pointer' }}><Check size={18} /></button>
                                                    <button onClick={cancelEditing} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button onClick={() => startEditing(t)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteTransaction(t.id)} style={{ background: 'none', border: 'none', color: 'var(--color-down)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Portfolio;

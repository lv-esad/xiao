import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
    const { t, i18n } = useTranslation();
    const [rate, setRate] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trend, setTrend] = useState('neutral'); // up, down, neutral
    const [portfolio, setPortfolio] = useState({ eur_balance: 0, rmb_balance: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch current rate
                const rateRes = await axios.get('/api/rates/latest');
                const currentRate = rateRes.data?.rates?.CNY;
                if (currentRate) {
                    setRate(currentRate);
                }

                // Fetch history
                const histRes = await axios.get('/api/rates/history');
                const ratesData = histRes.data?.rates || {};
                const locale = i18n.language === 'zh' ? 'zh-CN' : 'fr-FR';
                const chartData = Object.keys(ratesData).map(date => ({
                    date: new Date(date).toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
                    value: ratesData[date].CNY
                })).filter(item => item.value !== undefined);
                setHistory(chartData);

                // Calculate Trend (compare with average of last 7 days)
                if (chartData.length > 7 && currentRate) {
                    const last7 = chartData.slice(-7);
                    const avg = last7.reduce((sum, item) => sum + item.value, 0) / 7;
                    if (currentRate > avg + 0.01) setTrend('up');
                    else if (currentRate < avg - 0.01) setTrend('down');
                    else setTrend('neutral');
                }

                // Fetch portfolio
                const portRes = await axios.get('/api/portfolio');
                setPortfolio(portRes.data);

            } catch (error) {
                console.error("Error fetching data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // refresh every minute
        return () => clearInterval(interval);
    }, [i18n.language]);

    if (loading) return <div>{t('dashboard.loading')}</div>;

    const totalInRmb = rate ? (portfolio.eur_balance * rate) + portfolio.rmb_balance : portfolio.rmb_balance;

    const TrendIcon = () => {
        if (trend === 'up') return <ArrowUpRight className="trend-up" size={28} />;
        if (trend === 'down') return <ArrowDownRight className="trend-down" size={28} />;
        return <Minus className="trend-neutral" size={28} />;
    };

    return (
        <div className="animate-fade-in">
            <h1>{t('dashboard.overview')}</h1>

            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div className="text-muted">1 EUR =</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                        {rate ? rate.toFixed(4) : '---'} <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>RMB</span>
                    </div>
                </div>
                <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '50%' }}>
                    <TrendIcon />
                </div>
            </div>

            <div className="card">
                <h2>{t('dashboard.evolution')}</h2>
                <div style={{ height: '250px', width: '100%', marginTop: '1rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                            <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis domain={['auto', 'auto']} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--surface-color)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }}
                                itemStyle={{ color: 'var(--color-accent)' }}
                            />
                            <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={3} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card">
                <h2>{t('dashboard.myPortfolio')}</h2>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-up)' }}>
                    {totalInRmb.toLocaleString(i18n.language === 'zh' ? 'zh-CN' : 'fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RMB
                </div>
                <div className="text-muted" style={{ marginTop: '0.5rem' }}>
                    {t('dashboard.basedOn')}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

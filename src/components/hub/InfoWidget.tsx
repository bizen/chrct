import { useState, useEffect } from 'react';
import { Sun, Cloud, CloudFog, CloudRain, Snowflake, CloudLightning } from 'lucide-react';

const getWeatherIcon = (code: number, size: number = 32) => {
    if (code === 0) return <Sun size={size} color="#FDB813" />;
    if (code >= 1 && code <= 3) return <Cloud size={size} color="#94a3b8" />;
    if (code >= 45 && code <= 48) return <CloudFog size={size} color="#94a3b8" />;
    if (code >= 51 && code <= 67) return <CloudRain size={size} color="#60A5FA" />;
    if (code >= 71 && code <= 77) return <Snowflake size={size} color="#E0F2FE" />;
    if (code >= 80 && code <= 82) return <CloudRain size={size} color="#60A5FA" />;
    if (code >= 95 && code <= 99) return <CloudLightning size={size} color="#F59E0B" />;
    return <Sun size={size} color="#FDB813" />;
};

export function InfoWidget({ theme, weather }: { theme: 'dark' | 'light' | 'wallpaper'; weather: any }) {
    const [prices, setPrices] = useState<{ btc: string | null; sol: string | null }>({ btc: null, sol: null });

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,solana&vs_currencies=usd');
                const data = await response.json();
                setPrices({
                    btc: data.bitcoin.usd.toLocaleString(),
                    sol: data.solana.usd.toLocaleString()
                });
            } catch (error) {
                console.error('Failed to fetch crypto prices:', error);
            }
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: theme === 'light' ? '#6b7280' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '0.25rem' }}>
                Breakfast
            </h3>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem', // Reduced padding
                backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '16px',
                border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid rgba(255, 255, 255, 0.05)',
                color: theme === 'light' ? '#1f2937' : 'white',
            }}>
                {/* Weather Section (Left) */}
                {weather ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {getWeatherIcon(weather.code, 24)}
                        <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{weather.temp}°C</div>
                            <div style={{ fontSize: '0.65rem', color: theme === 'light' ? '#4b5563' : 'var(--text-secondary)' }}>{weather.city}</div>
                        </div>
                    </div>
                ) : (
                    <div style={{ fontSize: '0.8rem', color: theme === 'light' ? '#6b7280' : 'var(--text-secondary)' }}>Loading...</div>
                )}

                {/* Vertical Divider */}
                <div style={{ width: '1px', height: '24px', backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }} />

                {/* Crypto Section (Right) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.6 }}>BTC</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>${prices.btc || '...'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.6 }}>SOL</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>${prices.sol || '...'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

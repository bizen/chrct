export function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            minWidth: '0',
        }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {label}
            </span>
            <span className="stat-card-value" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-color)', lineHeight: 1 }}>
                {value}
            </span>
        </div>
    );
}

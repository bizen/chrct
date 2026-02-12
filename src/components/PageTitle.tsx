interface PageTitleProps {
    title: string;
}

export function PageTitle({ title }: PageTitleProps) {
    return (
        <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 700,
            fontSize: '1.6rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            opacity: 0.45,
            marginBottom: '0',
            userSelect: 'none',
        }}>
            {title}
        </div>
    );
}

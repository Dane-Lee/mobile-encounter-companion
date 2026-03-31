interface StatusPillProps {
  label: string;
  tone?: 'neutral' | 'ready' | 'draft' | 'exported' | 'overdue';
}

const StatusPill = ({ label, tone = 'neutral' }: StatusPillProps) => (
  <span className={`status-pill status-pill--${tone}`}>{label}</span>
);

export default StatusPill;

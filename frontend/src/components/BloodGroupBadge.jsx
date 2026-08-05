const COLORS = {
  'A+': 'bg-brick-50 text-brick-600 border-brick-400/40',
  'A-': 'bg-brick-50 text-brick-600 border-brick-400/40',
  'B+': 'bg-forest-50 text-forest-600 border-forest-400/40',
  'B-': 'bg-forest-50 text-forest-600 border-forest-400/40',
  'AB+': 'bg-parchment-200 text-ink-700 border-ink-400/30',
  'AB-': 'bg-parchment-200 text-ink-700 border-ink-400/30',
  'O+': 'bg-amber-50 text-amber-700 border-amber-400/40',
  'O-': 'bg-amber-50 text-amber-700 border-amber-400/40',
};

export default function BloodGroupBadge({ value }) {
  if (!value) {
    return <span className="text-xs text-ink-400 italic">Not recorded</span>;
  }
  const cls = COLORS[value] || 'bg-parchment-200 text-ink-700 border-ink-400/30';
  return (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded border text-xs font-mono font-medium ${cls}`}>
      {value}
    </span>
  );
}

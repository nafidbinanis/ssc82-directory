import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, MapPin, Stethoscope, AlertTriangle } from 'lucide-react';
import api from '../lib/api';

const BAR_COLORS = ['#2F5D3A', '#4C7C58', '#A6C1AB', '#C4573F', '#A8402C'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/stats')
      .then((res) => setStats(res.data))
      .catch(() => setError('Could not load dashboard statistics.'));
  }, []);

  if (error) {
    return <div className="p-8 text-brick-500">{error}</div>;
  }
  if (!stats) {
    return <div className="p-8 text-ink-400">Loading dashboard…</div>;
  }

  const topDistricts = stats.by_district.slice(0, 8);
  const topProfessions = stats.by_profession.slice(0, 8);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-forest-500 font-medium mb-1">Register overview</p>
        <h1 className="font-display text-3xl font-semibold text-ink-900">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total People" value={stats.total_people} accent="forest" />
        <StatCard icon={MapPin} label="Districts Covered" value={stats.total_districts} accent="brick" />
        <StatCard icon={Stethoscope} label="Occupations Recorded" value={stats.by_profession.length} accent="forest" />
        <StatCard icon={AlertTriangle} label="Probable Duplicates" value={stats.data_quality.probable_duplicates} accent="brick" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="People by district (top 8)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topDistricts} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="district" type="category" width={100} tick={{ fontSize: 12, fill: '#4A443B' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#F5EFE2' }} contentStyle={{ borderRadius: 8, borderColor: '#EAE0C9', fontSize: 13 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {topDistricts.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="People by occupation (top 8)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topProfessions} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="profession" type="category" width={140} tick={{ fontSize: 11, fill: '#4A443B' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#F5EFE2' }} contentStyle={{ borderRadius: 8, borderColor: '#EAE0C9', fontSize: 13 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {topProfessions.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[(i + 2) % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Blood group distribution">
          <div className="flex flex-wrap gap-3 pt-2">
            {stats.by_blood_group.map((bg) => (
              <div key={bg.blood_group} className="flex-1 min-w-[80px] bg-parchment-100 rounded-md p-3 text-center border border-ink-400/10">
                <p className="font-mono text-lg font-semibold text-forest-700">{bg.blood_group}</p>
                <p className="text-xs text-ink-400 mt-0.5">{bg.count} people</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Data completeness">
          <ul className="space-y-2.5 pt-1 text-sm">
            <QualityRow label="Missing email address" value={stats.data_quality.missing_email} total={stats.total_people} />
            <QualityRow label="Missing phone number" value={stats.data_quality.missing_phone} total={stats.total_people} />
            <QualityRow label="Missing blood group" value={stats.data_quality.missing_blood_group} total={stats.total_people} />
            <QualityRow label="Invalid email format" value={stats.data_quality.invalid_emails} total={stats.total_people} />
          </ul>
        </ChartCard>
      </div>

      <ChartCard title="Recently added records">
        {stats.recently_added.length === 0 ? (
          <p className="text-sm text-ink-400 py-4">No records have been added yet.</p>
        ) : (
          <div className="divide-y divide-ink-400/10">
            {stats.recently_added.map((r) => (
              <Link
                key={r.id}
                to={`/directory/${r.id}`}
                className="flex items-center justify-between py-2.5 hover:bg-parchment-100 -mx-2 px-2 rounded transition-colors focus-ring"
              >
                <div>
                  <p className="text-sm font-medium text-ink-800">{r.name}</p>
                  <p className="text-xs text-ink-400">{r.district} {r.profession ? `· ${r.profession}` : ''}</p>
                </div>
                <span className="text-xs text-ink-400 font-mono">{r.created_at}</span>
              </Link>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  const accentCls = accent === 'brick' ? 'text-brick-500 bg-brick-50' : 'text-forest-600 bg-forest-50';
  return (
    <div className="bg-white rounded-lg border border-ink-400/10 p-4 shadow-sm">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-3 ${accentCls}`}>
        <Icon size={16} />
      </div>
      <p className="text-2xl font-display font-semibold text-ink-900">{value.toLocaleString()}</p>
      <p className="text-xs text-ink-400 mt-0.5">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-lg border border-ink-400/10 p-5 shadow-sm">
      <h2 className="font-display text-base font-semibold text-ink-800 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function QualityRow({ label, value, total }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <li>
      <div className="flex justify-between text-ink-600 mb-1">
        <span>{label}</span>
        <span className="font-mono text-xs text-ink-400">{value} ({pct}%)</span>
      </div>
      <div className="h-1.5 bg-parchment-100 rounded-full overflow-hidden">
        <div className="h-full bg-brick-400/70 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

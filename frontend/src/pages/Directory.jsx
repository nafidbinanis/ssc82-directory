import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Phone, Mail, X, ArrowUpDown } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import BloodGroupBadge from '../components/BloodGroupBadge';
import Pagination from '../components/Pagination';

export default function Directory() {
  const { isAdmin } = useAuth();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [district, setDistrict] = useState('');
  const [profession, setProfession] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [options, setOptions] = useState({ districts: [], professions: [], blood_groups: [] });
  const [result, setResult] = useState({ data: [], pagination: { total: 0, total_pages: 1, page: 1, page_size: 25 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/people/meta/options').then((res) => setOptions(res.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => setPage(1), [debouncedQ, district, profession, bloodGroup]);

  const fetchData = useCallback(() => {
    setLoading(true);
    api
      .get('/people', {
        params: {
          q: debouncedQ || undefined,
          district: district || undefined,
          profession: profession || undefined,
          blood_group: bloodGroup || undefined,
          sort,
          order,
          page,
          page_size: 20,
        },
      })
      .then((res) => setResult(res.data))
      .finally(() => setLoading(false));
  }, [debouncedQ, district, profession, bloodGroup, sort, order, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function toggleSort(col) {
    if (sort === col) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(col);
      setOrder('asc');
    }
  }

  function clearFilters() {
    setDistrict('');
    setProfession('');
    setBloodGroup('');
  }

  const activeFilterCount = [district, profession, bloodGroup].filter(Boolean).length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-forest-500 font-medium mb-1">
          {isAdmin ? 'Admin access' : 'General user'}
        </p>
        <h1 className="font-display text-3xl font-semibold text-ink-900">Directory</h1>
        <p className="text-sm text-ink-400 mt-1">Search across name, school, district, occupation, phone, and email.</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, district, occupation, phone, or email…"
            className="w-full rounded-md border border-ink-400/25 bg-white pl-10 pr-9 py-2.5 text-sm focus-ring"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 focus-ring rounded"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium border focus-ring ${
            showFilters || activeFilterCount ? 'bg-forest-600 text-white border-forest-600' : 'bg-white border-ink-400/25 text-ink-600 hover:bg-parchment-100'
          }`}
        >
          <SlidersHorizontal size={15} />
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white border border-ink-400/10 rounded-md p-4 grid sm:grid-cols-3 gap-3 shadow-sm">
          <Select label="District" value={district} onChange={setDistrict} options={options.districts} />
          <Select label="Occupation" value={profession} onChange={setProfession} options={options.professions} />
          <Select label="Blood group" value={bloodGroup} onChange={setBloodGroup} options={options.blood_groups} />
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="sm:col-span-3 text-sm text-brick-500 hover:underline text-left focus-ring rounded w-fit">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Table - desktop */}
      <div className="hidden md:block bg-white border border-ink-400/10 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-parchment-100 text-ink-500 text-xs uppercase tracking-wide">
              <SortableTh label="Name" col="name" sort={sort} order={order} onSort={toggleSort} />
              <SortableTh label="District" col="district" sort={sort} order={order} onSort={toggleSort} />
              <SortableTh label="Occupation" col="profession" sort={sort} order={order} onSort={toggleSort} />
              <th className="text-left px-4 py-3 font-medium">Contact</th>
              <SortableTh label="Blood" col="blood_group" sort={sort} order={order} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-400/8">
            {result.data.map((p) => (
              <tr key={p.id} className="hover:bg-parchment-50 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/directory/${p.id}`} className="font-medium text-forest-700 hover:underline focus-ring rounded">
                    {p.name}
                  </Link>
                  {p.is_duplicate_of && <span className="ml-2 text-[10px] uppercase tracking-wide text-brick-500 bg-brick-50 px-1.5 py-0.5 rounded">Possible duplicate</span>}
                </td>
                <td className="px-4 py-3 text-ink-500">{p.district}</td>
                <td className="px-4 py-3 text-ink-500">{p.profession || <span className="italic text-ink-400">Not recorded</span>}</td>
                <td className="px-4 py-3 text-ink-500">
                  <div className="flex flex-col gap-0.5">
                    {p.phone_primary && (
                      <span className="flex items-center gap-1.5 font-mono text-xs">
                        <Phone size={11} /> {p.phone_primary}
                      </span>
                    )}
                    {p.email && (
                      <span className="flex items-center gap-1.5 text-xs truncate max-w-[180px]">
                        <Mail size={11} /> {p.email}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <BloodGroupBadge value={p.blood_group} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && result.data.length === 0 && <EmptyState />}
      </div>

      {/* Cards - mobile */}
      <div className="md:hidden space-y-3">
        {result.data.map((p) => (
          <Link
            key={p.id}
            to={`/directory/${p.id}`}
            className="block bg-white border border-ink-400/10 rounded-lg p-4 shadow-sm focus-ring"
          >
            <div className="flex justify-between items-start gap-2">
              <p className="font-medium text-ink-800">{p.name}</p>
              <BloodGroupBadge value={p.blood_group} />
            </div>
            <p className="text-xs text-ink-400 mt-1">{p.district} {p.profession ? `· ${p.profession}` : ''}</p>
            <div className="flex gap-3 mt-2 text-xs text-ink-500">
              {p.phone_primary && <span className="flex items-center gap-1"><Phone size={11} />{p.phone_primary}</span>}
              {p.email && <span className="flex items-center gap-1 truncate"><Mail size={11} />{p.email}</span>}
            </div>
          </Link>
        ))}
        {!loading && result.data.length === 0 && <EmptyState />}
      </div>

      <Pagination
        page={result.pagination.page}
        totalPages={result.pagination.total_pages}
        total={result.pagination.total}
        pageSize={result.pagination.page_size}
        onChange={setPage}
      />
    </div>
  );
}

function SortableTh({ label, col, sort, order, onSort }) {
  const active = sort === col;
  return (
    <th className="text-left px-4 py-3 font-medium">
      <button onClick={() => onSort(col)} className="flex items-center gap-1 hover:text-ink-800 focus-ring rounded">
        {label}
        <ArrowUpDown size={11} className={active ? 'text-forest-600' : 'text-ink-400/50'} />
        {active && <span className="text-[10px]">{order === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="text-xs text-ink-500 font-medium space-y-1 block">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 rounded-md border border-ink-400/25 bg-white px-2.5 py-2 text-sm focus-ring"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-14 px-4">
      <p className="font-display text-lg text-ink-600 mb-1">No matching records</p>
      <p className="text-sm text-ink-400">Try a different search term or clear your filters.</p>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, School, Briefcase, Pencil, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import BloodGroupBadge from '../components/BloodGroupBadge';

export default function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [person, setPerson] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get(`/people/${id}`)
      .then((res) => setPerson(res.data.data))
      .catch(() => setError('Person not found.'));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`Remove ${person.name} from the directory? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/people/${id}`);
      navigate('/directory');
    } catch {
      setDeleting(false);
      alert('Could not delete this record.');
    }
  }

  if (error) return <div className="p-10 text-brick-500">{error}</div>;
  if (!person) return <div className="p-10 text-ink-400">Loading…</div>;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <Link to="/directory" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-forest-600 mb-6 focus-ring rounded">
        <ArrowLeft size={15} /> Back to directory
      </Link>

      <div className="bg-white border border-ink-400/10 rounded-lg shadow-sm p-7">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            {person.is_duplicate_of && (
              <span className="inline-block mb-2 text-[11px] uppercase tracking-wide text-brick-500 bg-brick-50 px-2 py-0.5 rounded">
                Possible duplicate of record #{person.is_duplicate_of}
              </span>
            )}
            <h1 className="font-display text-2xl font-semibold text-ink-900">{person.name}</h1>
            <p className="text-ink-400 text-sm mt-1 flex items-center gap-1.5">
              <MapPin size={13} /> {person.district}
            </p>
          </div>
          <BloodGroupBadge value={person.blood_group} />
        </div>

        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-5 mt-7">
          <Field icon={Briefcase} label="Occupation" value={person.profession} />
          <Field icon={MapPin} label="Current Location" value={person.current_location} />
          <Field icon={School} label="School (Name &amp; District)" value={person.school_name_district} />
          <Field icon={MapPin} label="Home District (as recorded)" value={person.home_district_raw} />
          <Field icon={Phone} label="Phone" value={person.phone_primary} mono />
          <Field icon={Phone} label="Secondary Phone" value={person.phone_secondary} mono />
          <Field icon={Mail} label="Email" value={person.email} warn={person.email_valid === false} />
        </dl>

        {isAdmin && (
          <div className="flex gap-3 mt-8 pt-6 border-t border-ink-400/10">
            <Link
              to={`/directory/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-forest-600 text-white text-sm font-medium hover:bg-forest-700 focus-ring"
            >
              <Pencil size={14} /> Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-brick-400/40 text-brick-500 text-sm font-medium hover:bg-brick-50 focus-ring disabled:opacity-50"
            >
              <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, mono, warn }) {
  return (
    <div>
      <dt className="text-xs text-ink-400 flex items-center gap-1.5 mb-1">
        <Icon size={12} /> {label}
      </dt>
      <dd className={`text-sm ${mono ? 'font-mono' : ''} ${value ? 'text-ink-800' : 'text-ink-400 italic'} ${warn ? 'text-brick-500' : ''}`}>
        {value || 'Not recorded'}
        {warn && <span className="ml-2 text-[10px] uppercase tracking-wide bg-brick-50 text-brick-500 px-1.5 py-0.5 rounded">Invalid format</span>}
      </dd>
    </div>
  );
}

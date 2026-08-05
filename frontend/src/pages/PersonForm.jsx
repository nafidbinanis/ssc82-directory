import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const EMPTY_FORM = {
  name: '',
  district: '',
  school_name_district: '',
  home_district_raw: '',
  profession: '',
  current_location: '',
  phone_primary: '',
  phone_secondary: '',
  blood_group: '',
  email: '',
};

export default function PersonForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [districts, setDistricts] = useState([]);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/people/meta/options').then((res) => setDistricts(res.data.districts));
  }, []);

  useEffect(() => {
    if (isEdit) {
      api.get(`/people/${id}`).then((res) => {
        const p = res.data.data;
        setForm({
          name: p.name || '',
          district: p.district || '',
          school_name_district: p.school_name_district || '',
          home_district_raw: p.home_district_raw || '',
          profession: p.profession || '',
          current_location: p.current_location || '',
          phone_primary: p.phone_primary || '',
          phone_secondary: p.phone_secondary || '',
          blood_group: p.blood_group || '',
          email: p.email || '',
        });
      });
    }
  }, [id, isEdit]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/people/${id}`, form);
      } else {
        await api.post('/people', form);
      }
      setSuccess(true);
      setTimeout(() => navigate(isEdit ? `/directory/${id}` : '/directory'), 900);
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else if (err.response?.data?.error) {
        setErrors([err.response.data.error]);
      } else {
        setErrors(['Something went wrong. Please try again.']);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <Link to="/directory" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-forest-600 mb-6 focus-ring rounded">
        <ArrowLeft size={15} /> Back to directory
      </Link>

      <h1 className="font-display text-2xl font-semibold text-ink-900 mb-1">{isEdit ? 'Edit Person' : 'Add New Person'}</h1>
      <p className="text-sm text-ink-400 mb-6">
        Fields mirror the original SSC 1982 telephone directory sheet — Name, School Name &amp; District, Home
        District, Occupation, Current Location, Contact Number(s), Blood Group, and Email.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border border-ink-400/10 rounded-lg shadow-sm p-7 space-y-5">
        {errors.length > 0 && (
          <div className="bg-brick-50 border border-brick-400/30 text-brick-600 text-sm rounded-md px-4 py-3 space-y-1">
            {errors.map((e, i) => (
              <p key={i}>• {e}</p>
            ))}
          </div>
        )}
        {success && (
          <div className="bg-forest-50 border border-forest-400/30 text-forest-700 text-sm rounded-md px-4 py-3 flex items-center gap-2">
            <CheckCircle2 size={16} /> Record saved successfully.
          </div>
        )}

        <Field label="Name" required>
          <input
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="input"
            placeholder="Full name"
          />
        </Field>

        <Field label="District" required hint="The batch directory sheet / home district this person belongs to.">
          <input
            required
            list="district-options"
            value={form.district}
            onChange={(e) => update('district', e.target.value)}
            className="input"
            placeholder="e.g. Dhaka"
          />
          <datalist id="district-options">
            {districts.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </Field>

        <Field label="School Name &amp; District" hint="As recorded in the original register, e.g. 'Ideal School, Dhaka'.">
          <input
            value={form.school_name_district}
            onChange={(e) => update('school_name_district', e.target.value)}
            className="input"
            placeholder="School name, District"
          />
        </Field>

        <Field label="Home District (as recorded)">
          <input
            value={form.home_district_raw}
            onChange={(e) => update('home_district_raw', e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Occupation / Profession">
          <input
            value={form.profession}
            onChange={(e) => update('profession', e.target.value)}
            className="input"
            placeholder="e.g. Doctor, Business, Govt. Service"
          />
        </Field>

        <Field label="Current Location">
          <input
            value={form.current_location}
            onChange={(e) => update('current_location', e.target.value)}
            className="input"
            placeholder="e.g. Dhanmondi, Dhaka"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Phone Number" required hint="Digits, spaces, +, ( ) and - are accepted.">
            <input
              required
              value={form.phone_primary}
              onChange={(e) => update('phone_primary', e.target.value)}
              className="input font-mono"
              placeholder="01XXXXXXXXX"
            />
          </Field>
          <Field label="Secondary Phone (optional)">
            <input
              value={form.phone_secondary}
              onChange={(e) => update('phone_secondary', e.target.value)}
              className="input font-mono"
              placeholder="01XXXXXXXXX"
            />
          </Field>
        </div>

        <Field label="Blood Group">
          <select value={form.blood_group} onChange={(e) => update('blood_group', e.target.value)} className="input">
            <option value="">Not specified</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="input"
            placeholder="name@example.com"
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-md bg-forest-600 text-white text-sm font-medium hover:bg-forest-700 focus-ring disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Person'}
          </button>
          <Link
            to="/directory"
            className="px-5 py-2.5 rounded-md border border-ink-400/25 text-ink-600 text-sm font-medium hover:bg-parchment-100 focus-ring"
          >
            Cancel
          </Link>
        </div>
      </form>

      <style>{`.input { width: 100%; border: 1px solid rgba(107,100,89,0.25); border-radius: 6px; padding: 0.55rem 0.75rem; font-size: 0.875rem; background: white; } .input:focus { outline: 2px solid #2F5D3A; outline-offset: 1px; }`}</style>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-700">
        {label} {required && <span className="text-brick-500">*</span>}
      </span>
      {hint && <span className="block text-xs text-ink-400 mt-0.5 mb-1.5">{hint}</span>}
      <div className={hint ? '' : 'mt-1.5'}>{children}</div>
    </label>
  );
}

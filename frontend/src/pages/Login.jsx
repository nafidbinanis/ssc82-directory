import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BatchEmblem from '../components/BatchEmblem';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role) {
    if (role === 'admin') {
      setEmail('admin@ssc82.local');
      setPassword('admin123');
    } else {
      setEmail('viewer@ssc82.local');
      setPassword('user123');
    }
  }

  return (
    <div className="min-h-screen bg-forest-800 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] bg-ledger-lines pointer-events-none" />
      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8 text-parchment-50">
          <BatchEmblem size={64} />
          <h1 className="font-display text-2xl font-semibold mt-4">SSC 1982 Directory</h1>
          <p className="text-forest-200 text-sm mt-1 tracking-wide">Batch register &amp; contact archive</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-parchment-50 rounded-lg shadow-xl p-7 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-ink-400/25 px-3 py-2 text-sm focus-ring bg-white"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-ink-400/25 px-3 py-2 text-sm focus-ring bg-white"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-brick-500 bg-brick-50 border border-brick-400/30 rounded px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-forest-600 hover:bg-forest-700 text-white font-medium py-2.5 rounded-md transition-colors focus-ring disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="pt-3 border-t border-ink-400/15 text-xs text-ink-400 space-y-1.5">
            <p className="font-medium text-ink-500">Demo accounts</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => fillDemo('admin')} className="underline hover:text-forest-600 focus-ring rounded">
                Use admin login
              </button>
              <span>·</span>
              <button type="button" onClick={() => fillDemo('user')} className="underline hover:text-forest-600 focus-ring rounded">
                Use viewer login
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

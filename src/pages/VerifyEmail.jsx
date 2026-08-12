import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getDashboardRoute = (role) => {
  switch (role) {
    case 'super_admin':  return '/dashboard/super-admin';
    case 'admin':        return '/dashboard/admin';
    case 'lead':         return '/dashboard/lead';
    default:             return '/dashboard/team-member';
  }
};

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { checkVerificationToken, verifyEmail } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState('checking'); // checking | valid | invalid
  const [account, setAccount] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus('invalid');
        return;
      }
      try {
        const res = await checkVerificationToken(token);
        setAccount(res.data);
        setStatus('valid');
      } catch (err) {
        setError(err.response?.data?.message || 'This verification link is invalid or has expired.');
        setStatus('invalid');
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await verifyEmail(token, password);
      navigate(getDashboardRoute(res.data.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try registering again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-800 to-indigo-700 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>

        {status === 'checking' && (
          <div className="text-center">
            <svg className="animate-spin w-8 h-8 text-blue-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <p className="text-gray-500 text-sm">Checking your verification link…</p>
          </div>
        )}

        {status === 'invalid' && (
          <div className="text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link invalid or expired</h1>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <Link
              to="/register"
              className="inline-block w-full h-11 leading-[44px] bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold rounded-xl transition-colors duration-150"
            >
              Register again
            </Link>
          </div>
        )}

        {status === 'valid' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 text-center">Verify your email</h1>
              <p className="text-gray-500 text-sm mt-1 text-center">
                Welcome, <span className="font-medium text-gray-700">{account?.firstName} {account?.lastName}</span>.
                Set a password for <span className="font-medium text-gray-700">{account?.email}</span> to finish setting up your Super Admin account.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    placeholder="At least 6 characters"
                    className="w-full h-11 px-4 pr-11 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400
                               bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                               transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.243M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter password"
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400
                             bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                             transition-all duration-150"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-blue-800 hover:bg-blue-900 active:bg-blue-950 text-white text-sm font-semibold
                           rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Setting up your account…
                  </span>
                ) : 'Verify & set password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

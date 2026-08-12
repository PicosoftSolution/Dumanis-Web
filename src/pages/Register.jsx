import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ firstName, lastName, email });
      setSubmittedEmail(email);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Panel — Brand / Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gray-900">
        <img
          src="/survey-app.jpg"
          alt="Survey Platform"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">DUNAMIS GeoSurvey</span>
          </div>
          <p className="text-blue-300/70 text-xs">© {new Date().getFullYear()} DUNAMIS GeoSurvey Platform. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <div className="lg:hidden w-12 h-12 bg-gradient-to-br from-blue-800 to-indigo-700 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>

            {submittedEmail ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Check your inbox</h1>
                <p className="text-gray-500 text-sm mt-1">We're almost done setting up your Super Admin account.</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Create Super Admin account</h1>
                <p className="text-gray-500 text-sm mt-1">
                  We'll email you a verification link to confirm your address and set your password.
                </p>
              </>
            )}
          </div>

          {submittedEmail ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-green-700 text-sm">
                <svg className="w-5 h-5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  A verification link has been sent to <span className="font-semibold">{submittedEmail}</span>.
                  Open it to verify your email and set your password.
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Didn't get it? Check your spam folder, or if you're testing locally without SMTP configured,
                look at the backend server console — the link is printed there too.
              </p>
              <Link
                to="/login"
                className="block text-center w-full h-11 leading-[44px] bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold rounded-xl transition-colors duration-150"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoFocus
                      placeholder="Ravi"
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400
                                 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                                 transition-all duration-150"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      placeholder="Kumar"
                      className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400
                                 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                                 transition-all duration-150"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400
                               bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                               transition-all duration-150"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-blue-800 hover:bg-blue-900 active:bg-blue-950 text-white text-sm font-semibold
                             rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Sending verification email…
                    </span>
                  ) : 'Send verification email'}
                </button>
              </form>

              <p className="text-center text-xs text-gray-400 mt-8">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-700 font-medium hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

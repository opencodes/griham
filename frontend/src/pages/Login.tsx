import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Home, AlertCircle } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-ai-wallpaper flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl ai-gradient-icon flex items-center justify-center shadow-lg">
            <Home className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--app-fg)]">Griham</p>
            <p className="text-sm text-[var(--app-fg-muted)]">Home Automation</p>
          </div>
        </div>

        <div className="premium-panel rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-[var(--app-fg)] mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-[var(--app-fg-muted)] mb-6">
            {isLogin ? 'Sign in to your account' : 'Register to get started'}
          </p>

          {error && (
            <div className="mb-4 alert-error flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  disabled={isLoading}
                  className="input-theme"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="input-theme"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--app-fg)] mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="input-theme"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full ai-gradient-button text-white py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {isLogin && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className="text-sm text-[var(--app-fg-muted)] hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setName('');
                setEmail('');
                setPassword('');
              }}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

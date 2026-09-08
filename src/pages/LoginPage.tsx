import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { hasApiSession, login, register } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { FieldWrapper, Input } from '@/components/ui/Field';

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasApiSession()) navigate('/', { replace: true });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, organizationName);
      navigate('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-raised p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === 'login' ? 'Sign in to Centsible' : 'Create your organization'}</CardTitle>
        </CardHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <FieldWrapper label="Email" htmlFor="login-email">
            <Input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </FieldWrapper>
          <FieldWrapper label="Password" htmlFor="login-password">
            <Input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === 'register' ? 10 : 1} required />
          </FieldWrapper>
          {mode === 'register' && (
            <FieldWrapper label="Organization" htmlFor="login-organization">
              <Input id="login-organization" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} required />
            </FieldWrapper>
          )}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Connecting...' : mode === 'login' ? 'Sign in' : 'Create account'}</Button>
          <button type="button" className="text-sm text-text-muted hover:text-text" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
            {mode === 'login' ? 'Create a new organization' : 'I already have an account'}
          </button>
        </form>
      </Card>
    </main>
  );
}

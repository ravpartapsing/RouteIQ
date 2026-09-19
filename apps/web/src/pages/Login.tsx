import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Alert, Button, Field, useFormErrors } from '../components/ui';
import { AuthLayout } from './AuthLayout';

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const errors = useFormErrors();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    errors.clear();
    setBusy(true);
    try {
      await login({ email: String(f.get('email')), password: String(f.get('password')) });
      nav(from, { replace: true });
    } catch (err) {
      errors.set(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          New carrier? <Link className="text-accent-600 hover:underline" to="/register">Create an account</Link>
          <br />
          Invited by your team? <Link className="text-accent-600 hover:underline" to="/activate">Set your password</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors.message && <Alert>{errors.message}</Alert>}
        <Field label="Email" name="email" type="email" autoComplete="username" required error={errors.fields['email']} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required error={errors.fields['password']} />
        <Button type="submit" busy={busy} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}

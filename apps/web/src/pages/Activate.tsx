import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Alert, Button, Field, useFormErrors } from '../components/ui';
import { AuthLayout } from './AuthLayout';

export function Activate() {
  const { activate } = useAuth();
  const nav = useNavigate();
  const errors = useFormErrors();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    errors.clear();
    setBusy(true);
    try {
      await activate({ email: String(f.get('email')), code: String(f.get('code')), password: String(f.get('password')) });
      nav('/', { replace: true });
    } catch (err) {
      errors.set(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Set your password"
      subtitle="Use the code your admin gave you. It works once."
      footer={<Link className="text-accent-600 hover:underline" to="/login">Back to sign in</Link>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors.message && <Alert>{errors.message}</Alert>}
        <Field label="Email" name="email" type="email" autoComplete="username" required error={errors.fields['email']} />
        <Field
          label="Invitation code"
          name="code"
          required
          placeholder="XXXX-XXXX"
          autoComplete="one-time-code"
          className="uppercase"
          error={errors.fields['code']}
        />
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.fields['password']}
          hint="At least 12 characters."
        />
        <Button type="submit" busy={busy} className="w-full">
          Set password and sign in
        </Button>
      </form>
    </AuthLayout>
  );
}

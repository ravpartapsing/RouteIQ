import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Alert, Button, Field, useFormErrors } from '../components/ui';
import { AuthLayout } from './AuthLayout';

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const errors = useFormErrors();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? '').trim();
    errors.clear();
    setBusy(true);
    try {
      await register({
        companyName: s('companyName'),
        carrierCode: s('carrierCode'),
        ...(s('dotNumber') ? { dotNumber: s('dotNumber') } : {}),
        owner: { firstName: s('firstName'), lastName: s('lastName'), email: s('email'), password: String(f.get('password')) },
      });
      nav('/', { replace: true });
    } catch (err) {
      errors.set(err);
    } finally {
      setBusy(false);
    }
  }

  const fe = errors.fields;
  return (
    <AuthLayout
      title="Create your carrier account"
      subtitle="You'll be the owner. Invite dispatchers and add drivers next."
      footer={<>Already have an account? <Link className="text-accent-600 hover:underline" to="/login">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors.message && <Alert>{errors.message}</Alert>}
        <Field label="Company name" name="companyName" required error={fe['companyName']} />
        <Field
          label="Carrier code"
          name="carrierCode"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          error={fe['carrierCode']}
          hint="Your drivers type this to sign in. Short and simple, e.g. acme-freight."
        />
        <Field label="USDOT number (optional)" name="dotNumber" inputMode="numeric" error={fe['dotNumber']} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" name="firstName" autoComplete="given-name" required error={fe['owner.firstName']} />
          <Field label="Last name" name="lastName" autoComplete="family-name" required error={fe['owner.lastName']} />
        </div>
        <Field label="Email" name="email" type="email" autoComplete="username" required error={fe['owner.email']} />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          error={fe['owner.password']}
          hint="At least 12 characters. A short phrase works well."
        />
        <Button type="submit" busy={busy} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}

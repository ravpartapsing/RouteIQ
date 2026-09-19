import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { InviteUserResponse, User } from '@routeiq/contracts';
import { request } from '../lib/api';
import { useMe } from '../lib/auth';
import { Alert, Badge, Button, Field, IssuedCode, Modal, PageHeader, Select, useFormErrors } from '../components/ui';

const ROLE_LABEL = { OWNER: 'Owner', ADMIN: 'Admin', DISPATCHER: 'Dispatcher', ACCOUNTING: 'Accounting' } as const;
const STATUS = { ACTIVE: ['green', 'Active'], PENDING: ['amber', 'Invited'], INACTIVE: ['gray', 'Inactive'] } as const;

export function Team() {
  const me = useMe();
  const [items, setItems] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [issued, setIssued] = useState<InviteUserResponse | null>(null);

  const load = useCallback(() => {
    request<{ items: User[] }>('GET', '/v1/users')
      .then((r) => setItems(r.items))
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function act(u: User, action: 'code' | 'off' | 'on') {
    try {
      if (action === 'code') {
        if (!confirm(`Reset ${u.firstName}'s password? They'll be signed out and need the new code.`)) return;
        setIssued(await request<InviteUserResponse>('POST', `/v1/users/${u.id}/reissue-code`));
      } else {
        await request('PATCH', `/v1/users/${u.id}/status`, { status: action === 'off' ? 'INACTIVE' : 'ACTIVE' });
      }
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle="People who use this portal. Invitees set their own password with a one-time code."
        actions={<Button onClick={() => setInviting(true)}>Invite</Button>}
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items === null && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
            {items?.map((u) => {
              const [tone, label] = STATUS[u.status];
              const editable = u.id !== me.principal.id && u.role !== 'OWNER';
              return (
                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {u.firstName} {u.lastName}
                    {u.id === me.principal.id && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                  <td className="px-4 py-3"><Badge tone={tone}>{label}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {editable && u.status !== 'INACTIVE' && (
                      <>
                        <Button variant="ghost" onClick={() => void act(u, 'code')}>Reset password</Button>
                        <Button variant="ghost" onClick={() => void act(u, 'off')}>Deactivate</Button>
                      </>
                    )}
                    {editable && u.status === 'INACTIVE' && (
                      <Button variant="ghost" onClick={() => void act(u, 'on')}>Reactivate</Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {inviting && (
        <Invite
          onClose={() => setInviting(false)}
          onInvited={(r) => {
            setInviting(false);
            setIssued(r);
            load();
          }}
        />
      )}
      {issued && (
        <Modal title="Invitation code" onClose={() => setIssued(null)}>
          <IssuedCode
            code={issued.activation.code}
            expiresAt={issued.activation.expiresAt}
            who={
              <>
                Send <strong>{issued.user.firstName}</strong> to <strong>{window.location.origin}/activate</strong> with
                their email <strong>{issued.user.email}</strong> and this code:
              </>
            }
          />
          <div className="mt-5 text-right"><Button onClick={() => setIssued(null)}>Done</Button></div>
        </Modal>
      )}
    </div>
  );
}

function Invite({ onClose, onInvited }: { onClose: () => void; onInvited: (r: InviteUserResponse) => void }) {
  const errors = useFormErrors();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    errors.clear();
    setBusy(true);
    try {
      onInvited(
        await request<InviteUserResponse>('POST', '/v1/users', {
          firstName: String(f.get('firstName')).trim(),
          lastName: String(f.get('lastName')).trim(),
          email: String(f.get('email')).trim(),
          role: String(f.get('role')),
        }),
      );
    } catch (err) {
      errors.set(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Invite a teammate" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        {errors.message && <Alert>{errors.message}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" name="firstName" required error={errors.fields['firstName']} />
          <Field label="Last name" name="lastName" required error={errors.fields['lastName']} />
        </div>
        <Field label="Email" name="email" type="email" required error={errors.fields['email']} />
        <Select
          label="Role"
          name="role"
          defaultValue="DISPATCHER"
          options={[
            ['DISPATCHER', 'Dispatcher — orders, dispatch, drivers'],
            ['ACCOUNTING', 'Accounting — invoices and settlements'],
            ['ADMIN', 'Admin — everything, including team and settings'],
          ]}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" busy={busy}>Invite</Button>
        </div>
      </form>
    </Modal>
  );
}

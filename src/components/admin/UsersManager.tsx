"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { KeyRound, Plus, X } from "lucide-react";
import { inviteUserAction, resetUserPasswordAction, updateUserAction } from "@/app/(admin)/admin/(dashboard)/users/actions";
import { FormError } from "@/components/admin/FormSection";
import { useToast } from "@/components/admin/ToastProvider";
import { ROLE_LABELS, ADMIN_ROLES, type AdminRole } from "@/lib/admin/permissions";
import type { ActionResult } from "@/lib/admin/action-result";

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  forcePasswordChange: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
};

export function UsersManager({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", role: "editor" as AdminRole });
  const [inviteResult, setInviteResult] = useState<ActionResult<{ temporaryPassword: string; email: string; emailSent: boolean }> | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string; emailed: boolean } | null>(null);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [edit, setEdit] = useState({ name: "", role: "editor" as AdminRole, active: true });
  const [pending, startTransition] = useTransition();

  const submitInvite = () => {
    startTransition(async () => {
      const response = await inviteUserAction(invite);
      setInviteResult(response);
      if (response.ok) {
        setCredentials({
          email: response.data.email,
          password: response.data.temporaryPassword,
          emailed: response.data.emailSent,
        });
        setInvite({ name: "", email: "", role: "editor" });
        router.refresh();
      }
    });
  };

  const submitEdit = () => {
    if (!editing) return;
    startTransition(async () => {
      const response = await updateUserAction({ id: editing.id, ...edit });
      if (response.ok) {
        toast("Account updated.");
        setEditing(null);
        router.refresh();
      } else {
        toast(response.error, "error");
      }
    });
  };

  const resetPassword = (user: AdminUserRow) => {
    startTransition(async () => {
      const response = await resetUserPasswordAction({ id: user.id });
      if (response.ok) {
        setCredentials({ email: user.email, password: response.data.temporaryPassword, emailed: response.data.emailSent });
        router.refresh();
      } else {
        toast(response.error, "error");
      }
    });
  };

  return (
    <div className="space-y-4">
      {credentials ? (
        <div className="rounded-[8px] border border-warning/25 bg-warning-pale p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-semibold text-warning">Temporary password</h2>
              <p className="mt-1 text-[12px] text-warning/90">
                Share this with {credentials.email}. {credentials.emailed ? "An email was also sent." : "Email delivery failed, so share it directly."} The account must change it at sign-in.
              </p>
              <code className="mt-2 block w-fit rounded border border-warning/25 bg-white px-2 py-1 text-[13px] text-ink">
                {credentials.password}
              </code>
            </div>
            <button
              type="button"
              onClick={() => setCredentials(null)}
              className="p-1 text-warning hover:opacity-70"
              aria-label="Dismiss temporary password"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setInviteResult(null);
            setInviteOpen(true);
          }}
          className="inline-flex h-9 items-center gap-2 rounded-[6px] bg-navy px-3.5 text-[13px] font-medium text-white hover:bg-navy-deep"
        >
          <Plus className="h-4 w-4" />
          Invite user
        </button>
      </div>

      <div className="overflow-x-auto rounded-[8px] border border-admin-line bg-white">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-tile">
            <tr>
              {["Name", "Role", "Status", "Last sign-in", "Actions"].map((header) => (
                <th key={header} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-admin-muted">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-admin-line">
                <td className="px-4 py-3">
                  <p className="text-[13px] font-medium text-ink">{user.name}</p>
                  <p className="text-[11px] text-admin-muted">{user.email}</p>
                  {user.forcePasswordChange ? (
                    <p className="mt-0.5 text-[10px] text-warning">Password change pending</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[13px]">{ROLE_LABELS[user.role]}</td>
                <td className="px-4 py-3">
                  <span className={`text-[12px] font-medium ${user.active ? "text-success" : "text-danger"}`}>
                    {user.active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[12px] text-admin-muted">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(user);
                        setEdit({ name: user.name, role: user.role, active: user.active });
                      }}
                      className="text-[12px] font-medium text-brand-deep hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => resetPassword(user)}
                      disabled={pending}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-admin-muted hover:text-ink disabled:opacity-50"
                    >
                      <KeyRound className="h-3 w-3" />
                      Reset password
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-admin-muted">
        Signed in as {users.find((user) => user.id === currentUserId)?.email ?? "current user"}. The last active owner cannot be deactivated or demoted.
      </p>

      <Dialog.Root open={inviteOpen} onOpenChange={setInviteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-navy-deep/45" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[8px] border border-admin-line bg-white p-5">
            <Dialog.Title className="text-[16px] font-semibold text-ink">Invite a user</Dialog.Title>
            <Dialog.Description className="mt-1 text-[12px] text-admin-muted">
              A temporary password is generated. The user must change it at first sign-in.
            </Dialog.Description>
            <div className="mt-4 space-y-3">
              <FormError message={inviteResult && !inviteResult.ok ? inviteResult.error : null} />
              <div>
                <label className="admin-label" htmlFor="invite-name">Full name</label>
                <input
                  id="invite-name"
                  className="admin-field"
                  value={invite.name}
                  onChange={(event) => setInvite({ ...invite, name: event.target.value })}
                />
              </div>
              <div>
                <label className="admin-label" htmlFor="invite-email">Email</label>
                <input
                  id="invite-email"
                  type="email"
                  className="admin-field"
                  value={invite.email}
                  onChange={(event) => setInvite({ ...invite, email: event.target.value })}
                />
              </div>
              <div>
                <label className="admin-label" htmlFor="invite-role">Role</label>
                <select
                  id="invite-role"
                  className="admin-field"
                  value={invite.role}
                  onChange={(event) => setInvite({ ...invite, role: event.target.value as AdminRole })}
                >
                  {ADMIN_ROLES.map((role) => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" className="inline-flex h-9 items-center rounded-[6px] border border-admin-line px-3.5 text-[13px]">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                disabled={pending}
                onClick={submitInvite}
                className="inline-flex h-9 items-center rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white disabled:opacity-60"
              >
                Send invite
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-navy-deep/45" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[8px] border border-admin-line bg-white p-5">
            <Dialog.Title className="text-[16px] font-semibold text-ink">Edit account</Dialog.Title>
            <Dialog.Description className="mt-1 text-[12px] text-admin-muted">{editing?.email}</Dialog.Description>
            <div className="mt-4 space-y-3">
              <div>
                <label className="admin-label" htmlFor="edit-name">Full name</label>
                <input
                  id="edit-name"
                  className="admin-field"
                  value={edit.name}
                  onChange={(event) => setEdit({ ...edit, name: event.target.value })}
                />
              </div>
              <div>
                <label className="admin-label" htmlFor="edit-role">Role</label>
                <select
                  id="edit-role"
                  className="admin-field"
                  value={edit.role}
                  onChange={(event) => setEdit({ ...edit, role: event.target.value as AdminRole })}
                >
                  {ADMIN_ROLES.map((role) => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={edit.active}
                  onChange={(event) => setEdit({ ...edit, active: event.target.checked })}
                />
                Account is active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="inline-flex h-9 items-center rounded-[6px] border border-admin-line px-3.5 text-[13px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={submitEdit}
                className="inline-flex h-9 items-center rounded-[6px] bg-navy px-4 text-[13px] font-medium text-white disabled:opacity-60"
              >
                Save account
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

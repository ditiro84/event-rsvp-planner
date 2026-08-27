import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, KeyRound, Mail, Plus, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import {
  useCancelCollaboratorInvite,
  useCollaborators,
  useInviteCollaborator,
  useRemoveCollaborator,
} from "@/hooks/useCollaborators";
import { useCreateStaffPass, useRevokeStaffPass, useStaffPasses } from "@/hooks/useStaffPasses";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Tooltip } from "@/components/ui/Tooltip";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { getApiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { EventCollaboratorInviteRecord, EventCollaboratorRecord, EventStaffPassRecord } from "@/types";

function nameInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "?";
}

export function TeamTab({ eventId }: { eventId: string }) {
  const { data, isLoading, isError, refetch } = useCollaborators(eventId);
  const { data: passes, isLoading: passesLoading, isError: passesError, refetch: refetchPasses } = useStaffPasses(eventId);
  const removeCollaborator = useRemoveCollaborator(eventId);
  const cancelInvite = useCancelCollaboratorInvite(eventId);
  const revokePass = useRevokeStaffPass(eventId);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreatePass, setShowCreatePass] = useState(false);

  async function handleRemove(collaborator: EventCollaboratorRecord) {
    if (!confirm(`Remove ${collaborator.user.name} from this event's staff? Their access ends immediately.`)) return;
    try {
      await removeCollaborator.mutateAsync(collaborator.id);
      toast.success("Staff member removed");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleCancelInvite(invite: EventCollaboratorInviteRecord) {
    try {
      await cancelInvite.mutateAsync(invite.id);
      toast.success("Invite cancelled");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleRevokePass(pass: EventStaffPassRecord) {
    if (!confirm(`Revoke the door check-in pass for "${pass.name}"? Their link will stop working immediately.`)) return;
    try {
      await revokePass.mutateAsync(pass.id);
      toast.success("Pass revoked");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  function copyPassLink(pass: EventStaffPassRecord) {
    const url = `${window.location.origin}/staff/${pass.token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-slate-950">Team & Access</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Give other people working on this event a way in -- without handing over ownership.
        </p>
      </div>

      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900">Staff Collaborators</h2>
          </div>
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <UserPlus className="h-4 w-4" />
            Invite Staff
          </Button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Staff can manage guests, RSVP, seating, check-in, vendors, merchandise, and tickets for this event. They
          can't delete the event, connect payout accounts, or manage other staff.
        </p>

        {isError ? (
          <ErrorState title="We couldn't load staff" onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <Spinner />
        ) : data.collaborators.length === 0 && data.pendingInvites.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="h-6 w-6" />}
            title="No staff added yet"
            description="Invite someone by email to give them working access to this one event."
            action={
              <Button size="sm" onClick={() => setShowInvite(true)}>
                <UserPlus className="h-4 w-4" />
                Invite Staff
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {data.collaborators.map((collaborator) => (
              <div key={collaborator.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                    {nameInitials(collaborator.user.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{collaborator.user.name}</p>
                    <p className="truncate text-xs text-slate-500">{collaborator.user.email}</p>
                  </div>
                  <Badge variant="brand">Staff</Badge>
                </div>
                <Tooltip label="Remove staff access">
                  <button
                    onClick={() => handleRemove(collaborator)}
                    aria-label={`Remove ${collaborator.user.name}`}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
            ))}
            {data.pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{invite.email}</p>
                    <p className="text-xs text-slate-500">Invited {formatDate(invite.createdAt)}</p>
                  </div>
                  <Badge variant="warning">Invite sent</Badge>
                </div>
                <Tooltip label="Cancel invite">
                  <button
                    onClick={() => handleCancelInvite(invite)}
                    aria-label={`Cancel invite for ${invite.email}`}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900">Door Check-in Passes</h2>
          </div>
          <Button size="sm" onClick={() => setShowCreatePass(true)}>
            <Plus className="h-4 w-4" />
            Create Pass
          </Button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          A named, no-account link for day-of check-in duty only -- hand it to a door staffer and revoke it the
          moment their shift ends, without touching anyone else's access.
        </p>

        {passesError ? (
          <ErrorState title="We couldn't load staff passes" onRetry={() => refetchPasses()} />
        ) : passesLoading || !passes ? (
          <Spinner />
        ) : passes.length === 0 ? (
          <EmptyState
            icon={<KeyRound className="h-6 w-6" />}
            title="No check-in passes yet"
            description="Create a named pass for anyone working the door who doesn't need a full account."
            action={
              <Button size="sm" onClick={() => setShowCreatePass(true)}>
                <Plus className="h-4 w-4" />
                Create Pass
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {passes.map((pass) => (
              <div key={pass.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-600">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{pass.name}</p>
                    <p className="text-xs text-slate-500">
                      {pass.active ? `Created ${formatDate(pass.createdAt)}` : `Revoked ${formatDate(pass.revokedAt)}`}
                    </p>
                  </div>
                  <Badge variant={pass.active ? "success" : "neutral"}>{pass.active ? "Active" : "Revoked"}</Badge>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {pass.active && (
                    <>
                      <Tooltip label="Copy check-in link">
                        <button
                          onClick={() => copyPassLink(pass)}
                          aria-label={`Copy check-in link for ${pass.name}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      <Tooltip label="Revoke pass">
                        <button
                          onClick={() => handleRevokePass(pass)}
                          aria-label={`Revoke pass for ${pass.name}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <InviteCollaboratorModal open={showInvite} onClose={() => setShowInvite(false)} eventId={eventId} />
      <CreateStaffPassModal open={showCreatePass} onClose={() => setShowCreatePass(false)} eventId={eventId} />
    </div>
  );
}

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});
type InviteFormValues = z.infer<typeof inviteSchema>;

function InviteCollaboratorModal({ open, onClose, eventId }: { open: boolean; onClose: () => void; eventId: string }) {
  const inviteCollaborator = useInviteCollaborator(eventId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({ resolver: zodResolver(inviteSchema), defaultValues: { email: "" } });

  async function onSubmit(values: InviteFormValues) {
    try {
      const result = await inviteCollaborator.mutateAsync(values.email);
      toast.success(
        result.collaborator ? `${values.email} now has staff access` : `Invite sent to ${values.email}`
      );
      reset();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite staff to this event">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-slate-500">
          If they already have a Gadaova account, they'll get access right away. Otherwise, we'll email them and
          it'll be waiting the moment they register with this address.
        </p>
        <Field label="Email address" htmlFor="collab-email" error={errors.email?.message}>
          <Input id="collab-email" type="email" placeholder="staff@example.com" {...register("email")} error={!!errors.email} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Send Invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const passSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
});
type PassFormValues = z.infer<typeof passSchema>;

function CreateStaffPassModal({ open, onClose, eventId }: { open: boolean; onClose: () => void; eventId: string }) {
  const createPass = useCreateStaffPass(eventId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PassFormValues>({ resolver: zodResolver(passSchema), defaultValues: { name: "" } });

  async function onSubmit(values: PassFormValues) {
    try {
      const pass = await createPass.mutateAsync(values.name);
      const url = `${window.location.origin}/staff/${pass.token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Pass created -- link copied to clipboard");
      reset();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a door check-in pass">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-slate-500">
          Name it after the person who'll use it (e.g. "Chidi -- door"). They don't need an account -- just the link
          this creates, which only lets them scan guests and tickets in at the door.
        </p>
        <Field label="Pass name" htmlFor="pass-name" error={errors.name?.message}>
          <Input id="pass-name" placeholder="e.g. Chidi -- door" {...register("name")} error={!!errors.name} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Pass
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { requireAdminUser } from "@/lib/auth";

export default async function AdminSettingsPage() {
  const admin = await requireAdminUser();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-[var(--neutral-500)]">
          Settings
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">Admin profile</h1>
      </div>

      <section className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5">
        <dl className="grid gap-4 md:grid-cols-2 text-sm">
          <Info label="Name" value={admin.fullName} />
          <Info label="Phone" value={admin.phone} />
          <Info label="Email" value={admin.email} />
          <Info label="Role" value={admin.role} />
        </dl>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">{label}</dt>
      <dd className="mt-1 text-[var(--neutral-200)]">{value}</dd>
    </div>
  );
}

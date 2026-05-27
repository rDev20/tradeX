import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TelegramConnectFlow } from "@/app/onboarding/telegram/telegram-connect-flow";

export default async function AdminTelegramPage() {
  const admin = await requireAdminUser();
  const telegram = await db.userTelegramAccount.findUnique({ where: { userId: admin.id } });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-[var(--neutral-500)]">
          Admin Telegram
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">Connect source account</h1>
        <p className="text-sm text-[var(--neutral-400)] mt-2 max-w-2xl">
          Only the admin Telegram account receives and syncs channels. User accounts do not connect
          Telegram anymore.
        </p>
      </div>

      {telegram?.connectedAt ? (
        <section className="rounded-md border border-[var(--neutral-800)] bg-[var(--neutral-900)] p-5 max-w-xl">
          <div className="text-sm font-semibold text-[var(--success)]">Telegram connected</div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Info label="Phone" value={telegram.phone} />
            <Info label="Telegram user" value={telegram.tgUsername ? `@${telegram.tgUsername}` : telegram.tgFirstName ?? "Connected"} />
            <Info label="Session" value={telegram.sessionPath} />
            <Info label="Connected at" value={telegram.connectedAt.toLocaleString()} />
          </dl>
        </section>
      ) : (
        <TelegramConnectFlow
          defaultPhone={admin.phone}
          requestEndpoint="/api/admin/telegram/request-code"
          submitEndpoint="/api/admin/telegram/submit-code"
          successCopy="Admin Telegram connected."
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-[var(--neutral-500)]">{label}</dt>
      <dd className="mt-1 text-[var(--neutral-200)] break-words">{value}</dd>
    </div>
  );
}

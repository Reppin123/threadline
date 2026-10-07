"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cancelScheduled, forgetCustomer, rollbackTo } from "@/app/(app)/actions";

export function CancelScheduled({ botId, id }: { botId: string; id: string }) {
  const [p, start] = useTransition();
  return <button className="btn btn-sm" disabled={p} onClick={() => start(() => cancelScheduled(botId, id))}>Cancel</button>;
}
export function ForgetCustomer({ botId, id }: { botId: string; id: string }) {
  const [p, start] = useTransition();
  return <button className="btn btn-sm btn-danger" disabled={p} onClick={() => { if (confirm("Delete everything the bot remembers about this customer?")) start(() => forgetCustomer(botId, id)); }}>Forget</button>;
}
export function RollbackButton({ botId, versionId, number }: { botId: string; versionId: string; number: number }) {
  const router = useRouter();
  const [p, start] = useTransition();
  return (
    <button className="btn btn-sm" disabled={p} onClick={() => {
      if (!confirm(`Roll back to v${number}? Customers get v${number} right away.`)) return;
      start(async () => { const r = await rollbackTo(botId, versionId); if (!r.ok) alert(r.error); router.refresh(); });
    }}>Roll back</button>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { clearTestData } from "@/app/(app)/actions";

export function ClearTestData({ botId, tableId, tableName, count }: { botId: string; tableId: string; tableName: string; count: number }) {
  const router = useRouter();
  const [p, start] = useTransition();
  return (
    <button className="btn btn-sm btn-danger" disabled={p || count === 0} data-clear-test={tableId} onClick={() => {
      if (!confirm(`Delete ${count} test row${count === 1 ? "" : "s"} from ${tableName}? Real customers' rows stay.`)) return;
      start(async () => { await clearTestData(botId, tableId); router.refresh(); });
    }}>{p ? "Clearing…" : "Clear test data"}</button>
  );
}

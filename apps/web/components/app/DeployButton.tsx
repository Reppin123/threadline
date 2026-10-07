"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deployBot } from "@/app/(app)/actions";

export function DeployButton({ botId, nothing }: { botId: string; nothing: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <button
        className="btn btn-blue"
        id="deploy-btn"
        disabled={pending || nothing}
        title={nothing ? "Nothing new to deploy" : undefined}
        onClick={() => start(async () => {
          const r = await deployBot(botId);
          setMsg(r.ok ? `Deployed v${r.number}` : `Deploy failed: ${r.error}`);
          router.refresh();
          setTimeout(() => setMsg(null), 4000);
        })}
      >
        {pending ? <><span className="spinner" /> Deploying…</> : "Deploy to customers →"}
      </button>
      {msg && <div className="toast" role="status" id="deploy-toast">{msg}</div>}
    </>
  );
}

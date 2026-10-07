import type { Change } from "@/lib/diff";

export function DiffList({ changes, empty = "No changes." }: { changes: Change[]; empty?: string }) {
  if (!changes.length) return <p className="muted" style={{ fontSize: 13.5 }}>{empty}</p>;
  return (
    <div className="diff">
      {changes.slice(0, 80).map((c, i) => (
        <div key={i} style={{ padding: "3px 0" }}>
          <span className="key">{c.path}: </span>
          {c.kind === "added" && <span className="add">+ {c.after}</span>}
          {c.kind === "removed" && <span className="del">− {c.before}</span>}
          {c.kind === "changed" && <><span className="del">{c.before}</span> → <span className="add">{c.after}</span></>}
        </div>
      ))}
      {changes.length > 80 && <div className="key">…and {changes.length - 80} more</div>}
    </div>
  );
}

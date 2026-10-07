"use client";
import { useState, useTransition } from "react";
import { deleteTableRow, saveTableRow } from "@/app/(app)/actions";

type Row = { id: string; data: Record<string, unknown>; created_at: string };
const str = (v: unknown) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));

export function TableEditor({ botId, tableId, columns, rows, editable }: { botId: string; tableId: string; columns: string[]; rows: Row[]; editable: boolean }) {
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const cols = columns.length ? columns : [...new Set(rows.flatMap((r) => Object.keys(r.data)))];
  const save = (r: Row, col: string, value: string) => {
    if (str(r.data[col]) === value) return;
    const data = Object.fromEntries(cols.map((c) => [c, str(r.data[c])]));
    data[col] = value;
    start(() => saveTableRow(botId, tableId, r.id, data));
  };
  return (
    <div className="table-wrap">
      <table className="t">
        <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}<th style={{ width: 120 }}>Added</th>{editable && <th style={{ width: 60 }} />}</tr></thead>
        <tbody>
          {rows.length === 0 && !editable && <tr><td colSpan={cols.length + 1} className="muted">Nothing saved yet.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id}>
              {cols.map((c) => (
                <td key={c}>{editable ? <input defaultValue={str(r.data[c])} aria-label={c} onBlur={(e) => save(r, c, e.target.value)} /> : str(r.data[c])}</td>
              ))}
              <td className="muted" style={{ whiteSpace: "nowrap" }}>{r.created_at.slice(0, 10)}</td>
              {editable && <td><button className="btn btn-ghost btn-sm" aria-label="Delete row" disabled={pending} onClick={() => start(() => deleteTableRow(botId, tableId, r.id))}>×</button></td>}
            </tr>
          ))}
          {editable && (
            <tr>
              {cols.map((c) => <td key={c}><input placeholder={c} value={draft[c] ?? ""} aria-label={`New ${c}`} onChange={(e) => setDraft((d) => ({ ...d, [c]: e.target.value }))} /></td>)}
              <td colSpan={2}>
                <button className="btn btn-sm btn-primary" disabled={pending || !Object.values(draft).some((v) => v.trim())} onClick={() => start(async () => { await saveTableRow(botId, tableId, null, draft); setDraft({}); })}>Add row</button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

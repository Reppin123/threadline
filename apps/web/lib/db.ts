// @threadline/db, but rows come back as plain objects. node:sqlite returns null-prototype rows, which React refuses
// to pass from Server to Client Components ("Classes or null prototypes are not supported").
import { all as rawAll, get as rawGet } from "@threadline/db";
export * from "@threadline/db";

type Params = Parameters<typeof rawAll>[1];
export function all<T = any>(sql: string, p?: Params): T[] {
  return rawAll<T>(sql, p).map((r) => ({ ...(r as object) }) as T);
}
export function get<T = any>(sql: string, p?: Params): T | undefined {
  const r = rawGet<T>(sql, p);
  return r ? ({ ...(r as object) } as T) : r;
}

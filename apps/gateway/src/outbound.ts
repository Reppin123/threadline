// Delivers due scheduled_messages. Exactly-once per row: a row is claimed with a conditional UPDATE
// (status scheduled → sending) before anything is sent, so overlapping ticks or a second gateway can't double-send.
// Failures are retried with backoff (attempts / next_attempt_at, migration 0003) up to GATEWAY_MAX_SEND_ATTEMPTS.
import { all, run, get, logEvent } from "@threadline/db";
import type { Channel } from "@threadline/core/contract";
import type { Gateway } from "./gateway.ts";
import * as router from "./router.ts";
import { billing, stripeBilling, safety } from "@threadline/core";
import { log } from "./log.ts";

interface DueRow {
  id: string; bot_id: string; customer_id: string; channel: Channel; prompt: string; text: string | null;
  attempts: number; handle: string; bot_name: string;
}

export class OutboundWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  lastTickAt: Date | null = null;
  stats = { sent: 0, failed: 0, retried: 0 };

  constructor(private gw: Gateway, private channels: () => string[]) {}

  start() {
    this.timer = setInterval(() => void this.tick(), this.gw.cfg.outboundPollMs);
    void this.tick();
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  dueCount(): number {
    const ch = this.channels();
    if (!ch.length) return 0;
    return get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM scheduled_messages WHERE status = 'scheduled' AND channel IN (${ch.map(() => "?").join(",")})
         AND julianday(send_at) <= julianday('now')`, ch)?.n ?? 0;
  }

  /** One pass. Returns the number of rows processed. Safe to call concurrently. */
  async tick(): Promise<number> {
    if (this.running || safety.killed("outbound")) return 0;
    this.running = true;
    this.lastTickAt = new Date();
    try {
      // Rows left in 'sending' by a crash are NOT re-sent (could duplicate); surface them as failed instead.
      run(`UPDATE scheduled_messages SET status = 'failed', error = 'gateway stopped mid-send; not retried to avoid a duplicate'
             WHERE status = 'sending' AND julianday(next_attempt_at) < julianday('now', '-5 minutes')`);
      const ch = this.channels();
      if (!ch.length) return 0;
      const rows = all<DueRow>(
        `SELECT sm.id, sm.bot_id, sm.customer_id, sm.channel, sm.prompt, sm.text, sm.attempts, c.handle, b.name AS bot_name
           FROM scheduled_messages sm JOIN customers c ON c.id = sm.customer_id JOIN bots b ON b.id = sm.bot_id
          WHERE sm.status = 'scheduled' AND sm.channel IN (${ch.map(() => "?").join(",")})
            AND julianday(sm.send_at) <= julianday('now')
            AND (sm.next_attempt_at IS NULL OR julianday(sm.next_attempt_at) <= julianday('now'))
          ORDER BY julianday(sm.send_at) LIMIT 25`, ch);
      let n = 0;
      for (const r of rows) { if (await this.deliver(r)) n++; }
      return n;
    } catch (e) {
      this.gw.fail(null, "outbound.tick", e);
      return 0;
    } finally {
      this.running = false;
    }
  }

  private claim(id: string): boolean {
    const res = run(`UPDATE scheduled_messages SET status = 'sending', attempts = attempts + 1, next_attempt_at = strftime('%Y-%m-%d %H:%M:%f', 'now')
                      WHERE id = ? AND status = 'scheduled'`, [id]);
    return Number(res.changes) === 1;
  }

  private async deliver(r: DueRow): Promise<boolean> {
    if (!this.claim(r.id)) return false;      // someone else has it
    const attempt = r.attempts + 1;
    // billing: a bot-initiated message opens (or continues) a conversation like a reply does; refused → failed, not retried.
    const admit = billing.admitTurn(r.bot_id, r.channel, r.handle);
    if (!admit.ok) {
      run("UPDATE scheduled_messages SET status = 'failed', error = ? WHERE id = ?", [`billing: ${admit.message}`, r.id]);
      logEvent(r.bot_id, "scheduled_failed", { id: r.id, attempt, error: `billing_${admit.reason}` });
      this.stats.failed++;
      return false;
    }
    try {
      let text = r.text;
      let conversationId: string | undefined;
      if (!text) {
        ({ text, conversationId } = await this.gw.core.composeOutbound(r.bot_id, r.channel, r.handle, r.prompt));
        run("UPDATE scheduled_messages SET text = ? WHERE id = ?", [text, r.id]);   // a retry re-sends the same words
      }
      const { space, binding } = await this.gw.spaceFor(r.channel, r.handle, r.bot_id);
      // On the shared line, tell the customer who is writing if they're currently talking to a different bot.
      const bound = binding.fixedBotId ? r.bot_id : router.boundBotId(binding.routeChannel, r.handle);
      const body = bound && bound !== r.bot_id ? `${r.bot_name}: ${text}` : text;
      await this.gw.sendBubbles(space, binding, [body], r.bot_id, { scheduledId: r.id });
      run("UPDATE scheduled_messages SET status = 'sent', sent_at = datetime('now'), error = NULL WHERE id = ?", [r.id]);
      if (admit.billable) {
        const conv = conversationId || billing.activeConversationId(r.bot_id, r.channel, r.handle) || `sched:${r.id}`;
        if (billing.recordConversation(r.bot_id, conv, r.channel).overage) void stripeBilling.reportOverage().catch(() => {});
      }
      logEvent(r.bot_id, "scheduled_sent", { id: r.id, channel: r.channel, attempt });
      this.stats.sent++;
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Photon Free/Pro shared pool only messages handles registered as project Users; retrying can't help.
      const notAllowed = /target not allowed/i.test(msg);
      if (notAllowed || attempt >= this.gw.cfg.maxSendAttempts) {
        if (notAllowed) log.warn(`${r.handle} is not an allowed recipient: add the exact handle Apple sends iMessage from ` +
          "(check at https://debug.photon.codes) under Users in app.photon.codes, or `photon spectrum users add`.");
        run("UPDATE scheduled_messages SET status = 'failed', error = ? WHERE id = ?", [msg.slice(0, 500), r.id]);
        logEvent(r.bot_id, "scheduled_failed", { id: r.id, attempt, error: msg.slice(0, 300) });
        this.stats.failed++;
        log.warn(`scheduled ${r.id} failed permanently: ${msg}`);
      } else {
        const backoffSec = ((this.gw.cfg.retryBaseMs / 1000) * 4 ** attempt).toFixed(3);
        run(`UPDATE scheduled_messages SET status = 'scheduled', error = ?, next_attempt_at = strftime('%Y-%m-%d %H:%M:%f', 'now', ?) WHERE id = ?`,
          [msg.slice(0, 500), `+${backoffSec} seconds`, r.id]);
        this.stats.retried++;
        log.warn(`scheduled ${r.id} attempt ${attempt} failed (${msg}); retrying in ${backoffSec}s`);
      }
      return false;
    }
  }
}

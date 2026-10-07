// Tiny leveled logger. In TUI mode the terminal provider forwards console output into its __system__ chat.
const quiet = () => process.env.GATEWAY_LOG === "silent";
const ts = () => new Date().toISOString().slice(11, 19);
export const log = {
  info: (...a: unknown[]) => { if (!quiet()) console.log(`[gateway ${ts()}]`, ...a); },
  warn: (...a: unknown[]) => { if (!quiet()) console.warn(`[gateway ${ts()}] WARN`, ...a); },
  error: (...a: unknown[]) => { if (process.env.GATEWAY_LOG !== "silent") console.error(`[gateway ${ts()}] ERROR`, ...a); },
};

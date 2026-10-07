// One-off cloud send (no stream consumption) to check Photon delivery / allowlisting:
//   tsx scripts/send-once.ts +15551234567 "hello"
// Credentials: SPECTRUM_PROJECT_ID/SECRET env or macOS Keychain ("Threadline Spectrum").
import { Spectrum } from "spectrum-ts";
import { loadKeychainCreds } from "../src/config.ts";

const [handle, text = "Threadline: iMessage delivery check ✅"] = process.argv.slice(2);
if (!handle) { console.error("usage: tsx scripts/send-once.ts <E.164 phone|email> [text]"); process.exit(2); }
loadKeychainCreds();
const { imessage } = await import("spectrum-ts/providers/imessage");
const app = await Spectrum({
  projectId: (process.env.SPECTRUM_PROJECT_ID || process.env.PHOTON_PROJECT_ID)!,
  projectSecret: (process.env.SPECTRUM_PROJECT_SECRET || process.env.PHOTON_PROJECT_SECRET)!,
  providers: [imessage.config()],
});
try {
  const im = (imessage as any)(app);
  const space = await im.space.create(await im.user(handle));
  await space.send(text);
  console.log("sent ✔");
} catch (e) {
  console.error("send failed:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await app.stop().catch(() => {});
}

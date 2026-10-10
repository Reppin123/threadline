import "./app.css";
import { requireUser, appUrl } from "@/lib/auth";
import { listBotsBasic, trialOf } from "@/lib/data";
import { all } from "@/lib/db";
import { TopBar } from "@/components/app/TopBar";
import { BillingBanner } from "./billing/Banner";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const bots = listBotsBasic(user.id);
  const trial = trialOf(user.id);
  const apiKeys = all("SELECT id,name,key_prefix,bot_id,can_read_notes,created_at,last_used_at FROM api_keys WHERE user_id=? ORDER BY created_at DESC", [user.id]);
  return (
    <div className="app">
      <a className="skip" href="#main">Skip to content</a>
      <TopBar user={{ name: user.name, email: user.email, plan: user.plan }} bots={bots} trial={trial} apiKeys={apiKeys as any} appUrl={appUrl()} />
      <BillingBanner userId={user.id} />
      {children}
    </div>
  );
}

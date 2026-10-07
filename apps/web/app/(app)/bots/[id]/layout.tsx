import { requireUser } from "@/lib/auth";
import { getBot } from "@/lib/data";
import { WsNav } from "@/components/app/WsNav";

export default async function BotLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/bots/${id}/build`);
  const bot = getBot(user.id, id);
  return (
    <div className="ws">
      <WsNav botId={bot.id} name={bot.name} status={bot.status} />
      <div className="ws-main">{children}</div>
    </div>
  );
}

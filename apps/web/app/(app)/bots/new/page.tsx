import type { Metadata } from "next";
import { cookies } from "next/headers";
import { core } from "@threadline/core";
import { requireUser } from "@/lib/auth";
import { Wizard } from "@/components/app/Wizard";

export const metadata: Metadata = { title: "Start a bot" };

export default async function NewBot({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("/bots/new");
  const sp = await searchParams;
  const jar = await cookies();
  const idea = (sp.idea || jar.get("tl_idea")?.value || "").slice(0, 2000);
  const kind = sp.kind && ["website", "api", "mcp", "idea"].includes(sp.kind) ? sp.kind : idea ? "idea" : undefined;
  let first = null as Awaited<ReturnType<typeof core.nextWizardQuestion>>;
  try {
    first = await core.nextWizardQuestion([]);
  } catch (e) {
    console.error("[web] first wizard question", e);
  }
  first ??= { question: "What are we starting from?", chips: ["Just an idea", "Existing website or app", "An MCP server", "Some APIs"], multi: false };
  return (
    <main id="main" className="wizard">
      <div>
        <h1>Start a <span className="h-serif">bot</span></h1>
        <p className="muted">A few quick questions, then Threadline writes the first version.</p>
      </div>
      <Wizard first={first} idea={idea} kind={kind} />
    </main>
  );
}

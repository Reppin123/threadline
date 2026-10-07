// Public entry of @threadline/core: the CoreAPI implementation, wired from the modules below.
import type { CoreAPI } from "./contract.ts";
import { nextWizardQuestion } from "./wizard.ts";
import { createBot, buildBot, builderChat } from "./builder.ts";
import { chat, composeOutbound } from "./runtime.ts";
import { runChecks, getTestRun } from "./checks.ts";
import { deploy, rollback } from "./versions.ts";
import { getInsights } from "./insights.ts";
export * from "./contract.ts";

export const core: CoreAPI = {
  nextWizardQuestion,
  createBot,
  buildBot,
  builderChat,
  chat: (input) => chat(input),
  composeOutbound,
  runChecks: (botId, opts) => runChecks(botId, opts),
  getTestRun,
  deploy,
  rollback,
  getInsights,
};

// Extra helpers (additive): wizard → source mapping, awaiting a check run, provider info.
export { sourceFromWizard } from "./wizard.ts";
export { waitForRun } from "./checks.ts";
export { providerName } from "./llm.ts";
export { refreshBuiltins } from "./builder.ts";

export default core;

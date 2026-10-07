// Cloudflare Worker fronting the Threadline container (web :3000 + gateway + worker inside one image).
import { Container, getContainer } from "@cloudflare/containers";

interface Env {
  APP: DurableObjectNamespace<App>;
  ANTHROPIC_API_KEY: string;
  SPECTRUM_PROJECT_ID: string;
  SPECTRUM_PROJECT_SECRET: string;
  AUTH_SECRET: string;
  APP_URL: string;
}

export class App extends Container<Env> {
  defaultPort = 3000;
  sleepAfter = "6h";
  constructor(ctx: DurableObjectState<{}>, env: Env) {
    super(ctx, env);
    this.envVars = {
      ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
      SPECTRUM_PROJECT_ID: env.SPECTRUM_PROJECT_ID,
      SPECTRUM_PROJECT_SECRET: env.SPECTRUM_PROJECT_SECRET,
      AUTH_SECRET: env.AUTH_SECRET,
      THREADLINE_ENCRYPTION_KEY: env.AUTH_SECRET,
      APP_URL: env.APP_URL,
      GATEWAY_MODE: "cloud",
      THREADLINE_MODEL: "claude-sonnet-5-5",
      THREADLINE_FAST_MODEL: "claude-haiku-5-5",
      THREADLINE_DB: "/data/threadline.db",
    };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // One singleton instance holds the SQLite DB and the live Photon connection.
    return getContainer(env.APP, "main").fetch(request);
  },
};

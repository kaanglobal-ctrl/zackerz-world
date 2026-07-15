import express from "express";
import { createServer } from "node:http";
import { registerRoutes } from "./routes";

// Vercel serverless entry. Pre-bundled by esbuild (see script/build.ts) into
// api/[...path].js so all local code (routes, storage, supabase, shared) is
// inlined. We assign the handler to module.exports directly (CJS) so Vercel's
// @vercel/node runtime reliably finds it.
const app = express();
let ready: Promise<void> | null = null;
let initError: unknown = null;

function init() {
  if (ready) return ready;
  app.use(
    express.json({
      limit: "5mb",
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));

  const httpServer = createServer(app);
  ready = registerRoutes(httpServer, app)
    .then(() => {
      app.use((err: any, _req: any, res: any, _next: any) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
      });
    })
    .catch((e) => {
      initError = e;
      console.error("[api] init failed:", e);
    });
  return ready;
}

async function handler(req: any, res: any) {
  await init();
  if (initError) {
    return res.status(500).json({
      message: "Function init failed",
      error: initError instanceof Error ? initError.message : String(initError),
    });
  }
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url}`;
  }
  return app(req, res);
}

// CJS export — must be a direct assignment so esbuild preserves it.
;(module as any).exports = handler;

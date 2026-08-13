import express from "express";
import cors from "cors";
import pino from "pino";
import pinoHttpModule from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { router } from "./routes.js";

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const pinoHttp = pinoHttpModule as unknown as (
  options: { logger: typeof logger }
) => express.RequestHandler;

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json({ limit: "16kb" }));
app.use(router);

const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
app.use(express.static(webDist));
app.get("/", (_req, res) => res.sendFile(path.join(webDist, "index.html")));

const port = Number(process.env.API_PORT ?? 10000);

app.listen(port, "0.0.0.0", () =>
  logger.info(
    {
      port,
      executionEnabled: process.env.EXECUTION_ENABLED === "true",
    },
    "MINTLINE API listening",
  ),
);

import { createPostgresStore } from "@usekratose/database";
import {
  ExplanationService,
  OllamaExplanationProvider,
  OpenAiExplanationProvider,
} from "@usekratose/explanations";
import { z } from "zod";

import { loadConfig } from "./config.js";

const eventId = z
  .string()
  .uuid()
  .parse(
    process.argv
      .slice(2)
      .find((argument) => argument !== "--" && !argument.startsWith("--")),
  );
const config = loadConfig();
const database = createPostgresStore(config.DATABASE_URL);

try {
  const provider =
    config.AI_EXPLANATION_PROVIDER === "ollama"
      ? new OllamaExplanationProvider(
          config.AI_EXPLANATION_MODEL,
          config.OLLAMA_BASE_URL,
        )
      : config.AI_EXPLANATION_PROVIDER === "openai"
        ? new OpenAiExplanationProvider(
            config.OPENAI_API_KEY,
            config.AI_EXPLANATION_MODEL,
          )
        : null;
  if (provider === null) {
    throw new Error("AI_EXPLANATION_PROVIDER must be ollama or openai");
  }
  const processed = await new ExplanationService(
    database.store,
    provider,
  ).processPending(1, { eventId });
  console.log(
    JSON.stringify({
      eventId,
      model: provider.model,
      processed,
      provider: provider.name,
    }),
  );
} finally {
  await database.close();
}

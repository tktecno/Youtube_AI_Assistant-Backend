import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

import { env } from "../config/env.js";

const sharedConfiguration = {
  baseURL: env.OPENROUTER_BASE_URL,
  defaultHeaders: {
    "HTTP-Referer": env.OPENROUTER_APP_URL,
    "X-Title": env.OPENROUTER_APP_NAME
  }
};

export const createChatModel = (temperature = 0.1) =>
  new ChatOpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_CHAT_MODEL,
    temperature,
    configuration: sharedConfiguration
  });

export const embeddingsModel = new OpenAIEmbeddings({
  apiKey: env.OPENROUTER_API_KEY,
  model: env.OPENROUTER_EMBEDDING_MODEL,
  configuration: sharedConfiguration
});


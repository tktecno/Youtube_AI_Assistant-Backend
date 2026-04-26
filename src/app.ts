import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { ChatController } from "./controllers/chat.controller.js";
import { VideoController } from "./controllers/video.controller.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { ChatRepository } from "./repositories/chat.repository.js";
import { EmbeddingRepository } from "./repositories/embedding.repository.js";
import { MessageRepository } from "./repositories/message.repository.js";
import { VideoRepository } from "./repositories/video.repository.js";
import { createChatRouter } from "./routes/chat.routes.js";
import { createVideoRouter } from "./routes/video.routes.js";
import { ChatService } from "./services/chat.service.js";
import { EmbeddingService } from "./services/embedding.service.js";
import { RagService } from "./services/rag.service.js";
import { TranscriptService } from "./services/transcript.service.js";
import { TranslationService } from "./services/translation.service.js";
import { VideoService } from "./services/video.service.js";

const videoRepository = new VideoRepository();
const chatRepository = new ChatRepository();
const messageRepository = new MessageRepository();
const embeddingRepository = new EmbeddingRepository();

const transcriptService = new TranscriptService();
const translationService = new TranslationService();
const embeddingService = new EmbeddingService();
const ragService = new RagService(embeddingRepository, embeddingService);
const videoService = new VideoService(
  videoRepository,
  chatRepository,
  transcriptService,
  translationService,
  embeddingService,
  embeddingRepository
);
const chatService = new ChatService(chatRepository, messageRepository, ragService);

const videoController = new VideoController(videoService);
const chatController = new ChatController(chatService);

export const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://your-vercel-domain.vercel.app"
    ],
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.use("/api", requireAuth);
app.use("/api", createVideoRouter(videoController));
app.use("/api", createChatRouter(chatController));

app.use(notFoundHandler);
app.use(errorHandler);

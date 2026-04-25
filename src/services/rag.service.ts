import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BaseRetriever } from "@langchain/core/retrievers";

import { env } from "../config/env.js";
import { createChatModel } from "../lib/openrouter.js";
import { EmbeddingRepository } from "../repositories/embedding.repository.js";
import { EmbeddingService } from "./embedding.service.js";

export interface VideoContextRetrieverInput {
  videoId: string;
  k: number;
  embeddingRepository: EmbeddingRepository;
  embeddingService: EmbeddingService;
}

class VideoContextRetriever extends BaseRetriever {
  lc_namespace = ["teacher-culture", "retrievers", "video-context"];

  private readonly videoId: string;
  private readonly k: number;
  private readonly embeddingRepository: EmbeddingRepository;
  private readonly embeddingService: EmbeddingService;

  constructor(input: VideoContextRetrieverInput) {
    super({});
    this.videoId = input.videoId;
    this.k = input.k;
    this.embeddingRepository = input.embeddingRepository;
    this.embeddingService = input.embeddingService;
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    const queryEmbedding = await this.embeddingService.embedQuery(query);
    const matches = await this.embeddingRepository.matchByVideoId(
      this.videoId,
      queryEmbedding,
      this.k
    );

    return matches.map(
      (match) =>
        new Document({
          pageContent: match.content,
          metadata: {
            timeStamp: match.time_stamp,
            similarity: match.similarity
          }
        })
    );
  }
}

const answerPrompt = ChatPromptTemplate.fromTemplate(`
You are an AI assistant that answers questions ONLY based on the provided video context.
First understand Question then responde according to converstion and context.
When you answer, cite the most relevant timestamp(s) using square brackets like [00:42] or [00:42 - 01:05].

Context:
{context}

Conversation:
{history}

Question:
{query}
`);

export class RagService {
  private readonly qaChain = answerPrompt
    .pipe(createChatModel(0.1))
    .pipe(new StringOutputParser());

  constructor(
    private readonly embeddingRepository: EmbeddingRepository,
    private readonly embeddingService: EmbeddingService
  ) {}

  async retrieveContext(videoId: string, query: string): Promise<Document[]> {
    const retriever = new VideoContextRetriever({
      videoId,
      k: env.RETRIEVAL_K,
      embeddingRepository: this.embeddingRepository,
      embeddingService: this.embeddingService
    });

    return retriever.getRelevantDocuments(query);
  }

  async answerQuestion(input: {
    query: string;
    contextDocuments: Document[];
    history: string;
  }): Promise<string> {
    if (input.contextDocuments.length === 0) {
      return "Not mentioned in the video.";
    }

    const context = input.contextDocuments
      .map((document) => document.pageContent)
      .join("\n\n");

    const answer = await this.qaChain.invoke({
      context,
      history: input.history || "No previous conversation.",
      query: input.query
    });

    const trimmed = answer.trim();
    return trimmed.length > 0 ? trimmed : "Not mentioned in the video.";
  }
}


import { ChatRepository } from "../repositories/chat.repository.js";
import { EmbeddingRepository } from "../repositories/embedding.repository.js";
import { VideoRepository } from "../repositories/video.repository.js";
import { AppError } from "../middleware/error.middleware.js";
import type { ProcessVideoResult } from "../types/entities.js";
import { extractYoutubeId, fetchVideoTitle } from "../utils/youtube.js";
import { EmbeddingService } from "./embedding.service.js";
import { TranscriptService } from "./transcript.service.js";
import { TranslationService } from "./translation.service.js";

export class VideoService {
  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly chatRepository: ChatRepository,
    private readonly transcriptService: TranscriptService,
    private readonly translationService: TranslationService,
    private readonly embeddingService: EmbeddingService,
    private readonly embeddingRepository: EmbeddingRepository
  ) {}

  async processVideo(url: string, userId: string): Promise<ProcessVideoResult> {
    let youtubeId: string;

    try {
      youtubeId = extractYoutubeId(url);
    } catch (error) {
      throw new AppError(
        error instanceof Error ? error.message : "Invalid YouTube URL.",
        400
      );
    }

    let video = await this.videoRepository.findByYoutubeId(youtubeId);
    let reusedProcessing = true;

    if (!video) {
      const title = await fetchVideoTitle(youtubeId);
      video = await this.videoRepository.create(youtubeId, title);
      reusedProcessing = false;
    }

    if (!video.processed) {
      const transcript = await this.transcriptService.fetchTranscript(youtubeId);
      const chunks = this.transcriptService.buildChunks(youtubeId, transcript.entries);
      const translatedChunks = await this.translationService.translateChunks(
        chunks,
        transcript.detectedLanguage
      );
      const embeddingRows = await this.embeddingService.buildEmbeddingRows(
        video.id,
        translatedChunks
      );

      await this.embeddingRepository.upsertMany(embeddingRows);
      await this.videoRepository.markProcessed(video.id, transcript.detectedLanguage);
      reusedProcessing = false;
    }

    const existingChat = await this.chatRepository.findLatestByVideoId(video.id, userId);

    if (existingChat) {
      await this.chatRepository.touch(existingChat.id, userId);
      return {
        chatId: existingChat.id,
        videoId: video.id,
        youtubeId,
        reusedProcessing,
        resumedExistingChat: true
      };
    }

    const chat = await this.chatRepository.create(video.id, userId);

    return {
      chatId: chat.id,
      videoId: video.id,
      youtubeId,
      reusedProcessing,
      resumedExistingChat: false
    };
  }
}

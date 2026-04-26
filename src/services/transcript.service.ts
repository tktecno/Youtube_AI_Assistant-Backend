import { franc } from "franc";
import youtubeTranscriptApi from "youtube-transcript-api";

import { env } from "../config/env.js";
import { AppError } from "../middleware/error.middleware.js";
import type { TranscriptChunk, TranscriptEntry, VideoTranscript } from "../types/entities.js";
import { createChunkHash } from "../utils/chunkHash.js";
import { formatTimestampRange } from "../utils/timestamps.js";

export class TranscriptService {
  async getTranscript(youtubeId: string): Promise<VideoTranscript> {
    try {
      const rawEntries = await youtubeTranscriptApi.getTranscript(youtubeId);

      const entries = rawEntries
        .map((entry:any) => ({
          text: entry.text.replace(/\s+/g, " ").trim(),
          duration: entry.duration ?? 0,
          offset: entry.offset ?? 0
        }))
        .filter((entry:any) => entry.text.length > 0);

      if (entries.length === 0) {
        throw new AppError("This video does not have a usable transcript.", 400);
      }

      const sampleText = entries
        .slice(0, 40)
        .map((entry:any) => entry.text)
        .join(" ");

      const detectedLanguage = this.detectLanguage(sampleText);

      return {
        youtubeId,
        detectedLanguage,
        entries
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new AppError(`Failed to load transcript: ${error.message}`, 400);
      }

      throw new AppError("Failed to load transcript.", 400);
    }
  }

  buildChunks(youtubeId: string, entries: TranscriptEntry[]): TranscriptChunk[] {
    const chunks: TranscriptChunk[] = [];
    let cursor = 0;

    while (cursor < entries.length) {
      const chunkEntries: TranscriptEntry[] = [];
      let totalCharacters = 0;
      let localCursor = cursor;

      while (localCursor < entries.length && totalCharacters < env.MAX_CHUNK_CHARACTERS) {
        const candidate = entries[localCursor];
        chunkEntries.push(candidate);
        totalCharacters += candidate.text.length;
        localCursor += 1;
      }

      if (chunkEntries.length === 0) {
        break;
      }

      const startSeconds = Math.floor(chunkEntries[0].offset);
      const lastEntry = chunkEntries[chunkEntries.length - 1];
      const endSeconds = Math.ceil(lastEntry.offset + lastEntry.duration);
      const sourceContent = chunkEntries.map((entry) => entry.text).join(" ");
      const timeStamp = formatTimestampRange(startSeconds, endSeconds);

      chunks.push({
        sourceContent,
        content: sourceContent,
        startSeconds,
        endSeconds,
        timeStamp,
        chunkHash: createChunkHash(youtubeId, startSeconds, sourceContent)
      });

      cursor = Math.max(cursor + 1, localCursor - env.CHUNK_OVERLAP_SEGMENTS);
    }

    return chunks;
  }

  private detectLanguage(sampleText: string): string {
    const cleanSample = sampleText.trim();

    if (cleanSample.length < 20) {
      return "eng";
    }

    const detected = franc(cleanSample, { minLength: 20 });

    if (detected === "und") {
      return /[a-zA-Z]/.test(cleanSample) ? "eng" : "und";
    }

    return detected;
  }
}

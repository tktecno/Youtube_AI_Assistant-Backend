import { embeddingsModel } from "../lib/openrouter.js";
import type { EmbeddingInsert, TranscriptChunk } from "../types/entities.js";

export class EmbeddingService {
  async buildEmbeddingRows(
    videoId: string,
    chunks: TranscriptChunk[]
  ): Promise<EmbeddingInsert[]> {
    if (chunks.length === 0) {
      return [];
    }

    const embeddings = await embeddingsModel.embedDocuments(
      chunks.map((chunk) => chunk.content)
    );

    return chunks.map((chunk, index) => ({
      video_id: videoId,
      content: `[${chunk.timeStamp}] ${chunk.content}`,
      embedding: embeddings[index],
      time_stamp: chunk.timeStamp,
      chunk_hash: chunk.chunkHash
    }));
  }

  async embedQuery(query: string): Promise<number[]> {
    return embeddingsModel.embedQuery(query);
  }
}


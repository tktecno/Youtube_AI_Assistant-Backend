import { AppError } from "../middleware/error.middleware.js";
import { supabase } from "../lib/supabase.js";
import type { EmbeddingInsert, RetrievedChunk } from "../types/entities.js";

export class EmbeddingRepository {
  async upsertMany(rows: EmbeddingInsert[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    const { error } = await supabase.from("embeddings").upsert(rows, {
      onConflict: "video_id,chunk_hash",
      ignoreDuplicates: false
    });

    if (error) {
      throw new AppError(`Failed to store embeddings: ${error.message}`);
    }
  }

  async matchByVideoId(
    videoId: string,
    queryEmbedding: number[],
    matchCount: number
  ): Promise<RetrievedChunk[]> {
    const { data, error } = await supabase.rpc("match_video_embeddings", {
      filter_video_id: videoId,
      query_embedding: queryEmbedding,
      match_count: matchCount
    });

    if (error) {
      throw new AppError(`Failed to retrieve relevant chunks: ${error.message}`);
    }

    return (data ?? []) as RetrievedChunk[];
  }
}

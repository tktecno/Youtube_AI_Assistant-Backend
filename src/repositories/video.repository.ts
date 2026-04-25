import { AppError } from "../middleware/error.middleware.js";
import { supabase } from "../lib/supabase.js";
import type { VideoRecord } from "../types/entities.js";

export class VideoRepository {
  async findByYoutubeId(youtubeId: string): Promise<VideoRecord | null> {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("youtube_id", youtubeId)
      .maybeSingle<VideoRecord>();

    if (error) {
      throw new AppError(`Failed to load video record: ${error.message}`);
    }

    return data;
  }

  async create(youtubeId: string, title: string): Promise<VideoRecord> {
    const { data, error } = await supabase
      .from("videos")
      .insert({ youtube_id: youtubeId, title, processed: false })
      .select("*")
      .single<VideoRecord>();

    if (error) {
      if (error.code === "23505") {
        const existing = await this.findByYoutubeId(youtubeId);
        if (existing) {
          return existing;
        }
      }

      throw new AppError(`Failed to create video record: ${error.message}`);
    }

    return data;
  }

  async markProcessed(videoId: string, sourceLanguage: string): Promise<void> {
    const { error } = await supabase
      .from("videos")
      .update({
        processed: true,
        source_language: sourceLanguage,
        updated_at: new Date().toISOString()
      })
      .eq("id", videoId);

    if (error) {
      throw new AppError(`Failed to update video state: ${error.message}`);
    }
  }
}

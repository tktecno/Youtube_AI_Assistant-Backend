import { AppError } from "../middleware/error.middleware.js";
import { supabase } from "../lib/supabase.js";
import type { ChatRecord, ChatSummary } from "../types/entities.js";

export class ChatRepository {
  async create(videoId: string, userId: string): Promise<ChatRecord> {
    const { data, error } = await supabase
      .from("chats")
      .insert({ video_id: videoId, user_id: userId })
      .select("*")
      .single<ChatRecord>();

    if (error) {
      throw new AppError(`Failed to create chat: ${error.message}`);
    }

    return data;
  }

  async findById(chatId: string, userId: string): Promise<ChatRecord | null> {
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .eq("user_id", userId)
      .maybeSingle<ChatRecord>();

    if (error) {
      throw new AppError(`Failed to load chat: ${error.message}`);
    }

    return data;
  }

  async findLatestByVideoId(videoId: string, userId: string): Promise<ChatRecord | null> {
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("video_id", videoId)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<ChatRecord>();

    if (error) {
      throw new AppError(`Failed to load existing chat: ${error.message}`);
    }

    return data;
  }


  async touch(chatId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("chats")
      .update({
        updated_at: new Date().toISOString()
      })
      .eq("id", chatId)
      .eq("user_id", userId);

    if (error) {
      throw new AppError(`Failed to update chat timestamp: ${error.message}`);
    }
  }

  async delete(chatId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("chats")
      .delete()
      .eq("id", chatId)
      .eq("user_id", userId);

    if (error) {
      throw new AppError(`Failed to delete chat: ${error.message}`);
    }
  }

  async listByUser(userId: string): Promise<ChatSummary[]> {
    const { data, error } = await supabase
      .from("chats")
      .select("id, video_id, created_at, updated_at, videos!inner(youtube_id, title)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new AppError(`Failed to load chat history: ${error.message}`);
    }

    const rows = (data ?? []) as Array<{
      id: string;
      video_id: string;
      created_at: string;
      updated_at: string;
      videos: { youtube_id: string; title: string } | Array<{ youtube_id: string; title: string }>;
    }>;

    return rows.map((row) => {
      const joinedVideo = Array.isArray(row.videos) ? row.videos[0] : row.videos;

      return {
        id: row.id,
        videoId: row.video_id,
        youtubeId: joinedVideo?.youtube_id ?? "",
        title: joinedVideo?.title ?? "",
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });
  }
}

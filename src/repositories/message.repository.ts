import { AppError } from "../middleware/error.middleware.js";
import { supabase } from "../lib/supabase.js";
import type { MessageRecord, MessageRole } from "../types/entities.js";

export class MessageRepository {
  async create(chatId: string, role: MessageRole, content: string): Promise<MessageRecord> {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        role,
        content
      })
      .select("*")
      .single<MessageRecord>();

    if (error) {
      throw new AppError(`Failed to store chat message: ${error.message}`);
    }

    return data;
  }

  async listRecent(chatId: string, limit: number): Promise<MessageRecord[]> {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new AppError(`Failed to load recent messages: ${error.message}`);
    }

    return ((data ?? []) as MessageRecord[]).reverse();
  }

  async listByChatId(chatId: string): Promise<MessageRecord[]> {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new AppError(`Failed to load chat history: ${error.message}`);
    }

    return (data ?? []) as MessageRecord[];
  }
}


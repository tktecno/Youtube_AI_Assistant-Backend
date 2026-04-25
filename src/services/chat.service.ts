import { env } from "../config/env.js";
import { AppError } from "../middleware/error.middleware.js";
import { ChatRepository } from "../repositories/chat.repository.js";
import { MessageRepository } from "../repositories/message.repository.js";
import type { ChatAnswerResult, ChatSummary, MessageRecord } from "../types/entities.js";
import { RagService } from "./rag.service.js";

export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly messageRepository: MessageRepository,
    private readonly ragService: RagService
  ) {}

  async answer(chatId: string, userId: string, query: string): Promise<ChatAnswerResult> {
    let chat = await this.chatRepository.findById(chatId, userId);

    if (!chat) {
      throw new AppError("Chat session not found.", 404);
    }


    const historyMessages = await this.messageRepository.listRecent(
      chatId,
      env.CHAT_MEMORY_MESSAGES
    );
    const contextDocuments = await this.ragService.retrieveContext(chat.video_id, query);
    const history = this.formatHistory(historyMessages);

    await this.messageRepository.create(chatId, "user", query);

    const answer = await this.ragService.answerQuestion({
      query,
      contextDocuments,
      history
    });

    await this.messageRepository.create(chatId, "assistant", answer);
    await this.chatRepository.touch(chatId, userId);

    return {
      answer,
      sources: contextDocuments.map((document) => ({
        timeStamp: String(document.metadata.timeStamp ?? ""),
        similarity: Number(document.metadata.similarity ?? 0)
      }))
    };
  }

  async listMessages(chatId: string, userId: string): Promise<{
    chatId: string;
    videoId: string;
    messages: MessageRecord[];
  }> {
    const chat = await this.chatRepository.findById(chatId, userId);

    if (!chat) {
      throw new AppError("Chat session not found.", 404);
    }

    const messages = await this.messageRepository.listByChatId(chatId);

    return {
      chatId,
      videoId: chat.video_id,
      messages
    };
  }

  async listChats(userId: string): Promise<{ chats: ChatSummary[] }> {
    const chats = await this.chatRepository.listByUser(userId);
    return { chats };
  }


  async deleteChat(chatId: string, userId: string): Promise<void> {
    const chat = await this.chatRepository.findById(chatId, userId);

    if (!chat) {
      throw new AppError("Chat session not found.", 404);
    }

    await this.chatRepository.delete(chatId, userId);
  }

  private formatHistory(messages: MessageRecord[]): string {
    if (messages.length === 0) {
      return "No previous conversation.";
    }

    return messages
      .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
      .join("\n");
  }
}

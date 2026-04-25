import type { Request, Response } from "express";
import { z } from "zod";

import { AppError } from "../middleware/error.middleware.js";
import { ChatService } from "../services/chat.service.js";

const chatSchema = z.object({
  chat_id: z.string().uuid(),
  query: z.string().min(1)
});

const chatParamSchema = z.object({
  chatId: z.string().uuid()
});

export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  chat = async (request: Request, response: Response): Promise<void> => {
    const { chat_id, query } = chatSchema.parse(request.body);
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authenticated user missing from request context.", 401);
    }

    const result = await this.chatService.answer(chat_id, userId, query);

    response.status(200).json(result);
  };

  getMessages = async (request: Request, response: Response): Promise<void> => {
    const { chatId } = chatParamSchema.parse(request.params);
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authenticated user missing from request context.", 401);
    }

    const result = await this.chatService.listMessages(chatId, userId);

    response.status(200).json(result);
  };

  listChats = async (request: Request, response: Response): Promise<void> => {
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authenticated user missing from request context.", 401);
    }

    const result = await this.chatService.listChats(userId);

    response.status(200).json(result);
  };


  deleteChat = async (request: Request, response: Response): Promise<void> => {
    const { chatId } = chatParamSchema.parse(request.params);
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authenticated user missing from request context.", 401);
    }

    await this.chatService.deleteChat(chatId, userId);

    response.status(204).send();
  };
}

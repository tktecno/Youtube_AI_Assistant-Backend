import { Router } from "express";

import { ChatController } from "../controllers/chat.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createChatRouter = (chatController: ChatController): Router => {
  const router = Router();

  router.get("/chats", asyncHandler(chatController.listChats));
  router.post("/chat", asyncHandler(chatController.chat));

  router.get("/chats/:chatId/messages", asyncHandler(chatController.getMessages));
  router.delete("/chats/:chatId", asyncHandler(chatController.deleteChat));

  return router;
};

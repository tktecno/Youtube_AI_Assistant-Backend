import { Router } from "express";

import { VideoController } from "../controllers/video.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createVideoRouter = (videoController: VideoController): Router => {
  const router = Router();

  router.post("/process-video", asyncHandler(videoController.processVideo));

  return router;
};


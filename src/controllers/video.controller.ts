import type { Request, Response } from "express";
import { z } from "zod";

import { AppError } from "../middleware/error.middleware.js";
import { VideoService } from "../services/video.service.js";

const processVideoSchema = z.object({
  url: z.string().min(1)
});

export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  processVideo = async (request: Request, response: Response): Promise<void> => {
    const { url } = processVideoSchema.parse(request.body);
    const userId = request.user?.id;

    if (!userId) {
      throw new AppError("Authenticated user missing from request context.", 401);
    }

    const result = await this.videoService.processVideo(url, userId);

    response.status(200).json(result);
  };
}

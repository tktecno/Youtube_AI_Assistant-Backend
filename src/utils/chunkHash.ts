import { createHash } from "node:crypto";

export const createChunkHash = (
  youtubeId: string,
  startSeconds: number,
  content: string
): string =>
  createHash("sha256")
    .update(`${youtubeId}:${Math.floor(startSeconds)}:${content.trim().toLowerCase()}`)
    .digest("hex");


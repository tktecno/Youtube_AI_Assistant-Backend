export type MessageRole = "user" | "assistant";

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

export interface VideoRecord {
  id: string;
  youtube_id: string;
  title: string;
  processed: boolean;
  source_language: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatRecord {
  id: string;
  video_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSummary {
  id: string;
  videoId: string;
  youtubeId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  chat_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface TranscriptEntry {
  text: string;
  offset: number;
  duration: number;
}

export interface TranscriptChunk {
  sourceContent: string;
  content: string;
  startSeconds: number;
  endSeconds: number;
  timeStamp: string;
  chunkHash: string;
}

export interface EmbeddingInsert {
  video_id: string;
  content: string;
  embedding: number[];
  time_stamp: string;
  chunk_hash: string;
}

export interface RetrievedChunk {
  id: string;
  video_id: string;
  content: string;
  time_stamp: string;
  similarity: number;
}

export interface VideoTranscript {
  youtubeId: string;
  detectedLanguage: string;
  entries: TranscriptEntry[];
}

export interface ProcessVideoResult {
  chatId: string;
  videoId: string;
  youtubeId: string;
  reusedProcessing: boolean;
  resumedExistingChat: boolean;
}

export interface ChatAnswerResult {
  answer: string;
  sources: Array<{
    timeStamp: string;
    similarity: number;
  }>;
}

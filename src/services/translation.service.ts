import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

import { createChatModel } from "../lib/openrouter.js";
import type { TranscriptChunk } from "../types/entities.js";

const translationPrompt = ChatPromptTemplate.fromTemplate(`
You translate YouTube transcript chunks into natural English.
Preserve factual meaning, keep numbers accurate, and do not add information.
Return only the translated English text.

Transcript chunk:
{content}
`);

export class TranslationService {
  private readonly translator = translationPrompt
    .pipe(createChatModel(0))
    .pipe(new StringOutputParser());

  async translateChunks(
    chunks: TranscriptChunk[],
    detectedLanguage: string
  ): Promise<TranscriptChunk[]> {
    if (chunks.length === 0 || detectedLanguage === "eng") {
      return chunks;
    }

    const translatedChunks: TranscriptChunk[] = [];

    for (const chunk of chunks) {
      const translatedContent = await this.translator.invoke({
        content: chunk.sourceContent
      });

      translatedChunks.push({
        ...chunk,
        content: translatedContent.trim()
      });
    }

    return translatedChunks;
  }
}


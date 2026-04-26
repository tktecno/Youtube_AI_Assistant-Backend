declare module "youtube-transcript-api" {
    export function getTranscript(videoId: string): Promise<
      {
        text: string;
        duration: number;
        offset: number;
      }[]
    >;
  
    const _default: {
      getTranscript: typeof getTranscript;
    };
  
    export default _default;
  }
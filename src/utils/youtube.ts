const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export const extractYoutubeId = (input: string): string => {
  try {
    const url = new URL(input.trim());

    if (url.hostname === "youtu.be") {
      const shortId = url.pathname.replace("/", "");
      if (YOUTUBE_ID_REGEX.test(shortId)) {
        return shortId;
      }
    }

    if (
      url.hostname.includes("youtube.com") ||
      url.hostname.includes("youtube-nocookie.com")
    ) {
      const watchId = url.searchParams.get("v");
      if (watchId && YOUTUBE_ID_REGEX.test(watchId)) {
        return watchId;
      }

      const parts = url.pathname.split("/").filter(Boolean);
      const candidate = parts.at(-1);
      if (candidate && YOUTUBE_ID_REGEX.test(candidate)) {
        return candidate;
      }
    }
  } catch {
    if (YOUTUBE_ID_REGEX.test(input.trim())) {
      return input.trim();
    }
  }

  throw new Error("Invalid YouTube URL.");
};

export const fetchVideoTitle = async (youtubeId: string): Promise<string> => {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`
    );

    if (!response.ok) {
      return "Unknown Video";
    }

    const data = await response.json() as { title?: string };
    return data.title ?? "Unknown Video";
  } catch {
    return "Unknown Video";
  }
};


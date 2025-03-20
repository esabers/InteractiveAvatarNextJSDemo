// TypeScript declarations for global variables used in the app

interface QueueItem {
  text: string;
  imageUrl: string | null;
}

declare global {
  var textQueue: QueueItem[];
  var cleanup: () => void;
}

export {}
// Create a simple store to hold the latest generated text
import { create } from 'zustand';

interface GeneratedTextStore {
  latestText: string;
  setLatestText: (text: string) => void;
}

export const useGeneratedTextStore = create<GeneratedTextStore>((set) => ({
  latestText: '',
  setLatestText: (text) => set({ latestText: text }),
}));
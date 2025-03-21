"use client";

import InteractiveAvatarAI from "@/components/InteractiveAvatarAI";

export default function App() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#0f0e14]">
      <div className="w-[900px] max-w-full">
        <InteractiveAvatarAI />
      </div>
    </div>
  );
}

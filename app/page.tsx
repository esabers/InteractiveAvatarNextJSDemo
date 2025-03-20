"use client";

import { Tabs, Tab } from "@nextui-org/react";
import InteractiveAvatar from "@/components/InteractiveAvatar";
import InteractiveAvatarAI from "@/components/InteractiveAvatarAI";

export default function App() {
  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="w-[900px] flex flex-col items-start justify-start gap-5 mx-auto pt-4 pb-20">
        <Tabs aria-label="Avatar Options">
          <Tab key="standard" title="Standard Avatar">
            <div className="w-full">
              <InteractiveAvatar />
            </div>
          </Tab>
          <Tab key="ai-news" title="AI News Avatar">
            <div className="w-full">
              <InteractiveAvatarAI />
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}

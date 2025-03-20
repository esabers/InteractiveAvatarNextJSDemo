"use client";

import type { StartAvatarResponse } from "@heygen/streaming-avatar";

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents, TaskMode, TaskType, VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn } from "ahooks";

import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";
import { AVATARS, STT_LANGUAGE_LIST } from "@/app/lib/constants";

export default function InteractiveAvatarAI() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>("");
  const [knowledgeId, setKnowledgeId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("");
  const [language, setLanguage] = useState<string>('en');
  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const eventSource = useRef<EventSource | null>(null);

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();
      console.log("Access Token:", token);
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      setDebug("Failed to fetch access token");
    }
    return "";
  }

  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: newToken,
    });
    
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e);
      setDebug("Avatar speaking");
    });
    
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e);
      setDebug("Avatar ready");
    });
    
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      setDebug("Stream disconnected");
      endSession();
    });
    
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log(">>>>> Stream ready:", event.detail);
      setStream(event.detail);
      setDebug("Stream ready - connect to Rails app to start");
    });
    
    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: avatarId,
        knowledgeId: knowledgeId,
        voice: {
          rate: 1.0,
          emotion: VoiceEmotion.NEUTRAL,
        },
        language: language,
        disableIdleTimeout: true,
      });

      setData(res);
      
      // Connect to SSE endpoint
      connectToTextStream();
      
    } catch (error) {
      console.error("Error starting avatar session:", error);
      setDebug(`Error: ${error.message}`);
    } finally {
      setIsLoadingSession(false);
    }
  }

  // Connect to the server-sent events endpoint
  function connectToTextStream() {
    if (eventSource.current) {
      eventSource.current.close();
    }

    setDebug("Connecting to text stream...");
    
    // Use EventSource to connect to our SSE endpoint
    eventSource.current = new EventSource('/api/text-stream');
    
    eventSource.current.onopen = () => {
      console.log("SSE connection opened");
      setDebug("Connected to text stream - waiting for content");
    };
    
    eventSource.current.onmessage = (event) => {
      try {
        console.log("Received SSE message:", event.data);
        const data = JSON.parse(event.data);
        if (data.text) {
          console.log("Received text:", data.text);
          setText(data.text);
          
          // Handle image if provided
          if (data.imageUrl) {
            console.log("Received image URL:", data.imageUrl);
            setCurrentImage(data.imageUrl);
          } else {
            setCurrentImage(null);
          }
          
          handleSpeak(data.text);
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };
    
    eventSource.current.onerror = (error) => {
      console.error("SSE connection error:", error);
      setDebug("Text stream connection error - check logs");
    };
  }
  
  async function handleSpeak(inputText: string) {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    
    try {
      await avatar.current.speak({ 
        text: inputText, 
        taskType: TaskType.REPEAT, 
        taskMode: TaskMode.SYNC 
      });
    } catch (e) {
      setDebug(`Speech error: ${e.message}`);
    } finally {
      setIsLoadingRepeat(false);
    }
  }
  
  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current.interrupt().catch((e) => {
      setDebug(e.message);
    });
  }
  
  async function endSession() {
    if (eventSource.current) {
      eventSource.current.close();
      eventSource.current = null;
    }
    
    await avatar.current?.stopAvatar();
    setStream(undefined);
    setDebug("Session ended");
  }

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Ready - waiting for text from Rails app");
      };
    }
  }, [mediaStream, stream]);

  return (
    <div className="w-full flex flex-col gap-4">
      <Card>
        <CardBody className="h-[500px] flex flex-col justify-center items-center">
          {stream ? (
            <div className="h-[500px] w-[900px] justify-center items-center flex rounded-lg overflow-hidden relative">
              {/* Avatar video */}
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              >
                <track kind="captions" />
              </video>
              
              {/* Image overlay - shown only when there's a current image */}
              {currentImage && (
                <div className="absolute top-4 left-4 pointer-events-none">
                  <div className="relative w-[250px]">
                    <img 
                      src={currentImage} 
                      alt="Content illustration" 
                      className="w-full object-contain rounded-lg shadow-lg"
                      style={{ maxHeight: "200px" }}
                    />
                  </div>
                </div>
              )}
              
              {/* Control buttons */}
              <div className="flex flex-col gap-2 absolute bottom-3 right-3">
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={handleInterrupt}
                >
                  Interrupt task
                </Button>
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={endSession}
                >
                  End session
                </Button>
              </div>
              <div className="absolute top-3 right-3">
                <Chip color="success">Connected</Chip>
              </div>
            </div>
          ) : !isLoadingSession ? (
            <div className="h-full justify-center items-center flex flex-col gap-8 w-[500px] self-center">
              <div className="flex flex-col gap-2 w-full">
                <p className="text-sm font-medium leading-none">
                  Custom Knowledge ID (optional)
                </p>
                <Input
                  placeholder="Enter a custom knowledge ID"
                  value={knowledgeId}
                  onChange={(e) => setKnowledgeId(e.target.value)}
                />
                <p className="text-sm font-medium leading-none">
                  Custom Avatar ID (optional)
                </p>
                <Input
                  placeholder="Enter a custom avatar ID"
                  value={avatarId}
                  onChange={(e) => setAvatarId(e.target.value)}
                />
                <Select
                  placeholder="Or select one from these example avatars"
                  size="md"
                  onChange={(e) => {
                    setAvatarId(e.target.value);
                  }}
                >
                  {AVATARS.map((avatar) => (
                    <SelectItem
                      key={avatar.avatar_id}
                      textValue={avatar.avatar_id}
                    >
                      {avatar.name}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  label="Select language"
                  placeholder="Select language"
                  className="max-w-xs"
                  selectedKeys={[language]}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                  }}
                >
                  {STT_LANGUAGE_LIST.map((lang) => (
                    <SelectItem key={lang.key}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <Button
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                size="md"
                variant="shadow"
                onClick={startSession}
              >
                Start AI News Avatar
              </Button>
            </div>
          ) : (
            <Spinner color="default" size="lg" />
          )}
        </CardBody>
        <Divider />
        <CardFooter className="flex flex-col gap-3">
          <p className="font-mono text-sm w-full">
            <span className="font-bold">Status:</span> {debug}
          </p>
          {text && (
            <p className="font-mono text-xs w-full border-t pt-2">
              <span className="font-bold">Latest text:</span> {text.substring(0, 100)}...
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
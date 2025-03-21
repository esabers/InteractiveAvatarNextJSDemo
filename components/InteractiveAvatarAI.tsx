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
  const [backgroundImage, setBackgroundImage] = useState<string | null>("/logo.png");
  
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
          
          // Handle background image if provided
          if (data.backgroundImage) {
            console.log("Received background image URL:", data.backgroundImage);
            setBackgroundImage(data.backgroundImage);
          } else {
            // Keep using default logo.png background
            setBackgroundImage("/logo.png");
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
  
  // Green screen effect with canvas pixel replacement
  useEffect(() => {
    if (!stream || !mediaStream.current || !backgroundImage) return;
    
    const video = mediaStream.current;
    const canvas = document.getElementById('greenScreenCanvasAI') as HTMLCanvasElement;
    if (!canvas) return;
    
    // Setup canvas context
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Load background image
    const bgImage = new Image();
    bgImage.crossOrigin = 'Anonymous';
    bgImage.src = backgroundImage;
    
    // Process video frames
    const processFrame = () => {
      // Set canvas dimensions to match video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data to process pixels
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Define green threshold and sensitivity
      const threshold = 100; // Adjust based on how sensitive you want the detection to be
      
      // Process each pixel
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Check if pixel is green (g component significantly higher than r and b)
        if (g > threshold && g > r * 1.5 && g > b * 1.5) {
          // Set this pixel to be transparent
          data[i + 3] = 0; // Alpha channel
        }
      }
      
      // Put processed image data back to canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Draw background image first (only where alpha is 0)
      ctx.globalCompositeOperation = 'destination-over';
      if (bgImage.complete) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
      }
      
      // Request next frame
      requestAnimationFrame(processFrame);
    };
    
    // Start processing when video and background image are ready
    const handleStart = () => {
      if (video.readyState >= 2 && bgImage.complete) {
        processFrame();
      }
    };
    
    video.addEventListener('canplay', handleStart);
    bgImage.onload = handleStart;
    
    // If video is already loaded
    if (video.readyState >= 2) {
      handleStart();
    }
    
    return () => {
      video.removeEventListener('canplay', handleStart);
    };
  }, [stream, backgroundImage]);

  return (
    <div className="w-full flex flex-col gap-4">
      <Card>
        <CardBody className="h-[500px] flex flex-col justify-center items-center">
          {stream ? (
            <div className="h-[500px] w-[900px] justify-center items-center flex rounded-lg overflow-hidden relative">
              {/* The parent div that will hold both background and avatar */}
              <div className="h-full w-full relative">
                {/* Background image */}
                {backgroundImage && (
                  <div 
                    className="absolute inset-0" 
                    style={{
                      backgroundImage: `url(${backgroundImage})`,
                      backgroundColor: '#3c8a1f', // Medium green similar to the green screen
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                )}
                
                {/* Green screen video with canvas-based pixel replacement */}
                <div className="absolute inset-0 flex justify-center items-center">
                  <video
                    ref={mediaStream}
                    autoPlay
                    playsInline
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: backgroundImage ? "none" : "block"
                    }}
                  >
                    <track kind="captions" />
                  </video>
                  {backgroundImage && (
                    <canvas 
                      id="greenScreenCanvasAI" 
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain"
                      }}
                    />
                  )}
                </div>
              </div>
              
              {/* Image overlay - shown only when there's a current image */}
              {currentImage && (
                <div className="absolute top-4 left-4 pointer-events-none z-30">
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
// API endpoint to receive generated text and optional image URL
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, imageUrl, backgroundImage } = body;
    
    if (!text) {
      return new Response("Text is required", { status: 400 });
    }
    
    // Store the received text and image URL in server-side storage
    // We'll use Server-Sent Events to notify the client
    if (!global.textQueue) {
      global.textQueue = [];
    }
    
    // Add text, optional image URL, and optional background image to the queue
    global.textQueue.push({
      text,
      imageUrl: imageUrl || null,
      backgroundImage: backgroundImage || null
    });
    
    console.log("Received text:", text);
    if (imageUrl) {
      console.log("Received image URL:", imageUrl);
    }
    if (backgroundImage) {
      console.log("Received background image URL:", backgroundImage);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error receiving text:", error);
    
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
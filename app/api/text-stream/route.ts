// Server-sent events endpoint to stream text to the client
export async function GET() {
  // Define response headers for SSE
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };

  // Initialize text queue if it doesn't exist
  if (!global.textQueue) {
    global.textQueue = [];
  }

  // Create a readable stream
  const stream = new ReadableStream({
    start(controller) {
      // Function to send events
      const sendEvent = () => {
        if (global.textQueue && global.textQueue.length > 0) {
          // Get the next item from the queue
          const item = global.textQueue.shift();
          
          // Send the text and optional image URL as an event
          controller.enqueue(`data: ${JSON.stringify(item)}\n\n`);
        }
      };

      // Send any existing events immediately
      sendEvent();

      // Set up interval to check for new events
      const interval = setInterval(sendEvent, 1000);

      // Clean up function
      const cleanup = () => {
        clearInterval(interval);
        controller.close();
      };

      // Store cleanup function to be called on connection close
      global.cleanup = cleanup;
    },
    cancel() {
      // Clean up when the connection is closed
      if (global.cleanup) {
        global.cleanup();
      }
    },
  });

  // Return the stream as the response
  return new Response(stream, { headers });
}
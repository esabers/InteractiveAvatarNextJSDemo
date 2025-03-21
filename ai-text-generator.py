#!/usr/bin/env python3
import os
import requests
import json
import time
import argparse
import openai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("Please set the OPENAI_API_KEY environment variable")

# Configuration
DEFAULT_NEXT_APP_URL = "http://localhost:3000"
NEWS_TOPICS = [
    {"headline": "Global Cryptocurrency Adoption Rising", 
     "summary": "Countries are increasingly adopting cryptocurrencies for international trade, bypassing traditional banking systems."},
    {"headline": "Breakthrough in Renewable Energy Storage", 
     "summary": "Scientists develop new battery technology that can store renewable energy for months at low cost."},
    {"headline": "AI System Predicts Protein Structures", 
     "summary": "New AI model accurately predicts 3D structures of proteins, potentially revolutionizing drug discovery."},
    {"headline": "Space Tourism Reaches Milestone", 
     "summary": "Commercial space flight company completes first civilian orbital mission with non-professional astronauts."},
    {"headline": "Global Weather Patterns Show Significant Shift", 
     "summary": "New climate data reveals unprecedented changes in global weather systems over the past decade."},
    {"headline": "Breakthrough in Quantum Computing", 
     "summary": "Researchers achieve quantum supremacy with new 128-qubit processor, solving previously impossible calculations."}
]

def generate_news_narrative(topics):
    """Generate a flowing narrative about the provided news topics using GPT-4."""
    # Format topics for the prompt
    formatted_topics = "\n".join([f"Topic {i+1}: {topic['headline']} - {topic['summary']}" 
                                 for i, topic in enumerate(topics)])
    
    # Create the system and user messages
    messages = [
        {"role": "system", "content": """You are a helpful, conversational AI news narrator who discusses current events in a flowing narrative style. Your primary characteristics:

1. SMOOTH TRANSITIONS: You transition naturally between topics, making logical connections between seemingly unrelated stories.

2. ENGAGING RESPONSES: Your speech is interesting and varied, using a mix of short and medium-length sentences.

3. CONVERSATIONAL INTEGRATION: You maintain a friendly, engaging tone throughout.

4. CONTINUOUS NARRATION: You maintain the flow of your narrative.

5. CONCISE DELIVERY: Keep responses to 2-3 sentences to maintain a natural speaking flow."""},
        {"role": "user", "content": f"Please discuss these top news topics in a flowing narrative, smoothly transitioning from one topic to the next:\n\n{formatted_topics}\n\nStart with the first topic and naturally progress through all of them."}
    ]
    
    # Generate response using GPT-4
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=messages,
            max_tokens=150,
            temperature=0.7,
        )
        return response.choices[0].message['content']
    except Exception as e:
        print(f"Error generating narrative: {e}")
        return "I'm having trouble generating news content at the moment. Please try again later."

def send_to_avatar(text, image_url=None, background_image=None, next_app_url=DEFAULT_NEXT_APP_URL):
    """Send the generated text and optional image URL to the NextJS app for the avatar to speak.
    
    Parameters:
    - text: The text for the avatar to speak
    - image_url: Optional URL of an image to display alongside text
    - background_image: Optional URL of an image to replace the green screen background
    - next_app_url: Base URL of the NextJS app
    """
    endpoint = f"{next_app_url}/api/receive-text"
    
    # Prepare the payload
    payload = {"text": text}
    if image_url:
        payload["imageUrl"] = image_url
    if background_image:
        payload["backgroundImage"] = background_image
    
    try:
        response = requests.post(
            endpoint,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            success_msg = "Successfully sent text"
            if image_url:
                success_msg += " and image"
            if background_image:
                success_msg += " with custom background"
            success_msg += " to avatar"
            print(success_msg)
            return True
        else:
            print(f"Failed to send to avatar: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"Error sending to avatar: {e}")
        return False

def generate_continuation(previous_text):
    """Generate a continuation of the previous narrative."""
    messages = [
        {"role": "system", "content": """You are a helpful, conversational AI news narrator who discusses current events in a flowing narrative style. Your primary characteristics:

1. SMOOTH TRANSITIONS: You transition naturally between topics, making logical connections between seemingly unrelated stories.

2. ENGAGING RESPONSES: Your speech is interesting and varied, using a mix of short and medium-length sentences.

3. CONTINUOUS NARRATION: You maintain the flow of your narrative.

4. CONCISE DELIVERY: Keep responses to 2-3 sentences to maintain a natural speaking flow."""},
        {"role": "assistant", "content": previous_text},
        {"role": "user", "content": "Continue your news narrative. Pick up naturally from your last sentence. Maintain your train of thought or transition smoothly to a connected news topic. Make this transition feel like part of the same conversation, not a new segment."}
    ]
    
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=messages,
            max_tokens=150,
            temperature=0.7,
        )
        return response.choices[0].message['content']
    except Exception as e:
        print(f"Error generating continuation: {e}")
        return "I'm having trouble continuing the narrative at the moment. Let's move on to another topic."

def main():
    parser = argparse.ArgumentParser(description='Generate AI news narratives and send to avatar')
    parser.add_argument('--url', type=str, default=DEFAULT_NEXT_APP_URL, 
                        help=f'URL of the NextJS app (default: {DEFAULT_NEXT_APP_URL})')
    parser.add_argument('--continuous', action='store_true', 
                        help='Run in continuous mode, generating new content every few seconds')
    parser.add_argument('--interval', type=int, default=15, 
                        help='Interval in seconds between generations in continuous mode (default: 15)')
    parser.add_argument('--rounds', type=int, default=10, 
                        help='Number of generations in continuous mode (default: 10)')
    parser.add_argument('--image', type=str, 
                        help='URL of an image to display with the text')
    parser.add_argument('--background', type=str, 
                        help='URL of an image to replace the green screen background')
    
    args = parser.parse_args()
    
    # Initial generation based on news topics
    print("Generating initial news narrative...")
    narrative = generate_news_narrative(NEWS_TOPICS)
    print("\nNarrative generated:")
    print("-" * 40)
    print(narrative)
    print("-" * 40)
    
    # Send to avatar with optional image and background
    print("\nSending to avatar...")
    if send_to_avatar(narrative, args.image, args.background, args.url):
        print("Successfully sent initial narrative to avatar")
    else:
        print("Failed to send initial narrative to avatar")
        return
    
    # If continuous mode, keep generating and sending
    if args.continuous:
        print(f"\nRunning in continuous mode, generating every {args.interval} seconds for {args.rounds} rounds")
        
        previous_text = narrative
        for i in range(args.rounds - 1):  # -1 because we already did the initial generation
            time.sleep(args.interval)
            print(f"\nGenerating continuation {i+2}/{args.rounds}...")
            
            continuation = generate_continuation(previous_text)
            previous_text = continuation
            
            print("Continuation generated:")
            print("-" * 40)
            print(continuation)
            print("-" * 40)
            
            print("Sending to avatar...")
            if send_to_avatar(continuation, args.image, args.background, args.url):
                print(f"Successfully sent continuation {i+2}/{args.rounds} to avatar")
            else:
                print(f"Failed to send continuation {i+2}/{args.rounds} to avatar")
    
    print("\nDone!")

if __name__ == "__main__":
    main()
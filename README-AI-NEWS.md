# AI News Avatar Integration

This document explains how to use the AI News Avatar feature with the Python text generator.

## Overview

This integration allows AI-generated news content from a Python script to be automatically sent to the HeyGen avatar, which will speak the text in real-time. This creates an immersive news broadcasting experience with an animated avatar delivering the latest news.

## Setup Instructions

### 1. NextJS Avatar App Setup

1. First, make sure you have a HeyGen API token. You can get a trial token from [HeyGen's website](https://app.heygen.com/settings?nav=API).

2. Create a `.env` file in the root directory (use `.env.example` as a template):
   ```
   HEYGEN_API_KEY=your_heygen_token_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. Install dependencies and start the NextJS app:
   ```bash
   npm install
   npm run dev
   ```

4. The NextJS app should now be running at http://localhost:3000

### 2. Python Script Setup

1. Install the required Python packages:
   ```bash
   pip install openai requests python-dotenv
   ```

2. Make sure the script has execution permissions:
   ```bash
   chmod +x ai-text-generator.py
   ```

## Using the Integration

1. Start the NextJS app if it's not already running:
   ```bash
   npm run dev
   ```

2. Open the NextJS app in your browser (http://localhost:3000)

3. Click on the "AI News Avatar" tab and configure the avatar settings

4. Click "Start AI News Avatar" to initialize the HeyGen avatar

5. Run the Python script to generate and send AI news content:
   ```bash
   # Basic usage
   python ai-text-generator.py
   
   # Run continuously with content generated every 15 seconds for 10 rounds
   python ai-text-generator.py --continuous --interval 15 --rounds 10
   
   # With an image to display alongside the text
   python ai-text-generator.py --image https://example.com/image.jpg
   
   # If NextJS is running on a different URL:
   python ai-text-generator.py --url http://localhost:3000
   ```

6. The avatar will automatically speak the content as it's received

## Command-line Options

The Python script supports the following options:

- `--url` - URL of the NextJS app (default: http://localhost:3000)
- `--continuous` - Run in continuous mode, generating new content at intervals
- `--interval` - Seconds between generations in continuous mode (default: 15)
- `--rounds` - Number of generations in continuous mode (default: 10)
- `--image` - URL of an image to display alongside the spoken text

## Troubleshooting

- Make sure both the NextJS app is running before running the Python script
- Check that your HeyGen API token and OpenAI API key are valid
- If the avatar doesn't speak, check the browser console for error messages
- If the Python script fails, check the error messages in the terminal

## Limitations

- The avatar will only speak content generated after the avatar session has started
- Long texts may be truncated or split across multiple messages
- The avatar will stop speaking if the NextJS app is closed or refreshed
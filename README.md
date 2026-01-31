# Running Tour Guide

An app that gives you a real-time audio tour of surrounding attractions as you run through the city. Using AI-powered commentary, it tells you about nearby landmarks, restaurants, historical facts, and local tips.

## Features

- **Real-time location tracking** - Tracks your run with GPS
- **AI-generated commentary** - Uses OpenAI to generate interesting facts about your surroundings
- **Text-to-speech** - Converts commentary to audio so you can listen while running
- **Customizable interests** - Choose what you want to hear about (landmarks, history, restaurants, etc.)
- **Multiple voices** - Select from different AI voices
- **Run statistics** - Track distance, duration, and pace

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **AI**: OpenAI GPT-4o-mini for commentary, OpenAI TTS for audio
- **Location**: Browser Geolocation API

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd Running-tour-guide
   ```

2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env and add your OpenAI API key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

## Usage

1. Click **Start Run** to begin tracking your location
2. The app will automatically generate and speak commentary about nearby places
3. Use the skip button to get new commentary immediately
4. Adjust settings (gear icon) to customize:
   - Commentary frequency (15-120 seconds)
   - Voice selection
   - Topics of interest
5. Click **End Run** when finished

## API Endpoints

- `POST /api/tour/commentary` - Generate tour commentary for a location
- `POST /api/tour/nearby` - Get nearby points of interest
- `POST /api/tour/speak` - Convert text to speech audio

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key (required) |
| `PORT` | Backend server port (default: 3001) |

## License

MIT

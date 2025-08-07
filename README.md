# SOAP Note Generator

A medical documentation assistant that converts voice recordings and audio files into structured SOAP notes using **Deepgram Nova-3-Medical** for highly accurate medical speech recognition and **OpenAI GPT-4** for intelligent SOAP note generation.

## Features

🎤 **Medical-Grade Speech Recognition**

- Powered by Deepgram Nova-3-Medical model
- Specialized for medical terminology, drug names, and clinical jargon
- 63.7% better accuracy than competitors on medical audio
- Real-time voice recording with live transcription

📁 **Audio File Upload**

- Support for various audio formats (WAV, MP3, M4A, etc.)
- Batch processing of pre-recorded consultations
- Drag-and-drop interface for easy file uploads

🏥 **Intelligent SOAP Note Generation**

- Structured medical documentation (Subjective, Objective, Assessment, Plan)
- Powered by OpenAI GPT-4 for clinical accuracy
- Markdown formatting for enhanced readability
- Copy and export functionality

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Speech-to-Text**: Deepgram Nova-3-Medical API
- **AI Processing**: OpenAI GPT-4 via Vercel AI SDK
- **UI Components**: Radix UI, Shadcn/ui
- **Deployment**: Vercel

## Setup Instructions

### Prerequisites

- Node.js 18+ and pnpm
- Deepgram API Key ([Sign up here](https://console.deepgram.com/signup))
- OpenAI API Key ([Get yours here](https://platform.openai.com/api-keys))

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# OpenAI API Key for SOAP note generation
OPENAI_API_KEY=your_openai_api_key_here

# Deepgram API Key for speech-to-text transcription
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd SOAP-Note-Generator
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Run the development server**

   ```bash
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Voice Recording

1. Click "Start Recording" to begin voice capture
2. Speak clearly about the patient encounter
3. Click "Stop Recording" when finished
4. The audio will be automatically transcribed using Deepgram Nova-3-Medical

### File Upload

1. Click "Upload Audio File"
2. Select an audio file from your device
3. The file will be processed and transcribed automatically

### Generate SOAP Note

1. Review and edit the transcript if needed
2. Click "Generate SOAP Note"
3. The AI will create a structured SOAP note
4. Copy or download the generated note

## API Endpoints

### `POST /api/transcribe`

Transcribes uploaded audio files using Deepgram Nova-3-Medical

**Request**: FormData with audio file
**Response**:

```json
{
  "transcript": "transcribed text",
  "confidence": 0.95,
  "metadata": {
    "duration": 45.2,
    "model": "nova-3-medical",
    "language": "en"
  }
}
```

### `POST /api/completion`

Generates SOAP notes from transcripts using OpenAI GPT-4

**Request**:

```json
{
  "prompt": "transcript text"
}
```

**Response**: Streaming text response with SOAP note

## Deepgram Nova-3-Medical Features

- **Medical Terminology**: Specialized recognition of drug names, procedures, diagnoses
- **Clinical Accuracy**: 40.35% better keyword error rate than competitors
- **Smart Formatting**: Automatic punctuation, capitalization, and structure
- **Speaker Diarization**: Identifies different speakers in recordings
- **Noise Handling**: Excellent performance in clinical environments

## Security & Compliance

- All audio processing is done via secure APIs
- No audio files are permanently stored
- Transcripts are processed in memory only
- HIPAA-compliant infrastructure available through Deepgram

## Development

### Project Structure

```
├── app/
│   ├── api/
│   │   ├── transcribe/          # Deepgram transcription endpoint
│   │   ├── transcribe-live/     # Live transcription endpoint
│   │   └── completion/          # OpenAI SOAP generation
│   ├── actions.ts               # Server actions
│   └── page.tsx                 # Main application page
├── components/
│   ├── soap-note-generator/     # Core application components
│   │   ├── header.tsx           # App title and description
│   │   ├── audio-input.tsx      # Recording controls and file upload
│   │   ├── transcript-editor.tsx # Transcript display and editing
│   │   ├── soap-note-display.tsx # SOAP note viewer and export
│   │   ├── input-panel.tsx      # Left panel layout component
│   │   └── index.ts             # Component exports
│   ├── ui/                      # Shadcn/ui components
│   └── markdown.tsx             # Markdown rendering
├── hooks/
│   ├── use-deepgram-transcription.ts  # Deepgram integration
│   └── use-toast.ts             # Toast notifications
└── lib/
    └── utils.ts                 # Utility functions
```

### Component Architecture

The application is built with a modular component structure for maintainability and reusability:

**Core Components:**

- `Header` - Application branding and description
- `AudioInput` - Voice recording and file upload interface
- `TranscriptEditor` - Transcript display, editing, and SOAP generation
- `SOAPNoteDisplay` - Generated SOAP note viewer with export functionality
- `InputPanel` - Composite component organizing the left panel layout

**Features:**

- ✅ TypeScript interfaces for all props
- ✅ Responsive design with adaptive layouts
- ✅ Clean separation of concerns
- ✅ Reusable and testable components
- ✅ Consistent styling with Tailwind CSS

### Key Dependencies

- `@deepgram/sdk` - Deepgram JavaScript SDK
- `@ai-sdk/openai` - OpenAI integration
- `@radix-ui/*` - UI primitives
- `lucide-react` - Icons

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

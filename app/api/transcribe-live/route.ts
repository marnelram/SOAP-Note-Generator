import { createClient } from "@deepgram/sdk";
import { NextRequest } from "next/server";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

export async function GET(request: NextRequest) {
  if (request.headers.get("upgrade") !== "websocket") {
    return new Response("Expected websocket", { status: 400 });
  }

  return new Response(null, {
    status: 101,
    headers: {
      Upgrade: "websocket",
      Connection: "Upgrade",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { action, options } = await request.json();

    if (action === "start") {
      if (!process.env.DEEPGRAM_API_KEY) {
        return Response.json(
          { error: "Deepgram API key not configured" },
          { status: 500 }
        );
      }

      const config = {
        model: "nova-3-medical",
        language: "en",
        smart_format: true,
        punctuate: true,
        interim_results: true,
        utterance_end_ms: 1000,
        vad_events: true,
        endpointing: 300,
        diarize: false,
        profanity_filter: false,
        redact: false,
        encoding: "linear16",
        sample_rate: 16000,
        channels: 1,
        ...options,
      };

      try {
        // Key returned to the browser by design — client connects to Deepgram
        // directly (see CLAUDE.md security note).
        return Response.json({
          key: process.env.DEEPGRAM_API_KEY,
          url: "wss://api.deepgram.com/v1/listen",
          config,
          metadata: {
            modelInfo: "nova-3-medical - Optimized for healthcare terminology",
            features: [
              "Real-time transcription",
              "Medical terminology support",
              "Punctuation and formatting",
              "Voice activity detection",
              "Interim results",
            ],
          },
        });
      } catch (sdkError) {
        console.error("Deepgram SDK error:", sdkError);
        const errorMessage =
          sdkError instanceof Error ? sdkError.message : "Unknown SDK error";
        return Response.json(
          {
            error: "Failed to initialize Deepgram connection",
            details: errorMessage,
          },
          { status: 500 }
        );
      }
    }

    if (action === "validate") {
      try {
        const { result: projectsResult } = await deepgram.manage.getProjects();
        return Response.json({
          status: "healthy",
          projectCount: projectsResult?.projects?.length || 0,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown validation error";
        return Response.json(
          { error: "API key validation failed", details: errorMessage },
          { status: 401 }
        );
      }
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in live transcription API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown API error";
    return Response.json(
      {
        error: "Failed to setup live transcription",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

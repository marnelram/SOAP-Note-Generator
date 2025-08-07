import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { NextRequest, NextResponse } from "next/server";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const upgrade = request.headers.get("upgrade");

  if (upgrade !== "websocket") {
    return new Response("Expected websocket", { status: 400 });
  }

  try {
    // Create a live transcription connection
    const deepgramLive = deepgram.listen.live({
      model: "nova-3-medical",
      language: "en",
      smart_format: true,
      punctuate: true,
      interim_results: true,
      utterance_end_ms: 1000,
      vad_events: true,
    });

    return new Response("WebSocket upgrade handled by Deepgram", {
      status: 101,
      headers: {
        Upgrade: "websocket",
        Connection: "Upgrade",
      },
    });
  } catch (error) {
    console.error("Error setting up live transcription:", error);
    return NextResponse.json(
      { error: "Failed to setup live transcription" },
      { status: 500 }
    );
  }
}

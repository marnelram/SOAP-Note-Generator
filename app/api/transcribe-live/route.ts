import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
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
    const { action } = await request.json();

    if (action === "start") {
      // Create a WebSocket connection token for Deepgram
      const { result: projectsResult } = await deepgram.manage.getProjects();
      const project = projectsResult?.projects?.[0];

      if (!project) {
        return Response.json({ error: "No project found" }, { status: 500 });
      }

      const { result: keyResult } = await deepgram.manage.getProjectKeys(
        project.project_id
      );

      return Response.json({
        key: keyResult?.api_keys?.[0]?.api_key || process.env.DEEPGRAM_API_KEY,
        url: "wss://api.deepgram.com/v1/listen",
        config: {
          model: "nova-2-medical",
          language: "en",
          smart_format: true,
          punctuate: true,
          interim_results: true,
          utterance_end_ms: 1000,
          vad_events: true,
          encoding: "linear16",
          sample_rate: 16000,
        },
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error setting up live transcription:", error);
    return Response.json(
      { error: "Failed to setup live transcription" },
      { status: 500 }
    );
  }
}

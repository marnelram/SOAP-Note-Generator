import { createClient } from "@deepgram/sdk";
import { NextRequest, NextResponse } from "next/server";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

// Configure longer timeout for transcription (10 minutes)
export const maxDuration = 600;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Validate file size (500MB limit)
    const maxSizeBytes = 500 * 1024 * 1024;
    if (audioFile.size > maxSizeBytes) {
      return NextResponse.json(
        {
          error: `Audio file too large. Maximum size allowed is ${
            maxSizeBytes / (1024 * 1024)
          }MB. Current file size: ${(audioFile.size / (1024 * 1024)).toFixed(
            2
          )}MB`,
        },
        { status: 413 }
      );
    }

    // Validate file type
    if (
      !audioFile.type.startsWith("audio/") &&
      !audioFile.type.includes("webm")
    ) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an audio file." },
        { status: 400 }
      );
    }

    // Convert the file to a buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Transcribe with Deepgram Nova-3-Medical model
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: "nova-3-medical",
        smart_format: true,
        punctuate: true,
        diarize: true,
        utterances: true,
        paragraphs: true,
        language: "en",
      }
    );

    if (error) {
      console.error("Deepgram transcription error:", error);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 500 }
      );
    }

    // Extract the transcript text
    const transcript = result.results.channels[0].alternatives[0].transcript;

    return NextResponse.json({
      transcript,
      confidence: result.results.channels[0].alternatives[0].confidence,
      metadata: {
        duration: result.metadata.duration,
        model: "nova-3-medical",
        language: "en",
      },
    });
  } catch (error) {
    console.error("Error processing transcription request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

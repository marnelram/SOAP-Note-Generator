"use server";

import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function generateSOAPNote(transcript: string): Promise<Response> {
  const stream = await streamText({
    model: openai("gpt-4o"),
    system: `You are a medical documentation assistant. Convert the provided patient encounter transcript into a structured SOAP note format. Include only the information that is provided in the transcript, and not any additional information. Write the SOAP note in markdown format, with each section separated by a divider. Use tables, lists, and other markdown formatting to make the note more readable.

SOAP Format:
- Subjective: Patient's reported symptoms, concerns, and history in their own words
  - CC: why the patient is seeking care
  - HPI: the story of the patient's last clinic visit, or message to the provider
- Objective: Observable, measurable findings
  - History:
  - Physical Exam:
  - Labs: A1C, CBC, lipid panel, etc.
  - Medications: Current medications, allergies, and medication history
- Assessment: Clinical impression, diagnosis, or differential diagnosis
- Plan: Treatment plan, medications, follow-up instructions, patient education

If information is missing for a section, note what additional information would be needed.`,
    prompt: `Please convert this patient encounter transcript into a SOAP note:

${transcript}

Return as JSON format with subjective, objective, assessment, and plan fields.`,
  });

  try {
    return stream.toTextStreamResponse();
  } catch (error) {
    console.error("Error creating SOAP note:", error);
    throw new Error("Failed to generate SOAP note");
  }
}

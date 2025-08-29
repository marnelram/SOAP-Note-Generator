import { streamText } from "ai";
import { groq } from "@ai-sdk/groq";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = await streamText({
    model: groq("moonshotai/kimi-k2-instruct"),
    temperature: 0,
    system: `You are a medical documentation assistant. Convert the provided SOAP bullet points into a properly formatted, comprehensive SOAP note.

Follow this exact format:

# SOAP Note

## Subjective (6-8 sentences)
Convert the subjective bullet points into a flowing paragraph that includes:
- Patient introduction (age, gender, relevant demographics)
- Chief complaint and history of present illness
- Relevant medical history, family history, and social history
- All subjective information combined into a single, well-written paragraph

### Last Visit
If there are bullet points about a previous visit, create a separate paragraph summarizing:
- What happened at the last visit
- Relevant plans, medication changes, and action items
- Only include information most relevant to the current visit
- If no previous visit information is provided, omit this section

## Objective
Convert objective bullet points into organized sections using markdown tables where appropriate:

### Physical Exam
- List physical examination findings
- Include any additional clinical data

### Labs
- Create markdown tables for laboratory results
- Separate different lab panels into their own tables (e.g., CMP, CBC, lipid panel)
- Include reference ranges if provided
- Format as: | Test | Result | Reference Range |

### Medications
Create a table with 3 columns:
| Medication | SIG | Notes |
- Medication column: Full medication name and strength
- SIG column: Complete dosing instructions (number of tablets/capsules, route, frequency)
- Notes column: Any additional information, adjustments, or changes

## Assessment/Plan

### Assessment (6-8 sentences)
Convert assessment bullet points into a flowing paragraph that includes:
- Clinical impressions and diagnoses
- Provider's analysis of the patient's condition
- Supporting evidence for clinical decisions
- How the provider interpreted labs, symptoms, and examination findings
- Any differential diagnoses considered

### Plan
Convert plan bullet points into organized sections:
1. **Medications:** New prescriptions, changes, or adjustments
2. **Education:** Patient education topics and instructions provided
3. **Follow-up:** Scheduled appointments and monitoring plans
4. **Laboratory/Testing:** Any ordered tests or studies
5. **Lifestyle:** Diet, exercise, or other lifestyle recommendations

# Formatting Requirements:
- Use proper markdown formatting with headers, tables, and lists
- Maintain clinical accuracy and professional tone
- Preserve any uncertainty markers (~~word?~~) from the bullet points
- Create well-structured tables for labs and medications
- Ensure the note flows naturally and is easy to read
- Do not add information not present in the bullet points`,
    prompt,
  });

  return result.toTextStreamResponse();
}

'use server'

import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

interface SOAPNote {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

export async function generateSOAPNote(transcript: string): Promise<SOAPNote> {
  const { text } = await generateText({
    model: openai('gpt-4o'),
    system: `You are a medical documentation assistant. Convert the provided patient encounter transcript into a structured SOAP note format.

SOAP Format:
- Subjective: Patient's reported symptoms, concerns, and history in their own words
- Objective: Observable, measurable findings (vital signs, physical exam, lab results)
- Assessment: Clinical impression, diagnosis, or differential diagnosis
- Plan: Treatment plan, medications, follow-up instructions, patient education

Return the response as a JSON object with keys: subjective, objective, assessment, plan.
Each section should be a clear, professional medical note entry.
If information is missing for a section, note what additional information would be needed.`,
    prompt: `Please convert this patient encounter transcript into a SOAP note:

${transcript}

Return as JSON format with subjective, objective, assessment, and plan fields.`
  })

  try {
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    // Fallback parsing if no JSON found
    const lines = text.split('\n').filter(line => line.trim())
    const soapNote: SOAPNote = {
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    }
    
    let currentSection = ''
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase()
      if (lowerLine.includes('subjective')) {
        currentSection = 'subjective'
      } else if (lowerLine.includes('objective')) {
        currentSection = 'objective'
      } else if (lowerLine.includes('assessment')) {
        currentSection = 'assessment'
      } else if (lowerLine.includes('plan')) {
        currentSection = 'plan'
      } else if (currentSection && line.trim()) {
        soapNote[currentSection as keyof SOAPNote] += line.trim() + ' '
      }
    }
    
    return soapNote
  } catch (error) {
    console.error('Error parsing SOAP note:', error)
    throw new Error('Failed to generate SOAP note')
  }
}

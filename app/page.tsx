'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Mic, MicOff, FileText, Download, Copy } from 'lucide-react'
import { generateSOAPNote } from './actions'
import { useToast } from '@/hooks/use-toast'

interface SOAPNote {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

export default function SOAPNoteGenerator() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [soapNote, setSoapNote] = useState<SOAPNote | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        setIsSupported(false)
        return
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        setTranscript(prev => {
          const newTranscript = prev + finalTranscript
          return newTranscript
        })
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
        toast({
          title: "Recording Error",
          description: "There was an error with speech recognition. Please try again.",
          variant: "destructive"
        })
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
    }
  }, [toast])

  const startRecording = () => {
    if (recognitionRef.current && isSupported) {
      setTranscript('')
      setSoapNote(null)
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleGenerateSOAP = async () => {
    if (!transcript.trim()) {
      toast({
        title: "No Transcript",
        description: "Please record some audio first before generating a SOAP note.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    try {
      const result = await generateSOAPNote(transcript)
      setSoapNote(result)
      toast({
        title: "SOAP Note Generated",
        description: "Your SOAP note has been successfully generated.",
      })
    } catch (error) {
      console.error('Error generating SOAP note:', error)
      toast({
        title: "Generation Error",
        description: "Failed to generate SOAP note. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied",
        description: "Content copied to clipboard.",
      })
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const exportSOAP = () => {
    if (!soapNote) return

    const content = `SOAP NOTE
Generated: ${new Date().toLocaleDateString()}

SUBJECTIVE:
${soapNote.subjective}

OBJECTIVE:
${soapNote.objective}

ASSESSMENT:
${soapNote.assessment}

PLAN:
${soapNote.plan}

---
Original Transcript:
${transcript}`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soap-note-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="mt-20">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Browser Not Supported</h1>
              <p className="text-gray-600">
                Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SOAP Note Generator</h1>
          <p className="text-gray-600">Voice-to-SOAP medical documentation assistant</p>
        </div>

        {/* Recording Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Voice Recording
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={startRecording}
                disabled={isRecording}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Recording
              </Button>
              <Button
                onClick={stopRecording}
                disabled={!isRecording}
                size="lg"
                variant="destructive"
              >
                <MicOff className="h-5 w-5 mr-2" />
                Stop Recording
              </Button>
            </div>
            
            {isRecording && (
              <div className="text-center">
                <Badge variant="destructive" className="animate-pulse">
                  Recording in progress...
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transcript */}
        {transcript && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Transcript</span>
                <Button
                  onClick={() => copyToClipboard(transcript)}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Your transcribed text will appear here..."
                className="min-h-32"
              />
              <div className="mt-4">
                <Button
                  onClick={handleGenerateSOAP}
                  disabled={isGenerating || !transcript.trim()}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating SOAP Note...' : 'Generate SOAP Note'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SOAP Note Display */}
        {soapNote && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Generated SOAP Note</span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(`SUBJECTIVE:\n${soapNote.subjective}\n\nOBJECTIVE:\n${soapNote.objective}\n\nASSESSMENT:\n${soapNote.assessment}\n\nPLAN:\n${soapNote.plan}`)}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={exportSOAP}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-2">SUBJECTIVE</h3>
                <p className="text-gray-700 bg-green-50 p-4 rounded-lg">{soapNote.subjective}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold text-blue-700 mb-2">OBJECTIVE</h3>
                <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">{soapNote.objective}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold text-orange-700 mb-2">ASSESSMENT</h3>
                <p className="text-gray-700 bg-orange-50 p-4 rounded-lg">{soapNote.assessment}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold text-purple-700 mb-2">PLAN</h3>
                <p className="text-gray-700 bg-purple-50 p-4 rounded-lg">{soapNote.plan}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

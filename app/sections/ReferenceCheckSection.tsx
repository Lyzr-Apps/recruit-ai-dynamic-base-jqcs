'use client'

import React, { useState } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FiArrowLeft, FiCheck, FiAlertTriangle, FiClock, FiSend, FiClipboard, FiSearch, FiList } from 'react-icons/fi'

const AGENT_ID = '69a3753f8811f110756792da'

interface ReferenceQuestion {
  category?: string
  question?: string
  purpose?: string
}

interface ReferenceAnalysis {
  overall_score?: number
  recommendation?: string
  consistency_rating?: string
  enthusiasm_level?: string
  key_strengths?: string[]
  concerns?: string[]
  red_flags?: string[]
  patterns_identified?: string[]
  summary?: string
}

interface ReferenceCheckResult {
  mode?: string
  candidate_name?: string
  role_applied?: string
  reference_questions?: ReferenceQuestion[]
  reference_analysis?: ReferenceAnalysis
  verification_status?: string
  next_steps?: string[]
}

interface ReferenceCheckSectionProps {
  candidateName?: string
  candidateEmail?: string
  requisitionTitle?: string
  onBack: () => void
  onUpdateCandidate?: (data: any) => void
  setActiveAgentId: (id: string | null) => void
}

function parseAgentResponse(result: AIAgentResponse) {
  if (!result.success) return null
  const r = result?.response?.result
  if (!r) return null
  if (typeof r === 'string') {
    try { return JSON.parse(r) } catch { return null }
  }
  return r
}

export default function ReferenceCheckSection({
  candidateName, candidateEmail, requisitionTitle, onBack, onUpdateCandidate, setActiveAgentId
}: ReferenceCheckSectionProps) {
  const [generateForm, setGenerateForm] = useState({
    candidateName: candidateName ?? '',
    roleApplied: requisitionTitle ?? '',
    keySkills: '',
    yearsExperience: '',
    company: '',
  })
  const [referenceFeedback, setReferenceFeedback] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [generateResult, setGenerateResult] = useState<ReferenceCheckResult | null>(null)
  const [analyzeResult, setAnalyzeResult] = useState<ReferenceCheckResult | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState('generate')

  const handleGenerate = async () => {
    if (!generateForm.candidateName || !generateForm.roleApplied) {
      setStatusMessage({ type: 'error', text: 'Please provide at least the candidate name and role applied for.' })
      return
    }
    setLoading('generate')
    setStatusMessage({ type: 'info', text: 'Generating reference check questionnaire...' })
    setActiveAgentId(AGENT_ID)

    const message = `Generate a reference check questionnaire for candidate ${generateForm.candidateName} applying for the role of ${generateForm.roleApplied}. Key skills: ${generateForm.keySkills || 'Not specified'}. Years of experience: ${generateForm.yearsExperience || 'Not specified'}. Current/Previous company: ${generateForm.company || 'Not specified'}.`

    const result = await callAIAgent(message, AGENT_ID)
    setActiveAgentId(null)
    setLoading(null)

    const parsed = parseAgentResponse(result) as ReferenceCheckResult | null
    if (parsed) {
      setGenerateResult(parsed)
      setStatusMessage({ type: 'success', text: 'Reference check questionnaire generated successfully' })
      if (onUpdateCandidate) onUpdateCandidate(parsed)
    } else {
      setStatusMessage({ type: 'error', text: result?.error ?? 'Failed to generate questionnaire. Please try again.' })
    }
  }

  const handleAnalyze = async () => {
    if (!referenceFeedback.trim()) {
      setStatusMessage({ type: 'error', text: 'Please paste reference responses or feedback to analyze.' })
      return
    }
    setLoading('analyze')
    setStatusMessage({ type: 'info', text: 'Analyzing reference feedback...' })
    setActiveAgentId(AGENT_ID)

    const message = `Analyze the following reference feedback for candidate ${generateForm.candidateName || candidateName || 'the candidate'} applying for ${generateForm.roleApplied || requisitionTitle || 'the role'}:\n\n${referenceFeedback}`

    const result = await callAIAgent(message, AGENT_ID)
    setActiveAgentId(null)
    setLoading(null)

    const parsed = parseAgentResponse(result) as ReferenceCheckResult | null
    if (parsed) {
      setAnalyzeResult(parsed)
      setStatusMessage({ type: 'success', text: 'Reference analysis complete' })
      if (onUpdateCandidate) onUpdateCandidate(parsed)
    } else {
      setStatusMessage({ type: 'error', text: result?.error ?? 'Failed to analyze references. Please try again.' })
    }
  }

  // Group questions by category
  const questions = Array.isArray(generateResult?.reference_questions) ? generateResult.reference_questions : []
  const groupedQuestions: Record<string, ReferenceQuestion[]> = {}
  questions.forEach(q => {
    const cat = q?.category ?? 'General'
    if (!groupedQuestions[cat]) groupedQuestions[cat] = []
    groupedQuestions[cat].push(q)
  })
  const categoryKeys = Object.keys(groupedQuestions)

  const analysis = analyzeResult?.reference_analysis
  const keyStrengths = Array.isArray(analysis?.key_strengths) ? analysis.key_strengths : []
  const concerns = Array.isArray(analysis?.concerns) ? analysis.concerns : []
  const redFlags = Array.isArray(analysis?.red_flags) ? analysis.red_flags : []
  const patterns = Array.isArray(analysis?.patterns_identified) ? analysis.patterns_identified : []
  const nextSteps = Array.isArray(analyzeResult?.next_steps) ? analyzeResult.next_steps : []
  const overallScore = analysis?.overall_score ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-lg border border-[hsl(214,32%,91%)] bg-white flex items-center justify-center hover:bg-[hsl(210,40%,96%)] transition-colors">
          <FiArrowLeft className="w-4 h-4 text-[hsl(222,47%,11%)]" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[hsl(222,47%,11%)]">Reference Check</h1>
          <p className="text-sm text-[hsl(215,16%,47%)]">
            {candidateName && requisitionTitle
              ? `${candidateName} - ${requisitionTitle}`
              : candidateName
                ? candidateName
                : 'Generate questionnaires and analyze reference feedback'}
          </p>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {statusMessage.type === 'success' ? <FiCheck className="w-4 h-4 flex-shrink-0" /> : statusMessage.type === 'error' ? <FiAlertTriangle className="w-4 h-4 flex-shrink-0" /> : <FiClock className="animate-spin w-4 h-4 flex-shrink-0" />}
          {statusMessage.text}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-[hsl(210,40%,96%)] rounded-lg p-1">
          <TabsTrigger value="generate" className="rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FiClipboard className="w-4 h-4 mr-2" /> Generate Questions
          </TabsTrigger>
          <TabsTrigger value="analyze" className="rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FiSearch className="w-4 h-4 mr-2" /> Analyze References
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Generate Questions */}
        <TabsContent value="generate" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6 space-y-5">
              <h2 className="font-semibold text-[hsl(222,47%,11%)] flex items-center gap-2 text-base">
                <FiClipboard className="w-5 h-5" /> Candidate Details
              </h2>
              <div className="space-y-1.5">
                <Label className="text-[hsl(222,47%,11%)] text-sm font-medium">Candidate Name *</Label>
                <Input
                  value={generateForm.candidateName}
                  onChange={e => setGenerateForm(prev => ({ ...prev, candidateName: e.target.value }))}
                  placeholder="Jane Doe"
                  className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[hsl(222,47%,11%)] text-sm font-medium">Role Applied For *</Label>
                <Input
                  value={generateForm.roleApplied}
                  onChange={e => setGenerateForm(prev => ({ ...prev, roleApplied: e.target.value }))}
                  placeholder="Senior Software Engineer"
                  className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[hsl(222,47%,11%)] text-sm font-medium">Key Skills (comma-separated)</Label>
                <Input
                  value={generateForm.keySkills}
                  onChange={e => setGenerateForm(prev => ({ ...prev, keySkills: e.target.value }))}
                  placeholder="React, Node.js, Leadership"
                  className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[hsl(222,47%,11%)] text-sm font-medium">Years of Experience</Label>
                  <Input
                    type="number"
                    value={generateForm.yearsExperience}
                    onChange={e => setGenerateForm(prev => ({ ...prev, yearsExperience: e.target.value }))}
                    placeholder="5"
                    className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[hsl(222,47%,11%)] text-sm font-medium">Current/Previous Company</Label>
                  <Input
                    value={generateForm.company}
                    onChange={e => setGenerateForm(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Acme Corp"
                    className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading !== null}
                className="w-full bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,16%)] disabled:opacity-50 text-white rounded-lg px-5 py-2.5 font-medium shadow-sm flex items-center justify-center gap-2 text-sm transition-colors"
              >
                {loading === 'generate' ? <><FiClock className="animate-spin w-4 h-4" /> Generating...</> : <><FiSend className="w-4 h-4" /> Generate Reference Check</>}
              </button>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {loading === 'generate' && !generateResult && (
                <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6">
                  <div className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)] mb-4">
                    <FiClock className="animate-spin" /> Generating tailored reference check questions...
                  </div>
                  <div className="animate-pulse space-y-4">
                    <div className="h-5 bg-[hsl(210,40%,92%)] rounded-lg w-3/4"></div>
                    <div className="h-5 bg-[hsl(210,40%,92%)] rounded-lg w-1/2"></div>
                    <div className="h-5 bg-[hsl(210,40%,92%)] rounded-lg w-2/3"></div>
                  </div>
                </div>
              )}

              {categoryKeys.length > 0 && (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-4">
                    {generateResult?.candidate_name && (
                      <div className="bg-[hsl(210,40%,98%)] border border-[hsl(214,32%,91%)] rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
                        <span className="text-[hsl(215,16%,47%)]">Candidate:</span>
                        <span className="font-medium text-[hsl(222,47%,11%)]">{generateResult.candidate_name}</span>
                        {generateResult?.role_applied && (
                          <>
                            <span className="text-[hsl(214,32%,91%)]">|</span>
                            <span className="text-[hsl(215,16%,47%)]">Role:</span>
                            <span className="font-medium text-[hsl(222,47%,11%)]">{generateResult.role_applied}</span>
                          </>
                        )}
                      </div>
                    )}
                    {categoryKeys.map((category, ci) => (
                      <div key={ci} className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                        <h3 className="font-semibold text-[hsl(222,47%,11%)] mb-3 flex items-center gap-2">
                          <FiList className="w-4 h-4" /> {category}
                        </h3>
                        <div className="space-y-3">
                          {groupedQuestions[category].map((q, qi) => (
                            <div key={qi} className="bg-[hsl(210,40%,98%)] rounded-xl p-4 border border-[hsl(214,32%,91%)]">
                              <div className="flex items-start gap-3">
                                <span className="bg-[hsl(222,47%,11%)] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                                  {qi + 1}
                                </span>
                                <div className="flex-1 space-y-1.5">
                                  <p className="text-sm font-medium text-[hsl(222,47%,11%)]">{q?.question ?? ''}</p>
                                  {q?.purpose && (
                                    <p className="text-xs text-[hsl(215,16%,47%)] italic">Purpose: {q.purpose}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {generateResult?.verification_status && (
                      <div className="flex items-center gap-2 px-4 py-2">
                        <span className="text-sm text-[hsl(215,16%,47%)]">Verification Status:</span>
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200">{generateResult.verification_status}</Badge>
                      </div>
                    )}

                    {Array.isArray(generateResult?.next_steps) && generateResult.next_steps.length > 0 && (
                      <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                        <h3 className="font-semibold text-[hsl(222,47%,11%)] mb-3">Next Steps</h3>
                        <ol className="space-y-2">
                          {generateResult.next_steps.map((step: string, i: number) => (
                            <li key={i} className="text-sm text-[hsl(215,16%,47%)] flex gap-2.5">
                              <span className="bg-[hsl(222,47%,11%)] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">{i + 1}</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {!loading && categoryKeys.length === 0 && (
                <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm py-16 text-center">
                  <div className="w-16 h-16 bg-[hsl(210,40%,94%)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiClipboard className="w-7 h-7 text-[hsl(215,16%,47%)]" />
                  </div>
                  <p className="text-[hsl(222,47%,11%)] font-medium mb-1">Reference questions will appear here</p>
                  <p className="text-sm text-[hsl(215,16%,47%)] max-w-sm mx-auto">Fill in the candidate details and click Generate Reference Check</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: Analyze References */}
        <TabsContent value="analyze" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6 space-y-5">
              <h2 className="font-semibold text-[hsl(222,47%,11%)] flex items-center gap-2 text-base">
                <FiSearch className="w-5 h-5" /> Reference Feedback
              </h2>
              <div className="space-y-1.5">
                <Label className="text-[hsl(222,47%,11%)] text-sm font-medium">Paste Reference Responses *</Label>
                <Textarea
                  value={referenceFeedback}
                  onChange={e => setReferenceFeedback(e.target.value)}
                  placeholder={"Paste the reference responses or feedback here...\n\nExample:\nReference 1 (John Smith, Former Manager):\n\"Jane was an exceptional team member who consistently delivered high-quality work. She demonstrated strong leadership skills and was always willing to help others...\""}
                  rows={12}
                  className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent"
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={loading !== null}
                className="w-full bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,16%)] disabled:opacity-50 text-white rounded-lg px-5 py-2.5 font-medium shadow-sm flex items-center justify-center gap-2 text-sm transition-colors"
              >
                {loading === 'analyze' ? <><FiClock className="animate-spin w-4 h-4" /> Analyzing...</> : <><FiSearch className="w-4 h-4" /> Analyze References</>}
              </button>
            </div>

            {/* Analysis Results */}
            <div className="space-y-4">
              {loading === 'analyze' && !analyzeResult && (
                <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6">
                  <div className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)] mb-4">
                    <FiClock className="animate-spin" /> Analyzing reference feedback and identifying patterns...
                  </div>
                  <div className="animate-pulse space-y-4">
                    <div className="h-5 bg-[hsl(210,40%,92%)] rounded-lg w-3/4"></div>
                    <div className="h-5 bg-[hsl(210,40%,92%)] rounded-lg w-1/2"></div>
                    <div className="h-5 bg-[hsl(210,40%,92%)] rounded-lg w-2/3"></div>
                  </div>
                </div>
              )}

              {analysis && (
                <ScrollArea className="max-h-[700px]">
                  <div className="space-y-4">
                    {/* Overall Score */}
                    <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                      <h3 className="font-semibold text-[hsl(222,47%,11%)] mb-3">Overall Score</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="w-full h-3 bg-[hsl(210,40%,92%)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(Math.max(overallScore, 0), 100)}%`,
                                backgroundColor: overallScore >= 80 ? 'hsl(152, 69%, 31%)' : overallScore >= 60 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 72%, 51%)',
                              }}
                            />
                          </div>
                        </div>
                        <Badge className={`text-sm px-3 py-1 ${overallScore >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : overallScore >= 60 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          {overallScore}/100
                        </Badge>
                      </div>
                    </div>

                    {/* Recommendation */}
                    {analysis?.recommendation && (
                      <div className="bg-blue-50 text-blue-700 border border-blue-200 rounded-[0.875rem] p-5">
                        <h3 className="font-semibold mb-2">Recommendation</h3>
                        <p className="text-sm">{analysis.recommendation}</p>
                      </div>
                    )}

                    {/* Consistency & Enthusiasm */}
                    {(analysis?.consistency_rating || analysis?.enthusiasm_level) && (
                      <div className="flex items-center gap-3">
                        {analysis?.consistency_rating && (
                          <div className="flex-1 bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-4 text-center">
                            <p className="text-xs text-[hsl(215,16%,47%)] mb-1.5">Consistency Rating</p>
                            <Badge className="bg-[hsl(210,40%,96%)] text-[hsl(222,47%,11%)] border border-[hsl(214,32%,91%)] text-sm px-3 py-1">{analysis.consistency_rating}</Badge>
                          </div>
                        )}
                        {analysis?.enthusiasm_level && (
                          <div className="flex-1 bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-4 text-center">
                            <p className="text-xs text-[hsl(215,16%,47%)] mb-1.5">Enthusiasm Level</p>
                            <Badge className="bg-[hsl(210,40%,96%)] text-[hsl(222,47%,11%)] border border-[hsl(214,32%,91%)] text-sm px-3 py-1">{analysis.enthusiasm_level}</Badge>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Key Strengths */}
                    {keyStrengths.length > 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-[0.875rem] p-5">
                        <h3 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                          <FiCheck className="w-4 h-4" /> Key Strengths
                        </h3>
                        <ul className="space-y-2">
                          {keyStrengths.map((s: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-emerald-700">
                              <FiCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Concerns */}
                    {concerns.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-[0.875rem] p-5">
                        <h3 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
                          <FiAlertTriangle className="w-4 h-4" /> Concerns
                        </h3>
                        <ul className="space-y-2">
                          {concerns.map((c: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                              <FiAlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Red Flags */}
                    {redFlags.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-[0.875rem] p-5">
                        <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                          <FiAlertTriangle className="w-4 h-4" /> Red Flags
                        </h3>
                        <ul className="space-y-2">
                          {redFlags.map((rf: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                              <FiAlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              {rf}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Patterns Identified */}
                    {patterns.length > 0 && (
                      <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                        <h3 className="font-semibold text-[hsl(222,47%,11%)] mb-3">Patterns Identified</h3>
                        <ul className="space-y-2">
                          {patterns.map((p: string, i: number) => (
                            <li key={i} className="text-sm text-[hsl(215,16%,47%)] flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(222,47%,11%)] flex-shrink-0 mt-1.5"></span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Summary */}
                    {analysis?.summary && (
                      <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                        <h3 className="font-semibold text-[hsl(222,47%,11%)] mb-2">Summary</h3>
                        <p className="text-sm text-[hsl(215,16%,47%)] leading-relaxed">{analysis.summary}</p>
                      </div>
                    )}

                    {/* Verification Status */}
                    {analyzeResult?.verification_status && (
                      <div className="flex items-center gap-2 px-4 py-2">
                        <span className="text-sm text-[hsl(215,16%,47%)]">Verification Status:</span>
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200">{analyzeResult.verification_status}</Badge>
                      </div>
                    )}

                    {/* Next Steps */}
                    {nextSteps.length > 0 && (
                      <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                        <h3 className="font-semibold text-[hsl(222,47%,11%)] mb-3">Next Steps</h3>
                        <ol className="space-y-2">
                          {nextSteps.map((step: string, i: number) => (
                            <li key={i} className="text-sm text-[hsl(215,16%,47%)] flex gap-2.5">
                              <span className="bg-[hsl(222,47%,11%)] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">{i + 1}</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {!loading && !analysis && (
                <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm py-16 text-center">
                  <div className="w-16 h-16 bg-[hsl(210,40%,94%)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiSearch className="w-7 h-7 text-[hsl(215,16%,47%)]" />
                  </div>
                  <p className="text-[hsl(222,47%,11%)] font-medium mb-1">Reference analysis will appear here</p>
                  <p className="text-sm text-[hsl(215,16%,47%)] max-w-sm mx-auto">Paste reference responses and click Analyze References</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

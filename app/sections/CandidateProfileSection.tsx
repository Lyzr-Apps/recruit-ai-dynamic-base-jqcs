'use client'

import React, { useState } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FiArrowLeft, FiStar, FiAlertTriangle, FiCheck, FiClock, FiCalendar, FiBarChart2, FiDollarSign, FiFlag, FiAward, FiTrendingUp } from 'react-icons/fi'

interface Candidate {
  id: string; name: string; email: string; currentTitle: string; company: string
  yearsExperience: number; keySkills: string[]; location: string; education: string
  overallScore: number; skillsScore: number; experienceScore: number
  recommendation: string; fitAnalysis: string; sourcePlatform: string
  status: 'sourced' | 'screened' | 'interviewing' | 'analyzed' | 'negotiating' | 'offered' | 'hired'
  screening?: any; interviewReport?: any; negotiation?: any; offerDetails?: any; interviewScheduled?: boolean
}

interface CandidateProfileSectionProps {
  candidate: Candidate
  requisitionTitle: string
  onBack: () => void
  onUpdateCandidate: (candidate: Candidate) => void
  onScheduleInterview: (candidate: Candidate) => void
  onStartNegotiation: (candidate: Candidate) => void
  setActiveAgentId: (id: string | null) => void
}

const ANALYSIS_AGENT = '69a36bb2baa6e1c48dc21fa0'

function parseAgentResponse(result: AIAgentResponse) {
  if (!result.success) return null
  const r = result?.response?.result
  if (!r) return null
  if (typeof r === 'string') { try { return JSON.parse(r) } catch { return null } }
  return r
}

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-700 border-green-200'
  if (score >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  return 'bg-red-100 text-red-700 border-red-200'
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{line.slice(2)}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{line.replace(/^\d+\.\s/, '')}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{line}</p>
      })}
    </div>
  )
}

export default function CandidateProfileSection({
  candidate, requisitionTitle, onBack, onUpdateCandidate, onScheduleInterview, onStartNegotiation, setActiveAgentId
}: CandidateProfileSectionProps) {
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [interviewNotes, setInterviewNotes] = useState('')
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false)

  const screening = candidate.screening
  const interviewReport = candidate.interviewReport
  const negotiation = candidate.negotiation

  const screeningQuestions = Array.isArray(screening?.screening_questions) ? screening.screening_questions : []
  const strengths = Array.isArray(screening?.strengths) ? screening.strengths : []
  const concerns = Array.isArray(screening?.concerns) ? screening.concerns : []

  const competencyScores = Array.isArray(interviewReport?.competency_scores) ? interviewReport.competency_scores : []
  const irStrengths = Array.isArray(interviewReport?.strengths) ? interviewReport.strengths : []
  const devAreas = Array.isArray(interviewReport?.development_areas) ? interviewReport.development_areas : []
  const redFlags = Array.isArray(interviewReport?.red_flags) ? interviewReport.red_flags : []
  const quotes = Array.isArray(interviewReport?.notable_quotes) ? interviewReport.notable_quotes : []
  const themes = Array.isArray(interviewReport?.themes) ? interviewReport.themes : []

  const negStrategy = Array.isArray(negotiation?.negotiation_strategy) ? negotiation.negotiation_strategy : []
  const riskFactors = Array.isArray(negotiation?.risk_factors) ? negotiation.risk_factors : []
  const otherBenefits = Array.isArray(negotiation?.recommended_package?.other_benefits) ? negotiation.recommended_package.other_benefits : []

  const handleAnalyze = async () => {
    if (!interviewNotes.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter interview notes or transcript' })
      return
    }
    setLoading(true)
    setAnalysisDialogOpen(false)
    setStatusMessage({ type: 'info', text: 'AI is analyzing interview performance...' })
    setActiveAgentId(ANALYSIS_AGENT)

    const message = `Analyze this interview for candidate ${candidate.name} applying for ${requisitionTitle}.\n\nInterview Transcript/Notes:\n${interviewNotes}`
    const result = await callAIAgent(message, ANALYSIS_AGENT)
    setActiveAgentId(null)
    setLoading(false)

    const parsed = parseAgentResponse(result)
    if (parsed) {
      onUpdateCandidate({ ...candidate, interviewReport: parsed, status: 'analyzed' })
      setStatusMessage({ type: 'success', text: 'Interview analysis complete' })
    } else {
      setStatusMessage({ type: 'error', text: result?.error ?? 'Failed to analyze interview' })
    }
  }

  const statusActions = () => {
    const s = candidate.status
    const btns = []
    if (s === 'screened' || s === 'sourced') {
      btns.push(
        <Button key="schedule" onClick={() => onScheduleInterview(candidate)} className="bg-[hsl(222,47%,11%)] text-[hsl(210,40%,98%)] rounded-[0.875rem] gap-2"><FiCalendar /> Schedule Interview</Button>
      )
    }
    if (s === 'screened' || s === 'interviewing') {
      btns.push(
        <Dialog key="analyze-dialog" open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="rounded-[0.875rem] gap-2 border-[hsl(214,32%,91%)]"><FiBarChart2 /> Analyze Interview</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-white rounded-[0.875rem]">
            <DialogHeader><DialogTitle>Interview Notes / Transcript</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label>Enter the interview transcript or detailed notes:</Label>
              <Textarea rows={8} value={interviewNotes} onChange={e => setInterviewNotes(e.target.value)} placeholder="Paste interview transcript or notes here..." className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
              <Button onClick={handleAnalyze} disabled={!interviewNotes.trim()} className="w-full bg-[hsl(222,47%,11%)] text-[hsl(210,40%,98%)] rounded-[0.875rem]">Analyze</Button>
            </div>
          </DialogContent>
        </Dialog>
      )
    }
    if (s === 'analyzed' || s === 'screened') {
      btns.push(
        <Button key="negotiate" onClick={() => onStartNegotiation(candidate)} variant="outline" className="rounded-[0.875rem] gap-2 border-[hsl(214,32%,91%)]"><FiDollarSign /> Start Negotiation</Button>
      )
    }
    return btns
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="rounded-[0.875rem]"><FiArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[hsl(222,47%,11%)]">{candidate.name}</h1>
          <p className="text-sm text-[hsl(215,16%,47%)]">{candidate.currentTitle}{candidate.company ? ` at ${candidate.company}` : ''}</p>
        </div>
        <Badge className={scoreColor(candidate.overallScore ?? 0)}>Score: {candidate.overallScore ?? 0}</Badge>
        <Badge variant="outline" className="capitalize">{candidate.status}</Badge>
      </div>

      {statusMessage && (
        <div className={`flex items-center gap-2 p-3 rounded-[0.875rem] text-sm ${statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {statusMessage.type === 'success' ? <FiCheck /> : statusMessage.type === 'error' ? <FiAlertTriangle /> : <FiClock className="animate-spin" />}
          {statusMessage.text}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">{statusActions()}</div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info Card */}
        <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-[hsl(210,40%,96%)] flex items-center justify-center text-xl font-bold text-[hsl(222,47%,11%)] mx-auto">{(candidate.name ?? '?')[0]}</div>
          <div className="text-center">
            <h3 className="font-semibold text-[hsl(222,47%,11%)]">{candidate.name}</h3>
            <p className="text-sm text-[hsl(215,16%,47%)]">{candidate.email}</p>
          </div>
          <Separator className="bg-[hsl(214,32%,91%)]" />
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Role</span><span className="font-medium text-[hsl(222,47%,11%)]">{requisitionTitle}</span></div>
            <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Experience</span><span className="font-medium text-[hsl(222,47%,11%)]">{candidate.yearsExperience}y</span></div>
            <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Location</span><span className="font-medium text-[hsl(222,47%,11%)]">{candidate.location || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Education</span><span className="font-medium text-[hsl(222,47%,11%)] text-right max-w-[140px] truncate">{candidate.education || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Source</span><span className="font-medium text-[hsl(222,47%,11%)]">{candidate.sourcePlatform || 'N/A'}</span></div>
          </div>
          <Separator className="bg-[hsl(214,32%,91%)]" />
          <div>
            <span className="text-xs font-medium text-[hsl(222,47%,11%)] uppercase tracking-wider">Scores</span>
            <div className="mt-2 space-y-2">
              {[{ label: 'Overall', val: candidate.overallScore }, { label: 'Skills', val: candidate.skillsScore }, { label: 'Experience', val: candidate.experienceScore }].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-[hsl(215,16%,47%)]">{s.label}</span><span className="font-medium">{s.val ?? 0}</span></div>
                  <div className="h-1.5 bg-[hsl(210,40%,94%)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${scoreBg(s.val ?? 0)}`} style={{ width: `${Math.min(s.val ?? 0, 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <Separator className="bg-[hsl(214,32%,91%)]" />
          <div>
            <span className="text-xs font-medium text-[hsl(222,47%,11%)] uppercase tracking-wider">Skills</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(Array.isArray(candidate.keySkills) ? candidate.keySkills : []).map((sk, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] bg-[hsl(210,40%,96%)]">{sk}</Badge>
              ))}
            </div>
          </div>
          {candidate.fitAnalysis && (
            <>
              <Separator className="bg-[hsl(214,32%,91%)]" />
              <div>
                <span className="text-xs font-medium text-[hsl(222,47%,11%)] uppercase tracking-wider">Fit Analysis</span>
                <p className="text-sm text-[hsl(215,16%,47%)] mt-1">{candidate.fitAnalysis}</p>
              </div>
            </>
          )}
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="screening" className="w-full">
            <TabsList className="bg-[hsl(210,40%,96%)] rounded-[0.875rem] p-1">
              <TabsTrigger value="screening" className="rounded-[0.625rem] data-[state=active]:bg-white">Screening</TabsTrigger>
              <TabsTrigger value="interview" className="rounded-[0.625rem] data-[state=active]:bg-white">Interview</TabsTrigger>
              <TabsTrigger value="negotiation" className="rounded-[0.625rem] data-[state=active]:bg-white">Negotiation</TabsTrigger>
            </TabsList>

            <TabsContent value="screening" className="mt-4">
              {screening ? (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-4">
                    <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-[hsl(222,47%,11%)]">Suitability: {screening?.suitability_rating ?? 'N/A'}</span>
                        <Badge className={scoreColor(screening?.overall_score ?? 0)}>Score: {screening?.overall_score ?? 0}</Badge>
                      </div>
                      {screening?.recommendation && <p className="text-sm text-[hsl(215,16%,47%)]">{screening.recommendation}</p>}
                    </div>
                    {screeningQuestions.length > 0 && (
                      <div className="space-y-3">
                        {screeningQuestions.map((q: any, i: number) => (
                          <div key={i} className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-[10px]">{q?.category ?? 'General'}</Badge>
                              <Badge className={scoreColor(q?.score ?? 0)}>{q?.score ?? 0}/10</Badge>
                            </div>
                            <p className="text-sm font-medium text-[hsl(222,47%,11%)] mb-1">{q?.question ?? 'N/A'}</p>
                            <p className="text-sm text-[hsl(215,16%,47%)]">{q?.answer_evaluation ?? 'N/A'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {strengths.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-[0.875rem] p-4">
                          <h4 className="font-semibold text-green-700 flex items-center gap-1 mb-2"><FiStar className="w-4 h-4" /> Strengths</h4>
                          <ul className="space-y-1">{strengths.map((s: string, i: number) => <li key={i} className="text-sm text-green-700 flex items-start gap-2"><FiCheck className="w-3 h-3 mt-1 flex-shrink-0" />{s}</li>)}</ul>
                        </div>
                      )}
                      {concerns.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-[0.875rem] p-4">
                          <h4 className="font-semibold text-yellow-700 flex items-center gap-1 mb-2"><FiAlertTriangle className="w-4 h-4" /> Concerns</h4>
                          <ul className="space-y-1">{concerns.map((c: string, i: number) => <li key={i} className="text-sm text-yellow-700 flex items-start gap-2"><FiFlag className="w-3 h-3 mt-1 flex-shrink-0" />{c}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-10 text-center">
                  <FiBarChart2 className="w-8 h-8 mx-auto text-[hsl(215,16%,47%)] mb-2" />
                  <p className="text-[hsl(215,16%,47%)]">No screening data yet</p>
                  <p className="text-xs text-[hsl(215,16%,47%)] mt-1">Go back and screen this candidate from the requisition view</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="interview" className="mt-4">
              {loading && (
                <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-6">
                  <div className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)] mb-4"><FiClock className="animate-spin" /> Analyzing interview performance...</div>
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-[hsl(210,40%,94%)] rounded w-3/4"></div>
                    <div className="h-4 bg-[hsl(210,40%,94%)] rounded w-1/2"></div>
                  </div>
                </div>
              )}
              {interviewReport && !loading ? (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-4">
                    <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-[hsl(222,47%,11%)]">Executive Summary</span>
                        <Badge className={scoreColor(interviewReport?.overall_score ?? 0)}>Score: {interviewReport?.overall_score ?? 0}</Badge>
                      </div>
                      <div className="text-sm text-[hsl(215,16%,47%)]">{renderMarkdown(interviewReport?.executive_summary ?? '')}</div>
                    </div>
                    {competencyScores.length > 0 && (
                      <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-4">
                        <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-3 flex items-center gap-2"><FiBarChart2 /> Competency Scores</h4>
                        <div className="space-y-3">
                          {competencyScores.map((cs: any, i: number) => (
                            <div key={i}>
                              <div className="flex justify-between text-sm mb-1"><span className="text-[hsl(222,47%,11%)] font-medium">{cs?.dimension ?? 'N/A'}</span><span className="font-bold">{cs?.score ?? 0}/10</span></div>
                              <div className="h-2 bg-[hsl(210,40%,94%)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${scoreBg((cs?.score ?? 0) * 10)}`} style={{ width: `${Math.min((cs?.score ?? 0) * 10, 100)}%` }} /></div>
                              {cs?.evidence && <p className="text-xs text-[hsl(215,16%,47%)] mt-1">{cs.evidence}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {interviewReport?.recommendation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-[0.875rem] p-4">
                        <h4 className="font-semibold text-blue-700 flex items-center gap-1 mb-2"><FiAward /> Recommendation</h4>
                        <p className="text-sm text-blue-700">{interviewReport.recommendation}</p>
                      </div>
                    )}
                    {interviewReport?.risk_assessment && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-[0.875rem] p-4">
                        <h4 className="font-semibold text-yellow-700 mb-1">Risk Assessment</h4>
                        <p className="text-sm text-yellow-700">{interviewReport.risk_assessment}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {irStrengths.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-[0.875rem] p-4">
                          <h4 className="font-semibold text-green-700 flex items-center gap-1 mb-2"><FiStar /> Strengths</h4>
                          <ul className="space-y-1">{irStrengths.map((s: string, i: number) => <li key={i} className="text-sm text-green-700">{s}</li>)}</ul>
                        </div>
                      )}
                      {devAreas.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-[0.875rem] p-4">
                          <h4 className="font-semibold text-yellow-700 flex items-center gap-1 mb-2"><FiTrendingUp /> Development Areas</h4>
                          <ul className="space-y-1">{devAreas.map((d: string, i: number) => <li key={i} className="text-sm text-yellow-700">{d}</li>)}</ul>
                        </div>
                      )}
                    </div>
                    {redFlags.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-[0.875rem] p-4">
                        <h4 className="font-semibold text-red-700 flex items-center gap-1 mb-2"><FiAlertTriangle /> Red Flags</h4>
                        <ul className="space-y-1">{redFlags.map((f: string, i: number) => <li key={i} className="text-sm text-red-700">{f}</li>)}</ul>
                      </div>
                    )}
                    {themes.length > 0 && (
                      <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-4">
                        <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-2">Themes</h4>
                        <div className="flex flex-wrap gap-2">{themes.map((t: string, i: number) => <Badge key={i} variant="secondary" className="bg-[hsl(210,40%,96%)]">{t}</Badge>)}</div>
                      </div>
                    )}
                    {quotes.length > 0 && (
                      <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-4">
                        <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-2">Notable Quotes</h4>
                        <div className="space-y-2">{quotes.map((q: string, i: number) => <blockquote key={i} className="border-l-2 border-[#E8795A] pl-3 text-sm text-[hsl(215,16%,47%)] italic">&ldquo;{q}&rdquo;</blockquote>)}</div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : !loading ? (
                <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-10 text-center">
                  <FiBarChart2 className="w-8 h-8 mx-auto text-[hsl(215,16%,47%)] mb-2" />
                  <p className="text-[hsl(215,16%,47%)]">No interview analysis yet</p>
                  <p className="text-xs text-[hsl(215,16%,47%)] mt-1">Click &quot;Analyze Interview&quot; and paste the transcript</p>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="negotiation" className="mt-4">
              {negotiation ? (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-4">
                    {negotiation?.market_analysis && (
                      <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-4">
                        <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-2">Market Analysis</h4>
                        <div className="text-sm text-[hsl(215,16%,47%)]">{renderMarkdown(negotiation.market_analysis)}</div>
                      </div>
                    )}
                    <div className="bg-[hsl(222,47%,11%)] text-white rounded-[0.875rem] p-5">
                      <h4 className="font-semibold mb-3 flex items-center gap-2"><FiDollarSign /> Recommended Package</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-white/60">Base Salary</span><p className="font-bold text-lg">{negotiation?.recommended_package?.base_salary ?? 'N/A'}</p></div>
                        <div><span className="text-white/60">Bonus</span><p className="font-bold text-lg">{negotiation?.recommended_package?.bonus ?? 'N/A'}</p></div>
                        <div><span className="text-white/60">Equity</span><p className="font-bold text-lg">{negotiation?.recommended_package?.equity ?? 'N/A'}</p></div>
                        <div><span className="text-white/60">Total</span><p className="font-bold text-lg">{negotiation?.recommended_package?.total_compensation ?? 'N/A'}</p></div>
                      </div>
                      {otherBenefits.length > 0 && <div className="mt-3"><span className="text-white/60 text-xs">Other Benefits</span><div className="flex flex-wrap gap-1 mt-1">{otherBenefits.map((b: string, i: number) => <Badge key={i} className="bg-white/20 text-white text-[10px]">{b}</Badge>)}</div></div>}
                    </div>
                    {negotiation?.budget_comparison && (
                      <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-4">
                        <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-2">Budget Comparison</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Budget Range</span><span className="font-medium">{negotiation.budget_comparison?.budget_range ?? 'N/A'}</span></div>
                          <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">vs Budget</span><span className="font-medium">{negotiation.budget_comparison?.recommended_vs_budget ?? 'N/A'}</span></div>
                          <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Within Budget</span><Badge className={negotiation.budget_comparison?.within_budget ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{negotiation.budget_comparison?.within_budget ? 'Yes' : 'No'}</Badge></div>
                        </div>
                      </div>
                    )}
                    {negStrategy.length > 0 && (
                      <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-4">
                        <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-2">Negotiation Strategy</h4>
                        <ol className="space-y-2">{negStrategy.map((s: string, i: number) => <li key={i} className="text-sm text-[hsl(215,16%,47%)] flex items-start gap-2"><span className="bg-[hsl(222,47%,11%)] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">{i+1}</span>{s}</li>)}</ol>
                      </div>
                    )}
                    {riskFactors.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-[0.875rem] p-4">
                        <h4 className="font-semibold text-yellow-700 mb-2 flex items-center gap-1"><FiAlertTriangle /> Risk Factors</h4>
                        <ul className="space-y-1">{riskFactors.map((r: string, i: number) => <li key={i} className="text-sm text-yellow-700">{r}</li>)}</ul>
                      </div>
                    )}
                    {negotiation?.recommendation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-[0.875rem] p-4">
                        <h4 className="font-semibold text-blue-700 mb-1">Recommendation</h4>
                        <p className="text-sm text-blue-700">{negotiation.recommendation}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-10 text-center">
                  <FiDollarSign className="w-8 h-8 mx-auto text-[hsl(215,16%,47%)] mb-2" />
                  <p className="text-[hsl(215,16%,47%)]">No negotiation data yet</p>
                  <p className="text-xs text-[hsl(215,16%,47%)] mt-1">Click &quot;Start Negotiation&quot; to begin compensation analysis</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

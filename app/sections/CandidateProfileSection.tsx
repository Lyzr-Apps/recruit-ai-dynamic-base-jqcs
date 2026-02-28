'use client'

import React, { useState } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  if (score >= 60) return 'bg-amber-50 text-amber-700 border border-amber-200'
  return 'bg-red-50 text-red-700 border border-red-200'
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function statusPillClass(status: string): string {
  switch (status) {
    case 'sourced': return 'bg-slate-100 text-slate-600'
    case 'screened': return 'bg-blue-50 text-blue-600 border border-blue-200'
    case 'interviewing': return 'bg-purple-50 text-purple-600 border border-purple-200'
    case 'analyzed': return 'bg-indigo-50 text-indigo-600 border border-indigo-200'
    case 'negotiating': return 'bg-amber-50 text-amber-600 border border-amber-200'
    case 'offered': return 'bg-emerald-50 text-emerald-600 border border-emerald-200'
    default: return 'bg-slate-100 text-slate-600'
  }
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
        <button key="schedule" onClick={() => onScheduleInterview(candidate)} className="bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,16%)] text-white rounded-lg px-5 py-2.5 font-medium shadow-sm flex items-center gap-2 text-sm transition-colors"><FiCalendar className="w-4 h-4" /> Schedule Interview</button>
      )
    }
    if (s === 'screened' || s === 'interviewing') {
      btns.push(
        <Dialog key="analyze-dialog" open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
          <DialogTrigger asChild>
            <button className="border border-[hsl(214,32%,91%)] bg-white hover:bg-[hsl(210,40%,96%)] text-[hsl(222,47%,11%)] rounded-lg px-5 py-2.5 font-medium flex items-center gap-2 text-sm transition-colors"><FiBarChart2 className="w-4 h-4" /> Analyze Interview</button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-white rounded-xl border border-[hsl(214,32%,91%)] shadow-xl">
            <DialogHeader><DialogTitle className="text-[hsl(222,47%,11%)]">Interview Notes / Transcript</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label className="text-sm text-[hsl(215,16%,47%)]">Enter the interview transcript or detailed notes:</Label>
              <Textarea rows={8} value={interviewNotes} onChange={e => setInterviewNotes(e.target.value)} placeholder="Paste interview transcript or notes here..." className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent" />
              <button onClick={handleAnalyze} disabled={!interviewNotes.trim()} className="w-full bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,16%)] disabled:opacity-50 text-white rounded-lg px-5 py-2.5 font-medium shadow-sm text-sm transition-colors">Analyze</button>
            </div>
          </DialogContent>
        </Dialog>
      )
    }
    if (s === 'analyzed' || s === 'screened') {
      btns.push(
        <button key="negotiate" onClick={() => onStartNegotiation(candidate)} className="border border-[hsl(214,32%,91%)] bg-white hover:bg-[hsl(210,40%,96%)] text-[hsl(222,47%,11%)] rounded-lg px-5 py-2.5 font-medium flex items-center gap-2 text-sm transition-colors"><FiDollarSign className="w-4 h-4" /> Start Negotiation</button>
      )
    }
    return btns
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-lg border border-[hsl(214,32%,91%)] bg-white flex items-center justify-center hover:bg-[hsl(210,40%,96%)] transition-colors">
          <FiArrowLeft className="w-4 h-4 text-[hsl(222,47%,11%)]" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[hsl(222,47%,11%)]">{candidate.name}</h1>
          <p className="text-sm text-[hsl(215,16%,47%)]">{candidate.currentTitle}{candidate.company ? ` at ${candidate.company}` : ''}</p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${scoreColor(candidate.overallScore ?? 0)}`}>Score: {candidate.overallScore ?? 0}</span>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusPillClass(candidate.status)}`}>{candidate.status}</span>
      </div>

      {statusMessage && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {statusMessage.type === 'success' ? <FiCheck className="w-4 h-4 flex-shrink-0" /> : statusMessage.type === 'error' ? <FiAlertTriangle className="w-4 h-4 flex-shrink-0" /> : <FiClock className="animate-spin w-4 h-4 flex-shrink-0" />}
          {statusMessage.text}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">{statusActions()}</div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info Card */}
        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6 space-y-5">
          <div className="w-16 h-16 rounded-full bg-[hsl(210,40%,94%)] border-2 border-[hsl(214,32%,91%)] flex items-center justify-center text-xl font-bold text-[hsl(222,47%,11%)] mx-auto">{(candidate.name ?? '?')[0]}</div>
          <div className="text-center">
            <h3 className="font-semibold text-[hsl(222,47%,11%)]">{candidate.name}</h3>
            <p className="text-sm text-[hsl(215,16%,47%)]">{candidate.email}</p>
          </div>
          <div className="h-px bg-[hsl(214,32%,91%)]" />
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Role</span><span className="font-medium text-[hsl(222,47%,11%)] text-right max-w-[140px] truncate">{requisitionTitle}</span></div>
            <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Experience</span><span className="font-medium text-[hsl(222,47%,11%)]">{candidate.yearsExperience}y</span></div>
            <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Location</span><span className="font-medium text-[hsl(222,47%,11%)]">{candidate.location || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Education</span><span className="font-medium text-[hsl(222,47%,11%)] text-right max-w-[140px] truncate">{candidate.education || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Source</span><span className="font-medium text-[hsl(222,47%,11%)]">{candidate.sourcePlatform || 'N/A'}</span></div>
          </div>
          <div className="h-px bg-[hsl(214,32%,91%)]" />
          <div>
            <span className="text-xs font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wider">Scores</span>
            <div className="mt-3 space-y-3">
              {[{ label: 'Overall', val: candidate.overallScore }, { label: 'Skills', val: candidate.skillsScore }, { label: 'Experience', val: candidate.experienceScore }].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1.5"><span className="text-[hsl(215,16%,47%)]">{s.label}</span><span className="font-semibold text-[hsl(222,47%,11%)]">{s.val ?? 0}</span></div>
                  <div className="h-2 bg-[hsl(210,40%,94%)] rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${scoreBg(s.val ?? 0)}`} style={{ width: `${Math.min(s.val ?? 0, 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-px bg-[hsl(214,32%,91%)]" />
          <div>
            <span className="text-xs font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wider">Skills</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(Array.isArray(candidate.keySkills) ? candidate.keySkills : []).map((sk, i) => (
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-[hsl(210,40%,96%)] text-[hsl(222,47%,11%)] border border-[hsl(214,32%,91%)]">{sk}</span>
              ))}
            </div>
          </div>
          {candidate.fitAnalysis && (
            <>
              <div className="h-px bg-[hsl(214,32%,91%)]" />
              <div>
                <span className="text-xs font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wider">Fit Analysis</span>
                <p className="text-sm text-[hsl(215,16%,47%)] mt-1">{candidate.fitAnalysis}</p>
              </div>
            </>
          )}
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="screening" className="w-full">
            <TabsList className="bg-[hsl(210,40%,96%)] rounded-xl p-1 border border-[hsl(214,32%,91%)]">
              <TabsTrigger value="screening" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[hsl(222,47%,11%)] text-[hsl(215,16%,47%)]">Screening</TabsTrigger>
              <TabsTrigger value="interview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[hsl(222,47%,11%)] text-[hsl(215,16%,47%)]">Interview</TabsTrigger>
              <TabsTrigger value="negotiation" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[hsl(222,47%,11%)] text-[hsl(215,16%,47%)]">Negotiation</TabsTrigger>
            </TabsList>

            <TabsContent value="screening" className="mt-4">
              {screening ? (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-4">
                    <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-[hsl(222,47%,11%)]">Suitability: {screening?.suitability_rating ?? 'N/A'}</span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${scoreColor(screening?.overall_score ?? 0)}`}>Score: {screening?.overall_score ?? 0}</span>
                      </div>
                      {screening?.recommendation && <p className="text-sm text-[hsl(215,16%,47%)]">{screening.recommendation}</p>}
                    </div>
                    {screeningQuestions.length > 0 && (
                      <div className="space-y-3">
                        {screeningQuestions.map((q: any, i: number) => (
                          <div key={i} className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-[hsl(210,40%,96%)] text-[hsl(222,47%,11%)] border border-[hsl(214,32%,91%)]">{q?.category ?? 'General'}</span>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${scoreColor((q?.score ?? 0) * 10)}`}>{q?.score ?? 0}/10</span>
                            </div>
                            <p className="text-sm font-medium text-[hsl(222,47%,11%)] mb-1">{q?.question ?? 'N/A'}</p>
                            <p className="text-sm text-[hsl(215,16%,47%)]">{q?.answer_evaluation ?? 'N/A'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {strengths.length > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-[0.875rem] p-4">
                          <h4 className="font-semibold text-emerald-700 flex items-center gap-1.5 mb-2"><FiStar className="w-4 h-4" /> Strengths</h4>
                          <ul className="space-y-1.5">{strengths.map((s: string, i: number) => <li key={i} className="text-sm text-emerald-700 flex items-start gap-2"><FiCheck className="w-3 h-3 mt-1 flex-shrink-0" />{s}</li>)}</ul>
                        </div>
                      )}
                      {concerns.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-[0.875rem] p-4">
                          <h4 className="font-semibold text-amber-700 flex items-center gap-1.5 mb-2"><FiAlertTriangle className="w-4 h-4" /> Concerns</h4>
                          <ul className="space-y-1.5">{concerns.map((c: string, i: number) => <li key={i} className="text-sm text-amber-700 flex items-start gap-2"><FiFlag className="w-3 h-3 mt-1 flex-shrink-0" />{c}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm py-16 text-center">
                  <div className="w-16 h-16 bg-[hsl(210,40%,94%)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiBarChart2 className="w-7 h-7 text-[hsl(215,16%,47%)]" />
                  </div>
                  <p className="text-[hsl(222,47%,11%)] font-medium mb-1">No screening data yet</p>
                  <p className="text-sm text-[hsl(215,16%,47%)] max-w-sm mx-auto">Go back and screen this candidate from the requisition view</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="interview" className="mt-4">
              {loading && (
                <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6">
                  <div className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)] mb-4"><FiClock className="animate-spin" /> Analyzing interview performance...</div>
                  <div className="animate-pulse space-y-4">
                    <div className="h-5 bg-[hsl(210,40%,92%)] rounded-lg w-3/4"></div>
                    <div className="h-5 bg-[hsl(210,40%,92%)] rounded-lg w-1/2"></div>
                  </div>
                </div>
              )}
              {interviewReport && !loading ? (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-4">
                    <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-[hsl(222,47%,11%)]">Executive Summary</span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${scoreColor(interviewReport?.overall_score ?? 0)}`}>Score: {interviewReport?.overall_score ?? 0}</span>
                      </div>
                      <div className="text-sm text-[hsl(215,16%,47%)]">{renderMarkdown(interviewReport?.executive_summary ?? '')}</div>
                    </div>
                    {competencyScores.length > 0 && (
                      <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                        <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-4 flex items-center gap-2"><FiBarChart2 className="w-4 h-4" /> Competency Scores</h4>
                        <div className="space-y-4">
                          {competencyScores.map((cs: any, i: number) => (
                            <div key={i}>
                              <div className="flex justify-between text-sm mb-1.5"><span className="text-[hsl(222,47%,11%)] font-medium">{cs?.dimension ?? 'N/A'}</span><span className="font-bold">{cs?.score ?? 0}/10</span></div>
                              <div className="h-2.5 bg-[hsl(210,40%,94%)] rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${scoreBg((cs?.score ?? 0) * 10)}`} style={{ width: `${Math.min((cs?.score ?? 0) * 10, 100)}%` }} /></div>
                              {cs?.evidence && <p className="text-xs text-[hsl(215,16%,47%)] mt-1">{cs.evidence}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {interviewReport?.recommendation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-[0.875rem] p-5">
                        <h4 className="font-semibold text-blue-700 flex items-center gap-1.5 mb-2"><FiAward className="w-4 h-4" /> Recommendation</h4>
                        <p className="text-sm text-blue-700">{interviewReport.recommendation}</p>
                      </div>
                    )}
                    {interviewReport?.risk_assessment && (
                      <div className="bg-amber-50 border border-amber-200 rounded-[0.875rem] p-5">
                        <h4 className="font-semibold text-amber-700 mb-1">Risk Assessment</h4>
                        <p className="text-sm text-amber-700">{interviewReport.risk_assessment}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {irStrengths.length > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-[0.875rem] p-4">
                          <h4 className="font-semibold text-emerald-700 flex items-center gap-1.5 mb-2"><FiStar className="w-4 h-4" /> Strengths</h4>
                          <ul className="space-y-1.5">{irStrengths.map((s: string, i: number) => <li key={i} className="text-sm text-emerald-700">{s}</li>)}</ul>
                        </div>
                      )}
                      {devAreas.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-[0.875rem] p-4">
                          <h4 className="font-semibold text-amber-700 flex items-center gap-1.5 mb-2"><FiTrendingUp className="w-4 h-4" /> Development Areas</h4>
                          <ul className="space-y-1.5">{devAreas.map((d: string, i: number) => <li key={i} className="text-sm text-amber-700">{d}</li>)}</ul>
                        </div>
                      )}
                    </div>
                    {redFlags.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-[0.875rem] p-5">
                        <h4 className="font-semibold text-red-700 flex items-center gap-1.5 mb-2"><FiAlertTriangle className="w-4 h-4" /> Red Flags</h4>
                        <ul className="space-y-1.5">{redFlags.map((f: string, i: number) => <li key={i} className="text-sm text-red-700">{f}</li>)}</ul>
                      </div>
                    )}
                    {themes.length > 0 && (
                      <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                        <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-2">Themes</h4>
                        <div className="flex flex-wrap gap-2">{themes.map((t: string, i: number) => <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[hsl(210,40%,96%)] text-[hsl(222,47%,11%)] border border-[hsl(214,32%,91%)]">{t}</span>)}</div>
                      </div>
                    )}
                    {quotes.length > 0 && (
                      <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                        <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-3">Notable Quotes</h4>
                        <div className="space-y-2.5">{quotes.map((q: string, i: number) => <blockquote key={i} className="border-l-3 border-[hsl(12,76%,61%)] pl-3 text-sm text-[hsl(215,16%,47%)] italic">&ldquo;{q}&rdquo;</blockquote>)}</div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : !loading ? (
                <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm py-16 text-center">
                  <div className="w-16 h-16 bg-[hsl(210,40%,94%)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiBarChart2 className="w-7 h-7 text-[hsl(215,16%,47%)]" />
                  </div>
                  <p className="text-[hsl(222,47%,11%)] font-medium mb-1">No interview analysis yet</p>
                  <p className="text-sm text-[hsl(215,16%,47%)] max-w-sm mx-auto">Click &quot;Analyze Interview&quot; and paste the transcript</p>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="negotiation" className="mt-4">
              {negotiation ? (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-4">
                    {negotiation?.market_analysis && (
                      <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                        <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-2">Market Analysis</h4>
                        <div className="text-sm text-[hsl(215,16%,47%)]">{renderMarkdown(negotiation.market_analysis)}</div>
                      </div>
                    )}
                    <div className="bg-[hsl(222,47%,11%)] text-white rounded-[0.875rem] p-6 shadow-lg">
                      <h4 className="font-semibold mb-4 flex items-center gap-2"><FiDollarSign className="w-5 h-5" /> Recommended Package</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-white/60 text-xs">Base Salary</span><p className="font-bold text-lg mt-0.5">{negotiation?.recommended_package?.base_salary ?? 'N/A'}</p></div>
                        <div><span className="text-white/60 text-xs">Bonus</span><p className="font-bold text-lg mt-0.5">{negotiation?.recommended_package?.bonus ?? 'N/A'}</p></div>
                        <div><span className="text-white/60 text-xs">Equity</span><p className="font-bold text-lg mt-0.5">{negotiation?.recommended_package?.equity ?? 'N/A'}</p></div>
                        <div><span className="text-white/60 text-xs">Total</span><p className="font-bold text-lg mt-0.5">{negotiation?.recommended_package?.total_compensation ?? 'N/A'}</p></div>
                      </div>
                      {otherBenefits.length > 0 && <div className="mt-4"><span className="text-white/60 text-xs">Other Benefits</span><div className="flex flex-wrap gap-1.5 mt-1.5">{otherBenefits.map((b: string, i: number) => <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/15 text-white">{b}</span>)}</div></div>}
                    </div>
                    {negotiation?.budget_comparison && (
                      <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                        <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-3">Budget Comparison</h4>
                        <div className="space-y-2.5 text-sm">
                          <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Budget Range</span><span className="font-medium">{negotiation.budget_comparison?.budget_range ?? 'N/A'}</span></div>
                          <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">vs Budget</span><span className="font-medium">{negotiation.budget_comparison?.recommended_vs_budget ?? 'N/A'}</span></div>
                          <div className="flex justify-between items-center"><span className="text-[hsl(215,16%,47%)]">Within Budget</span><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${negotiation.budget_comparison?.within_budget ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{negotiation.budget_comparison?.within_budget ? 'Yes' : 'No'}</span></div>
                        </div>
                      </div>
                    )}
                    {negStrategy.length > 0 && (
                      <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                        <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-3">Negotiation Strategy</h4>
                        <ol className="space-y-2.5">{negStrategy.map((s: string, i: number) => <li key={i} className="text-sm text-[hsl(215,16%,47%)] flex items-start gap-2.5"><span className="bg-[hsl(222,47%,11%)] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">{i + 1}</span>{s}</li>)}</ol>
                      </div>
                    )}
                    {riskFactors.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-[0.875rem] p-5">
                        <h4 className="font-semibold text-amber-700 mb-2 flex items-center gap-1.5"><FiAlertTriangle className="w-4 h-4" /> Risk Factors</h4>
                        <ul className="space-y-1.5">{riskFactors.map((r: string, i: number) => <li key={i} className="text-sm text-amber-700">{r}</li>)}</ul>
                      </div>
                    )}
                    {negotiation?.recommendation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-[0.875rem] p-5">
                        <h4 className="font-semibold text-blue-700 mb-1">Recommendation</h4>
                        <p className="text-sm text-blue-700">{negotiation.recommendation}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm py-16 text-center">
                  <div className="w-16 h-16 bg-[hsl(210,40%,94%)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiDollarSign className="w-7 h-7 text-[hsl(215,16%,47%)]" />
                  </div>
                  <p className="text-[hsl(222,47%,11%)] font-medium mb-1">No negotiation data yet</p>
                  <p className="text-sm text-[hsl(215,16%,47%)] max-w-sm mx-auto">Click &quot;Start Negotiation&quot; to begin compensation analysis</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

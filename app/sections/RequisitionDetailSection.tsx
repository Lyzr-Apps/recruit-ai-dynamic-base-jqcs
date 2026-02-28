'use client'

import React, { useState } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FiArrowLeft, FiUsers, FiSearch, FiCheck, FiAlertTriangle, FiClock, FiChevronRight, FiFlag, FiChevronDown } from 'react-icons/fi'

interface Candidate {
  id: string; name: string; email: string; currentTitle: string; company: string
  yearsExperience: number; keySkills: string[]; location: string; education: string
  overallScore: number; skillsScore: number; experienceScore: number
  recommendation: string; fitAnalysis: string; sourcePlatform: string
  status: 'sourced' | 'screened' | 'interviewing' | 'analyzed' | 'negotiating' | 'offered' | 'hired'
  screening?: any; interviewReport?: any; negotiation?: any; offerDetails?: any; interviewScheduled?: boolean
}

interface Requisition {
  id: string; title: string; department: string; description: string
  requirements: string[]; salaryMin: number; salaryMax: number; location: string
  type: string; team: string; createdAt: string
  status: 'open' | 'closed' | 'on-hold'
  stage: 'source' | 'screen' | 'interview' | 'analyze' | 'negotiate' | 'offer'
  candidates: Candidate[]
}

interface RequisitionDetailSectionProps {
  requisition: Requisition
  onBack: () => void
  onUpdateRequisition: (req: Requisition) => void
  onSelectCandidate: (candidate: Candidate) => void
  setActiveAgentId: (id: string | null) => void
}

const SOURCING_AGENT = '69a36bb2782856e667061c38'
const EVALUATION_AGENT = '69a36b742d64d730c5089dc8'

const STAGES = ['source', 'screen', 'interview', 'analyze', 'negotiate', 'offer']
const STAGE_LABELS: Record<string, string> = {
  source: 'Source', screen: 'Screen', interview: 'Interview',
  analyze: 'Analyze', negotiate: 'Negotiate', offer: 'Offer'
}

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

function statusPill(status: string): string {
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

export default function RequisitionDetailSection({
  requisition, onBack, onUpdateRequisition, onSelectCandidate, setActiveAgentId
}: RequisitionDetailSectionProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showDetails, setShowDetails] = useState(true)
  const [sortBy, setSortBy] = useState<'score' | 'experience' | 'name'>('score')

  const candidates = Array.isArray(requisition.candidates) ? requisition.candidates : []
  const currentStageIdx = STAGES.indexOf(requisition.stage)

  const handleSource = async () => {
    setLoading('sourcing')
    setStatusMessage({ type: 'info', text: 'AI is sourcing and matching candidates from the web...' })
    setActiveAgentId(SOURCING_AGENT)

    const message = `Find and rank candidates for the following role:\n\nTitle: ${requisition.title}\nDepartment: ${requisition.department}\nDescription: ${requisition.description}\nRequirements: ${(Array.isArray(requisition.requirements) ? requisition.requirements : []).join(', ')}\nLocation: ${requisition.location}\nSalary: $${requisition.salaryMin}-$${requisition.salaryMax}`

    const result = await callAIAgent(message, SOURCING_AGENT)
    setActiveAgentId(null)
    setLoading(null)

    const parsed = parseAgentResponse(result)
    if (parsed) {
      const rankedCandidates = Array.isArray(parsed?.ranked_candidates) ? parsed.ranked_candidates : []
      const newCandidates: Candidate[] = rankedCandidates.map((c: any, i: number) => ({
        id: crypto.randomUUID(),
        name: c?.name ?? `Candidate ${i + 1}`,
        email: `${(c?.name ?? 'candidate').toLowerCase().replace(/\s+/g, '.')}@email.com`,
        currentTitle: c?.current_title ?? '',
        company: c?.company ?? '',
        yearsExperience: c?.years_experience ?? 0,
        keySkills: Array.isArray(c?.key_skills) ? c.key_skills : [],
        location: c?.location ?? '',
        education: c?.education ?? '',
        overallScore: c?.overall_score ?? 0,
        skillsScore: c?.skills_score ?? 0,
        experienceScore: c?.experience_score ?? 0,
        recommendation: c?.recommendation ?? '',
        fitAnalysis: c?.fit_analysis ?? '',
        sourcePlatform: c?.source_platform ?? '',
        status: 'sourced' as const,
      }))
      const updated = { ...requisition, candidates: [...candidates, ...newCandidates], stage: 'screen' as const }
      onUpdateRequisition(updated)
      setStatusMessage({ type: 'success', text: `Found ${newCandidates.length} candidates. ${parsed?.sourcing_summary ?? ''}` })
    } else {
      setStatusMessage({ type: 'error', text: result?.error ?? 'Failed to source candidates. Please try again.' })
    }
  }

  const handleScreen = async () => {
    const toScreen = candidates.filter(c => selected.has(c.id) && c.status === 'sourced')
    if (toScreen.length === 0) {
      setStatusMessage({ type: 'error', text: 'Select at least one sourced candidate to screen' })
      return
    }
    setLoading('screening')
    setStatusMessage({ type: 'info', text: `Screening ${toScreen.length} candidate(s)...` })
    setActiveAgentId(EVALUATION_AGENT)

    const updatedCandidates = [...candidates]
    for (const cand of toScreen) {
      const message = `Evaluate candidate ${cand.name} for the role of ${requisition.title}.\n\nCandidate Profile:\n- Current Title: ${cand.currentTitle}\n- Company: ${cand.company}\n- Experience: ${cand.yearsExperience} years\n- Skills: ${(Array.isArray(cand.keySkills) ? cand.keySkills : []).join(', ')}\n- Education: ${cand.education}\n\nJob Requirements: ${(Array.isArray(requisition.requirements) ? requisition.requirements : []).join(', ')}`

      const result = await callAIAgent(message, EVALUATION_AGENT)
      const parsed = parseAgentResponse(result)
      const idx = updatedCandidates.findIndex(c => c.id === cand.id)
      if (idx !== -1 && parsed) {
        updatedCandidates[idx] = {
          ...updatedCandidates[idx],
          status: 'screened',
          screening: parsed,
          overallScore: parsed?.overall_score ?? updatedCandidates[idx].overallScore,
        }
      }
    }

    setActiveAgentId(null)
    setLoading(null)
    const updated = { ...requisition, candidates: updatedCandidates, stage: 'interview' as const }
    onUpdateRequisition(updated)
    setSelected(new Set())
    setStatusMessage({ type: 'success', text: `Successfully screened ${toScreen.length} candidate(s)` })
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const toggleAll = () => {
    if (selected.size === candidates.length) setSelected(new Set())
    else setSelected(new Set(candidates.map(c => c.id)))
  }

  const sortedCandidates = [...candidates].sort((a, b) => {
    if (sortBy === 'score') return (b.overallScore ?? 0) - (a.overallScore ?? 0)
    if (sortBy === 'experience') return (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0)
    return (a.name ?? '').localeCompare(b.name ?? '')
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-lg border border-[hsl(214,32%,91%)] bg-white flex items-center justify-center hover:bg-[hsl(210,40%,96%)] transition-colors">
          <FiArrowLeft className="w-4 h-4 text-[hsl(222,47%,11%)]" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[hsl(222,47%,11%)]">{requisition.title}</h1>
          <p className="text-sm text-[hsl(215,16%,47%)]">{requisition.department} {requisition.team ? `/ ${requisition.team}` : ''} &middot; {requisition.location} &middot; {requisition.type}</p>
        </div>
        <Badge className={requisition.status === 'open' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-600'}>{requisition.status}</Badge>
      </div>

      {/* Pipeline Stepper */}
      <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
        <div className="flex items-center gap-2">
          {STAGES.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors ${i < currentStageIdx ? 'bg-[hsl(222,47%,11%)] text-white' : i === currentStageIdx ? 'bg-[hsl(12,76%,61%)] text-white shadow-md' : 'bg-[hsl(210,40%,94%)] text-[hsl(215,16%,47%)]'}`}>
                {i < currentStageIdx ? <FiCheck className="w-3 h-3" /> : <span className="w-3 text-center">{i + 1}</span>}
                {STAGE_LABELS[s]}
              </div>
              {i < STAGES.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${i < currentStageIdx ? 'bg-[hsl(222,47%,11%)]' : 'bg-[hsl(214,32%,91%)]'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {statusMessage && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {statusMessage.type === 'success' ? <FiCheck className="w-4 h-4 flex-shrink-0" /> : statusMessage.type === 'error' ? <FiAlertTriangle className="w-4 h-4 flex-shrink-0" /> : <FiClock className="animate-spin w-4 h-4 flex-shrink-0" />}
          {statusMessage.text}
        </div>
      )}

      {/* Job Details Collapsible */}
      <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm overflow-hidden">
        <button onClick={() => setShowDetails(!showDetails)} className="w-full flex items-center justify-between p-5 text-left hover:bg-[hsl(210,40%,98%)] transition-colors">
          <span className="font-semibold text-[hsl(222,47%,11%)]">Job Details</span>
          <FiChevronDown className={`w-4 h-4 text-[hsl(215,16%,47%)] transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
        </button>
        {showDetails && (
          <div className="px-5 pb-5 space-y-3 border-t border-[hsl(214,32%,91%)]">
            <p className="text-sm text-[hsl(215,16%,47%)] pt-4">{requisition.description}</p>
            {(Array.isArray(requisition.requirements) ? requisition.requirements : []).length > 0 && (
              <div>
                <span className="text-xs font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wider">Requirements</span>
                <ul className="mt-2 space-y-1.5">
                  {(Array.isArray(requisition.requirements) ? requisition.requirements : []).map((r, i) => (
                    <li key={i} className="text-sm text-[hsl(215,16%,47%)] flex items-start gap-2"><FiCheck className="w-3.5 h-3.5 mt-0.5 text-emerald-500 flex-shrink-0" />{r}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-4 text-sm text-[hsl(215,16%,47%)]">
              <span>Salary: ${requisition.salaryMin?.toLocaleString()}-${requisition.salaryMax?.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={handleSource} disabled={loading !== null} className="bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,16%)] disabled:opacity-50 text-white rounded-lg px-5 py-2.5 font-medium shadow-sm flex items-center gap-2 text-sm transition-colors">
          {loading === 'sourcing' ? <><FiClock className="animate-spin w-4 h-4" /> Sourcing...</> : <><FiSearch className="w-4 h-4" /> Source & Match Candidates</>}
        </button>
        {candidates.filter(c => c.status === 'sourced').length > 0 && (
          <button onClick={handleScreen} disabled={loading !== null || selected.size === 0} className="border border-[hsl(214,32%,91%)] bg-white hover:bg-[hsl(210,40%,96%)] disabled:opacity-50 text-[hsl(222,47%,11%)] rounded-lg px-5 py-2.5 font-medium flex items-center gap-2 text-sm transition-colors">
            {loading === 'screening' ? <><FiClock className="animate-spin w-4 h-4" /> Screening...</> : <><FiFlag className="w-4 h-4" /> Screen Selected ({selected.size})</>}
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {loading === 'sourcing' && candidates.length === 0 && (
        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6">
          <div className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)] mb-4">
            <FiClock className="animate-spin" /> Searching for candidates across platforms...
          </div>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex gap-4 items-center">
                <div className="h-10 w-10 bg-[hsl(210,40%,92%)] rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[hsl(210,40%,92%)] rounded-lg w-1/3" />
                  <div className="h-3 bg-[hsl(210,40%,92%)] rounded-lg w-1/2" />
                </div>
                <div className="h-6 w-14 bg-[hsl(210,40%,92%)] rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidates List */}
      {candidates.length > 0 && (
        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[hsl(222,47%,11%)]">Candidates ({candidates.length})</h3>
              <div className="flex gap-1 bg-[hsl(210,40%,96%)] p-0.5 rounded-lg">
                {(['score', 'experience', 'name'] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sortBy === s ? 'bg-[hsl(222,47%,11%)] text-white shadow-sm' : 'text-[hsl(215,16%,47%)] hover:text-[hsl(222,47%,11%)]'}`}>
                    {s === 'score' ? 'Score' : s === 'experience' ? 'Exp' : 'Name'}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={toggleAll} className="text-xs font-medium text-[hsl(215,16%,47%)] hover:text-[hsl(222,47%,11%)] transition-colors">
              {selected.size === candidates.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="border-t border-[hsl(214,32%,91%)]" />
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y divide-[hsl(214,32%,91%)]">
              {sortedCandidates.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-4 hover:bg-[hsl(210,40%,98%)] transition-colors">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-[hsl(214,32%,91%)] w-4 h-4 accent-[hsl(222,47%,11%)]" />
                  <button onClick={() => onSelectCandidate(c)} className="flex-1 text-left flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-full bg-[hsl(210,40%,94%)] border border-[hsl(214,32%,91%)] flex items-center justify-center text-sm font-semibold text-[hsl(222,47%,11%)]">
                      {(c.name ?? '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[hsl(222,47%,11%)] truncate">{c.name}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusPill(c.status)}`}>{c.status}</span>
                      </div>
                      <p className="text-xs text-[hsl(215,16%,47%)] truncate">{c.currentTitle}{c.company ? ` at ${c.company}` : ''} &middot; {c.yearsExperience}y exp</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${scoreColor(c.overallScore ?? 0)}`}>{c.overallScore ?? 0}</span>
                      <FiChevronRight className="w-4 h-4 text-[hsl(215,16%,47%)] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {candidates.length === 0 && !loading && (
        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm py-16 text-center">
          <div className="w-16 h-16 bg-[hsl(210,40%,94%)] rounded-full flex items-center justify-center mx-auto mb-4">
            <FiUsers className="w-7 h-7 text-[hsl(215,16%,47%)]" />
          </div>
          <p className="text-[hsl(222,47%,11%)] font-medium mb-1">No candidates yet</p>
          <p className="text-sm text-[hsl(215,16%,47%)] max-w-sm mx-auto">Click "Source & Match Candidates" to find potential hires</p>
        </div>
      )}
    </div>
  )
}

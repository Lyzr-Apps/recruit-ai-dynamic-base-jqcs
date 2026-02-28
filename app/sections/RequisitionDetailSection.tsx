'use client'

import React, { useState } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { FiArrowLeft, FiUsers, FiSearch, FiCheck, FiAlertTriangle, FiClock, FiChevronRight, FiStar, FiFlag } from 'react-icons/fi'

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
  if (score >= 80) return 'bg-green-100 text-green-700 border-green-200'
  if (score >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  return 'bg-red-100 text-red-700 border-red-200'
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
        <Button variant="ghost" onClick={onBack} className="rounded-[0.875rem]"><FiArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[hsl(222,47%,11%)]">{requisition.title}</h1>
          <p className="text-sm text-[hsl(215,16%,47%)]">{requisition.department} {requisition.team ? `/ ${requisition.team}` : ''} &middot; {requisition.location} &middot; {requisition.type}</p>
        </div>
        <Badge className={requisition.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{requisition.status}</Badge>
      </div>

      {/* Pipeline Stepper */}
      <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-4">
        <div className="flex items-center gap-2">
          {STAGES.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${i < currentStageIdx ? 'bg-[hsl(222,47%,11%)] text-white' : i === currentStageIdx ? 'bg-[#E8795A] text-white' : 'bg-[hsl(210,40%,96%)] text-[hsl(215,16%,47%)]'}`}>
                {i < currentStageIdx ? <FiCheck className="w-3 h-3" /> : <span className="w-3 text-center">{i + 1}</span>}
                {STAGE_LABELS[s]}
              </div>
              {i < STAGES.length - 1 && <div className={`flex-1 h-0.5 ${i < currentStageIdx ? 'bg-[hsl(222,47%,11%)]' : 'bg-[hsl(214,32%,91%)]'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {statusMessage && (
        <div className={`flex items-center gap-2 p-3 rounded-[0.875rem] text-sm ${statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {statusMessage.type === 'success' ? <FiCheck /> : statusMessage.type === 'error' ? <FiAlertTriangle /> : <FiClock className="animate-spin" />}
          {statusMessage.text}
        </div>
      )}

      {/* Job Details Collapsible */}
      <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md">
        <button onClick={() => setShowDetails(!showDetails)} className="w-full flex items-center justify-between p-4 text-left">
          <span className="font-semibold text-[hsl(222,47%,11%)]">Job Details</span>
          <FiChevronRight className={`w-4 h-4 text-[hsl(215,16%,47%)] transition-transform ${showDetails ? 'rotate-90' : ''}`} />
        </button>
        {showDetails && (
          <div className="px-4 pb-4 space-y-3">
            <Separator className="bg-[hsl(214,32%,91%)]" />
            <p className="text-sm text-[hsl(215,16%,47%)]">{requisition.description}</p>
            {(Array.isArray(requisition.requirements) ? requisition.requirements : []).length > 0 && (
              <div>
                <span className="text-xs font-medium text-[hsl(222,47%,11%)] uppercase tracking-wider">Requirements</span>
                <ul className="mt-1 space-y-1">
                  {(Array.isArray(requisition.requirements) ? requisition.requirements : []).map((r, i) => (
                    <li key={i} className="text-sm text-[hsl(215,16%,47%)] flex items-start gap-2"><FiCheck className="w-3 h-3 mt-1 text-[#3BA395] flex-shrink-0" />{r}</li>
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
        <Button onClick={handleSource} disabled={loading !== null} className="bg-[hsl(222,47%,11%)] text-[hsl(210,40%,98%)] rounded-[0.875rem] gap-2">
          {loading === 'sourcing' ? <><FiClock className="animate-spin" /> Sourcing...</> : <><FiSearch /> Source &amp; Match Candidates</>}
        </Button>
        {candidates.filter(c => c.status === 'sourced').length > 0 && (
          <Button onClick={handleScreen} disabled={loading !== null || selected.size === 0} variant="outline" className="rounded-[0.875rem] gap-2 border-[hsl(214,32%,91%)]">
            {loading === 'screening' ? <><FiClock className="animate-spin" /> Screening...</> : <><FiFlag /> Screen Selected ({selected.size})</>}
          </Button>
        )}
      </div>

      {/* Loading skeleton */}
      {loading === 'sourcing' && candidates.length === 0 && (
        <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-6">
          <div className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)] mb-4">
            <FiClock className="animate-spin" /> Searching for candidates across platforms...
          </div>
          <div className="animate-pulse space-y-3">
            {[1,2,3].map(n => (
              <div key={n} className="flex gap-4 items-center">
                <div className="h-10 w-10 bg-[hsl(210,40%,94%)] rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[hsl(210,40%,94%)] rounded w-1/3" />
                  <div className="h-3 bg-[hsl(210,40%,94%)] rounded w-1/2" />
                </div>
                <div className="h-6 w-12 bg-[hsl(210,40%,94%)] rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidates List */}
      {candidates.length > 0 && (
        <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[hsl(222,47%,11%)]">Candidates ({candidates.length})</h3>
              <div className="flex gap-1">
                {(['score','experience','name'] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)} className={`px-2 py-0.5 rounded text-xs ${sortBy === s ? 'bg-[hsl(222,47%,11%)] text-white' : 'bg-[hsl(210,40%,96%)] text-[hsl(215,16%,47%)]'}`}>
                    {s === 'score' ? 'Score' : s === 'experience' ? 'Exp' : 'Name'}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={toggleAll} className="text-xs text-[hsl(215,16%,47%)] underline">
              {selected.size === candidates.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <Separator className="bg-[hsl(214,32%,91%)]" />
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y divide-[hsl(214,32%,91%)]">
              {sortedCandidates.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-4 hover:bg-[hsl(210,40%,98%)] transition-colors">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-[hsl(214,32%,91%)]" />
                  <button onClick={() => onSelectCandidate(c)} className="flex-1 text-left flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded-full bg-[hsl(210,40%,96%)] flex items-center justify-center text-sm font-medium text-[hsl(222,47%,11%)]">
                      {(c.name ?? '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[hsl(222,47%,11%)] truncate">{c.name}</span>
                        <Badge variant="outline" className={`text-[10px] ${c.status === 'screened' ? 'border-blue-300 text-blue-600' : c.status === 'sourced' ? 'border-gray-300 text-gray-600' : c.status === 'interviewing' ? 'border-purple-300 text-purple-600' : 'border-green-300 text-green-600'}`}>{c.status}</Badge>
                      </div>
                      <p className="text-xs text-[hsl(215,16%,47%)] truncate">{c.currentTitle}{c.company ? ` at ${c.company}` : ''} &middot; {c.yearsExperience}y exp</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge className={`text-xs ${scoreColor(c.overallScore ?? 0)}`}>{c.overallScore ?? 0}</Badge>
                      </div>
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
        <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-10 text-center">
          <FiUsers className="w-10 h-10 mx-auto text-[hsl(215,16%,47%)] mb-3" />
          <p className="text-[hsl(215,16%,47%)]">No candidates yet</p>
          <p className="text-xs text-[hsl(215,16%,47%)] mt-1">Click &quot;Source &amp; Match Candidates&quot; to find potential hires</p>
        </div>
      )}
    </div>
  )
}

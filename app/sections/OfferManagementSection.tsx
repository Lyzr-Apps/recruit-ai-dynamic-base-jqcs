'use client'

import React, { useState } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FiArrowLeft, FiDollarSign, FiSend, FiCheck, FiAlertTriangle, FiClock, FiMail, FiFileText, FiTrendingUp, FiX } from 'react-icons/fi'

const NEGOTIATION_AGENT = '69a36b75ce2839b4041a40da'
const OFFER_AGENT = '69a36b922d64d730c5089dca'

interface Candidate {
  id: string; name: string; email: string; currentTitle: string; company: string
  yearsExperience: number; keySkills: string[]; location: string; education: string
  overallScore: number; skillsScore: number; experienceScore: number
  recommendation: string; fitAnalysis: string; sourcePlatform: string
  status: 'sourced' | 'screened' | 'interviewing' | 'analyzed' | 'negotiating' | 'offered' | 'hired'
  screening?: any; interviewReport?: any; negotiation?: any; offerDetails?: any; interviewScheduled?: boolean
}

interface OfferManagementSectionProps {
  candidate: Candidate
  requisitionTitle: string
  salaryMin: number
  salaryMax: number
  onBack: () => void
  onUpdateCandidate: (candidate: Candidate) => void
  setActiveAgentId: (id: string | null) => void
}

function parseAgentResponse(result: AIAgentResponse) {
  if (!result.success) return null
  const r = result?.response?.result
  if (!r) return null
  if (typeof r === 'string') { try { return JSON.parse(r) } catch { return null } }
  return r
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-2 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-2 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{line.slice(2)}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{line}</p>
      })}
    </div>
  )
}

export default function OfferManagementSection({
  candidate, requisitionTitle, salaryMin, salaryMax, onBack, onUpdateCandidate, setActiveAgentId
}: OfferManagementSectionProps) {
  const existingNeg = candidate.negotiation
  const existingOffer = candidate.offerDetails

  const [compForm, setCompForm] = useState({
    baseSalary: existingNeg?.recommended_package?.base_salary ?? '',
    bonus: existingNeg?.recommended_package?.bonus ?? '',
    equity: existingNeg?.recommended_package?.equity ?? '',
    otherBenefits: '',
    startDate: '',
    candidateExpectation: '',
  })
  const [loading, setLoading] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [negotiationResult, setNegotiationResult] = useState<any>(existingNeg ?? null)
  const [offerResult, setOfferResult] = useState<any>(existingOffer ?? null)
  const [offerStatus, setOfferStatus] = useState<'draft' | 'sent' | 'accepted' | 'declined'>(existingOffer ? 'sent' : 'draft')

  const negStrategy = Array.isArray(negotiationResult?.negotiation_strategy) ? negotiationResult.negotiation_strategy : []
  const riskFactors = Array.isArray(negotiationResult?.risk_factors) ? negotiationResult.risk_factors : []
  const otherBenefits = Array.isArray(negotiationResult?.recommended_package?.other_benefits) ? negotiationResult.recommended_package.other_benefits : []
  const nextSteps = Array.isArray(offerResult?.next_steps) ? offerResult.next_steps : []

  const handleNegotiate = async () => {
    setLoading('negotiating')
    setStatusMessage({ type: 'info', text: 'Analyzing compensation and market data...' })
    setActiveAgentId(NEGOTIATION_AGENT)

    const message = `Analyze compensation for candidate ${candidate.name} applying for ${requisitionTitle}.\n\nCandidate expectations: ${compForm.candidateExpectation || 'Not specified'}\nBudget range: $${salaryMin}-$${salaryMax}\nCandidate experience: ${candidate.yearsExperience} years\nCurrent role: ${candidate.currentTitle} at ${candidate.company}\nBase salary input: ${compForm.baseSalary || 'Not set'}\nBonus input: ${compForm.bonus || 'Not set'}\nEquity input: ${compForm.equity || 'Not set'}`

    const result = await callAIAgent(message, NEGOTIATION_AGENT)
    setActiveAgentId(null)
    setLoading(null)

    const parsed = parseAgentResponse(result)
    if (parsed) {
      setNegotiationResult(parsed)
      onUpdateCandidate({ ...candidate, negotiation: parsed, status: 'negotiating' })
      if (parsed?.recommended_package) {
        setCompForm(prev => ({
          ...prev,
          baseSalary: parsed.recommended_package?.base_salary ?? prev.baseSalary,
          bonus: parsed.recommended_package?.bonus ?? prev.bonus,
          equity: parsed.recommended_package?.equity ?? prev.equity,
        }))
      }
      setStatusMessage({ type: 'success', text: 'Compensation analysis complete' })
    } else {
      setStatusMessage({ type: 'error', text: result?.error ?? 'Failed to analyze compensation' })
    }
  }

  const handleGenerateOffer = async () => {
    setLoading('offer')
    setStatusMessage({ type: 'info', text: 'Generating offer letter and sending via email...' })
    setActiveAgentId(OFFER_AGENT)

    const message = `Generate and send an offer letter for ${candidate.name} (${candidate.email}) for the role of ${requisitionTitle}.\n\nCompensation:\n- Base Salary: ${compForm.baseSalary || 'TBD'}\n- Bonus: ${compForm.bonus || 'TBD'}\n- Equity: ${compForm.equity || 'TBD'}\n- Other Benefits: ${compForm.otherBenefits || 'Standard package'}\n- Start Date: ${compForm.startDate || 'TBD'}\n\nCandidate details:\n- Current Role: ${candidate.currentTitle} at ${candidate.company}\n- Experience: ${candidate.yearsExperience} years`

    const result = await callAIAgent(message, OFFER_AGENT)
    setActiveAgentId(null)
    setLoading(null)

    const parsed = parseAgentResponse(result)
    if (parsed) {
      setOfferResult(parsed)
      setOfferStatus(parsed?.email_sent ? 'sent' : 'draft')
      onUpdateCandidate({ ...candidate, offerDetails: parsed, status: 'offered' })
      setStatusMessage({ type: 'success', text: parsed?.offer_status ?? 'Offer generated successfully' })
    } else {
      setStatusMessage({ type: 'error', text: result?.error ?? 'Failed to generate offer' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-lg border border-[hsl(214,32%,91%)] bg-white flex items-center justify-center hover:bg-[hsl(210,40%,96%)] transition-colors">
          <FiArrowLeft className="w-4 h-4 text-[hsl(222,47%,11%)]" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[hsl(222,47%,11%)]">Offer Management</h1>
          <p className="text-sm text-[hsl(215,16%,47%)]">{candidate.name} &middot; {requisitionTitle}</p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${offerStatus === 'sent' ? 'bg-blue-50 text-blue-600 border border-blue-200' : offerStatus === 'accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : offerStatus === 'declined' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-600'}`}>
          {offerStatus.charAt(0).toUpperCase() + offerStatus.slice(1)}
        </span>
      </div>

      {statusMessage && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {statusMessage.type === 'success' ? <FiCheck className="w-4 h-4 flex-shrink-0" /> : statusMessage.type === 'error' ? <FiAlertTriangle className="w-4 h-4 flex-shrink-0" /> : <FiClock className="animate-spin w-4 h-4 flex-shrink-0" />}
          {statusMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Form */}
        <div className="space-y-4">
          <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-[hsl(222,47%,11%)] flex items-center gap-2 text-base"><FiDollarSign className="w-5 h-5" /> Compensation Details</h2>
            <div className="space-y-1.5">
              <Label className="text-[hsl(222,47%,11%)] text-sm font-medium">Candidate Expectations</Label>
              <Input placeholder="e.g. $130,000 base + 15% bonus" value={compForm.candidateExpectation} onChange={e => setCompForm(prev => ({ ...prev, candidateExpectation: e.target.value }))} className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[hsl(222,47%,11%)] text-sm font-medium">Base Salary</Label>
                <Input placeholder="$120,000" value={compForm.baseSalary} onChange={e => setCompForm(prev => ({ ...prev, baseSalary: e.target.value }))} className="rounded-lg border-[hsl(214,32%,91%)] bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[hsl(222,47%,11%)] text-sm font-medium">Bonus</Label>
                <Input placeholder="$15,000" value={compForm.bonus} onChange={e => setCompForm(prev => ({ ...prev, bonus: e.target.value }))} className="rounded-lg border-[hsl(214,32%,91%)] bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[hsl(222,47%,11%)] text-sm font-medium">Equity</Label>
                <Input placeholder="$30,000 RSUs" value={compForm.equity} onChange={e => setCompForm(prev => ({ ...prev, equity: e.target.value }))} className="rounded-lg border-[hsl(214,32%,91%)] bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[hsl(222,47%,11%)] text-sm font-medium">Start Date</Label>
                <Input type="date" value={compForm.startDate} onChange={e => setCompForm(prev => ({ ...prev, startDate: e.target.value }))} className="rounded-lg border-[hsl(214,32%,91%)] bg-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[hsl(222,47%,11%)] text-sm font-medium">Other Benefits</Label>
              <Textarea placeholder="e.g. Remote work, 20 PTO days, health insurance..." value={compForm.otherBenefits} onChange={e => setCompForm(prev => ({ ...prev, otherBenefits: e.target.value }))} rows={2} className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent" />
            </div>
            <div className="bg-[hsl(210,40%,98%)] rounded-lg px-3 py-2 text-xs text-[hsl(215,16%,47%)] border border-[hsl(214,32%,91%)]">Budget range: ${salaryMin?.toLocaleString()}-${salaryMax?.toLocaleString()}</div>
            <div className="flex gap-3">
              <button onClick={handleNegotiate} disabled={loading !== null} className="flex-1 bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,16%)] disabled:opacity-50 text-white rounded-lg px-5 py-2.5 font-medium shadow-sm flex items-center justify-center gap-2 text-sm transition-colors">
                {loading === 'negotiating' ? <><FiClock className="animate-spin w-4 h-4" /> Analyzing...</> : <><FiTrendingUp className="w-4 h-4" /> Analyze Compensation</>}
              </button>
              <button onClick={handleGenerateOffer} disabled={loading !== null} className="flex-1 border border-[hsl(214,32%,91%)] bg-white hover:bg-[hsl(210,40%,96%)] disabled:opacity-50 text-[hsl(222,47%,11%)] rounded-lg px-5 py-2.5 font-medium flex items-center justify-center gap-2 text-sm transition-colors">
                {loading === 'offer' ? <><FiClock className="animate-spin w-4 h-4" /> Generating...</> : <><FiSend className="w-4 h-4" /> Generate & Send Offer</>}
              </button>
            </div>
          </div>

          {negotiationResult && (
            <div className="space-y-4">
              {negotiationResult?.market_analysis && (
                <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                  <h3 className="font-semibold text-[hsl(222,47%,11%)] mb-2">Market Analysis</h3>
                  <div className="text-sm text-[hsl(215,16%,47%)]">{renderMarkdown(negotiationResult.market_analysis)}</div>
                </div>
              )}
              <div className="bg-[hsl(222,47%,11%)] text-white rounded-[0.875rem] p-6 shadow-lg">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><FiDollarSign className="w-5 h-5" /> Recommended Package</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-white/60 text-xs">Base</span><p className="font-bold text-lg mt-0.5">{negotiationResult?.recommended_package?.base_salary ?? 'N/A'}</p></div>
                  <div><span className="text-white/60 text-xs">Bonus</span><p className="font-bold text-lg mt-0.5">{negotiationResult?.recommended_package?.bonus ?? 'N/A'}</p></div>
                  <div><span className="text-white/60 text-xs">Equity</span><p className="font-bold text-lg mt-0.5">{negotiationResult?.recommended_package?.equity ?? 'N/A'}</p></div>
                  <div><span className="text-white/60 text-xs">Total</span><p className="font-bold text-lg mt-0.5">{negotiationResult?.recommended_package?.total_compensation ?? 'N/A'}</p></div>
                </div>
                {otherBenefits.length > 0 && <div className="flex flex-wrap gap-1.5 mt-4">{otherBenefits.map((b: string, i: number) => <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/15 text-white">{b}</span>)}</div>}
              </div>
              {negotiationResult?.budget_comparison && (
                <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5 text-sm">
                  <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-3">Budget Comparison</h4>
                  <div className="space-y-2.5">
                    <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Range</span><span className="font-medium">{negotiationResult.budget_comparison?.budget_range ?? 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">vs Budget</span><span className="font-medium">{negotiationResult.budget_comparison?.recommended_vs_budget ?? 'N/A'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[hsl(215,16%,47%)]">Within?</span><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${negotiationResult.budget_comparison?.within_budget ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{negotiationResult.budget_comparison?.within_budget ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>
              )}
              {negStrategy.length > 0 && (
                <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                  <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-3">Strategy</h4>
                  <ol className="space-y-2">{negStrategy.map((s: string, i: number) => <li key={i} className="text-sm text-[hsl(215,16%,47%)] flex gap-2.5"><span className="bg-[hsl(222,47%,11%)] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">{i + 1}</span>{s}</li>)}</ol>
                </div>
              )}
              {riskFactors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-[0.875rem] p-5">
                  <h4 className="font-semibold text-amber-700 mb-2 flex items-center gap-1.5"><FiAlertTriangle className="w-4 h-4" /> Risk Factors</h4>
                  <ul className="space-y-1.5">{riskFactors.map((r: string, i: number) => <li key={i} className="text-sm text-amber-700">{r}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right - Offer Preview */}
        <div className="space-y-4">
          {loading === 'negotiating' && !negotiationResult && (
            <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6">
              <div className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)] mb-4"><FiClock className="animate-spin" /> Analyzing market data and compensation...</div>
              <div className="animate-pulse space-y-4">
                <div className="h-5 bg-[hsl(210,40%,92%)] rounded-lg w-3/4"></div>
                <div className="h-5 bg-[hsl(210,40%,92%)] rounded-lg w-1/2"></div>
              </div>
            </div>
          )}

          {loading === 'offer' && (
            <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6">
              <div className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)] mb-4"><FiClock className="animate-spin" /> Drafting offer letter and preparing to send...</div>
              <div className="animate-pulse space-y-4">
                <div className="h-5 bg-[hsl(210,40%,92%)] rounded-lg w-full"></div>
                <div className="h-5 bg-[hsl(210,40%,92%)] rounded-lg w-5/6"></div>
                <div className="h-5 bg-[hsl(210,40%,92%)] rounded-lg w-2/3"></div>
              </div>
            </div>
          )}

          {offerResult && (
            <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[hsl(222,47%,11%)] flex items-center gap-2"><FiFileText className="w-5 h-5" /> Offer Letter</h3>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${offerResult?.email_sent ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                  {offerResult?.email_sent ? 'Email Sent' : 'Draft'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-0.5"><span className="text-[hsl(215,16%,47%)] text-xs">Role</span><p className="font-medium text-[hsl(222,47%,11%)]">{offerResult?.role_title ?? requisitionTitle}</p></div>
                <div className="space-y-0.5"><span className="text-[hsl(215,16%,47%)] text-xs">Recipient</span><p className="font-medium text-[hsl(222,47%,11%)]">{offerResult?.recipient_email ?? candidate.email}</p></div>
                <div className="space-y-0.5"><span className="text-[hsl(215,16%,47%)] text-xs">Start Date</span><p className="font-medium text-[hsl(222,47%,11%)]">{offerResult?.start_date ?? 'TBD'}</p></div>
                <div className="space-y-0.5"><span className="text-[hsl(215,16%,47%)] text-xs">Deadline</span><p className="font-medium text-[hsl(222,47%,11%)]">{offerResult?.acceptance_deadline ?? 'TBD'}</p></div>
              </div>

              {offerResult?.compensation_summary && (
                <div className="bg-[hsl(210,40%,98%)] rounded-xl p-4 border border-[hsl(214,32%,91%)]">
                  <h4 className="text-xs font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wider mb-3">Compensation Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-[hsl(215,16%,47%)] text-xs">Base</span><p className="font-semibold text-[hsl(222,47%,11%)]">{offerResult.compensation_summary?.base_salary ?? 'N/A'}</p></div>
                    <div><span className="text-[hsl(215,16%,47%)] text-xs">Bonus</span><p className="font-semibold text-[hsl(222,47%,11%)]">{offerResult.compensation_summary?.bonus ?? 'N/A'}</p></div>
                    <div><span className="text-[hsl(215,16%,47%)] text-xs">Equity</span><p className="font-semibold text-[hsl(222,47%,11%)]">{offerResult.compensation_summary?.equity ?? 'N/A'}</p></div>
                    <div><span className="text-[hsl(215,16%,47%)] text-xs">Total</span><p className="font-semibold text-[hsl(222,47%,11%)]">{offerResult.compensation_summary?.total_package ?? 'N/A'}</p></div>
                  </div>
                </div>
              )}

              {offerResult?.offer_letter_content && (
                <div>
                  <h4 className="text-xs font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wider mb-2">Letter Content</h4>
                  <ScrollArea className="max-h-[300px]">
                    <div className="bg-white border border-[hsl(214,32%,91%)] rounded-xl p-5 text-sm text-[hsl(215,16%,47%)]">
                      {renderMarkdown(offerResult.offer_letter_content)}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {offerResult?.email_sent && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <FiMail className="w-4 h-4" /> Email sent to {offerResult?.recipient_email ?? candidate.email}
                </div>
              )}

              {nextSteps.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wider mb-2">Next Steps</h4>
                  <ol className="space-y-1.5">{nextSteps.map((s: string, i: number) => <li key={i} className="text-sm text-[hsl(215,16%,47%)] flex gap-2"><span className="text-[hsl(222,47%,11%)] font-semibold">{i + 1}.</span>{s}</li>)}</ol>
                </div>
              )}

              {offerStatus === 'sent' && (
                <div className="flex gap-3">
                  <button onClick={() => setOfferStatus('accepted')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-5 py-2.5 font-medium shadow-sm flex items-center justify-center gap-2 text-sm transition-colors"><FiCheck className="w-4 h-4" /> Mark Accepted</button>
                  <button onClick={() => setOfferStatus('declined')} className="flex-1 border border-red-300 bg-white hover:bg-red-50 text-red-600 rounded-lg px-5 py-2.5 font-medium flex items-center justify-center gap-2 text-sm transition-colors"><FiX className="w-4 h-4" /> Mark Declined</button>
                </div>
              )}
            </div>
          )}

          {!offerResult && !loading && (
            <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm py-16 text-center">
              <div className="w-16 h-16 bg-[hsl(210,40%,94%)] rounded-full flex items-center justify-center mx-auto mb-4">
                <FiFileText className="w-7 h-7 text-[hsl(215,16%,47%)]" />
              </div>
              <p className="text-[hsl(222,47%,11%)] font-medium mb-1">Offer letter preview will appear here</p>
              <p className="text-sm text-[hsl(215,16%,47%)] max-w-sm mx-auto">Set compensation details and click Generate & Send Offer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FiArrowLeft, FiDollarSign, FiSend, FiCheck, FiAlertTriangle, FiClock, FiMail, FiFileText, FiTrendingUp } from 'react-icons/fi'

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
        <Button variant="ghost" onClick={onBack} className="rounded-[0.875rem]"><FiArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[hsl(222,47%,11%)]">Offer Management</h1>
          <p className="text-sm text-[hsl(215,16%,47%)]">{candidate.name} &middot; {requisitionTitle}</p>
        </div>
        <Badge className={offerStatus === 'sent' ? 'bg-blue-100 text-blue-700' : offerStatus === 'accepted' ? 'bg-green-100 text-green-700' : offerStatus === 'declined' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}>
          {offerStatus.charAt(0).toUpperCase() + offerStatus.slice(1)}
        </Badge>
      </div>

      {statusMessage && (
        <div className={`flex items-center gap-2 p-3 rounded-[0.875rem] text-sm ${statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {statusMessage.type === 'success' ? <FiCheck /> : statusMessage.type === 'error' ? <FiAlertTriangle /> : <FiClock className="animate-spin" />}
          {statusMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Form */}
        <div className="space-y-4">
          <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-6 space-y-4">
            <h2 className="font-semibold text-[hsl(222,47%,11%)] flex items-center gap-2"><FiDollarSign /> Compensation Details</h2>
            <div>
              <Label className="text-[hsl(222,47%,11%)]">Candidate Expectations</Label>
              <Input placeholder="e.g. $130,000 base + 15% bonus" value={compForm.candidateExpectation} onChange={e => setCompForm(prev => ({ ...prev, candidateExpectation: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[hsl(222,47%,11%)]">Base Salary</Label>
                <Input placeholder="$120,000" value={compForm.baseSalary} onChange={e => setCompForm(prev => ({ ...prev, baseSalary: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
              </div>
              <div>
                <Label className="text-[hsl(222,47%,11%)]">Bonus</Label>
                <Input placeholder="$15,000" value={compForm.bonus} onChange={e => setCompForm(prev => ({ ...prev, bonus: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[hsl(222,47%,11%)]">Equity</Label>
                <Input placeholder="$30,000 RSUs" value={compForm.equity} onChange={e => setCompForm(prev => ({ ...prev, equity: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
              </div>
              <div>
                <Label className="text-[hsl(222,47%,11%)]">Start Date</Label>
                <Input type="date" value={compForm.startDate} onChange={e => setCompForm(prev => ({ ...prev, startDate: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
              </div>
            </div>
            <div>
              <Label className="text-[hsl(222,47%,11%)]">Other Benefits</Label>
              <Textarea placeholder="e.g. Remote work, 20 PTO days, health insurance..." value={compForm.otherBenefits} onChange={e => setCompForm(prev => ({ ...prev, otherBenefits: e.target.value }))} rows={2} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
            </div>
            <div className="text-xs text-[hsl(215,16%,47%)]">Budget range: ${salaryMin?.toLocaleString()}-${salaryMax?.toLocaleString()}</div>
            <div className="flex gap-3">
              <Button onClick={handleNegotiate} disabled={loading !== null} className="flex-1 bg-[hsl(222,47%,11%)] text-[hsl(210,40%,98%)] rounded-[0.875rem] gap-2">
                {loading === 'negotiating' ? <><FiClock className="animate-spin" /> Analyzing...</> : <><FiTrendingUp /> Analyze Compensation</>}
              </Button>
              <Button onClick={handleGenerateOffer} disabled={loading !== null} variant="outline" className="flex-1 rounded-[0.875rem] gap-2 border-[hsl(214,32%,91%)]">
                {loading === 'offer' ? <><FiClock className="animate-spin" /> Generating...</> : <><FiSend /> Generate &amp; Send Offer</>}
              </Button>
            </div>
          </div>

          {negotiationResult && (
            <div className="space-y-4">
              {negotiationResult?.market_analysis && (
                <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-4">
                  <h3 className="font-semibold text-[hsl(222,47%,11%)] mb-2">Market Analysis</h3>
                  <div className="text-sm text-[hsl(215,16%,47%)]">{renderMarkdown(negotiationResult.market_analysis)}</div>
                </div>
              )}
              <div className="bg-[hsl(222,47%,11%)] text-white rounded-[0.875rem] p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><FiDollarSign /> Recommended Package</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-white/60">Base</span><p className="font-bold">{negotiationResult?.recommended_package?.base_salary ?? 'N/A'}</p></div>
                  <div><span className="text-white/60">Bonus</span><p className="font-bold">{negotiationResult?.recommended_package?.bonus ?? 'N/A'}</p></div>
                  <div><span className="text-white/60">Equity</span><p className="font-bold">{negotiationResult?.recommended_package?.equity ?? 'N/A'}</p></div>
                  <div><span className="text-white/60">Total</span><p className="font-bold">{negotiationResult?.recommended_package?.total_compensation ?? 'N/A'}</p></div>
                </div>
                {otherBenefits.length > 0 && <div className="flex flex-wrap gap-1 mt-3">{otherBenefits.map((b: string, i: number) => <Badge key={i} className="bg-white/20 text-white text-[10px]">{b}</Badge>)}</div>}
              </div>
              {negotiationResult?.budget_comparison && (
                <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-4 text-sm">
                  <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-2">Budget Comparison</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Range</span><span>{negotiationResult.budget_comparison?.budget_range ?? 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">vs Budget</span><span>{negotiationResult.budget_comparison?.recommended_vs_budget ?? 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-[hsl(215,16%,47%)]">Within?</span><Badge className={negotiationResult.budget_comparison?.within_budget ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{negotiationResult.budget_comparison?.within_budget ? 'Yes' : 'No'}</Badge></div>
                  </div>
                </div>
              )}
              {negStrategy.length > 0 && (
                <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-4">
                  <h4 className="font-semibold text-[hsl(222,47%,11%)] mb-2">Strategy</h4>
                  <ol className="space-y-1">{negStrategy.map((s: string, i: number) => <li key={i} className="text-sm text-[hsl(215,16%,47%)] flex gap-2"><span className="bg-[hsl(222,47%,11%)] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">{i+1}</span>{s}</li>)}</ol>
                </div>
              )}
              {riskFactors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-[0.875rem] p-4">
                  <h4 className="font-semibold text-yellow-700 mb-2 flex items-center gap-1"><FiAlertTriangle /> Risk Factors</h4>
                  <ul className="space-y-1">{riskFactors.map((r: string, i: number) => <li key={i} className="text-sm text-yellow-700">{r}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right - Offer Preview */}
        <div className="space-y-4">
          {loading === 'negotiating' && !negotiationResult && (
            <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-6">
              <div className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)] mb-4"><FiClock className="animate-spin" /> Analyzing market data and compensation...</div>
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-[hsl(210,40%,94%)] rounded w-3/4"></div>
                <div className="h-4 bg-[hsl(210,40%,94%)] rounded w-1/2"></div>
              </div>
            </div>
          )}

          {loading === 'offer' && (
            <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-6">
              <div className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)] mb-4"><FiClock className="animate-spin" /> Drafting offer letter and preparing to send...</div>
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-[hsl(210,40%,94%)] rounded w-full"></div>
                <div className="h-4 bg-[hsl(210,40%,94%)] rounded w-5/6"></div>
                <div className="h-4 bg-[hsl(210,40%,94%)] rounded w-2/3"></div>
              </div>
            </div>
          )}

          {offerResult && (
            <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[hsl(222,47%,11%)] flex items-center gap-2"><FiFileText /> Offer Letter</h3>
                <Badge className={offerResult?.email_sent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                  {offerResult?.email_sent ? 'Email Sent' : 'Draft'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-[hsl(215,16%,47%)]">Role</span><p className="font-medium text-[hsl(222,47%,11%)]">{offerResult?.role_title ?? requisitionTitle}</p></div>
                <div><span className="text-[hsl(215,16%,47%)]">Recipient</span><p className="font-medium text-[hsl(222,47%,11%)]">{offerResult?.recipient_email ?? candidate.email}</p></div>
                <div><span className="text-[hsl(215,16%,47%)]">Start Date</span><p className="font-medium text-[hsl(222,47%,11%)]">{offerResult?.start_date ?? 'TBD'}</p></div>
                <div><span className="text-[hsl(215,16%,47%)]">Deadline</span><p className="font-medium text-[hsl(222,47%,11%)]">{offerResult?.acceptance_deadline ?? 'TBD'}</p></div>
              </div>

              {offerResult?.compensation_summary && (
                <div className="bg-[hsl(210,40%,96%)] rounded-[0.875rem] p-4">
                  <h4 className="text-xs font-medium text-[hsl(222,47%,11%)] uppercase tracking-wider mb-2">Compensation Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-[hsl(215,16%,47%)]">Base</span><p className="font-semibold">{offerResult.compensation_summary?.base_salary ?? 'N/A'}</p></div>
                    <div><span className="text-[hsl(215,16%,47%)]">Bonus</span><p className="font-semibold">{offerResult.compensation_summary?.bonus ?? 'N/A'}</p></div>
                    <div><span className="text-[hsl(215,16%,47%)]">Equity</span><p className="font-semibold">{offerResult.compensation_summary?.equity ?? 'N/A'}</p></div>
                    <div><span className="text-[hsl(215,16%,47%)]">Total</span><p className="font-semibold">{offerResult.compensation_summary?.total_package ?? 'N/A'}</p></div>
                  </div>
                </div>
              )}

              {offerResult?.offer_letter_content && (
                <div>
                  <h4 className="text-xs font-medium text-[hsl(222,47%,11%)] uppercase tracking-wider mb-2">Letter Content</h4>
                  <ScrollArea className="max-h-[300px]">
                    <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] p-4 text-sm text-[hsl(215,16%,47%)]">
                      {renderMarkdown(offerResult.offer_letter_content)}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {offerResult?.email_sent && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-[0.875rem]">
                  <FiMail className="w-4 h-4" /> Email sent to {offerResult?.recipient_email ?? candidate.email}
                </div>
              )}

              {nextSteps.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[hsl(222,47%,11%)] uppercase tracking-wider mb-2">Next Steps</h4>
                  <ol className="space-y-1">{nextSteps.map((s: string, i: number) => <li key={i} className="text-sm text-[hsl(215,16%,47%)] flex gap-2"><span className="text-[hsl(222,47%,11%)] font-medium">{i+1}.</span>{s}</li>)}</ol>
                </div>
              )}

              {offerStatus === 'sent' && (
                <div className="flex gap-2">
                  <Button onClick={() => setOfferStatus('accepted')} className="flex-1 bg-green-600 text-white rounded-[0.875rem] gap-2"><FiCheck /> Mark Accepted</Button>
                  <Button onClick={() => setOfferStatus('declined')} variant="outline" className="flex-1 rounded-[0.875rem] gap-2 border-red-300 text-red-600"><FiAlertTriangle /> Mark Declined</Button>
                </div>
              )}
            </div>
          )}

          {!offerResult && !loading && (
            <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-10 text-center">
              <FiFileText className="w-10 h-10 mx-auto text-[hsl(215,16%,47%)] mb-3" />
              <p className="text-[hsl(215,16%,47%)]">Offer letter preview will appear here</p>
              <p className="text-xs text-[hsl(215,16%,47%)] mt-1">Set compensation details and click Generate &amp; Send Offer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FiArrowLeft, FiBriefcase, FiUsers, FiClock, FiTrendingUp, FiZap, FiAlertTriangle, FiCheck, FiBarChart2, FiTarget, FiStar } from 'react-icons/fi'

const AGENT_ID = '69a3753f2d64d730c5089ddb'

interface Candidate {
  id: string; name: string; email: string; currentTitle: string; company: string
  yearsExperience: number; keySkills: string[]; location: string; education: string
  overallScore: number; skillsScore: number; experienceScore: number
  recommendation: string; fitAnalysis: string; sourcePlatform: string
  status: 'sourced' | 'screened' | 'interviewing' | 'analyzed' | 'negotiating' | 'offered' | 'hired'
}

interface Requisition {
  id: string; title: string; department: string; description: string
  requirements: string[]; salaryMin: number; salaryMax: number; location: string
  type: string; team: string; createdAt: string
  status: 'open' | 'closed' | 'on-hold'
  stage: 'source' | 'screen' | 'interview' | 'analyze' | 'negotiate' | 'offer'
  candidates: Candidate[]
}

interface HiringAnalyticsSectionProps {
  requisitions: Requisition[]
  onBack: () => void
  setActiveAgentId: (id: string | null) => void
}

interface StageConversionRate {
  stage: string
  conversion_rate: string
  avg_days_in_stage: number
  candidates_count: number
}

interface SourceEffectivenessItem {
  source: string
  candidates: number
  avg_score: number
  conversion_rate: string
  cost_effectiveness: string
}

interface RecommendationItem {
  priority: string
  area: string
  recommendation: string
  expected_impact: string
}

interface AnalyticsData {
  pipeline_health?: {
    total_requisitions?: number
    total_candidates?: number
    avg_time_to_hire_days?: number
    overall_conversion_rate?: string
    stage_conversion_rates?: StageConversionRate[]
    bottlenecks?: string[]
  }
  candidate_quality?: {
    avg_score?: number
    score_distribution?: string
    top_performers_pct?: string
    quality_trend?: string
  }
  source_effectiveness?: SourceEffectivenessItem[]
  recommendations?: RecommendationItem[]
  summary?: string
  key_insights?: string[]
}

function parseAgentResponse(result: AIAgentResponse) {
  if (!result.success) return null
  const r = result?.response?.result
  if (!r) return null
  if (typeof r === 'string') { try { return JSON.parse(r) } catch { return null } }
  return r
}

function buildPipelineMessage(requisitions: Requisition[]): string {
  const totalReqs = requisitions.length
  const openReqs = requisitions.filter(r => r.status === 'open').length
  const closedReqs = requisitions.filter(r => r.status === 'closed').length
  const onHoldReqs = requisitions.filter(r => r.status === 'on-hold').length

  const allCandidates = requisitions.flatMap(r => Array.isArray(r.candidates) ? r.candidates : [])
  const totalCandidates = allCandidates.length

  const statusCounts: Record<string, number> = {}
  allCandidates.forEach(c => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1
  })

  const stageCounts: Record<string, number> = {}
  requisitions.forEach(r => {
    stageCounts[r.stage] = (stageCounts[r.stage] || 0) + 1
  })

  const avgScore = totalCandidates > 0
    ? (allCandidates.reduce((sum, c) => sum + (c.overallScore || 0), 0) / totalCandidates).toFixed(1)
    : '0'

  const sourceCounts: Record<string, number> = {}
  allCandidates.forEach(c => {
    const src = c.sourcePlatform || 'Unknown'
    sourceCounts[src] = (sourceCounts[src] || 0) + 1
  })

  const departments = [...new Set(requisitions.map(r => r.department).filter(Boolean))]

  return `Analyze the following hiring pipeline data and provide comprehensive analytics:

Pipeline Overview:
- Total Requisitions: ${totalReqs} (Open: ${openReqs}, Closed: ${closedReqs}, On-Hold: ${onHoldReqs})
- Total Candidates: ${totalCandidates}
- Departments: ${departments.join(', ') || 'N/A'}

Requisition Stages: ${Object.entries(stageCounts).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}

Candidate Status Distribution: ${Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}

Average Candidate Score: ${avgScore}/100

Source Distribution: ${Object.entries(sourceCounts).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}

Requisition Details:
${requisitions.map(r => {
  const cands = Array.isArray(r.candidates) ? r.candidates : []
  const reqAvg = cands.length > 0 ? (cands.reduce((s, c) => s + (c.overallScore || 0), 0) / cands.length).toFixed(1) : 'N/A'
  return `- ${r.title} (${r.department}): ${cands.length} candidates, stage: ${r.stage}, status: ${r.status}, avg score: ${reqAvg}`
}).join('\n')}

Please provide:
1. Pipeline health metrics with stage conversion rates and bottlenecks
2. Candidate quality analysis with score distribution and trends
3. Source effectiveness comparison
4. Key insights and actionable recommendations with priority levels`
}

function parseConversionRate(rate: string): number {
  if (!rate) return 0
  const match = rate.match(/([\d.]+)/)
  return match ? parseFloat(match[1]) : 0
}

function getPriorityColor(priority: string): string {
  const p = (priority || '').toLowerCase()
  if (p === 'high' || p === 'critical') return 'bg-red-50 text-red-700 border-red-200'
  if (p === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-blue-50 text-blue-700 border-blue-200'
}

const STAT_ICON_COLORS = [
  { bg: 'bg-slate-100', text: 'text-slate-600' },
  { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { bg: 'bg-orange-50', text: 'text-orange-600' },
  { bg: 'bg-indigo-50', text: 'text-indigo-600' },
]

export default function HiringAnalyticsSection({ requisitions, onBack, setActiveAgentId }: HiringAnalyticsSectionProps) {
  const [loading, setLoading] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setStatusMessage({ type: 'info', text: 'Analyzing your hiring pipeline data...' })
    setActiveAgentId(AGENT_ID)

    const message = buildPipelineMessage(requisitions)
    const result = await callAIAgent(message, AGENT_ID)

    setActiveAgentId(null)
    setLoading(false)

    const parsed = parseAgentResponse(result)
    if (parsed) {
      setAnalyticsData(parsed)
      setStatusMessage({ type: 'success', text: 'Pipeline analysis complete' })
    } else {
      setStatusMessage({ type: 'error', text: result?.error ?? 'Failed to analyze pipeline data' })
    }
  }

  const ph = analyticsData?.pipeline_health
  const cq = analyticsData?.candidate_quality
  const stageRates = Array.isArray(ph?.stage_conversion_rates) ? ph.stage_conversion_rates : []
  const bottlenecks = Array.isArray(ph?.bottlenecks) ? ph.bottlenecks : []
  const sourceData = Array.isArray(analyticsData?.source_effectiveness) ? analyticsData.source_effectiveness : []
  const recommendations = Array.isArray(analyticsData?.recommendations) ? analyticsData.recommendations : []
  const keyInsights = Array.isArray(analyticsData?.key_insights) ? analyticsData.key_insights : []

  const stats = [
    { label: 'Total Requisitions', value: ph?.total_requisitions ?? '--', icon: FiBriefcase },
    { label: 'Total Candidates', value: ph?.total_candidates ?? '--', icon: FiUsers },
    { label: 'Avg Time to Hire', value: ph?.avg_time_to_hire_days != null ? `${ph.avg_time_to_hire_days}d` : '--', icon: FiClock },
    { label: 'Conversion Rate', value: ph?.overall_conversion_rate ?? '--', icon: FiTrendingUp },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-lg border border-[hsl(214,32%,91%)] bg-white flex items-center justify-center hover:bg-[hsl(210,40%,96%)] transition-colors">
          <FiArrowLeft className="w-4 h-4 text-[hsl(222,47%,11%)]" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[hsl(222,47%,11%)]">Hiring Analytics</h1>
          <p className="text-sm text-[hsl(215,16%,47%)] mt-0.5">AI-powered pipeline insights and recommendations</p>
        </div>
        <button onClick={handleAnalyze} disabled={loading} className="bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,16%)] disabled:opacity-50 text-white rounded-lg px-5 py-2.5 font-medium shadow-sm flex items-center gap-2 text-sm transition-colors">
          {loading ? <><FiClock className="animate-spin w-4 h-4" /> Analyzing...</> : <><FiBarChart2 className="w-4 h-4" /> Analyze Pipeline</>}
        </button>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {statusMessage.type === 'success' ? <FiCheck className="w-4 h-4 flex-shrink-0" /> : statusMessage.type === 'error' ? <FiAlertTriangle className="w-4 h-4 flex-shrink-0" /> : <FiClock className="animate-spin w-4 h-4 flex-shrink-0" />}
          {statusMessage.text}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !analyticsData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 bg-[hsl(210,40%,92%)] rounded w-24" />
                  <div className="w-10 h-10 bg-[hsl(210,40%,92%)] rounded-xl" />
                </div>
                <div className="h-8 bg-[hsl(210,40%,92%)] rounded w-16" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6 animate-pulse">
              <div className="h-5 bg-[hsl(210,40%,92%)] rounded w-40 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-[hsl(210,40%,92%)] rounded-lg" />)}
              </div>
            </div>
            <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6 animate-pulse">
              <div className="h-5 bg-[hsl(210,40%,92%)] rounded w-40 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[hsl(210,40%,92%)] rounded-lg" />)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !analyticsData && (
        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm py-16 text-center">
          <div className="w-16 h-16 bg-[hsl(210,40%,94%)] rounded-full flex items-center justify-center mx-auto mb-4">
            <FiBarChart2 className="w-7 h-7 text-[hsl(215,16%,47%)]" />
          </div>
          <p className="text-[hsl(222,47%,11%)] font-medium mb-1">No analytics data yet</p>
          <p className="text-sm text-[hsl(215,16%,47%)] max-w-sm mx-auto">Click Analyze Pipeline to get AI insights on your hiring data</p>
        </div>
      )}

      {/* Analytics Results */}
      {analyticsData && (
        <div className="space-y-6">
          {/* ROW 1 - Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, si) => (
              <div key={s.label} className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[hsl(215,16%,47%)]">{s.label}</span>
                  <div className={`w-10 h-10 rounded-xl ${STAT_ICON_COLORS[si]?.bg ?? 'bg-slate-100'} flex items-center justify-center`}>
                    <s.icon className={`w-5 h-5 ${STAT_ICON_COLORS[si]?.text ?? 'text-slate-600'}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-[hsl(222,47%,11%)]">{s.value}</p>
              </div>
            ))}
          </div>

          {/* ROW 2 - Pipeline Health + Candidate Quality */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pipeline Health */}
            <div className="space-y-4">
              <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6">
                <h2 className="font-semibold text-[hsl(222,47%,11%)] flex items-center gap-2 text-base mb-4">
                  <FiTarget className="w-5 h-5" /> Pipeline Health
                </h2>
                {stageRates.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-xs font-medium text-[hsl(215,16%,47%)] uppercase tracking-wider pb-2 border-b border-[hsl(214,32%,91%)]">
                      <span>Stage</span>
                      <span>Conversion</span>
                      <span>Avg Days</span>
                      <span>Candidates</span>
                    </div>
                    {stageRates.map((sr, i) => {
                      const pct = parseConversionRate(sr?.conversion_rate ?? '0')
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="grid grid-cols-4 gap-2 text-sm items-center">
                            <span className="font-medium text-[hsl(222,47%,11%)] capitalize">{sr?.stage ?? 'N/A'}</span>
                            <span className="text-[hsl(215,16%,47%)]">{sr?.conversion_rate ?? 'N/A'}</span>
                            <span className="text-[hsl(215,16%,47%)]">{sr?.avg_days_in_stage ?? 'N/A'}d</span>
                            <span className="text-[hsl(215,16%,47%)]">{sr?.candidates_count ?? 0}</span>
                          </div>
                          <div className="h-1.5 bg-[hsl(210,40%,94%)] rounded-full overflow-hidden">
                            <div className="h-full bg-[hsl(222,47%,11%)] rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-[hsl(215,16%,47%)]">No stage conversion data available</p>
                )}
              </div>

              {/* Bottlenecks */}
              {bottlenecks.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-[0.875rem] p-5">
                  <h3 className="font-semibold text-amber-700 mb-3 flex items-center gap-1.5">
                    <FiAlertTriangle className="w-4 h-4" /> Bottlenecks Identified
                  </h3>
                  <ul className="space-y-2">
                    {bottlenecks.map((b, i) => (
                      <li key={i} className="text-sm text-amber-700 flex gap-2 items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Candidate Quality */}
            <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6">
              <h2 className="font-semibold text-[hsl(222,47%,11%)] flex items-center gap-2 text-base mb-5">
                <FiStar className="w-5 h-5" /> Candidate Quality
              </h2>
              <div className="space-y-6">
                {/* Avg Score - Large Display */}
                <div className="text-center py-4">
                  <p className="text-xs font-medium text-[hsl(215,16%,47%)] uppercase tracking-wider mb-2">Average Score</p>
                  <p className="text-5xl font-bold text-[hsl(222,47%,11%)]">{cq?.avg_score ?? '--'}</p>
                  <p className="text-sm text-[hsl(215,16%,47%)] mt-1">out of 100</p>
                </div>

                <div className="border-t border-[hsl(214,32%,91%)] pt-4 space-y-4">
                  {/* Score Distribution */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(215,16%,47%)]">Score Distribution</span>
                    <span className="text-sm font-medium text-[hsl(222,47%,11%)]">{cq?.score_distribution ?? 'N/A'}</span>
                  </div>

                  {/* Top Performers */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(215,16%,47%)]">Top Performers</span>
                    <span className="text-sm font-medium text-[hsl(222,47%,11%)]">{cq?.top_performers_pct ?? 'N/A'}</span>
                  </div>

                  {/* Quality Trend */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(215,16%,47%)]">Quality Trend</span>
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {(cq?.quality_trend ?? '').toLowerCase().includes('up') || (cq?.quality_trend ?? '').toLowerCase().includes('improv') ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <FiTrendingUp className="w-4 h-4" /> {cq?.quality_trend ?? 'N/A'}
                        </span>
                      ) : (cq?.quality_trend ?? '').toLowerCase().includes('down') || (cq?.quality_trend ?? '').toLowerCase().includes('declin') ? (
                        <span className="flex items-center gap-1 text-red-600">
                          <FiTrendingUp className="w-4 h-4 rotate-180" /> {cq?.quality_trend ?? 'N/A'}
                        </span>
                      ) : (
                        <span className="text-[hsl(222,47%,11%)]">{cq?.quality_trend ?? 'N/A'}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 3 - Source Effectiveness Table */}
          {sourceData.length > 0 && (
            <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6">
              <h2 className="font-semibold text-[hsl(222,47%,11%)] flex items-center gap-2 text-base mb-4">
                <FiUsers className="w-5 h-5" /> Source Effectiveness
              </h2>
              <ScrollArea className="max-h-[400px]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(214,32%,91%)]">
                        <th className="text-left py-3 px-3 text-xs font-medium text-[hsl(215,16%,47%)] uppercase tracking-wider">Source</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-[hsl(215,16%,47%)] uppercase tracking-wider">Candidates</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-[hsl(215,16%,47%)] uppercase tracking-wider">Avg Score</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-[hsl(215,16%,47%)] uppercase tracking-wider">Conversion Rate</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-[hsl(215,16%,47%)] uppercase tracking-wider">Cost Effectiveness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceData.map((src, i) => (
                        <tr key={i} className={`border-b border-[hsl(214,32%,91%)] last:border-b-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[hsl(210,40%,98%)]'}`}>
                          <td className="py-3 px-3 font-medium text-[hsl(222,47%,11%)]">{src?.source ?? 'N/A'}</td>
                          <td className="py-3 px-3 text-[hsl(215,16%,47%)]">{src?.candidates ?? 0}</td>
                          <td className="py-3 px-3 text-[hsl(215,16%,47%)]">{src?.avg_score ?? 'N/A'}</td>
                          <td className="py-3 px-3 text-[hsl(215,16%,47%)]">{src?.conversion_rate ?? 'N/A'}</td>
                          <td className="py-3 px-3">
                            <Badge variant="secondary" className={`text-xs font-medium border ${(src?.cost_effectiveness ?? '').toLowerCase().includes('high') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (src?.cost_effectiveness ?? '').toLowerCase().includes('low') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {src?.cost_effectiveness ?? 'N/A'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* ROW 4 - Key Insights + Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Insights */}
            {keyInsights.length > 0 && (
              <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6">
                <h2 className="font-semibold text-[hsl(222,47%,11%)] flex items-center gap-2 text-base mb-4">
                  <FiZap className="w-5 h-5" /> Key Insights
                </h2>
                <div className="space-y-3">
                  {keyInsights.map((insight, i) => (
                    <div key={i} className="flex gap-3 items-start p-3 bg-[hsl(210,40%,98%)] rounded-lg border border-[hsl(214,32%,91%)]">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FiTrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      <p className="text-sm text-[hsl(222,47%,11%)] leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6">
                <h2 className="font-semibold text-[hsl(222,47%,11%)] flex items-center gap-2 text-base mb-4">
                  <FiTarget className="w-5 h-5" /> Recommendations
                </h2>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-4">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="p-4 bg-[hsl(210,40%,98%)] rounded-lg border border-[hsl(214,32%,91%)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className={`text-[10px] font-semibold uppercase border ${getPriorityColor(rec?.priority ?? '')}`}>
                            {rec?.priority ?? 'N/A'}
                          </Badge>
                          <span className="text-xs font-medium text-[hsl(215,16%,47%)] bg-white px-2 py-0.5 rounded border border-[hsl(214,32%,91%)]">{rec?.area ?? 'General'}</span>
                        </div>
                        <p className="text-sm text-[hsl(222,47%,11%)] mb-2 leading-relaxed">{rec?.recommendation ?? ''}</p>
                        {rec?.expected_impact && (
                          <div className="flex items-center gap-1.5 text-xs text-[hsl(215,16%,47%)]">
                            <FiZap className="w-3 h-3 text-amber-500" />
                            <span className="font-medium">Expected Impact:</span> {rec.expected_impact}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* BOTTOM - Summary */}
          {analyticsData?.summary && (
            <div className="bg-[hsl(222,47%,11%)] text-white rounded-[0.875rem] p-6 shadow-lg">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <FiBarChart2 className="w-5 h-5" /> Overall Summary
              </h2>
              <p className="text-sm text-white/80 leading-relaxed">{analyticsData.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

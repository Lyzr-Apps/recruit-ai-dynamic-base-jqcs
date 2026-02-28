'use client'

import React, { useState } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FiArrowLeft, FiFileText, FiClock, FiCheckCircle, FiAlertCircle, FiSend, FiClipboard, FiBriefcase } from 'react-icons/fi'

const AGENT_ID = '69a3753fc46cc1fb2b570443'

interface JDGeneratorSectionProps {
  onBack: () => void
  onCreateRequisition?: (data: { title: string; department: string; description: string; requirements: string[] }) => void
  setActiveAgentId: (id: string | null) => void
}

interface JDResponse {
  job_title?: string
  department?: string
  role_summary?: string
  key_responsibilities?: string[]
  required_qualifications?: string[]
  preferred_qualifications?: string[]
  benefits_and_perks?: string[]
  salary_range_guidance?: string
  work_arrangement?: string
  equal_opportunity_statement?: string
  seo_keywords?: string[]
  tone_analysis?: string
  inclusivity_score?: number
  full_description_text?: string
}

interface FormData {
  jobTitle: string
  department: string
  responsibilities: string
  skills: string
  location: string
  workArrangement: string
  salaryMin: string
  salaryMax: string
  culture: string
}

function parseAgentResponse(result: AIAgentResponse) {
  if (!result.success) return null
  const r = result?.response?.result
  if (!r) return null
  if (typeof r === 'string') { try { return JSON.parse(r) } catch { return null } }
  return r
}

function inclusivityColor(score: number): string {
  if (score >= 80) return 'text-emerald-700'
  if (score >= 60) return 'text-amber-700'
  return 'text-red-700'
}

function inclusivityBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function JDGeneratorSection({
  onBack,
  onCreateRequisition,
  setActiveAgentId
}: JDGeneratorSectionProps) {
  const [formData, setFormData] = useState<FormData>({
    jobTitle: '',
    department: '',
    responsibilities: '',
    skills: '',
    location: '',
    workArrangement: '',
    salaryMin: '',
    salaryMax: '',
    culture: ''
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<JDResponse | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const canSubmit = formData.jobTitle.trim() && formData.department.trim() && !loading

  const handleGenerate = async () => {
    if (!canSubmit) return
    setLoading(true)
    setResult(null)
    setStatusMessage(null)
    setActiveAgentId(AGENT_ID)

    const parts: string[] = [
      `Generate a comprehensive job description for the role of "${formData.jobTitle}" in the "${formData.department}" department.`
    ]
    if (formData.responsibilities.trim()) {
      parts.push(`Key responsibilities include: ${formData.responsibilities.trim()}`)
    }
    if (formData.skills.trim()) {
      parts.push(`Required skills: ${formData.skills.trim()}`)
    }
    if (formData.location.trim()) {
      parts.push(`Location: ${formData.location.trim()}`)
    }
    if (formData.workArrangement) {
      parts.push(`Work arrangement: ${formData.workArrangement}`)
    }
    if (formData.salaryMin.trim() || formData.salaryMax.trim()) {
      const min = formData.salaryMin.trim() || 'not specified'
      const max = formData.salaryMax.trim() || 'not specified'
      parts.push(`Salary range: ${min} - ${max}`)
    }
    if (formData.culture.trim()) {
      parts.push(`Company culture: ${formData.culture.trim()}`)
    }

    try {
      const response = await callAIAgent(parts.join(' '), AGENT_ID)
      const parsed = parseAgentResponse(response)
      if (parsed) {
        setResult(parsed)
        setStatusMessage({ type: 'success', text: 'Job description generated successfully' })
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to parse the generated job description. Please try again.' })
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'An error occurred while generating the job description.' })
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }

  const handleUseAsRequisition = () => {
    if (!result || !onCreateRequisition) return
    onCreateRequisition({
      title: result.job_title ?? formData.jobTitle,
      department: result.department ?? formData.department,
      description: result.full_description_text ?? result.role_summary ?? '',
      requirements: Array.isArray(result.required_qualifications) ? result.required_qualifications : []
    })
  }

  const responsibilities = Array.isArray(result?.key_responsibilities) ? result.key_responsibilities : []
  const requiredQuals = Array.isArray(result?.required_qualifications) ? result.required_qualifications : []
  const preferredQuals = Array.isArray(result?.preferred_qualifications) ? result.preferred_qualifications : []
  const benefits = Array.isArray(result?.benefits_and_perks) ? result.benefits_and_perks : []
  const seoKeywords = Array.isArray(result?.seo_keywords) ? result.seo_keywords : []
  const inclusivityScore = typeof result?.inclusivity_score === 'number' ? result.inclusivity_score : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-[hsl(210,40%,93%)] transition-colors text-[hsl(215,16%,47%)]"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-[hsl(222,47%,11%)]">AI Job Description Generator</h2>
          <p className="text-sm text-[hsl(215,16%,47%)]">Create comprehensive, inclusive job descriptions powered by AI</p>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {statusMessage.type === 'success' && <FiCheckCircle className="w-4 h-4 flex-shrink-0" />}
          {statusMessage.type === 'error' && <FiAlertCircle className="w-4 h-4 flex-shrink-0" />}
          {statusMessage.text}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Form */}
        <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <FiFileText className="w-4 h-4 text-[hsl(215,16%,47%)]" />
            <h3 className="text-sm font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wide">Job Details</h3>
          </div>

          {/* Job Title */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[hsl(222,47%,11%)]">Job Title <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Senior Software Engineer"
              value={formData.jobTitle}
              onChange={(e) => updateField('jobTitle', e.target.value)}
              className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent"
            />
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[hsl(222,47%,11%)]">Department <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Engineering"
              value={formData.department}
              onChange={(e) => updateField('department', e.target.value)}
              className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent"
            />
          </div>

          {/* Key Responsibilities */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[hsl(222,47%,11%)]">Key Responsibilities</Label>
            <Textarea
              placeholder="Enter one responsibility per line, e.g.&#10;Design and implement scalable APIs&#10;Mentor junior developers&#10;Lead code reviews"
              value={formData.responsibilities}
              onChange={(e) => updateField('responsibilities', e.target.value)}
              rows={4}
              className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent resize-none"
            />
          </div>

          {/* Required Skills */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[hsl(222,47%,11%)]">Required Skills</Label>
            <Textarea
              placeholder="Enter one skill per line, e.g.&#10;TypeScript / JavaScript&#10;React or Next.js&#10;PostgreSQL"
              value={formData.skills}
              onChange={(e) => updateField('skills', e.target.value)}
              rows={3}
              className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent resize-none"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[hsl(222,47%,11%)]">Location</Label>
            <Input
              placeholder="e.g. San Francisco, CA"
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent"
            />
          </div>

          {/* Work Arrangement */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[hsl(222,47%,11%)]">Work Arrangement</Label>
            <Select value={formData.workArrangement} onValueChange={(val) => updateField('workArrangement', val)}>
              <SelectTrigger className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent">
                <SelectValue placeholder="Select work arrangement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Remote">Remote</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
                <SelectItem value="On-site">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Salary Range */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[hsl(222,47%,11%)]">Salary Range</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Min (e.g. 120000)"
                value={formData.salaryMin}
                onChange={(e) => updateField('salaryMin', e.target.value)}
                type="number"
                className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent"
              />
              <Input
                placeholder="Max (e.g. 180000)"
                value={formData.salaryMax}
                onChange={(e) => updateField('salaryMax', e.target.value)}
                type="number"
                className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent"
              />
            </div>
          </div>

          {/* Company Culture */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-[hsl(222,47%,11%)]">Company Culture</Label>
            <Textarea
              placeholder="Brief description of your company culture and values..."
              value={formData.culture}
              onChange={(e) => updateField('culture', e.target.value)}
              rows={3}
              className="rounded-lg border-[hsl(214,32%,91%)] bg-white focus:ring-2 focus:ring-[hsl(222,47%,11%)] focus:border-transparent resize-none"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!canSubmit}
            className="w-full bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,16%)] text-white rounded-lg px-5 py-2.5 font-medium shadow-sm text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <FiClock className="animate-spin w-4 h-4" />
                Generating Job Description...
              </>
            ) : (
              <>
                <FiSend className="w-4 h-4" />
                Generate Job Description
              </>
            )}
          </button>
        </div>

        {/* RIGHT COLUMN: Results */}
        <div className="space-y-4">
          {loading && (
            <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 text-[hsl(215,16%,47%)] text-sm">
                <FiClock className="animate-spin w-4 h-4" />
                <span>AI is generating your job description...</span>
              </div>
              <div className="space-y-3">
                <div className="h-5 bg-[hsl(210,40%,93%)] rounded animate-pulse w-3/4" />
                <div className="h-4 bg-[hsl(210,40%,93%)] rounded animate-pulse w-full" />
                <div className="h-4 bg-[hsl(210,40%,93%)] rounded animate-pulse w-5/6" />
                <div className="h-4 bg-[hsl(210,40%,93%)] rounded animate-pulse w-full" />
                <div className="h-20 bg-[hsl(210,40%,93%)] rounded animate-pulse w-full" />
                <div className="h-4 bg-[hsl(210,40%,93%)] rounded animate-pulse w-2/3" />
                <div className="h-4 bg-[hsl(210,40%,93%)] rounded animate-pulse w-4/5" />
                <div className="h-4 bg-[hsl(210,40%,93%)] rounded animate-pulse w-full" />
                <div className="h-10 bg-[hsl(210,40%,93%)] rounded animate-pulse w-full" />
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-full bg-[hsl(210,40%,93%)] flex items-center justify-center mb-4">
                <FiBriefcase className="w-7 h-7 text-[hsl(215,16%,47%)]" />
              </div>
              <h3 className="text-base font-semibold text-[hsl(222,47%,11%)] mb-1">No Job Description Yet</h3>
              <p className="text-sm text-[hsl(215,16%,47%)] max-w-xs">
                Fill out the form and click &quot;Generate&quot; to create an AI-powered, inclusive job description.
              </p>
            </div>
          )}

          {!loading && result && (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4 pr-3">
                {/* Job Title & Department Header */}
                <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                  <h3 className="text-lg font-semibold text-[hsl(222,47%,11%)]">{result.job_title ?? formData.jobTitle}</h3>
                  <p className="text-sm text-[hsl(215,16%,47%)] mt-0.5">{result.department ?? formData.department}</p>
                  {result.work_arrangement && (
                    <Badge className="mt-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50 font-normal text-xs">
                      {result.work_arrangement}
                    </Badge>
                  )}
                </div>

                {/* Role Summary */}
                {result.role_summary && (
                  <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                    <h4 className="text-sm font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wide mb-2">Role Summary</h4>
                    <p className="text-sm text-[hsl(215,16%,47%)] leading-relaxed">{result.role_summary}</p>
                  </div>
                )}

                {/* Key Responsibilities */}
                {responsibilities.length > 0 && (
                  <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                    <h4 className="text-sm font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wide mb-3">Key Responsibilities</h4>
                    <ul className="space-y-2">
                      {responsibilities.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[hsl(215,16%,47%)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(222,47%,11%)] mt-1.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Required Qualifications */}
                {requiredQuals.length > 0 && (
                  <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                    <h4 className="text-sm font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wide mb-3">Required Qualifications</h4>
                    <ul className="space-y-2">
                      {requiredQuals.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[hsl(215,16%,47%)]">
                          <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Preferred Qualifications */}
                {preferredQuals.length > 0 && (
                  <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                    <h4 className="text-sm font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wide mb-3">Preferred Qualifications</h4>
                    <ul className="space-y-2">
                      {preferredQuals.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[hsl(215,16%,47%)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(215,16%,47%)] mt-1.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Benefits & Perks */}
                {benefits.length > 0 && (
                  <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                    <h4 className="text-sm font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wide mb-3">Benefits & Perks</h4>
                    <div className="flex flex-wrap gap-2">
                      {benefits.map((item, i) => (
                        <Badge key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 font-normal text-xs py-1 px-2.5">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Salary Range Guidance */}
                {result.salary_range_guidance && (
                  <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                    <h4 className="text-sm font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wide mb-2">Salary Range Guidance</h4>
                    <p className="text-sm text-[hsl(215,16%,47%)]">{result.salary_range_guidance}</p>
                  </div>
                )}

                {/* Inclusivity Score & Tone Analysis */}
                <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wide">Inclusivity Score</h4>
                      <span className={`text-sm font-semibold ${inclusivityColor(inclusivityScore)}`}>{inclusivityScore}/100</span>
                    </div>
                    <div className="w-full h-2.5 bg-[hsl(210,40%,93%)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${inclusivityBg(inclusivityScore)}`}
                        style={{ width: `${Math.min(inclusivityScore, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-[hsl(215,16%,47%)] mt-1.5">
                      {inclusivityScore >= 80 ? 'Excellent - Highly inclusive language' :
                       inclusivityScore >= 60 ? 'Good - Mostly inclusive with room for improvement' :
                       'Needs improvement - Consider revising for inclusivity'}
                    </p>
                  </div>

                  {result.tone_analysis && (
                    <div className="pt-3 border-t border-[hsl(214,32%,91%)]">
                      <h4 className="text-sm font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wide mb-1.5">Tone Analysis</h4>
                      <p className="text-sm text-[hsl(215,16%,47%)] leading-relaxed">{result.tone_analysis}</p>
                    </div>
                  )}
                </div>

                {/* SEO Keywords */}
                {seoKeywords.length > 0 && (
                  <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                    <h4 className="text-sm font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wide mb-3">SEO Keywords</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {seoKeywords.map((keyword, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal text-[hsl(215,16%,47%)] border-[hsl(214,32%,91%)] bg-[hsl(210,40%,97%)] py-0.5 px-2">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full Description Preview */}
                {result.full_description_text && (
                  <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                    <h4 className="text-sm font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wide mb-3">Full Description Preview</h4>
                    <div className="bg-[hsl(210,40%,97%)] rounded-lg p-4 max-h-64 overflow-y-auto">
                      <div className="text-sm text-[hsl(222,47%,11%)] leading-relaxed whitespace-pre-wrap">
                        {result.full_description_text}
                      </div>
                    </div>
                  </div>
                )}

                {/* Equal Opportunity Statement */}
                {result.equal_opportunity_statement && (
                  <div className="bg-white border border-[hsl(214,32%,91%)] rounded-[0.875rem] shadow-sm p-5">
                    <h4 className="text-sm font-semibold text-[hsl(222,47%,11%)] uppercase tracking-wide mb-2">Equal Opportunity Statement</h4>
                    <p className="text-sm text-[hsl(215,16%,47%)] leading-relaxed italic">{result.equal_opportunity_statement}</p>
                  </div>
                )}

                {/* Action Button */}
                {onCreateRequisition && (
                  <div className="pb-4">
                    <button
                      onClick={handleUseAsRequisition}
                      className="w-full border border-[hsl(214,32%,91%)] bg-white hover:bg-[hsl(210,40%,96%)] text-[hsl(222,47%,11%)] rounded-lg px-5 py-2.5 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <FiClipboard className="w-4 h-4" />
                      Use as Requisition
                    </button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  )
}

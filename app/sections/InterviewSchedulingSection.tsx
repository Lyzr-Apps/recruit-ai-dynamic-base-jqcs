'use client'

import React, { useState } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FiCalendar, FiClock, FiCheck, FiAlertTriangle, FiMail, FiArrowLeft, FiSend } from 'react-icons/fi'

const AGENT_ID = '69a36b92baa6e1c48dc21f9e'

interface ScheduleResult {
  scheduling_status?: string
  scheduled_interviews?: Array<{
    candidate_name?: string
    interviewer_name?: string
    date_time?: string
    duration?: string
    meeting_link?: string
    status?: string
  }>
  emails_sent?: string[]
  conflicts?: string[]
  summary?: string
}

interface InterviewSchedulingSectionProps {
  candidateName?: string
  candidateEmail?: string
  requisitionTitle?: string
  onBack: () => void
  onScheduled?: (data: ScheduleResult) => void
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

export default function InterviewSchedulingSection({
  candidateName, candidateEmail, requisitionTitle, onBack, onScheduled, setActiveAgentId
}: InterviewSchedulingSectionProps) {
  const [form, setForm] = useState({
    candidateName: candidateName ?? '',
    candidateEmail: candidateEmail ?? '',
    interviewerName: '',
    interviewerEmail: '',
    preferredDateStart: '',
    preferredDateEnd: '',
    timePreference: 'all-day',
    duration: '60',
  })
  const [loading, setLoading] = useState(false)
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const handleSchedule = async () => {
    if (!form.candidateName || !form.candidateEmail || !form.interviewerName || !form.interviewerEmail) {
      setStatusMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }
    setLoading(true)
    setStatusMessage({ type: 'info', text: 'Scheduling interview and sending calendar invites...' })
    setActiveAgentId(AGENT_ID)

    const message = `Schedule an interview for candidate ${form.candidateName} (${form.candidateEmail}) with interviewer ${form.interviewerName} (${form.interviewerEmail}). Role: ${requisitionTitle ?? 'N/A'}. Preferred dates: ${form.preferredDateStart || 'flexible'} to ${form.preferredDateEnd || 'flexible'}. Time preference: ${form.timePreference}. Duration: ${form.duration} minutes.`

    const result = await callAIAgent(message, AGENT_ID)
    setActiveAgentId(null)
    setLoading(false)

    const parsed = parseAgentResponse(result)
    if (parsed) {
      setScheduleResult(parsed)
      setStatusMessage({ type: 'success', text: parsed?.scheduling_status ?? 'Interview scheduled successfully' })
      if (onScheduled) onScheduled(parsed)
    } else {
      setStatusMessage({ type: 'error', text: result?.error ?? 'Failed to schedule interview. Please try again.' })
    }
  }

  const interviews = Array.isArray(scheduleResult?.scheduled_interviews) ? scheduleResult.scheduled_interviews : []
  const emails = Array.isArray(scheduleResult?.emails_sent) ? scheduleResult.emails_sent : []
  const conflicts = Array.isArray(scheduleResult?.conflicts) ? scheduleResult.conflicts : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="rounded-[0.875rem]">
          <FiArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(222,47%,11%)]">Schedule Interview</h1>
          <p className="text-sm text-[hsl(215,16%,47%)]">{requisitionTitle ? `For ${requisitionTitle}` : 'Set up candidate interviews'}</p>
        </div>
      </div>

      {statusMessage && (
        <div className={`flex items-center gap-2 p-3 rounded-[0.875rem] text-sm ${statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {statusMessage.type === 'success' ? <FiCheck /> : statusMessage.type === 'error' ? <FiAlertTriangle /> : <FiClock className="animate-spin" />}
          {statusMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-6 space-y-4">
          <h2 className="font-semibold text-[hsl(222,47%,11%)] flex items-center gap-2"><FiCalendar /> Scheduling Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[hsl(222,47%,11%)]">Candidate Name *</Label>
              <Input value={form.candidateName} onChange={e => setForm(prev => ({ ...prev, candidateName: e.target.value }))} placeholder="Jane Doe" className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
            </div>
            <div>
              <Label className="text-[hsl(222,47%,11%)]">Candidate Email *</Label>
              <Input type="email" value={form.candidateEmail} onChange={e => setForm(prev => ({ ...prev, candidateEmail: e.target.value }))} placeholder="jane@example.com" className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[hsl(222,47%,11%)]">Interviewer Name *</Label>
              <Input value={form.interviewerName} onChange={e => setForm(prev => ({ ...prev, interviewerName: e.target.value }))} placeholder="John Smith" className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
            </div>
            <div>
              <Label className="text-[hsl(222,47%,11%)]">Interviewer Email *</Label>
              <Input type="email" value={form.interviewerEmail} onChange={e => setForm(prev => ({ ...prev, interviewerEmail: e.target.value }))} placeholder="john@company.com" className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
            </div>
          </div>
          <Separator className="bg-[hsl(214,32%,91%)]" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[hsl(222,47%,11%)]">Preferred Start Date</Label>
              <Input type="date" value={form.preferredDateStart} onChange={e => setForm(prev => ({ ...prev, preferredDateStart: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
            </div>
            <div>
              <Label className="text-[hsl(222,47%,11%)]">Preferred End Date</Label>
              <Input type="date" value={form.preferredDateEnd} onChange={e => setForm(prev => ({ ...prev, preferredDateEnd: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[hsl(222,47%,11%)]">Time Preference</Label>
              <Select value={form.timePreference} onValueChange={v => setForm(prev => ({ ...prev, timePreference: v }))}>
                <SelectTrigger className="rounded-[0.875rem] border-[hsl(214,32%,91%)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (9am-12pm)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (1pm-5pm)</SelectItem>
                  <SelectItem value="all-day">All Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[hsl(222,47%,11%)]">Duration</Label>
              <Select value={form.duration} onValueChange={v => setForm(prev => ({ ...prev, duration: v }))}>
                <SelectTrigger className="rounded-[0.875rem] border-[hsl(214,32%,91%)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSchedule} disabled={loading} className="w-full bg-[hsl(222,47%,11%)] text-[hsl(210,40%,98%)] rounded-[0.875rem] gap-2">
            {loading ? <><FiClock className="animate-spin" /> Scheduling...</> : <><FiSend /> Schedule Interview</>}
          </Button>
        </div>

        <div className="space-y-4">
          {loading && !scheduleResult && (
            <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-6">
              <div className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)] mb-4">
                <FiClock className="animate-spin" /> Coordinating calendars and sending invites...
              </div>
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-[hsl(210,40%,94%)] rounded w-3/4"></div>
                <div className="h-4 bg-[hsl(210,40%,94%)] rounded w-1/2"></div>
                <div className="h-4 bg-[hsl(210,40%,94%)] rounded w-2/3"></div>
              </div>
            </div>
          )}

          {interviews.length > 0 && (
            <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-6">
              <h3 className="font-semibold text-[hsl(222,47%,11%)] mb-4">Scheduled Interviews</h3>
              <div className="space-y-3">
                {interviews.map((iv, i) => (
                  <div key={i} className="p-4 bg-[hsl(210,40%,96%)] rounded-[0.875rem] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[hsl(222,47%,11%)]">{iv?.candidate_name ?? 'Candidate'}</span>
                      <Badge className={iv?.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>{iv?.status ?? 'pending'}</Badge>
                    </div>
                    <div className="text-sm text-[hsl(215,16%,47%)] space-y-1">
                      <p>Interviewer: {iv?.interviewer_name ?? 'N/A'}</p>
                      <p>Date/Time: {iv?.date_time ?? 'TBD'}</p>
                      <p>Duration: {iv?.duration ?? 'N/A'}</p>
                      {iv?.meeting_link && <a href={iv.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">Meeting Link</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {emails.length > 0 && (
            <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-6">
              <h3 className="font-semibold text-[hsl(222,47%,11%)] mb-3 flex items-center gap-2"><FiMail /> Emails Sent</h3>
              <div className="space-y-2">
                {emails.map((email, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-[hsl(215,16%,47%)]">
                    <FiCheck className="text-green-600 w-4 h-4 flex-shrink-0" />
                    <span>{email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-[0.875rem] p-6">
              <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2"><FiAlertTriangle /> Conflicts Detected</h3>
              <div className="space-y-2">
                {conflicts.map((c, i) => (
                  <p key={i} className="text-sm text-red-600">{c}</p>
                ))}
              </div>
            </div>
          )}

          {scheduleResult?.summary && (
            <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-6">
              <h3 className="font-semibold text-[hsl(222,47%,11%)] mb-2">Summary</h3>
              <p className="text-sm text-[hsl(215,16%,47%)]">{scheduleResult.summary}</p>
            </div>
          )}

          {!loading && !scheduleResult && (
            <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-8 text-center">
              <FiCalendar className="w-10 h-10 mx-auto text-[hsl(215,16%,47%)] mb-3" />
              <p className="text-[hsl(215,16%,47%)]">Fill in the scheduling details and click Schedule Interview</p>
              <p className="text-xs text-[hsl(215,16%,47%)] mt-1">The AI will coordinate calendars and send email invitations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

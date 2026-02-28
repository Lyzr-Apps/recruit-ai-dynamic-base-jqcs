'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FiBriefcase, FiUsers, FiBarChart2, FiFileText, FiCheckCircle, FiTrendingUp } from 'react-icons/fi'

import DashboardSection from './sections/DashboardSection'
import RequisitionDetailSection from './sections/RequisitionDetailSection'
import CandidateProfileSection from './sections/CandidateProfileSection'
import InterviewSchedulingSection from './sections/InterviewSchedulingSection'
import OfferManagementSection from './sections/OfferManagementSection'
import JDGeneratorSection from './sections/JDGeneratorSection'
import ReferenceCheckSection from './sections/ReferenceCheckSection'
import HiringAnalyticsSection from './sections/HiringAnalyticsSection'

import type { Requisition, Candidate } from './sections/DashboardSection'

const AGENTS = [
  { id: '69a36bb2782856e667061c38', name: 'Sourcing & Matching', purpose: 'Finds and ranks candidates' },
  { id: '69a36b742d64d730c5089dc8', name: 'Candidate Evaluation', purpose: 'Screening assessments' },
  { id: '69a36b92baa6e1c48dc21f9e', name: 'Interview Scheduler', purpose: 'Calendar & email coordination' },
  { id: '69a36bb2baa6e1c48dc21fa0', name: 'Interview Analysis', purpose: 'Performance evaluation' },
  { id: '69a36b75ce2839b4041a40da', name: 'Compensation Negotiation', purpose: 'Salary analysis & strategy' },
  { id: '69a36b922d64d730c5089dca', name: 'Offer Letter', purpose: 'Drafts & sends offers' },
  { id: '69a3753fc46cc1fb2b570443', name: 'JD Generator', purpose: 'Creates job descriptions' },
  { id: '69a3753f8811f110756792da', name: 'Reference Check', purpose: 'Verifies candidates' },
  { id: '69a3753f2d64d730c5089ddb', name: 'Hiring Analytics', purpose: 'Pipeline insights' },
]

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(210,40%,97%)] text-[hsl(222,47%,11%)]">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-[hsl(215,16%,47%)] mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-5 py-2.5 bg-[hsl(222,47%,11%)] text-white rounded-lg text-sm font-medium shadow-sm hover:bg-[hsl(222,47%,16%)] transition-colors">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function makeSampleRequisitions(): Requisition[] {
  return [
    {
      id: 'sample-1',
      title: 'Senior Frontend Engineer',
      department: 'Engineering',
      description: 'We are looking for a Senior Frontend Engineer to lead the development of our next-generation web platform. The ideal candidate will have deep expertise in React, TypeScript, and modern web technologies.',
      requirements: ['5+ years frontend experience', 'React & TypeScript proficiency', 'Experience with design systems', 'Strong communication skills'],
      salaryMin: 130000, salaryMax: 170000,
      location: 'Remote (US)', type: 'Full-time', team: 'Platform',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      status: 'open', stage: 'source', candidates: [],
    },
    {
      id: 'sample-2',
      title: 'Product Designer',
      department: 'Design',
      description: 'Join our design team to shape the user experience of our SaaS platform. You will work closely with engineering and product to deliver intuitive, beautiful interfaces.',
      requirements: ['3+ years product design experience', 'Figma expertise', 'User research skills', 'Portfolio required'],
      salaryMin: 100000, salaryMax: 140000,
      location: 'New York, NY', type: 'Full-time', team: 'UX',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      status: 'open', stage: 'source', candidates: [],
    },
  ]
}

type ViewType = 'dashboard' | 'requisition' | 'candidate' | 'interview' | 'offer' | 'jd-generator' | 'reference-check' | 'analytics'

export default function Page() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [useSample, setUseSample] = useState(false)

  useEffect(() => {
    if (useSample && requisitions.length === 0) {
      setRequisitions(makeSampleRequisitions())
    }
    if (!useSample && requisitions.every(r => r.id.startsWith('sample-'))) {
      setRequisitions([])
    }
  }, [useSample])

  const selectedReq = requisitions.find(r => r.id === selectedReqId) ?? null
  const selectedCandidate = selectedReq
    ? (Array.isArray(selectedReq.candidates) ? selectedReq.candidates : []).find(c => c.id === selectedCandidateId) ?? null
    : null

  const handleSelectRequisition = useCallback((req: Requisition) => {
    setSelectedReqId(req.id)
    setSelectedCandidateId(null)
    setCurrentView('requisition')
  }, [])

  const handleAddRequisition = useCallback((req: Requisition) => {
    setRequisitions(prev => [...prev, req])
  }, [])

  const handleUpdateRequisition = useCallback((updated: Requisition) => {
    setRequisitions(prev => prev.map(r => r.id === updated.id ? updated : r))
  }, [])

  const handleSelectCandidate = useCallback((candidate: Candidate) => {
    setSelectedCandidateId(candidate.id)
    setCurrentView('candidate')
  }, [])

  const handleUpdateCandidate = useCallback((candidate: Candidate) => {
    if (!selectedReqId) return
    setRequisitions(prev => prev.map(r => {
      if (r.id !== selectedReqId) return r
      const cands = Array.isArray(r.candidates) ? r.candidates : []
      return { ...r, candidates: cands.map(c => c.id === candidate.id ? candidate : c) }
    }))
  }, [selectedReqId])

  const handleScheduleInterview = useCallback((candidate: Candidate) => {
    setSelectedCandidateId(candidate.id)
    setCurrentView('interview')
  }, [])

  const handleStartNegotiation = useCallback((candidate: Candidate) => {
    setSelectedCandidateId(candidate.id)
    setCurrentView('offer')
  }, [])

  const handleReferenceCheck = useCallback((candidate: Candidate) => {
    setSelectedCandidateId(candidate.id)
    setCurrentView('reference-check')
  }, [])

  const goToDashboard = useCallback(() => {
    setCurrentView('dashboard')
    setSelectedReqId(null)
    setSelectedCandidateId(null)
  }, [])

  const goToRequisition = useCallback(() => {
    setCurrentView('requisition')
    setSelectedCandidateId(null)
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex bg-[hsl(210,40%,97%)]">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 bg-white border-r border-[hsl(214,32%,91%)] flex flex-col">
          <div className="p-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[hsl(222,47%,11%)] flex items-center justify-center flex-shrink-0 shadow-sm">
              <FiBriefcase className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[hsl(222,47%,11%)] text-lg tracking-tight">Recruitment AI</span>
          </div>
          <div className="h-px bg-[hsl(214,32%,91%)]" />

          <nav className="flex-1 p-3 space-y-1">
            <button onClick={goToDashboard} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-[hsl(222,47%,11%)] text-white shadow-sm' : 'text-[hsl(215,16%,47%)] hover:bg-[hsl(210,40%,96%)]'}`}>
              <FiBarChart2 className="w-4 h-4 flex-shrink-0" />
              <span>Dashboard</span>
            </button>

            <div className="pt-3 pb-1 px-3">
              <span className="text-[10px] font-semibold text-[hsl(215,16%,47%)] uppercase tracking-widest">Tools</span>
            </div>
            <button onClick={() => { setCurrentView('jd-generator') }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'jd-generator' ? 'bg-[hsl(222,47%,11%)] text-white shadow-sm' : 'text-[hsl(215,16%,47%)] hover:bg-[hsl(210,40%,96%)]'}`}>
              <FiFileText className="w-4 h-4 flex-shrink-0" />
              <span>JD Generator</span>
            </button>
            <button onClick={() => { setCurrentView('reference-check'); setSelectedReqId(null); setSelectedCandidateId(null) }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'reference-check' ? 'bg-[hsl(222,47%,11%)] text-white shadow-sm' : 'text-[hsl(215,16%,47%)] hover:bg-[hsl(210,40%,96%)]'}`}>
              <FiCheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Reference Check</span>
            </button>
            <button onClick={() => { setCurrentView('analytics') }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'analytics' ? 'bg-[hsl(222,47%,11%)] text-white shadow-sm' : 'text-[hsl(215,16%,47%)] hover:bg-[hsl(210,40%,96%)]'}`}>
              <FiTrendingUp className="w-4 h-4 flex-shrink-0" />
              <span>Hiring Analytics</span>
            </button>

            {requisitions.length > 0 && (
              <>
                <div className="pt-4 pb-1 px-3">
                  <span className="text-[10px] font-semibold text-[hsl(215,16%,47%)] uppercase tracking-widest">Open Roles</span>
                </div>
                <ScrollArea className="max-h-[240px]">
                  {requisitions.filter(r => r.status === 'open').map(req => (
                    <button key={req.id} onClick={() => handleSelectRequisition(req)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left mb-0.5 ${selectedReqId === req.id ? 'bg-[hsl(222,47%,11%)] text-white shadow-sm' : 'text-[hsl(215,16%,47%)] hover:bg-[hsl(210,40%,96%)]'}`}>
                      <FiUsers className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{req.title}</span>
                    </button>
                  ))}
                </ScrollArea>
              </>
            )}
          </nav>

          <div className="h-px bg-[hsl(214,32%,91%)]" />

          {/* Agent Status */}
          <div className="p-3">
            <span className="text-[10px] font-semibold text-[hsl(215,16%,47%)] uppercase tracking-widest px-3">AI Agents</span>
            <div className="mt-2 space-y-0.5">
              {AGENTS.map(a => (
                <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeAgentId === a.id ? 'bg-emerald-500 animate-pulse' : 'bg-[hsl(214,32%,91%)]'}`} />
                  <span className={`truncate ${activeAgentId === a.id ? 'text-[hsl(222,47%,11%)] font-medium' : 'text-[hsl(215,16%,47%)]'}`}>{a.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Toggle */}
          <div className="p-4 border-t border-[hsl(214,32%,91%)]">
            <div className="flex items-center justify-between px-1">
              <Label className="text-xs text-[hsl(215,16%,47%)] font-medium">Sample Data</Label>
              <Switch checked={useSample} onCheckedChange={setUseSample} />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-8">
            {currentView === 'dashboard' && (
              <DashboardSection
                requisitions={requisitions}
                onSelectRequisition={handleSelectRequisition}
                onAddRequisition={handleAddRequisition}
                useSample={useSample}
              />
            )}

            {currentView === 'requisition' && selectedReq && (
              <RequisitionDetailSection
                requisition={selectedReq}
                onBack={goToDashboard}
                onUpdateRequisition={handleUpdateRequisition}
                onSelectCandidate={handleSelectCandidate}
                setActiveAgentId={setActiveAgentId}
              />
            )}

            {currentView === 'candidate' && selectedReq && selectedCandidate && (
              <CandidateProfileSection
                candidate={selectedCandidate}
                requisitionTitle={selectedReq.title}
                onBack={goToRequisition}
                onUpdateCandidate={handleUpdateCandidate}
                onScheduleInterview={handleScheduleInterview}
                onStartNegotiation={handleStartNegotiation}
                onReferenceCheck={handleReferenceCheck}
                setActiveAgentId={setActiveAgentId}
              />
            )}

            {currentView === 'interview' && selectedReq && selectedCandidate && (
              <InterviewSchedulingSection
                candidateName={selectedCandidate.name}
                candidateEmail={selectedCandidate.email}
                requisitionTitle={selectedReq.title}
                onBack={goToRequisition}
                onScheduled={() => {
                  handleUpdateCandidate({ ...selectedCandidate, interviewScheduled: true, status: 'interviewing' })
                }}
                setActiveAgentId={setActiveAgentId}
              />
            )}

            {currentView === 'offer' && selectedReq && selectedCandidate && (
              <OfferManagementSection
                candidate={selectedCandidate}
                requisitionTitle={selectedReq.title}
                salaryMin={selectedReq.salaryMin}
                salaryMax={selectedReq.salaryMax}
                onBack={() => {
                  setSelectedCandidateId(selectedCandidate.id)
                  setCurrentView('candidate')
                }}
                onUpdateCandidate={handleUpdateCandidate}
                setActiveAgentId={setActiveAgentId}
              />
            )}

            {currentView === 'jd-generator' && (
              <JDGeneratorSection
                onBack={goToDashboard}
                onCreateRequisition={(data) => {
                  const newReq: Requisition = {
                    id: crypto.randomUUID(),
                    title: data.title,
                    department: data.department,
                    description: data.description,
                    requirements: data.requirements,
                    salaryMin: 0,
                    salaryMax: 0,
                    location: '',
                    type: 'Full-time',
                    team: '',
                    createdAt: new Date().toISOString(),
                    status: 'open',
                    stage: 'source',
                    candidates: [],
                  }
                  setRequisitions(prev => [...prev, newReq])
                  setSelectedReqId(newReq.id)
                  setCurrentView('requisition')
                }}
                setActiveAgentId={setActiveAgentId}
              />
            )}

            {currentView === 'reference-check' && (
              <ReferenceCheckSection
                candidateName={selectedCandidate?.name}
                candidateEmail={selectedCandidate?.email}
                requisitionTitle={selectedReq?.title}
                onBack={() => {
                  if (selectedCandidate && selectedReq) {
                    setCurrentView('candidate')
                  } else {
                    goToDashboard()
                  }
                }}
                onUpdateCandidate={selectedCandidate ? (data: any) => {
                  handleUpdateCandidate({ ...selectedCandidate, ...data })
                } : undefined}
                setActiveAgentId={setActiveAgentId}
              />
            )}

            {currentView === 'analytics' && (
              <HiringAnalyticsSection
                requisitions={requisitions}
                onBack={goToDashboard}
                setActiveAgentId={setActiveAgentId}
              />
            )}

            {currentView !== 'dashboard' && currentView !== 'jd-generator' && currentView !== 'reference-check' && currentView !== 'analytics' && !selectedReq && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-[hsl(210,40%,94%)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiBriefcase className="w-7 h-7 text-[hsl(215,16%,47%)]" />
                </div>
                <p className="text-[hsl(222,47%,11%)] font-medium mb-1">No requisition selected</p>
                <button onClick={goToDashboard} className="mt-2 text-sm text-[hsl(222,47%,11%)] underline hover:no-underline">Go to Dashboard</button>
              </div>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}

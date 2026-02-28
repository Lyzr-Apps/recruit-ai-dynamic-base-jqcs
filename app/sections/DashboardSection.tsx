'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FiBriefcase, FiUsers, FiCalendar, FiFileText, FiPlus, FiChevronRight, FiClock } from 'react-icons/fi'

export interface Requisition {
  id: string
  title: string
  department: string
  description: string
  requirements: string[]
  salaryMin: number
  salaryMax: number
  location: string
  type: string
  team: string
  createdAt: string
  status: 'open' | 'closed' | 'on-hold'
  stage: 'source' | 'screen' | 'interview' | 'analyze' | 'negotiate' | 'offer'
  candidates: Candidate[]
}

export interface Candidate {
  id: string
  name: string
  email: string
  currentTitle: string
  company: string
  yearsExperience: number
  keySkills: string[]
  location: string
  education: string
  overallScore: number
  skillsScore: number
  experienceScore: number
  recommendation: string
  fitAnalysis: string
  sourcePlatform: string
  status: 'sourced' | 'screened' | 'interviewing' | 'analyzed' | 'negotiating' | 'offered' | 'hired'
  screening?: any
  interviewReport?: any
  negotiation?: any
  offerDetails?: any
  interviewScheduled?: boolean
}

interface DashboardSectionProps {
  requisitions: Requisition[]
  onSelectRequisition: (req: Requisition) => void
  onAddRequisition: (req: Requisition) => void
  useSample: boolean
}

const STAGES = ['source', 'screen', 'interview', 'analyze', 'negotiate', 'offer']
const STAGE_LABELS: Record<string, string> = {
  source: 'Source', screen: 'Screen', interview: 'Interview',
  analyze: 'Analyze', negotiate: 'Negotiate', offer: 'Offer'
}

function StageIndicator({ stage }: { stage: string }) {
  const idx = STAGES.indexOf(stage)
  return (
    <div className="flex gap-1 items-center">
      {STAGES.map((s, i) => (
        <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-[hsl(222,47%,11%)]' : 'bg-[hsl(214,32%,91%)]'}`} />
      ))}
    </div>
  )
}

function daysSince(dateStr: string): number {
  const now = new Date()
  const then = new Date(dateStr)
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)))
}

export default function DashboardSection({ requisitions, onSelectRequisition, onAddRequisition, useSample }: DashboardSectionProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState({
    title: '', department: '', description: '', requirements: '',
    salaryMin: '', salaryMax: '', location: '', type: 'Full-time', team: ''
  })

  const openReqs = requisitions.filter(r => r.status === 'open')
  const totalCandidates = requisitions.reduce((sum, r) => sum + (Array.isArray(r.candidates) ? r.candidates.length : 0), 0)
  const interviewing = requisitions.reduce((sum, r) => {
    const cands = Array.isArray(r.candidates) ? r.candidates : []
    return sum + cands.filter(c => c.status === 'interviewing').length
  }, 0)
  const pendingOffers = requisitions.reduce((sum, r) => {
    const cands = Array.isArray(r.candidates) ? r.candidates : []
    return sum + cands.filter(c => c.status === 'offered' || c.status === 'negotiating').length
  }, 0)

  const stats = [
    { label: 'Open Roles', value: openReqs.length, icon: FiBriefcase, color: 'text-[#2B4F5F]' },
    { label: 'Total Candidates', value: totalCandidates, icon: FiUsers, color: 'text-[#3BA395]' },
    { label: 'Interviews This Week', value: interviewing, icon: FiCalendar, color: 'text-[#E8795A]' },
    { label: 'Pending Offers', value: pendingOffers, icon: FiFileText, color: 'text-[#D4A94E]' },
  ]

  const handleCreate = () => {
    const newReq: Requisition = {
      id: crypto.randomUUID(),
      title: form.title,
      department: form.department,
      description: form.description,
      requirements: form.requirements.split('\n').filter(Boolean),
      salaryMin: Number(form.salaryMin) || 0,
      salaryMax: Number(form.salaryMax) || 0,
      location: form.location,
      type: form.type,
      team: form.team,
      createdAt: new Date().toISOString(),
      status: 'open',
      stage: 'source',
      candidates: [],
    }
    onAddRequisition(newReq)
    setForm({ title: '', department: '', description: '', requirements: '', salaryMin: '', salaryMax: '', location: '', type: 'Full-time', team: '' })
    setDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(222,47%,11%)]">Dashboard</h1>
          <p className="text-sm text-[hsl(215,16%,47%)] mt-1">Manage your recruitment pipeline</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[hsl(222,47%,11%)] text-[hsl(210,40%,98%)] rounded-[0.875rem] gap-2">
              <FiPlus /> New Requisition
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-white rounded-[0.875rem]">
            <DialogHeader>
              <DialogTitle className="text-[hsl(222,47%,11%)]">Create New Requisition</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[hsl(222,47%,11%)]">Job Title *</Label>
                  <Input placeholder="Senior Software Engineer" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
                </div>
                <div>
                  <Label className="text-[hsl(222,47%,11%)]">Department *</Label>
                  <Input placeholder="Engineering" value={form.department} onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
                </div>
              </div>
              <div>
                <Label className="text-[hsl(222,47%,11%)]">Description *</Label>
                <Textarea placeholder="Job description..." rows={3} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
              </div>
              <div>
                <Label className="text-[hsl(222,47%,11%)]">Requirements (one per line)</Label>
                <Textarea placeholder="5+ years experience&#10;React/TypeScript&#10;..." rows={3} value={form.requirements} onChange={e => setForm(prev => ({ ...prev, requirements: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-[hsl(222,47%,11%)]">Salary Min</Label>
                  <Input type="number" placeholder="80000" value={form.salaryMin} onChange={e => setForm(prev => ({ ...prev, salaryMin: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
                </div>
                <div>
                  <Label className="text-[hsl(222,47%,11%)]">Salary Max</Label>
                  <Input type="number" placeholder="120000" value={form.salaryMax} onChange={e => setForm(prev => ({ ...prev, salaryMax: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
                </div>
                <div>
                  <Label className="text-[hsl(222,47%,11%)]">Location</Label>
                  <Input placeholder="Remote" value={form.location} onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[hsl(222,47%,11%)]">Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(prev => ({ ...prev, type: v }))}>
                    <SelectTrigger className="rounded-[0.875rem] border-[hsl(214,32%,91%)]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[hsl(222,47%,11%)]">Team</Label>
                  <Input placeholder="Platform" value={form.team} onChange={e => setForm(prev => ({ ...prev, team: e.target.value }))} className="rounded-[0.875rem] border-[hsl(214,32%,91%)]" />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={!form.title || !form.department || !form.description} className="w-full bg-[hsl(222,47%,11%)] text-[hsl(210,40%,98%)] rounded-[0.875rem]">
                Create Requisition
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[hsl(215,16%,47%)]">{s.label}</span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-[hsl(222,47%,11%)]">{s.value}</p>
          </div>
        ))}
      </div>

      <Separator className="bg-[hsl(214,32%,91%)]" />

      <div>
        <h2 className="text-lg font-semibold text-[hsl(222,47%,11%)] mb-4">Open Requisitions</h2>
        {requisitions.length === 0 ? (
          <div className="bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-12 text-center">
            <FiBriefcase className="w-10 h-10 mx-auto text-[hsl(215,16%,47%)] mb-3" />
            <p className="text-[hsl(215,16%,47%)] mb-1">No open requisitions yet</p>
            <p className="text-sm text-[hsl(215,16%,47%)]">Click New Requisition to begin your hiring pipeline</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requisitions.map(req => (
              <button key={req.id} onClick={() => onSelectRequisition(req)} className="text-left bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md p-5 hover:shadow-lg transition-all duration-200 group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-[hsl(222,47%,11%)] group-hover:text-[hsl(222,47%,20%)]">{req.title}</h3>
                    <p className="text-sm text-[hsl(215,16%,47%)]">{req.department} {req.team ? `/ ${req.team}` : ''}</p>
                  </div>
                  <Badge variant={req.status === 'open' ? 'default' : 'secondary'} className={req.status === 'open' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600'}>
                    {req.status}
                  </Badge>
                </div>
                <StageIndicator stage={req.stage} />
                <div className="flex items-center justify-between mt-3 text-xs text-[hsl(215,16%,47%)]">
                  <span className="flex items-center gap-1"><FiClock className="w-3 h-3" /> {daysSince(req.createdAt)}d open</span>
                  <span className="flex items-center gap-1"><FiUsers className="w-3 h-3" /> {Array.isArray(req.candidates) ? req.candidates.length : 0} candidates</span>
                  <span className="capitalize">{STAGE_LABELS[req.stage] ?? req.stage}</span>
                </div>
                <div className="flex justify-end mt-2">
                  <FiChevronRight className="w-4 h-4 text-[hsl(215,16%,47%)] group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

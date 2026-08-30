import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button, Modal, Badge, PageHeader, Field, Input, Select, Textarea, Card, CardHeader } from '../components/ui'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { formatCurrency, formatDate } from '../utils/helpers'
import { PROJECT_STATUSES } from '../utils/constants'
import type { Project } from '../types'

const statusColor: Record<string, string> = {
  'not-started': 'slate',
  'in-progress': 'blue',
  'on-hold': 'amber',
  completed: 'green',
}

export function ProjectsPage() {
  const { projects, can } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)

  const exportColumns = [
    { header: 'ID', accessor: (p: Project) => p.projectID },
    { header: 'Project', accessor: (p: Project) => p.projectName },
    { header: 'Start', accessor: (p: Project) => p.startDate },
    { header: 'Budget', accessor: (p: Project) => p.estimatedBudget },
    { header: 'Actual', accessor: (p: Project) => p.actualExpense },
    { header: 'Remaining', accessor: (p: Project) => p.estimatedBudget - p.actualExpense },
    { header: 'Status', accessor: (p: Project) => p.status },
  ]

  const columns: Column<Project>[] = [
    { header: 'Project', accessor: (p) => <span className="font-medium text-slate-700">{p.projectName}</span>, sortable: true, sortKey: 'projectName' },
    { header: 'Start Date', accessor: (p) => formatDate(p.startDate) },
    { header: 'Budget', accessor: (p) => formatCurrency(p.estimatedBudget), sortable: true, sortKey: 'estimatedBudget' },
    { header: 'Actual', accessor: (p) => formatCurrency(p.actualExpense), sortable: true, sortKey: 'actualExpense' },
    { header: 'Remaining', accessor: (p) => (
      <span className={`font-semibold ${p.estimatedBudget - p.actualExpense < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
        {formatCurrency(p.estimatedBudget - p.actualExpense)}
      </span>
    ), sortable: true },
    { header: 'Progress', accessor: (p) => {
      const pct = p.estimatedBudget > 0 ? Math.min(100, Math.round((p.actualExpense / p.estimatedBudget) * 100)) : 0
      return (
        <div className="w-24">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{pct}% used</p>
        </div>
      )
    } },
    { header: 'Contractor', accessor: (p) => p.contractor || '—' },
    { header: 'Status', accessor: (p) => <Badge color={statusColor[p.status] as never}>{p.status}</Badge> },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Construction Projects"
        subtitle={`${projects.length} projects • Total budget ${formatCurrency(projects.reduce((s, p) => s + p.estimatedBudget, 0))}`}
        action={can('*') && <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Project</Button>}
      />

      {/* Budget overview */}
      <Card>
        <CardHeader title="Overall Construction Budget vs Actual" />
        <div className="p-5 grid grid-cols-3 gap-4">
          <Metric label="Total Budget" value={formatCurrency(projects.reduce((s, p) => s + p.estimatedBudget, 0))} color="text-blue-600" />
          <Metric label="Actual Spent" value={formatCurrency(projects.reduce((s, p) => s + p.actualExpense, 0))} color="text-orange-600" />
          <Metric label="Remaining" value={formatCurrency(projects.reduce((s, p) => s + p.estimatedBudget - p.actualExpense, 0))} color="text-emerald-600" />
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={projects}
        searchable
        searchPlaceholder="Search projects..."
        exportFilename={`projects-${new Date().toISOString().slice(0, 10)}.csv`}
        exportColumns={exportColumns}
        pageSize={10}
        rowKey={(p) => p.projectID}
        actions={(p) => can('*') && (
          <button onClick={() => setEditProject(p)} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-600" title="Edit"><Pencil size={15} /></button>
        )}
      />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Project" wide>
        <ProjectForm onDone={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!editProject} onClose={() => setEditProject(null)} title="Edit Project" wide>
        {editProject && <ProjectForm initial={editProject} onDone={() => setEditProject(null)} />}
      </Modal>
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function ProjectForm({ initial, onDone }: { initial?: Partial<Project>; onDone: () => void }) {
  const { addProject, updateProject, vendors } = useApp()
  const [form, setForm] = useState<Partial<Project>>({ ...{
    projectName: '', description: '', startDate: new Date().toISOString().slice(0, 10), estimatedBudget: 0, actualExpense: 0, status: 'not-started', contractor: '',
  }, ...initial })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: keyof Project, v: never) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.projectName?.trim()) return setError('Project name is required')
    setError('')
    setSaving(true)
    try {
      if (initial?.projectID) {
        await updateProject({ ...(form as Project), projectID: initial.projectID })
      } else {
        await addProject(form as Omit<Project, 'projectID'>)
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Project Name" required><Input value={form.projectName} onChange={(e) => set('projectName', e.target.value as never)} placeholder="e.g. Main Temple Building" required /></Field>
        <Field label="Start Date"><Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value as never)} /></Field>
      </div>
      <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value as never)} placeholder="Short description" /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Estimated Budget (₹)"><Input type="number" min="0" value={form.estimatedBudget || ''} onChange={(e) => set('estimatedBudget', Number(e.target.value) as never)} placeholder="0" /></Field>
        <Field label="Actual Expenses (auto-calculated)"><Input type="number" min="0" value={form.actualExpense || 0} onChange={(e) => set('actualExpense', Number(e.target.value) as never)} /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value as never)}>
            {PROJECT_STATUSES.map((s) => <option key={s} value={s.toLowerCase().replace(/ /g, '-')}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Contractor">
          <Select value={form.contractor} onChange={(e) => set('contractor', e.target.value as never)}>
            <option value="">None</option>
            {vendors.map((v) => <option key={v.vendorID} value={v.companyName}>{v.companyName}</option>)}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : initial?.projectID ? 'Save Changes' : 'Add Project'}</Button>
      </div>
    </form>
  )
}

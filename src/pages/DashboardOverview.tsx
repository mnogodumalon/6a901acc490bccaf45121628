import { useDashboardData } from '@/hooks/useDashboardData';
import type { Testdaten } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TestdatenDialog } from '@/components/dialogs/TestdatenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconClipboardList,
  IconCircleCheck, IconPlayerPlay, IconAlertTriangle, IconCircle,
} from '@tabler/icons-react';

const STATUS_ORDER = ['offen', 'in_bearbeitung', 'abgeschlossen', 'fehlgeschlagen'] as const;
type StatusKey = typeof STATUS_ORDER[number];

const STATUS_CONFIG: Record<StatusKey, {
  label: string;
  color: string;
  headerBg: string;
  badge: string;
  icon: React.ReactNode;
}> = {
  offen: {
    label: 'Offen',
    color: 'text-slate-600',
    headerBg: 'bg-slate-100 border-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <IconCircle size={16} className="text-slate-500 shrink-0" />,
  },
  in_bearbeitung: {
    label: 'In Bearbeitung',
    color: 'text-blue-600',
    headerBg: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <IconPlayerPlay size={16} className="text-blue-500 shrink-0" />,
  },
  abgeschlossen: {
    label: 'Abgeschlossen',
    color: 'text-green-600',
    headerBg: 'bg-green-50 border-green-200',
    badge: 'bg-green-50 text-green-700 border-green-200',
    icon: <IconCircleCheck size={16} className="text-green-500 shrink-0" />,
  },
  fehlgeschlagen: {
    label: 'Fehlgeschlagen',
    color: 'text-red-600',
    headerBg: 'bg-red-50 border-red-200',
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: <IconAlertTriangle size={16} className="text-red-500 shrink-0" />,
  },
};

const STATUS_OPTIONS = LOOKUP_OPTIONS['testdaten']?.['status'] ?? [];

export default function DashboardOverview() {
  const { testdaten, loading, error, fetchAll } = useDashboardData();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Testdaten | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Testdaten | null>(null);
  const [presetStatus, setPresetStatus] = useState<StatusKey | null>(null);

  const byStatus = useMemo(() => {
    const map: Record<StatusKey, Testdaten[]> = { offen: [], in_bearbeitung: [], abgeschlossen: [], fehlgeschlagen: [] };
    for (const t of testdaten) {
      const key = (t.fields.status?.key ?? 'offen') as StatusKey;
      if (key in map) map[key].push(t);
      else map['offen'].push(t);
    }
    return map;
  }, [testdaten]);

  const total = testdaten.length;
  const done = byStatus['abgeschlossen'].length;
  const failed = byStatus['fehlgeschlagen'].length;
  const inProgress = byStatus['in_bearbeitung'].length;

  const handleCreate = async (fields: Testdaten['fields']) => {
    await LivingAppsService.createTestdatenEntry(fields);
    fetchAll();
  };

  const handleUpdate = async (fields: Testdaten['fields']) => {
    if (!editRecord) return;
    await LivingAppsService.updateTestdatenEntry(editRecord.record_id, fields);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteTestdatenEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const handleStatusChange = async (record: Testdaten, newStatus: StatusKey) => {
    await LivingAppsService.updateTestdatenEntry(record.record_id, { status: newStatus });
    fetchAll();
  };

  const openCreate = (status?: StatusKey) => {
    setPresetStatus(status ?? null);
    setEditRecord(null);
    setDialogOpen(true);
  };

  const openEdit = (record: Testdaten) => {
    setEditRecord(record);
    setPresetStatus(null);
    setDialogOpen(true);
  };

  const getDefaultValues = () => {
    if (editRecord) return editRecord.fields;
    if (presetStatus) {
      const opt = STATUS_OPTIONS.find(o => o.key === presetStatus);
      return opt ? { status: opt } : undefined;
    }
    return undefined;
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Testerfassung</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} Einträge gesamt</p>
        </div>
        <Button onClick={() => openCreate()} className="shrink-0 gap-2">
          <IconPlus size={16} className="shrink-0" />
          <span>Neuer Testeintrag</span>
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(total)}
          description="Alle Testeinträge"
          icon={<IconClipboardList size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="In Bearbeitung"
          value={String(inProgress)}
          description="Aktive Tests"
          icon={<IconPlayerPlay size={18} className="text-blue-500" />}
        />
        <StatCard
          title="Abgeschlossen"
          value={String(done)}
          description={total > 0 ? `${Math.round((done / total) * 100)} % erfolgreich` : 'Keine Tests'}
          icon={<IconCircleCheck size={18} className="text-green-500" />}
        />
        <StatCard
          title="Fehlgeschlagen"
          value={String(failed)}
          description={total > 0 ? `${Math.round((failed / total) * 100)} % Fehlerquote` : 'Keine Tests'}
          icon={<IconAlertTriangle size={18} className="text-red-500" />}
        />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATUS_ORDER.map(statusKey => {
          const cfg = STATUS_CONFIG[statusKey];
          const cards = byStatus[statusKey];
          return (
            <div key={statusKey} className="flex flex-col gap-3 min-w-0">
              {/* Column Header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${cfg.headerBg}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {cfg.icon}
                  <span className={`text-sm font-semibold truncate ${cfg.color}`}>{cfg.label}</span>
                  <Badge variant="secondary" className="ml-1 text-xs shrink-0">{cards.length}</Badge>
                </div>
                <button
                  onClick={() => openCreate(statusKey)}
                  className="p-1 rounded-lg hover:bg-black/10 transition-colors shrink-0"
                  title={`Neuen ${cfg.label}-Eintrag erstellen`}
                >
                  <IconPlus size={14} className={cfg.color} />
                </button>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-[80px]">
                {cards.map(record => (
                  <TestCard
                    key={record.record_id}
                    record={record}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onStatusChange={handleStatusChange}
                  />
                ))}
                {cards.length === 0 && (
                  <button
                    onClick={() => openCreate(statusKey)}
                    className="flex flex-col items-center justify-center py-6 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors gap-1"
                  >
                    <IconPlus size={18} stroke={1.5} />
                    <span className="text-xs">Hinzufügen</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialogs */}
      <TestdatenDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); setPresetStatus(null); }}
        onSubmit={editRecord ? handleUpdate : handleCreate}
        defaultValues={getDefaultValues()}
        enablePhotoScan={AI_PHOTO_SCAN['Testdaten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Testdaten']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={`Möchtest du "${deleteTarget?.fields.titel ?? 'diesen Eintrag'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Test Card ────────────────────────────────────────────────────────────────

interface TestCardProps {
  record: Testdaten;
  onEdit: (r: Testdaten) => void;
  onDelete: (r: Testdaten) => void;
  onStatusChange: (r: Testdaten, s: StatusKey) => void;
}

function TestCard({ record, onEdit, onDelete, onStatusChange }: TestCardProps) {
  const { titel, beschreibung, testdatum, verantwortlich_vorname, verantwortlich_nachname, status } = record.fields;
  const statusKey = (status?.key ?? 'offen') as StatusKey;
  const cfg = STATUS_CONFIG[statusKey];

  const nextStatus = useMemo((): StatusKey | null => {
    const idx = STATUS_ORDER.indexOf(statusKey);
    if (idx < 0 || idx >= STATUS_ORDER.length - 1) return null;
    return STATUS_ORDER[idx + 1];
  }, [statusKey]);

  const verantwortlich = [verantwortlich_vorname, verantwortlich_nachname].filter(Boolean).join(' ') || null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-3 flex flex-col gap-2 hover:shadow-md transition-shadow">
      {/* Title row */}
      <div className="flex items-start gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{titel ?? '(Kein Titel)'}</p>
          {beschreibung && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{beschreibung}</p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.badge}`}>
          {cfg.icon}
          {cfg.label}
        </span>
        {testdatum && (
          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            {formatDate(testdatum)}
          </span>
        )}
        {verantwortlich && (
          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border truncate max-w-[120px]">
            {verantwortlich}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t border-border/60 flex-wrap">
        {nextStatus && (
          <button
            onClick={() => onStatusChange(record, nextStatus)}
            className={`flex-1 min-w-0 text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${STATUS_CONFIG[nextStatus].badge} hover:opacity-80`}
            title={`Zu "${STATUS_CONFIG[nextStatus].label}" verschieben`}
          >
            → {STATUS_CONFIG[nextStatus].label}
          </button>
        )}
        <button
          onClick={() => onEdit(record)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title="Bearbeiten"
        >
          <IconPencil size={14} className="shrink-0" />
        </button>
        <button
          onClick={() => onDelete(record)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          title="Löschen"
        >
          <IconTrash size={14} className="shrink-0" />
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Error ────────────────────────────────────────────────────────────────────

const APPGROUP_ID = '6a901acc490bccaf45121628';
const REPAIR_ENDPOINT = '/claude/build/repair';

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Wird repariert...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte wende dich an den Support.</p>}
    </div>
  );
}

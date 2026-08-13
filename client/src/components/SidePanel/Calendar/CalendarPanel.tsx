import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar as CalendarIcon,
  Trash2,
  Pencil,
  Play,
  Send,
  CalendarPlus,
  Download,
  History,
} from 'lucide-react';
import { useCalendarEventsQuery, useDeleteEventMutation, useExecuteEventMutation } from '~/data-provider/Calendar';
import type { CalendarEvent, CreateEventPayload } from '~/data-provider/Calendar';
import { useListAgentsQuery } from '~/data-provider/Agents/queries';
import { PermissionBits } from 'nashm-data-provider';
import { OGDialog, OGDialogContent } from '@nashm/client';
import { mainTextareaId } from '~/common';
import EventDialog from './EventDialog';

// ── Helpers ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const STATUS_ICONS: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-yellow-400', label: 'Pending' },
  running: { icon: Loader2, color: 'text-blue-400 animate-spin', label: 'Running' },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-400', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-gray-400', label: 'Cancelled' },
};

// ── CalendarPanel ──────────────────────────────────────────────────────────

function CalendarPanel() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [mainView, setMainView] = useState<'calendar' | 'history'>('calendar');

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Query date range for the current month
  const startDate = useMemo(
    () => new Date(currentYear, currentMonth, 1).toISOString(),
    [currentYear, currentMonth],
  );
  const endDate = useMemo(
    () => new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString(),
    [currentYear, currentMonth],
  );

  const { data, isLoading } = useCalendarEventsQuery(startDate, endDate);
  const events = data?.events ?? [];

  const deleteMutation = useDeleteEventMutation();
  const executeMutation = useExecuteEventMutation();

  // Get agents for display
  const { data: agentsData } = useListAgentsQuery({ limit: 100, requiredPermission: PermissionBits.VIEW });
  const agentMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (agentsData?.data) {
      for (const a of agentsData.data) {
        map[a.id] = a.name ?? 'Unknown Agent';
      }
    }
    return map;
  }, [agentsData]);

  // Events grouped by day (excluding completed)
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      if (ev.status === 'completed') continue;
      const d = new Date(ev.startDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const completedEvents = useMemo(() => {
    return events
      .filter((e) => e.status === 'completed')
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [events]);

  // Selected day events
  const selectedDayEvents = useMemo(() => {
    const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
    return (eventsByDay[key] ?? []).sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
  }, [eventsByDay, selectedDate]);

  // Navigation
  const goToPrevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const goToToday = useCallback(() => {
    const t = new Date();
    setCurrentYear(t.getFullYear());
    setCurrentMonth(t.getMonth());
    setSelectedDate(t);
  }, []);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [currentYear, currentMonth]);

  const handleDelete = useCallback(
    (id: string) => {
      setEventToDelete(id);
    },
    [],
  );

  const confirmDelete = useCallback(() => {
    if (eventToDelete) {
      deleteMutation.mutate(eventToDelete);
      setEventToDelete(null);
    }
  }, [deleteMutation, eventToDelete]);

  const handleExecute = useCallback(
    (id: string) => {
      executeMutation.mutate(id);
    },
    [executeMutation],
  );

  const handleSendToChat = useCallback(
    (event: CalendarEvent) => {
      const d = new Date(event.startDate);
      const dateStr = d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const timeStr = event.allDay ? 'All day' : formatTime(event.startDate);

      const text = `I want to discuss the following ${event.eventType}:\n- **Title:** ${event.title}\n- **Date:** ${dateStr} at ${timeStr}\n- **Status:** ${event.status}${
        event.description ? `\n- **Description:** ${event.description}` : ''
      }`;
      
      const textarea = document.getElementById(mainTextareaId) as HTMLTextAreaElement | null;
      if (textarea) {
        const currentText = textarea.value;
        const newText = currentText.trim().length > 0 ? `${currentText}\n\n${text}` : text;
        
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value',
        )?.set;
        nativeInputValueSetter?.call(textarea, newText);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
      }
    },
    [],
  );

  const handleExportToGoogleCalendar = useCallback((event: CalendarEvent) => {
    const start = new Date(event.startDate).toISOString().replace(/-|:|\.\d\d\d/g, '');
    let end = start;
    if (event.endDate) {
      end = new Date(event.endDate).toISOString().replace(/-|:|\.\d\d\d/g, '');
    } else {
      // If no end date, default to 1 hour later
      const d = new Date(event.startDate);
      d.setHours(d.getHours() + 1);
      end = d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    }
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${encodeURIComponent(event.description || '')}`;
    window.open(url, '_blank');
  }, []);

  const handleExportToICal = useCallback((event: CalendarEvent) => {
    const start = new Date(event.startDate).toISOString().replace(/-|:|\.\d\d\d/g, '');
    let end = start;
    if (event.endDate) {
      end = new Date(event.endDate).toISOString().replace(/-|:|\.\d\d\d/g, '');
    } else {
      const d = new Date(event.startDate);
      d.setHours(d.getHours() + 1);
      end = d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    }

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const openCreateDialog = useCallback(
    (type: 'event' | 'action' = 'event') => {
      setEditingEvent(null);
      setDialogOpen(true);
    },
    [],
  );

  const openEditDialog = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setDialogOpen(true);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
        <div className="flex bg-surface-tertiary rounded-md p-0.5">
          <button
            onClick={() => setMainView('calendar')}
            className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
              mainView === 'calendar'
                ? 'bg-surface-primary text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setMainView('history')}
            className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
              mainView === 'history'
                ? 'bg-surface-primary text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            History
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Clock className="h-3.5 w-3.5" />
          <span className="tabular-nums font-medium">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {mainView === 'calendar' ? (
        <>
          {/* ── Month Navigation ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={goToPrevMonth}
          className="rounded-md p-1 transition-colors hover:bg-surface-hover"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4 text-text-secondary" />
        </button>
        <button
          onClick={goToToday}
          className="text-sm font-medium text-text-primary transition-colors hover:text-[#C41E3A]"
        >
          {MONTH_NAMES[currentMonth]} {currentYear}
        </button>
        <button
          onClick={goToNextMonth}
          className="rounded-md p-1 transition-colors hover:bg-surface-hover"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4 text-text-secondary" />
        </button>
      </div>

      {/* ── Calendar Grid ──────────────────────────────────────── */}
      <div className="px-3 pb-2">
        {/* Day labels */}
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {DAY_LABELS.map((d) => (
            <div key={d} className="pb-1 text-[10px] font-medium uppercase text-text-tertiary">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-8" />;
            }

            const date = new Date(currentYear, currentMonth, day);
            const isToday = isSameDay(date, today);
            const isSelected = isSameDay(date, selectedDate);
            const dayKey = `${currentYear}-${currentMonth}-${day}`;
            const dayEvents = eventsByDay[dayKey] ?? [];
            const hasEvents = dayEvents.length > 0;
            const hasActions = dayEvents.some((e) => e.eventType === 'action');

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(date)}
                className={`
                  relative flex h-8 flex-col items-center justify-center rounded-md text-xs
                  transition-all duration-150
                  ${isSelected
                    ? 'bg-[#C41E3A] font-bold text-white shadow-sm shadow-[#C41E3A]/30'
                    : isToday
                      ? 'bg-surface-hover font-semibold text-[#C41E3A] ring-1 ring-[#C41E3A]/30'
                      : 'text-text-primary hover:bg-surface-hover'}
                `}
              >
                {day}
                {hasEvents && (
                  <div className="absolute bottom-0.5 flex gap-[2px]">
                    <span
                      className={`h-[3px] w-[3px] rounded-full ${
                        isSelected ? 'bg-white' : 'bg-[#C41E3A]'
                      }`}
                    />
                    {hasActions && (
                      <span
                        className={`h-[3px] w-[3px] rounded-full ${
                          isSelected ? 'bg-white/70' : 'bg-amber-400'
                        }`}
                      />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Selected Day Events ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto border-t border-border-light px-3 py-2">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-text-secondary">
            {selectedDate.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </h3>
          <span className="text-[10px] text-text-tertiary">
            {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
          </div>
        ) : selectedDayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-text-tertiary">
            <CalendarIcon className="mb-2 h-8 w-8 opacity-30" />
            <p className="text-xs">No events for this day</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {selectedDayEvents.map((event) => {
              const statusInfo = STATUS_ICONS[event.status] || STATUS_ICONS.pending;
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={event._id}
                  className="group relative rounded-lg border border-border-light bg-surface-primary-alt p-2.5 transition-all duration-150 hover:border-border-medium hover:shadow-sm"
                >
                  {/* Color stripe */}
                  <div
                    className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg"
                    style={{ backgroundColor: event.color || '#C41E3A' }}
                  />

                  <div className="ml-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {event.eventType === 'action' ? (
                          <Zap className="h-3 w-3 flex-shrink-0 text-amber-400" />
                        ) : null}
                        <span className="truncate text-xs font-medium text-text-primary">
                          {event.title}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-text-tertiary">
                        {!event.allDay && (
                          <span className="tabular-nums">{formatTime(event.startDate)}</span>
                        )}
                        {event.allDay && <span>All day</span>}
                        <span className={`flex items-center gap-0.5 ${statusInfo.color}`}>
                          <StatusIcon className="h-2.5 w-2.5" />
                          {statusInfo.label}
                        </span>
                      </div>

                      {event.eventType === 'action' && event.agentId && (
                        <div className="mt-0.5 text-[10px] text-text-tertiary">
                          Agent: {agentMap[event.agentId] || event.agentId}
                        </div>
                      )}

                      {event.executionResult && event.status === 'completed' && (
                        <div className="mt-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                          ✓ Executed
                        </div>
                      )}

                      {event.executionResult && event.status === 'failed' && (
                        <div className="mt-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-400">
                          ✗ {event.executionResult.slice(0, 80)}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {event.eventType === 'action' && event.status === 'pending' && (
                        <button
                          onClick={() => handleExecute(event._id)}
                          className="rounded p-1 text-text-tertiary transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
                          title="Execute now"
                        >
                          <Play className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleExportToGoogleCalendar(event)}
                        className="rounded p-1 text-text-tertiary transition-colors hover:bg-blue-500/10 hover:text-blue-500"
                        title="Google Calendar"
                      >
                        <CalendarPlus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleExportToICal(event)}
                        className="rounded p-1 text-text-tertiary transition-colors hover:bg-purple-500/10 hover:text-purple-400"
                        title="iCalendar (.ics)"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleSendToChat(event)}
                        className="rounded p-1 text-text-tertiary transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                        title="Send to chat"
                      >
                        <Send className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => openEditDialog(event)}
                        className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(event._id)}
                        className="rounded p-1 text-text-tertiary transition-colors hover:bg-red-500/10 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-4 flex items-center gap-2 px-1">
            <History className="h-4 w-4 text-text-secondary" />
            <h3 className="text-sm font-semibold text-text-primary">Completed Events</h3>
          </div>
          {completedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
              <CheckCircle2 className="mb-2 h-8 w-8 opacity-30" />
              <p className="text-xs">No completed events yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {completedEvents.map((event) => {
                const dateStr = new Date(event.startDate).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <div
                    key={event._id}
                    className="group relative rounded-lg border border-border-light bg-surface-primary-alt p-3 transition-all duration-150 hover:border-border-medium"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {event.eventType === 'action' && (
                            <Zap className="h-3 w-3 flex-shrink-0 text-amber-400" />
                          )}
                          <span className="truncate text-sm font-medium text-text-primary line-through opacity-70">
                            {event.title}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-text-tertiary">
                          <span className="tabular-nums">{dateStr}</span>
                          {!event.allDay && <span>{formatTime(event.startDate)}</span>}
                          {event.allDay && <span>All day</span>}
                        </div>
                        {event.executionResult && (
                          <div className="mt-2 rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                            ✓ {event.executionResult}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handleSendToChat(event)}
                          className="rounded p-1 text-text-tertiary transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                          title="Send to chat"
                        >
                          <Send className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(event._id)}
                          className="rounded p-1 text-text-tertiary transition-colors hover:bg-red-500/10 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Add Buttons ────────────────────────────────────────── */}
      <div className="flex gap-2 border-t border-border-light px-3 py-2.5">
        <button
          onClick={() => openCreateDialog('event')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-light bg-surface-primary-alt px-3 py-2 text-xs font-medium text-text-primary transition-all duration-150 hover:border-[#C41E3A]/30 hover:bg-[#C41E3A]/5 hover:text-[#C41E3A]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Event
        </button>
        <button
          onClick={() => openCreateDialog('action')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-light bg-surface-primary-alt px-3 py-2 text-xs font-medium text-text-primary transition-all duration-150 hover:border-amber-400/30 hover:bg-amber-400/5 hover:text-amber-400"
        >
          <Zap className="h-3.5 w-3.5" />
          Add Action
        </button>
      </div>

      {/* ── Event Dialog ──────────────────────────────────────── */}
      {dialogOpen && (
        <EventDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingEvent(null);
          }}
          event={editingEvent}
          selectedDate={selectedDate}
        />
      )}

      {/* ── Delete Confirmation Dialog ────────────────────────── */}
      <OGDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <OGDialogContent className="sm:max-w-[400px]">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-text-primary">Delete Event</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEventToDelete(null)}
                className="rounded-md border border-border-light px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-md bg-[#C41E3A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#A31830]"
              >
                Delete
              </button>
            </div>
          </div>
        </OGDialogContent>
      </OGDialog>
    </div>
  );
}

export default memo(CalendarPanel);
//

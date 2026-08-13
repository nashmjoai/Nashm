import { useState, useEffect } from 'react';
import { useCreateEventMutation, useUpdateEventMutation } from '~/data-provider/Calendar';
import type { CalendarEvent, CreateEventPayload } from '~/data-provider/Calendar';
import { useListAgentsQuery } from '~/data-provider/Agents/queries';
import { PermissionBits } from 'nashm-data-provider';
import { OGDialog, OGDialogContent } from '@nashm/client';

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  selectedDate: Date;
}

const COLORS = [
  { value: '#C41E3A', label: 'Nashm Red' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Yellow' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#6B7280', label: 'Gray' },
];

export default function EventDialog({ isOpen, onClose, event, selectedDate }: EventDialogProps) {
  const isEdit = !!event;

  // Local state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<'event' | 'action'>('event');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [allDay, setAllDay] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [actionPrompt, setActionPrompt] = useState('');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [color, setColor] = useState(COLORS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch agents
  const { data: agentsData } = useListAgentsQuery({ limit: 100, requiredPermission: PermissionBits.VIEW });
  const agents = agentsData?.data || [];

  // Mutations
  const createMutation = useCreateEventMutation();
  const updateMutation = useUpdateEventMutation();

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      setError('');
      if (event) {
        setTitle(event.title);
        setDescription(event.description || '');
        setEventType(event.eventType);

        const d = new Date(event.startDate);
        setDate(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        );
        setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);

        setAllDay(event.allDay || false);
        setAgentId(event.agentId || '');
        setActionPrompt(event.actionPrompt || '');
        setRecurrence(event.recurrence || 'none');
        setColor(event.color || COLORS[0].value);
      } else {
        setTitle('');
        setDescription('');
        setDate(
          `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
        );

        const now = new Date();
        const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
        nextHour.setMinutes(0);
        setTime(
          `${String(nextHour.getHours()).padStart(2, '0')}:${String(nextHour.getMinutes()).padStart(2, '0')}`,
        );

        setAllDay(false);
        setAgentId('');
        setActionPrompt('');
        setRecurrence('none');
        setColor(COLORS[0].value);
      }
    }
  }, [isOpen, event, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (eventType === 'action') {
      if (!agentId) {
        setError('Agent selection is required for actions');
        return;
      }
      if (!actionPrompt.trim()) {
        setError('Action prompt is required');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);

      const startDateObj = new Date(year, month - 1, day, hour, minute, 0);

      const payload: CreateEventPayload = {
        title: title.trim(),
        description: description.trim(),
        eventType,
        startDate: startDateObj.toISOString(),
        allDay,
        agentId: eventType === 'action' ? agentId : undefined,
        actionPrompt: eventType === 'action' ? actionPrompt.trim() : undefined,
        recurrence,
        color,
      };

      if (isEdit && event) {
        await updateMutation.mutateAsync({ id: event._id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'An error occurred while saving');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OGDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <OGDialogContent className="sm:max-w-[425px]">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {isEdit ? 'Edit Calendar Entry' : 'New Calendar Entry'}
          </h2>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {/* Type Toggle */}
            {!isEdit && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-primary">Event Type</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="eventType"
                      className="h-4 w-4 text-[#C41E3A] border-border-light focus:ring-[#C41E3A]"
                      checked={eventType === 'event'}
                      onChange={() => setEventType('event')}
                    />
                    <span className="text-sm text-text-primary">Event</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="eventType"
                      className="h-4 w-4 text-[#C41E3A] border-border-light focus:ring-[#C41E3A]"
                      checked={eventType === 'action'}
                      onChange={() => setEventType('action')}
                    />
                    <span className="text-sm text-text-primary">Action</span>
                  </label>
                </div>
              </div>
            )}

            {error && <div className="text-sm text-red-500">{error}</div>}

            {/* Basic Info */}
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="text-sm font-medium text-text-primary">
                Title
              </label>
              <input
                id="title"
                className="rounded-md border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-[#C41E3A] focus:outline-none focus:ring-1 focus:ring-[#C41E3A]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  eventType === 'action' ? 'e.g. Generate daily report' : 'e.g. Team Meeting'
                }
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="description" className="text-sm font-medium text-text-primary">
                Description (optional)
              </label>
              <textarea
                id="description"
                className="resize-none rounded-md border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-[#C41E3A] focus:outline-none focus:ring-1 focus:ring-[#C41E3A]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="date" className="text-sm font-medium text-text-primary">
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  className="rounded-md border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-[#C41E3A] focus:outline-none focus:ring-1 focus:ring-[#C41E3A]"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="time" className="text-sm font-medium text-text-primary">
                  Time
                </label>
                <input
                  id="time"
                  type="time"
                  className="rounded-md border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-[#C41E3A] focus:outline-none focus:ring-1 focus:ring-[#C41E3A]"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={allDay}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="allDay"
                type="checkbox"
                className="h-4 w-4 rounded border-border-light text-[#C41E3A] focus:ring-[#C41E3A]"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
              />
              <label htmlFor="allDay" className="text-sm font-normal text-text-secondary">
                All day event
              </label>
            </div>

            {/* Action Specifics */}
            {eventType === 'action' && (
              <>
                <div className="flex flex-col gap-2">
                  <label htmlFor="agentId" className="text-sm font-medium text-text-primary">
                    Select Agent
                  </label>
                  <select
                    id="agentId"
                    className="rounded-md border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-[#C41E3A] focus:outline-none focus:ring-1 focus:ring-[#C41E3A]"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                  >
                    <option value="" disabled>
                      Choose an agent to run this action
                    </option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="actionPrompt" className="text-sm font-medium text-text-primary">
                    Action Prompt
                  </label>
                  <textarea
                    id="actionPrompt"
                    className="rounded-md border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-[#C41E3A] focus:outline-none focus:ring-1 focus:ring-[#C41E3A]"
                    value={actionPrompt}
                    onChange={(e) => setActionPrompt(e.target.value)}
                    placeholder="What should the agent do at this time?"
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="recurrence" className="text-sm font-medium text-text-primary">
                  Recurrence
                </label>
                <select
                  id="recurrence"
                  className="rounded-md border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-[#C41E3A] focus:outline-none focus:ring-1 focus:ring-[#C41E3A]"
                  value={recurrence}
                  onChange={(e: any) => setRecurrence(e.target.value)}
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="color" className="text-sm font-medium text-text-primary">
                  Color
                </label>
                <select
                  id="color"
                  className="rounded-md border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-[#C41E3A] focus:outline-none focus:ring-1 focus:ring-[#C41E3A]"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                >
                  {COLORS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-border-light pt-4">
              <button
                type="button"
                className="rounded-md border border-border-light px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-[#C41E3A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#A31830]"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? isEdit
                    ? 'Updating...'
                    : 'Creating...'
                  : isEdit
                    ? 'Save Changes'
                    : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}

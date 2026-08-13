/**
 * Calendar Data Provider - API client and React Query hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import axios from 'axios';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  _id: string;
  user: string;
  title: string;
  description: string;
  eventType: 'event' | 'action';
  startDate: string;
  endDate?: string;
  allDay: boolean;
  agentId?: string;
  actionPrompt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  color: string;
  executionResult?: string;
  executedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  eventType: 'event' | 'action';
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  agentId?: string;
  actionPrompt?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  color?: string;
}

export interface UpdateEventPayload extends Partial<CreateEventPayload> {
  status?: CalendarEvent['status'];
}

// ── Query Keys ─────────────────────────────────────────────────────────────

export const CalendarQueryKeys = {
  all: ['calendar'] as const,
  events: (startDate?: string, endDate?: string) =>
    ['calendar', 'events', startDate, endDate] as const,
  event: (id: string) => ['calendar', 'event', id] as const,
  upcoming: ['calendar', 'upcoming'] as const,
};

// ── API Functions ──────────────────────────────────────────────────────────

const calendarApi = {
  getEvents: async (startDate?: string, endDate?: string): Promise<CalendarEventsResponse> => {
    const params = new URLSearchParams();
    if (startDate) {
      params.set('startDate', startDate);
    }
    if (endDate) {
      params.set('endDate', endDate);
    }
    const { data } = await axios.get(`/api/calendar/events?${params.toString()}`);
    return data;
  },

  getEvent: async (id: string): Promise<{ event: CalendarEvent }> => {
    const { data } = await axios.get(`/api/calendar/events/${id}`);
    return data;
  },

  createEvent: async (payload: CreateEventPayload): Promise<{ event: CalendarEvent }> => {
    const { data } = await axios.post('/api/calendar/events', payload);
    return data;
  },

  updateEvent: async (
    id: string,
    payload: UpdateEventPayload,
  ): Promise<{ event: CalendarEvent }> => {
    const { data } = await axios.put(`/api/calendar/events/${id}`, payload);
    return data;
  },

  deleteEvent: async (id: string): Promise<{ message: string }> => {
    const { data } = await axios.delete(`/api/calendar/events/${id}`);
    return data;
  },

  executeEvent: async (id: string): Promise<{ message: string; event: CalendarEvent }> => {
    const { data } = await axios.post(`/api/calendar/events/${id}/execute`);
    return data;
  },

  getUpcoming: async (): Promise<CalendarEventsResponse> => {
    const { data } = await axios.get('/api/calendar/upcoming');
    return data;
  },
};

// ── React Query Hooks ──────────────────────────────────────────────────────

export const useCalendarEventsQuery = (
  startDate?: string,
  endDate?: string,
  config?: UseQueryOptions<CalendarEventsResponse>,
) => {
  return useQuery<CalendarEventsResponse>(
    CalendarQueryKeys.events(startDate, endDate),
    () => calendarApi.getEvents(startDate, endDate),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30 * 1000,
      ...config,
    },
  );
};

export const useUpcomingEventsQuery = (config?: UseQueryOptions<CalendarEventsResponse>) => {
  return useQuery<CalendarEventsResponse>(
    CalendarQueryKeys.upcoming,
    () => calendarApi.getUpcoming(),
    {
      refetchOnWindowFocus: true,
      refetchInterval: 60 * 1000, // Poll every minute
      ...config,
    },
  );
};

export const useCreateEventMutation = (
  options?: UseMutationOptions<{ event: CalendarEvent }, Error, CreateEventPayload>,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    (payload: CreateEventPayload) => calendarApi.createEvent(payload),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries(CalendarQueryKeys.all);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export const useUpdateEventMutation = (
  options?: UseMutationOptions<
    { event: CalendarEvent },
    Error,
    { id: string; payload: UpdateEventPayload }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, payload }: { id: string; payload: UpdateEventPayload }) =>
      calendarApi.updateEvent(id, payload),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries(CalendarQueryKeys.all);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export const useDeleteEventMutation = (
  options?: UseMutationOptions<{ message: string }, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation((id: string) => calendarApi.deleteEvent(id), {
    ...options,
    onSuccess: (...params) => {
      queryClient.invalidateQueries(CalendarQueryKeys.all);
      options?.onSuccess?.(...params);
    },
  });
};

export const useExecuteEventMutation = (
  options?: UseMutationOptions<{ message: string; event: CalendarEvent }, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation((id: string) => calendarApi.executeEvent(id), {
    ...options,
    onSuccess: (...params) => {
      queryClient.invalidateQueries(CalendarQueryKeys.all);
      options?.onSuccess?.(...params);
    },
  });
};

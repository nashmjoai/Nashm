import { useState } from 'react';
import {
  OGDialog,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  OGDialogClose,
  Button,
  Spinner,
  Input,
  Textarea,
  useToastContext,
} from '@librechat/client';
import { useCreateSupportTicketMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { NotificationSeverity } from '~/common';

type SupportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SupportModal({ open, onOpenChange }: SupportModalProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const submitTicketMutation = useCreateSupportTicketMutation({
    onSuccess: () => {
      showToast({
        message: 'Support ticket submitted successfully!',
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
      setSubject('');
      setMessage('');
      onOpenChange(false);
    },
    onError: (err: any) => {
      showToast({
        message: err?.response?.data?.error || 'Failed to submit support ticket.',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast({
        message: 'Please fill in all fields.',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
      return;
    }
    submitTicketMutation.mutate({ subject, message });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="w-11/12 max-w-lg border-border-light bg-surface-primary text-text-primary p-6">
        <OGDialogHeader>
          <OGDialogTitle>Help & Support</OGDialogTitle>
        </OGDialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <p className="text-sm text-text-secondary">
            Need help or have a question? Describe your issue below, and our team will get back to you at your registered email address.
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-text-primary">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the issue"
              className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary"
              disabled={submitTicketMutation.isLoading}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-text-primary">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain details of your request or bug..."
              rows={6}
              className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary resize-none"
              disabled={submitTicketMutation.isLoading}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
            <OGDialogClose asChild>
              <Button type="button" variant="outline" disabled={submitTicketMutation.isLoading}>
                Cancel
              </Button>
            </OGDialogClose>
            <Button
              type="submit"
              variant="submit"
              disabled={submitTicketMutation.isLoading}
            >
              {submitTicketMutation.isLoading ? <Spinner /> : 'Send Ticket'}
            </Button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}

import React, { useState } from 'react';
import {
  OGDialog,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  OGDialogClose,
  Button,
  Spinner,
  Input,
  useToastContext,
} from '@nashm/client';
import {
  Users,
  MessageSquare,
  Clock,
  User,
  ArrowLeft,
  ChevronRight,
  Trash2,
  Plus,
} from 'lucide-react';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import {
  useGetFamilyPlanQuery,
  useGetFamilyPlanActivityQuery,
  useGetFamilyPlanMemberConversationsQuery,
  useAddFamilyMemberMutation,
  useRemoveFamilyMemberMutation,
} from '~/data-provider';

type FamilyDashboardModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FamilyDashboardModal({ open, onOpenChange }: FamilyDashboardModalProps) {
  const localize = useLocalize();
  const isArabic = localize('com_nav_subscription' as any) === undefined;
  const { showToast } = useToastContext();

  const [selectedMember, setSelectedMember] = useState<{ id: string; email: string } | null>(null);
  const [newEmail, setNewEmail] = useState('');

  // Queries
  const { data: plan, isLoading: loadingPlan } = useGetFamilyPlanQuery({ enabled: open });
  const { data: activity, refetch: refetchActivity } = useGetFamilyPlanActivityQuery({ enabled: open && !!plan });

  const addMemberMutation = useAddFamilyMemberMutation({
    onSuccess: () => {
      showToast({
        message: isArabic ? 'تم إضافة العضو بنجاح' : 'Member added successfully!',
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
      setNewEmail('');
      refetchActivity();
    },
    onError: (err: any) => {
      showToast({
        message: err?.response?.data?.error || (isArabic ? 'فشل في إضافة العضو.' : 'Failed to add member.'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  const removeMemberMutation = useRemoveFamilyMemberMutation({
    onSuccess: () => {
      showToast({
        message: isArabic ? 'تم إزالة العضو بنجاح' : 'Member removed successfully!',
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
      refetchActivity();
    },
    onError: (err: any) => {
      showToast({
        message: err?.response?.data?.error || (isArabic ? 'فشل في إزالة العضو.' : 'Failed to remove member.'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  const { data: conversations, isLoading: loadingConvos } = useGetFamilyPlanMemberConversationsQuery(
    selectedMember?.id || '',
    { enabled: open && !!selectedMember }
  );

  const children = (plan?.members || []).filter((m: any) => m.role === 'child');

  const getMemberStatus = (email: string) => {
    if (!activity?.members) return { count: 0, lastActive: null, isOnline: false };
    const act = activity.members.find((m: any) => m.email.toLowerCase() === email.toLowerCase());
    const lastActiveDate = act?.lastActivity ? new Date(act.lastActivity) : null;
    const isOnline = lastActiveDate ? Date.now() - lastActiveDate.getTime() < 60 * 60 * 1000 : false;
    return {
      count: act?.conversationCount || 0,
      lastActive: lastActiveDate,
      isOnline,
    };
  };

  const handleBackToMembers = () => {
    setSelectedMember(null);
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="w-11/12 max-w-5xl border-border-light bg-surface-primary text-text-primary p-0 overflow-hidden flex flex-col h-[85vh] rounded-3xl shadow-2xl">
        
        {/* Header */}
        <OGDialogHeader className="p-6 border-b border-border-light flex items-center justify-between flex-shrink-0 bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="size-6" />
            </div>
            <div>
              <OGDialogTitle className="text-xl font-bold">
                {isArabic ? 'لوحة التحكم العائلية' : 'Family Dashboard'}
              </OGDialogTitle>
              <p className="text-xs text-text-secondary mt-0.5">
                {isArabic 
                  ? 'مراقبة نشاط أعضاء عائلتك ومراجعة المحادثات' 
                  : 'Monitor your family members\' activity and review chat histories'}
              </p>
            </div>
          </div>
        </OGDialogHeader>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            {loadingPlan ? (
              <div className="flex-1 flex items-center justify-center">
                <Spinner className="size-8 text-blue-500" />
              </div>
            ) : !selectedMember ? (
              /* Step 1: Members List */
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border-light/50 pb-4">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                    {isArabic ? `أعضاء العائلة النشطين (${children.length})` : `Active Family Members (${children.length})`}
                  </h3>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newEmail.trim()) {
                        addMemberMutation.mutate(newEmail.trim());
                      }
                    }}
                    className="flex items-center gap-2 w-full md:w-auto"
                  >
                    <Input
                      type="email"
                      placeholder={isArabic ? 'البريد الإلكتروني للطفل' : 'Child\'s email address'}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="h-9 min-w-[200px]"
                      disabled={addMemberMutation.isLoading}
                    />
                    <Button 
                      type="submit" 
                      variant="submit" 
                      className="h-9 px-3 flex items-center gap-2"
                      disabled={!newEmail.trim() || addMemberMutation.isLoading}
                    >
                      {addMemberMutation.isLoading ? <Spinner className="size-4" /> : <Plus className="size-4" />}
                      <span className="hidden sm:inline">{isArabic ? 'إضافة' : 'Add'}</span>
                    </Button>
                  </form>
                </div>
                {children.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 border border-dashed border-border-light rounded-2xl bg-surface-secondary/20">
                    <User className="size-12 text-text-tertiary mb-3" />
                    <p className="text-sm text-text-primary font-medium">
                      {isArabic ? 'لم يتم إضافة أفراد عائلة بعد' : 'No family members added yet'}
                    </p>
                    <p className="text-xs text-text-secondary mt-1 max-w-sm">
                      {isArabic 
                        ? 'يمكنك إضافة أعضاء عائلتك من خلال نافذة إعدادات الحساب تحت تبويب لوحة العائلة.' 
                        : 'You can add your family members in the Account settings under the Family Plan section.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {children.map((member: any) => {
                      const { count, lastActive, isOnline } = getMemberStatus(member.email);
                      return (
                        <div
                          key={member.user}
                          className="p-5 rounded-2xl border border-border-light bg-surface-secondary/40 hover:bg-surface-secondary/80 transition-all duration-300 flex flex-col justify-between gap-4"
                        >
                          <div>
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                                  {member.email[0].toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-text-primary text-sm truncate max-w-[180px]" title={member.email}>
                                    {member.email}
                                  </span>
                                  <span className="text-[10px] text-text-secondary">
                                    {isArabic ? 'عضو عائلة' : 'Family Member'}
                                  </span>
                                </div>
                              </div>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                isOnline 
                                  ? 'bg-green-500/10 text-green-500' 
                                  : 'bg-text-tertiary/10 text-text-tertiary'
                              }`}>
                                <span className={`size-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-text-tertiary'}`} />
                                {isOnline ? (isArabic ? 'نشط الآن' : 'Active') : (isArabic ? 'غير متصل' : 'Offline')}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-border-light/50 pt-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-text-secondary">{isArabic ? 'عدد المحادثات' : 'Chats Count'}</span>
                                <span className="font-bold text-text-primary">{count}</span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-text-secondary">{isArabic ? 'آخر نشاط' : 'Last Active'}</span>
                                <span className="font-bold text-text-primary text-[10px]">
                                  {lastActive ? lastActive.toLocaleDateString() : (isArabic ? 'لا يوجد' : 'Never')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="submit"
                              className="w-full text-xs font-semibold py-2"
                              onClick={() => setSelectedMember({ id: member.user, email: member.email })}
                            >
                              {isArabic ? 'عرض المحادثات' : 'View Conversations'}
                            </Button>
                            <Button
                              variant="destructive"
                              className="px-3"
                              title={isArabic ? 'إزالة العضو' : 'Remove Member'}
                              disabled={removeMemberMutation.isLoading}
                              onClick={() => {
                                if (confirm(isArabic ? 'هل أنت متأكد من إزالة هذا العضو؟' : 'Are you sure you want to remove this member?')) {
                                  removeMemberMutation.mutate(member.user);
                                }
                              }}
                            >
                              {removeMemberMutation.isLoading ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Member Conversations List */
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border-light/50 pb-3">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleBackToMembers}
                      className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-secondary transition-colors"
                    >
                      <ArrowLeft className="size-4" />
                    </button>
                    <div>
                      <h4 className="font-semibold text-text-primary text-sm">
                        {isArabic ? `محادثات ${selectedMember.email}` : `Conversations of ${selectedMember.email}`}
                      </h4>
                      <p className="text-xs text-text-secondary">
                        {isArabic ? 'تصفح قائمة المحادثات وقراءتها بالكامل' : 'Browse and read member conversation history'}
                      </p>
                    </div>
                  </div>
                </div>

                {loadingConvos ? (
                  <div className="flex-grow flex items-center justify-center">
                    <Spinner className="size-6 text-blue-500" />
                  </div>
                ) : conversations?.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                    <MessageSquare className="size-12 text-text-tertiary mb-3" />
                    <p className="text-sm text-text-primary font-medium">
                      {isArabic ? 'لا توجد محادثات نشطة' : 'No conversations found'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {conversations.map((convo: any) => {
                      const shareUrl = `${window.location.origin}/share/family/${selectedMember.id}/${convo.conversationId}`;
                      return (
                        <a
                          key={convo.conversationId}
                          href={shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full p-4 rounded-xl border border-border-light bg-surface-secondary/20 hover:bg-surface-secondary/60 text-left flex justify-between items-center transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                              <MessageSquare className="size-4" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-text-primary text-sm truncate max-w-[280px]">
                                {convo.title || (isArabic ? 'محادثة جديدة' : 'New Chat')}
                              </span>
                              <span className="text-[10px] text-text-secondary flex items-center gap-1">
                                <Clock className="size-3" />
                                {new Date(convo.updatedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="size-4 text-text-tertiary group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-light bg-surface-secondary/40 flex justify-end flex-shrink-0">
          <OGDialogClose asChild>
            <Button variant="outline">
              {isArabic ? 'إغلاق' : 'Close'}
            </Button>
          </OGDialogClose>
        </div>

      </OGDialogContent>
    </OGDialog>
  );
}

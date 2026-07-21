import { useCallback, useEffect, useState, useMemo, memo, lazy, Suspense, useRef } from 'react';
import { useSetRecoilState, useRecoilValue, useRecoilState } from 'recoil';
import { useMediaQuery, Button, Spinner } from '@nashm/client';
import { useQueryClient } from '@tanstack/react-query';
import { PermissionTypes, Permissions, QueryKeys } from 'nashm-data-provider';
import type { InfiniteQueryObserverResult } from '@tanstack/react-query';
import type { ConversationListResponse } from 'nashm-data-provider';
import type { List } from 'react-virtualized';
import {
  User,
  Briefcase,
  ChevronRight,
  Check,
  ShieldAlert,
} from 'lucide-react';
import {
  useLocalize,
  useHasAccess,
  useAuthContext,
  useLocalStorage,
  useNavScrolling,
  useNewConvo,
} from '~/hooks';
import {
  useConversationsInfiniteQuery,
  useTitleGeneration,
  useGetFamilyPlanQuery,
  useGetPendingInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '~/data-provider';
import { Conversations } from '~/components/Conversations';
import ProjectsSection from '~/components/Conversations/ProjectsSection';
import FavoritesList from '~/components/Nav/Favorites/FavoritesList';
import SearchBar from '~/components/Nav/SearchBar';
import { cn } from '~/utils';
import store from '~/store';

const BookmarkNav = lazy(() => import('~/components/Nav/Bookmarks/BookmarkNav'));

const ConversationsSection = memo(() => {
  const localize = useLocalize();
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const setSidebarExpanded = useSetRecoilState(store.sidebarExpanded);
  const { isAuthenticated } = useAuthContext();
  useTitleGeneration(isAuthenticated);

  const [isChatsExpanded, setIsChatsExpanded] = useLocalStorage('chatsExpanded', true);
  const [showLoading, setShowLoading] = useState(false);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });

  const search = useRecoilValue(store.search);
  const [workspace, setWorkspace] = useRecoilState(store.activeWorkspace);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const queryClient = useQueryClient();
  const { newConversation } = useNewConvo();
  const { user } = useAuthContext();

  // Family plan and invitation queries
  const { data: familyPlan } = useGetFamilyPlanQuery({ enabled: isAuthenticated });
  const { data: pendingInvites, refetch: refetchPending } = useGetPendingInvitationsQuery({ enabled: isAuthenticated });

  const acceptInviteMutation = useAcceptInvitationMutation({
    onSuccess: (data: any) => {
      refetchPending();
      if (data?.plan?._id) {
        setWorkspace(data.plan._id);
        newConversation();
      }
    }
  });

  const declineInviteMutation = useDeclineInvitationMutation({
    onSuccess: () => {
      refetchPending();
    }
  });

  const hasFamilyPlan = useMemo(() => {
    if (!familyPlan || !user) return false;
    if (familyPlan.owner === user.id) return true;
    return familyPlan.members?.some(
      (m: any) => m.user === user.id && m.status === 'accepted'
    );
  }, [familyPlan, user]);

  const familyPlanName = familyPlan?.name || localize('com_family_workspace' as any);

  const workspaceTenantId = useMemo(() => {
    return workspace && workspace !== 'personal' ? workspace : undefined;
  }, [workspace]);

  const { data, fetchNextPage, isFetchingNextPage, isLoading, isFetching } =
    useConversationsInfiniteQuery(
      {
        tags: tags.length === 0 ? undefined : tags,
        search: search.debouncedQuery || undefined,
        tenantId: workspaceTenantId,
      },
      {
        enabled: isAuthenticated && !isSwitchingWorkspace,
        staleTime: 30000,
        cacheTime: 300000,
      },
    );

  const computedHasNextPage = useMemo(() => {
    if (data?.pages && data.pages.length > 0) {
      const lastPage: ConversationListResponse = data.pages[data.pages.length - 1];
      return lastPage.nextCursor !== null;
    }
    return false;
  }, [data?.pages]);

  const conversationsRef = useRef<List | null>(null);

  const { moveToTop } = useNavScrolling<ConversationListResponse>({
    setShowLoading,
    fetchNextPage: async (options?) => {
      if (computedHasNextPage) {
        return fetchNextPage(options);
      }
      return Promise.resolve({} as InfiniteQueryObserverResult<ConversationListResponse, unknown>);
    },
    isFetchingNext: isFetchingNextPage,
  });

  const conversations = useMemo(() => {
    if (isSwitchingWorkspace) return [];
    return data ? data.pages.flatMap((page) => page.conversations) : [];
  }, [data, isSwitchingWorkspace]);

  const toggleNav = useCallback(() => {
    if (isSmallScreen) {
      setSidebarExpanded(false);
    }
  }, [isSmallScreen, setSidebarExpanded]);

  const loadMoreConversations = useCallback(() => {
    if (isFetchingNextPage || !computedHasNextPage) {
      return;
    }
    fetchNextPage();
  }, [isFetchingNextPage, computedHasNextPage, fetchNextPage]);

  const [isSearchLoading, setIsSearchLoading] = useState(
    !!search.query && (search.isTyping || isLoading || isFetching),
  );

  useEffect(() => {
    if (search.isTyping) {
      setIsSearchLoading(true);
    } else if (!isLoading && !isFetching) {
      setIsSearchLoading(false);
    } else if (!!search.query && (isLoading || isFetching)) {
      setIsSearchLoading(true);
    }
  }, [search.query, search.isTyping, isLoading, isFetching]);

  const handleWorkspaceChange = (newWorkspace: string) => {
    if (newWorkspace === workspace) {
      setIsWorkspaceOpen(false);
      return;
    }
    // Immediately show loading and clear stale data to prevent conversation jumping
    setIsSwitchingWorkspace(true);
    setIsWorkspaceOpen(false);
    // Reset the conversations cache for both workspaces so stale data never bleeds across
    queryClient.removeQueries([QueryKeys.allConversations]);
    setWorkspace(newWorkspace);
    newConversation();
    // Brief delay to ensure the new query fires with the right tenantId
    setTimeout(() => setIsSwitchingWorkspace(false), 100);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden pb-3 pt-2"
      role="region"
      aria-label={localize('com_ui_chat_history')}
    >
      {/* Workspace Selector */}
      {hasFamilyPlan && (
        <div className="relative px-3 mb-2 flex-shrink-0">
          <button
            onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-surface-secondary/40 hover:bg-surface-secondary/70 border border-border-light rounded-xl text-sm font-medium transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-lg bg-red-500/10 text-[#C41E3A] flex items-center justify-center">
                {workspace === 'personal' ? (
                  <User className="size-4" />
                ) : (
                  <Briefcase className="size-4" />
                )}
              </div>
              <span className="truncate max-w-[150px]">
                {workspace === 'personal'
                  ? localize('com_family_personal_workspace' as any)
                  : familyPlanName}
              </span>
            </div>
            <ChevronRight className={cn("size-4 text-text-tertiary transition-transform", isWorkspaceOpen ? "-rotate-90" : "rotate-90")} />
          </button>

          {isWorkspaceOpen && (
            <div className="absolute left-3 right-3 mt-1 z-50 bg-surface-primary border border-border-light rounded-xl shadow-lg p-1.5 flex flex-col gap-1">
              <button
                onClick={() => handleWorkspaceChange('personal')}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left",
                  workspace === 'personal'
                    ? "bg-surface-secondary font-semibold text-text-primary"
                    : "hover:bg-surface-secondary/50 text-text-secondary"
                )}
              >
                <div className="flex items-center gap-2">
                  <User className="size-3.5" />
                  <span>{localize('com_family_personal_workspace' as any)}</span>
                </div>
                {workspace === 'personal' && <Check className="size-3.5 text-[#C41E3A]" />}
              </button>
              <button
                onClick={() => handleWorkspaceChange(familyPlan._id)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left",
                  workspace === familyPlan._id
                    ? "bg-surface-secondary font-semibold text-text-primary"
                    : "hover:bg-surface-secondary/50 text-text-secondary"
                )}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="size-3.5" />
                  <span>{familyPlanName}</span>
                </div>
                {workspace === familyPlan._id && <Check className="size-3.5 text-[#C41E3A]" />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending Invitations Banner */}
      {pendingInvites && pendingInvites.length > 0 && (
        <div className="mx-3 mb-2 p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-start gap-2">
            <ShieldAlert className="size-4 text-[#C41E3A] mt-0.5 flex-shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-text-primary">
                {localize('com_family_invitation_title' as any)}
              </span>
              <span className="text-[11px] text-text-secondary leading-normal">
                {localize('com_family_invitation_body' as any, {
                  planName: pendingInvites[0].name || 'Family Plan',
                  ownerName: pendingInvites[0].owner?.name || pendingInvites[0].owner?.email,
                })}
              </span>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="text-[10px] h-7 py-1 px-2.5"
              onClick={() => declineInviteMutation.mutate(pendingInvites[0]._id)}
              disabled={declineInviteMutation.isLoading || acceptInviteMutation.isLoading}
            >
              {localize('com_family_invitation_decline' as any)}
            </Button>
            <Button
              size="sm"
              variant="submit"
              className="text-[10px] h-7 py-1 px-2.5"
              onClick={() => acceptInviteMutation.mutate(pendingInvites[0]._id)}
              disabled={declineInviteMutation.isLoading || acceptInviteMutation.isLoading}
            >
              {acceptInviteMutation.isLoading ? <Spinner className="size-3" /> : localize('com_family_invitation_accept' as any)}
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-0.5 px-3">
        {hasAccessToBookmarks && (
          <Suspense fallback={null}>
            <BookmarkNav tags={tags} setTags={setTags} />
          </Suspense>
        )}
        {search.enabled && <SearchBar isSmallScreen={isSmallScreen} />}
      </div>
      {!search.query && (
        <div className="px-3">
          <FavoritesList isSmallScreen={isSmallScreen} toggleNav={toggleNav} />
        </div>
      )}
      {!search.query && <ProjectsSection toggleNav={toggleNav} isAuthenticated={isAuthenticated} />}
      <div className="flex min-h-0 flex-grow flex-col overflow-hidden">
        <Conversations
          conversations={conversations}
          moveToTop={moveToTop}
          toggleNav={toggleNav}
          containerRef={conversationsRef}
          loadMoreConversations={loadMoreConversations}
          isLoading={isFetchingNextPage || showLoading || isLoading || isSwitchingWorkspace}
          isSearchLoading={isSearchLoading}
          isChatsExpanded={isChatsExpanded}
          setIsChatsExpanded={setIsChatsExpanded}
          showFavorites={false}
        />
      </div>
    </div>
  );
});

ConversationsSection.displayName = 'ConversationsSection';

export default ConversationsSection;

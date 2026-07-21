import { useCallback, useEffect, useState, useMemo, memo, lazy, Suspense, useRef } from 'react';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { useMediaQuery, Button, Spinner } from '@nashm/client';
import { PermissionTypes, Permissions } from 'nashm-data-provider';
import type { InfiniteQueryObserverResult } from '@tanstack/react-query';
import type { ConversationListResponse } from 'nashm-data-provider';
import type { List } from 'react-virtualized';
import { ShieldAlert } from 'lucide-react';
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
  useGetPendingInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '~/data-provider';
import { Conversations } from '~/components/Conversations';
import ProjectsSection from '~/components/Conversations/ProjectsSection';
import FavoritesList from '~/components/Nav/Favorites/FavoritesList';
import SearchBar from '~/components/Nav/SearchBar';
import store from '~/store';

const BookmarkNav = lazy(() => import('~/components/Nav/Bookmarks/BookmarkNav'));

const ConversationsSection = memo(() => {
  const localize = useLocalize();
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const setSidebarExpanded = useSetRecoilState(store.sidebarExpanded);
  const { isAuthenticated } = useAuthContext();
  useTitleGeneration(isAuthenticated);

  const search = useRecoilValue(store.search);
  const { newConversation } = useNewConvo();

  // Family plan and invitation queries
  const { data: pendingInvites, refetch: refetchPending } = useGetPendingInvitationsQuery({
    enabled: isAuthenticated,
  });

  const acceptInviteMutation = useAcceptInvitationMutation({
    onSuccess: () => {
      refetchPending();
      newConversation();
    },
  });

  const declineInviteMutation = useDeclineInvitationMutation({
    onSuccess: () => {
      refetchPending();
    },
  });

  const [isChatsExpanded, setIsChatsExpanded] = useLocalStorage('chatsExpanded', true);
  const [showLoading, setShowLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });

  const { data, fetchNextPage, isFetchingNextPage, isLoading, isFetching } =
    useConversationsInfiniteQuery(
      {
        tags: tags.length === 0 ? undefined : tags,
        search: search.debouncedQuery || undefined,
        tenantId: undefined,
      },
      {
        enabled: isAuthenticated,
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
    return data ? data.pages.flatMap((page) => page.conversations) : [];
  }, [data]);

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

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden pb-3 pt-2"
      role="region"
      aria-label={localize('com_ui_chat_history')}
    >
      {/* Pending Invitations Banner */}
      {pendingInvites && pendingInvites.length > 0 && (
        <div className="mx-3 mb-2 flex flex-shrink-0 flex-col gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 flex-shrink-0 text-[#C41E3A]" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-text-primary">
                {localize('com_family_invitation_title' as any)}
              </span>
              <span className="text-[11px] leading-normal text-text-secondary">
                {localize('com_family_invitation_body' as any, {
                  planName: pendingInvites[0].name || 'Family Plan',
                  ownerName: pendingInvites[0].owner?.name || pendingInvites[0].owner?.email,
                })}
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 py-1 text-[10px]"
              onClick={() => declineInviteMutation.mutate(pendingInvites[0]._id)}
              disabled={declineInviteMutation.isLoading || acceptInviteMutation.isLoading}
            >
              {localize('com_family_invitation_decline' as any)}
            </Button>
            <Button
              size="sm"
              variant="submit"
              className="h-7 px-2.5 py-1 text-[10px]"
              onClick={() => acceptInviteMutation.mutate(pendingInvites[0]._id)}
              disabled={declineInviteMutation.isLoading || acceptInviteMutation.isLoading}
            >
              {acceptInviteMutation.isLoading ? (
                <Spinner className="size-3" />
              ) : (
                localize('com_family_invitation_accept' as any)
              )}
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
          isLoading={isFetchingNextPage || showLoading || isLoading}
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

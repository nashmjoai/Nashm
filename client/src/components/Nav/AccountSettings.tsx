import { useState, memo, useRef } from 'react';
import * as Menu from '@ariakit/react/menu';
import { FileText, Archive, LogOut, Shield, Users } from 'lucide-react';
import { LinkIcon, GearIcon, DropdownMenuSeparator, Avatar } from '@nashm/client';
import { ArchivedChatsModal } from '~/components/Nav/SettingsTabs/General/ArchivedChatsModal';
import { MyFilesModal } from '~/components/Chat/Input/Files/MyFilesModal';
import { SupportModal } from './SupportModal';
import { UpgradeModal } from './UpgradeModal';
import { FamilyDashboardModal } from './FamilyDashboardModal';
import { useGetStartupConfig, useGetUserBalance } from '~/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import { useLocalize } from '~/hooks';
import Settings from './Settings';
import SubscriptionBadge from './SubscriptionBadge';

function AccountSettings({ collapsed = false }: { collapsed?: boolean }) {
  const localize = useLocalize();
  const isArabic = localize('com_nav_subscription' as any) === undefined;
  const { user, isAuthenticated, logout } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();
  const balanceQuery = useGetUserBalance({
    enabled: !!isAuthenticated && startupConfig?.balance?.enabled,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showFamilyDashboard, setShowFamilyDashboard] = useState(false);
  const accountSettingsButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Menu.MenuProvider placement={collapsed ? 'right-end' : undefined}>
      <Menu.MenuButton
        ref={accountSettingsButtonRef}
        aria-label={localize('com_nav_account_settings')}
        data-testid="nav-user"
        className={
          collapsed
            ? 'flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-active-alt aria-[expanded=true]:bg-surface-active-alt'
            : 'mt-text-sm flex h-auto w-full items-center gap-2 rounded-xl p-2 text-sm transition-all duration-200 ease-in-out hover:bg-surface-active-alt aria-[expanded=true]:bg-surface-active-alt'
        }
      >
        <div
          className={collapsed ? 'size-7 flex-shrink-0' : '-ml-0.9 -mt-0.8 h-8 w-8 flex-shrink-0'}
        >
          <div className="relative flex">
            <Avatar user={user} size={collapsed ? 28 : 32} />
          </div>
        </div>
        {!collapsed && (
          <div
            className="mt-2 grow overflow-hidden text-ellipsis whitespace-nowrap text-left text-text-primary"
            style={{ marginTop: '0', marginLeft: '0' }}
          >
            {user?.name ?? user?.username ?? localize('com_nav_user')}
          </div>
        )}
      </Menu.MenuButton>
      <Menu.Menu
        portal
        className="account-settings-popover popover-ui z-[125] w-[305px] rounded-lg md:w-[244px]"
        style={{
          transformOrigin: collapsed ? 'left bottom' : 'bottom',
          translate: collapsed ? '4px 0' : '0 -4px',
        }}
      >
        <div className="text-token-text-secondary ml-3 mr-2 py-2 text-sm" role="note">
          {user?.email ?? localize('com_nav_user')}
        </div>
        <DropdownMenuSeparator />
        <Menu.MenuItem onClick={() => setShowFiles(true)} className="select-item text-sm">
          <FileText className="icon-md" aria-hidden="true" />
          {localize('com_nav_my_files')}
        </Menu.MenuItem>
        <Menu.MenuItem onClick={() => setShowArchived(true)} className="select-item text-sm">
          <Archive className="icon-md" aria-hidden="true" />
          {localize('com_nav_archived_chats')}
        </Menu.MenuItem>
        <Menu.MenuItem onClick={() => setShowSupport(true)} className="select-item text-sm">
          <LinkIcon aria-hidden="true" />
          {localize('com_nav_help_faq')}
        </Menu.MenuItem>
        {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
          <Menu.MenuItem
            onClick={() => window.open('/admin-console', '_self')}
            className="select-item text-sm"
          >
            <Shield className="icon-md" aria-hidden="true" />
            {localize('com_ui_admin_panel')}
          </Menu.MenuItem>
        )}
        {startupConfig?.balance?.enabled === true && balanceQuery.data != null && (
          <Menu.MenuItem
            onClick={() => setShowUpgrade(true)}
            className="select-item justify-between text-sm"
          >
            <span className="text-text-secondary">
              {localize('com_nav_subscription' as any) || 'Plan'}:
            </span>
            <SubscriptionBadge plan={balanceQuery.data.plan || 'free'} />
          </Menu.MenuItem>
        )}
        {startupConfig?.balance?.enabled === true && balanceQuery.data?.isFamilyOwner === true && (
          <Menu.MenuItem
            onClick={() => setShowFamilyDashboard(true)}
            className="select-item text-sm"
          >
            <Users className="icon-md" aria-hidden="true" />
            {isArabic ? 'لوحة تحكم العائلة' : 'Family Dashboard'}
          </Menu.MenuItem>
        )}
        <Menu.MenuItem onClick={() => setShowSettings(true)} className="select-item text-sm">
          <GearIcon className="icon-md" aria-hidden="true" />
          {localize('com_nav_settings')}
        </Menu.MenuItem>
        <DropdownMenuSeparator />
        <Menu.MenuItem onClick={() => logout()} className="select-item text-sm">
          <LogOut className="icon-md" aria-hidden="true" />
          {localize('com_nav_log_out')}
        </Menu.MenuItem>
      </Menu.Menu>
      {showFiles && (
        <MyFilesModal
          open={showFiles}
          onOpenChange={setShowFiles}
          triggerRef={accountSettingsButtonRef}
        />
      )}
      {showArchived && (
        <ArchivedChatsModal
          open={showArchived}
          onOpenChange={setShowArchived}
          triggerRef={accountSettingsButtonRef}
        />
      )}
      {showSettings && <Settings open={showSettings} onOpenChange={setShowSettings} />}
      {showSupport && <SupportModal open={showSupport} onOpenChange={setShowSupport} />}
      {showUpgrade && balanceQuery.data != null && (
        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          currentPlan={balanceQuery.data.plan || 'free'}
          onUpgradeSuccess={() => balanceQuery.refetch()}
        />
      )}
      {showFamilyDashboard && (
        <FamilyDashboardModal open={showFamilyDashboard} onOpenChange={setShowFamilyDashboard} />
      )}
    </Menu.MenuProvider>
  );
}

export default memo(AccountSettings);

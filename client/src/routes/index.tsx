import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import {
  Login,
  VerifyEmail,
  Registration,
  ResetPassword,
  ApiErrorWatcher,
  TwoFactorScreen,
  RequestPasswordReset,
} from '~/components/Auth';
import { MarketplaceProvider } from '~/components/Agents/MarketplaceContext';
import AgentMarketplace from '~/components/Agents/Marketplace';
import { OAuthSuccess, OAuthError } from '~/components/OAuth';
import { AuthContextProvider } from '~/hooks/AuthContext';
import LandingPage from '~/components/LandingPage';
import WithRum from '~/lib/rum/WithRum';
import RouteErrorBoundary from './RouteErrorBoundary';
import StartupLayout from './Layouts/Startup';
import LoginLayout from './Layouts/Login';
import dashboardRoutes from './Dashboard';
import ShareRoute from './ShareRoute';
import ChatRoute from './ChatRoute';
import Search from './Search';
import Root from './Root';

const AuthLayout = () => (
  <AuthContextProvider>
    <WithRum>
      <Outlet />
    </WithRum>
    <ApiErrorWatcher />
  </AuthContextProvider>
);

const loadInlinePromptsView = () =>
  import('~/components/Prompts/layouts/InlinePromptsView').then((m) => ({
    Component: m.default,
  }));

const loadSkillsView = () =>
  import('~/components/Skills/layouts/SkillsView').then((m) => ({
    Component: m.default,
  }));

const loadProjectsView = () =>
  import('~/components/Projects').then((m) => ({
    Component: m.ProjectsView,
  }));

const loadProjectWorkspace = () =>
  import('~/components/Projects').then((m) => ({
    Component: m.ProjectWorkspace,
  }));

const loadAdminConsoleLayout = () =>
  import('~/components/AdminConsole/Layout').then((m) => ({
    Component: m.default,
  }));

const loadAdminConsoleOverview = () =>
  import('~/components/AdminConsole/Overview').then((m) => ({
    Component: m.default,
  }));

const loadAdminConsoleUsers = () =>
  import('~/components/AdminConsole/Users').then((m) => ({
    Component: m.default,
  }));

const loadAdminConsoleModels = () =>
  import('~/components/AdminConsole/Models').then((m) => ({
    Component: m.default,
  }));

const loadAdminConsoleTickets = () =>
  import('~/components/AdminConsole/Tickets').then((m) => ({
    Component: m.default,
  }));

const loadAdminConsolePlans = () =>
  import('~/components/AdminConsole/Plans').then((m) => ({
    Component: m.default,
  }));

const loadAdminConsoleAdmins = () =>
  import('~/components/AdminConsole/Admins').then((m) => ({
    Component: m.default,
  }));

const loadAdminConsoleFeatures = () =>
  import('~/components/AdminConsole/Features').then((m) => ({
    Component: m.default,
  }));


const baseEl = document.querySelector('base');
const baseHref = baseEl?.getAttribute('href') || '/';

export const router = createBrowserRouter(
  [
    {
      path: 'share/:shareId',
      element: <ShareRoute />,
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'oauth',
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          path: 'success',
          element: <OAuthSuccess />,
        },
        {
          path: 'error',
          element: <OAuthError />,
        },
      ],
    },
    {
      element: <AuthLayout />,
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          path: '/',
          element: <StartupLayout />,
          children: [
            {
              index: true,
              element: <LandingPage />,
            },
            {
              path: 'register',
              element: <Registration />,
            },
            {
              path: 'forgot-password',
              element: <RequestPasswordReset />,
            },
            {
              path: 'reset-password',
              element: <ResetPassword />,
            },
          ],
        },
      ],
    },
    {
      path: 'verify',
      element: <VerifyEmail />,
      errorElement: <RouteErrorBoundary />,
    },
    {
      element: <AuthLayout />,
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          path: '/',
          element: <LoginLayout />,
          children: [
            {
              path: 'login',
              element: <Login />,
            },
            {
              path: 'login/2fa',
              element: <TwoFactorScreen />,
            },
          ],
        },
        dashboardRoutes,
        {
          path: 'admin-console',
          lazy: loadAdminConsoleLayout,
          children: [
            {
              index: true,
              element: <Navigate to="overview" replace={true} />,
            },
            {
              path: 'overview',
              lazy: loadAdminConsoleOverview,
            },
            {
              path: 'users',
              lazy: loadAdminConsoleUsers,
            },
            {
              path: 'models',
              lazy: loadAdminConsoleModels,
            },
            {
              path: 'plans',
              lazy: loadAdminConsolePlans,
            },
            {
              path: 'admins',
              lazy: loadAdminConsoleAdmins,
            },
            {
              path: 'tickets',
              lazy: loadAdminConsoleTickets,
            },
            {
              path: 'features',
              lazy: loadAdminConsoleFeatures,
            },
          ],
        },

        {
          path: '/',
          element: <Root />,
          children: [
            {
              index: true,
              element: <Navigate to="/c/new" replace={true} />,
            },
            {
              path: 'c/:conversationId?',
              element: <ChatRoute />,
            },
            {
              path: 'search',
              element: <Search />,
            },
            {
              path: 'prompts',
              element: <Navigate to="/prompts/new" replace={true} />,
            },
            {
              path: 'prompts/new',
              lazy: loadInlinePromptsView,
            },
            {
              path: 'prompts/:promptId',
              lazy: loadInlinePromptsView,
            },
            {
              path: 'skills',
              lazy: loadSkillsView,
            },
            {
              path: 'skills/new',
              lazy: loadSkillsView,
            },
            {
              path: 'skills/:skillId',
              lazy: loadSkillsView,
            },
            {
              path: 'skills/:skillId/edit',
              lazy: loadSkillsView,
            },
            {
              path: 'projects',
              lazy: loadProjectsView,
            },
            {
              path: 'projects/:projectId',
              lazy: loadProjectWorkspace,
            },
            {
              path: 'agents',
              element: (
                <MarketplaceProvider>
                  <AgentMarketplace />
                </MarketplaceProvider>
              ),
            },
            {
              path: 'agents/:category',
              element: (
                <MarketplaceProvider>
                  <AgentMarketplace />
                </MarketplaceProvider>
              ),
            },
          ],
        },
      ],
    },
  ],
  { basename: baseHref },
);

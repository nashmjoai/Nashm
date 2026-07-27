import { Types } from 'mongoose';
import { logger } from '@nashm/data-schemas';
import type { FilterQuery, Model } from 'mongoose';
import type { Response } from 'express';
import type { TModelsConfig } from 'nashm-data-provider';
import type {
  IUser,
  IFamilyPlan,
  IModelAccess,
  ISubscription,
  ISupportTicket,
  IPlanConfig,
  IBalance,
  SubscriptionPlan,
  SubscriptionStatus,
  SupportTicketStatus,
  RenewalPeriod,
} from '@nashm/data-schemas';
import type { ServerRequest } from '~/types/http';
import { getDefaultAllowedPlans, getEffectiveSubscription } from '~/subscriptions';
import { parsePagination } from './pagination';

const ACTIVE_STATUSES = ['active', 'trialing'] as const;
const PLANS = ['free', 'individual', 'family', 'developer'] as const;
const SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'cancelled'] as const;
const SUPPORT_STATUSES = ['open', 'reviewed', 'resolved'] as const;
const RENEWAL_PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;
const ADMIN_ROLES = ['ADMIN', 'EDITOR'] as const;
const USER_FIELDS = '_id name username email avatar role provider createdAt updatedAt';


type SessionDoc = { user: Types.ObjectId; expiration: Date };
type TransactionDoc = {
  user: Types.ObjectId;
  model?: string;
  rawAmount?: number;
  tokenValue?: number;
};
type MessageDoc = { text?: string; isCreatedByUser?: boolean; createdAt?: Date };
type SupportEmailStatus = 'skipped' | 'sent' | 'failed';
type TokenAggregate = { _id: Types.ObjectId | string | null; totalTokens: number; tokenValue: number };
type ModelAggregate = { _id: string | null; totalTokens: number; requests: number };
type MessageAggregate = { text: string; count: number };
type SessionAggregate = { _id: Types.ObjectId | string; activeSessions: number };
type UserLean = Pick<
  IUser,
  '_id' | 'name' | 'username' | 'email' | 'avatar' | 'role' | 'provider' | 'createdAt' | 'updatedAt'
>;

export type SupportEmailPayload = {
  to: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  message: string;
  userId: string;
};

export type SupportEmailResult = { status: SupportEmailStatus; error?: string };
export type SupportEmailSender = (payload: SupportEmailPayload) => Promise<SupportEmailResult>;

export type AdminConsoleDeps = {
  User: Model<IUser>;
  Session: Model<SessionDoc>;
  Transaction: Model<TransactionDoc>;
  Message: Model<MessageDoc>;
  Subscription: Model<ISubscription>;
  FamilyPlan: Model<IFamilyPlan>;
  ModelAccess: Model<IModelAccess>;
  PlanConfig: Model<IPlanConfig>;
  Balance: Model<IBalance>;
  SupportTicket: Model<ISupportTicket>;
  Config: Model<any>;
  invalidateConfigCaches?: (tenantId?: string) => Promise<void>;
  loadModels: (req: ServerRequest) => Promise<TModelsConfig>;
  sendSupportEmail?: SupportEmailSender;
};

type ModelRulePayload = {
  endpoint?: string;
  model?: string;
  enabled?: boolean;
  label?: string;
  allowedPlans?: SubscriptionPlan[];
  notes?: string;
};

type SubscriptionPayload = {
  userId?: string;
  plan?: SubscriptionPlan;
  status?: SubscriptionStatus;
  expiresAt?: string | null;
  notes?: string;
  allowedModels?: Array<{ endpoint: string; model: string }>;
  tokenBalance?: number;
};


type SupportPayload = { subject?: string; message?: string };

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPlan(value: string | undefined): value is SubscriptionPlan {
  return PLANS.includes(value as SubscriptionPlan);
}

function isSubscriptionStatus(value: string | undefined): value is SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus);
}

function isSupportStatus(value: string | undefined): value is SupportTicketStatus {
  return SUPPORT_STATUSES.includes(value as SupportTicketStatus);
}

function isRenewalPeriod(value: string | undefined): value is RenewalPeriod {
  return RENEWAL_PERIODS.includes(value as RenewalPeriod);
}

function isAdminRole(value: string | undefined): value is 'ADMIN' | 'EDITOR' {
  return ADMIN_ROLES.includes(value as 'ADMIN' | 'EDITOR');
}


function getActorId(req: ServerRequest): Types.ObjectId | undefined {
  const id = req.user?.id ?? req.user?._id?.toString();
  return id && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined;
}

function dateToIso(date: Date | string | undefined | null): string | undefined {
  if (!date) {
    return undefined;
  }
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

function parseOptionalDate(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function createUserFilter(rawSearch: unknown): FilterQuery<IUser> {
  const search = asString(rawSearch)?.trim();
  if (!search) {
    return {};
  }
  const regex = new RegExp(escapeRegex(search), 'i');
  return { $or: [{ name: regex }, { email: regex }, { username: regex }] };
}

function normalizeAllowedPlans(value: SubscriptionPlan[] | undefined): SubscriptionPlan[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((plan): plan is SubscriptionPlan => isPlan(plan));
}

function modelKey(endpoint: string, model: string): string {
  return `${endpoint}\u0000${model}`;
}

function mapSubscription(subscription?: ISubscription | null) {
  if (!subscription) {
    return undefined;
  }
  return {
    id: subscription._id.toString(),
    userId: subscription.user.toString(),
    plan: subscription.plan,
    status: subscription.status,
    source: subscription.source,
    notes: subscription.notes,
    expiresAt: dateToIso(subscription.expiresAt),
    createdAt: dateToIso(subscription.createdAt),
    updatedAt: dateToIso(subscription.updatedAt),
  };
}

function mapTicket(ticket: ISupportTicket) {
  return {
    id: ticket._id.toString(),
    userId: ticket.user.toString(),
    email: ticket.email,
    name: ticket.name,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    emailStatus: ticket.emailStatus,
    emailError: ticket.emailError,
    createdAt: dateToIso(ticket.createdAt),
    updatedAt: dateToIso(ticket.updatedAt),
  };
}

async function getTokenTotalsByUser(
  Transaction: Model<TransactionDoc>,
  userIds: Types.ObjectId[],
): Promise<Map<string, Omit<TokenAggregate, '_id'>>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const rows = await Transaction.aggregate<TokenAggregate>([
    { $match: { user: { $in: userIds } } },
    {
      $group: {
        _id: '$user',
        totalTokens: { $sum: { $abs: { $ifNull: ['$rawAmount', 0] } } },
        tokenValue: { $sum: { $abs: { $ifNull: ['$tokenValue', 0] } } },
      },
    },
  ]);

  return new Map(
    rows.map((row) => [
      row._id?.toString() ?? '',
      { totalTokens: row.totalTokens, tokenValue: row.tokenValue },
    ]),
  );
}

async function getActiveSessionsByUser(
  Session: Model<SessionDoc>,
  userIds: Types.ObjectId[],
): Promise<Map<string, number>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const rows = await Session.aggregate<SessionAggregate>([
    { $match: { user: { $in: userIds }, expiration: { $gt: new Date() } } },
    { $group: { _id: '$user', activeSessions: { $sum: 1 } } },
  ]);

  return new Map(rows.map((row) => [row._id.toString(), row.activeSessions]));
}

async function ensureFamilyPlan({
  deps,
  user,
  expiresAt,
}: {
  deps: Pick<AdminConsoleDeps, 'FamilyPlan'>;
  user: UserLean;
  expiresAt?: Date;
}): Promise<void> {
  const owner = user._id;
  let plan = await deps.FamilyPlan.findOne({ owner });
  if (!plan) {
    plan = new deps.FamilyPlan({
      owner,
      status: 'active',
      currentPeriodEnd: expiresAt,
      members: [{ user: owner, email: user.email, role: 'parent', addedAt: new Date() }],
    });
  } else {
    plan.status = 'active';
    plan.currentPeriodEnd = expiresAt;
    if (!plan.members.some((member) => member.user.toString() === owner.toString())) {
      plan.members.push({ user: owner, email: user.email, role: 'parent', addedAt: new Date() });
    }
  }
  await plan.save();
}

export function createAdminConsoleHandlers(deps: AdminConsoleDeps): {
  overview: (req: ServerRequest, res: Response) => Promise<Response>;
  users: (req: ServerRequest, res: Response) => Promise<Response>;
  upsertSubscription: (req: ServerRequest, res: Response) => Promise<Response>;
  models: (req: ServerRequest, res: Response) => Promise<Response>;
  updateModel: (req: ServerRequest, res: Response) => Promise<Response>;
  supportTickets: (req: ServerRequest, res: Response) => Promise<Response>;
  updateSupportTicket: (req: ServerRequest, res: Response) => Promise<Response>;
  getPlans: (req: ServerRequest, res: Response) => Promise<Response>;
  updatePlan: (req: ServerRequest, res: Response) => Promise<Response>;
  getAdmins: (req: ServerRequest, res: Response) => Promise<Response>;
  addAdmin: (req: ServerRequest, res: Response) => Promise<Response>;
  updateAdmin: (req: ServerRequest, res: Response) => Promise<Response>;
  removeAdmin: (req: ServerRequest, res: Response) => Promise<Response>;
  getFeatures: (req: ServerRequest, res: Response) => Promise<Response>;
  updateFeatures: (req: ServerRequest, res: Response) => Promise<Response>;
} {
  async function overview(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const [userCount, activeSessionCount, directSubscriberCount, familyPlanCount] =
        await Promise.all([
          deps.User.countDocuments(),
          deps.Session.countDocuments({ expiration: { $gt: new Date() } }),
          deps.Subscription.countDocuments({ plan: { $ne: 'free' }, status: { $in: ACTIVE_STATUSES } }),
          deps.FamilyPlan.countDocuments({ status: { $in: ACTIVE_STATUSES } }),
        ]);

      const [tokenTotal] = await deps.Transaction.aggregate<TokenAggregate>([
        {
          $group: {
            _id: null,
            totalTokens: { $sum: { $abs: { $ifNull: ['$rawAmount', 0] } } },
            tokenValue: { $sum: { $abs: { $ifNull: ['$tokenValue', 0] } } },
          },
        },
      ]);

      const [topModels, topMessages, modelConfig] = await Promise.all([
        deps.Transaction.aggregate<ModelAggregate>([
          { $match: { model: { $type: 'string', $ne: '' } } },
          {
            $group: {
              _id: '$model',
              totalTokens: { $sum: { $abs: { $ifNull: ['$rawAmount', 0] } } },
              requests: { $sum: 1 },
            },
          },
          { $sort: { totalTokens: -1, requests: -1 } },
          { $limit: 8 },
        ]),
        deps.Message.aggregate<MessageAggregate>([
          { $match: { isCreatedByUser: true, text: { $type: 'string', $ne: '' } } },
          { $group: { _id: '$text', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 8 },
          { $project: { _id: 0, text: { $substrCP: ['$_id', 0, 220] }, count: 1 } },
        ]),
        deps.loadModels(req),
      ]);

      return res.status(200).json({
        totals: {
          users: userCount,
          activeSessions: activeSessionCount,
          subscribers: directSubscriberCount + familyPlanCount,
          tokens: tokenTotal?.totalTokens ?? 0,
          tokenValue: tokenTotal?.tokenValue ?? 0,
        },
        topModels: topModels.map((item) => ({
          model: item._id ?? 'unknown',
          totalTokens: item.totalTokens,
          requests: item.requests,
        })),
        topMessages,
        endpointHealth: Object.entries(modelConfig).map(([endpoint, models]) => ({
          endpoint,
          modelCount: models.length,
          status: models.length > 0 ? 'available' : 'missing',
        })),
      });
    } catch (error) {
      logger.error('[adminConsole] overview error:', error);
      return res.status(500).json({ error: 'Failed to load admin overview' });
    }
  }

  async function users(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const { limit, offset } = parsePagination(req.query);
      const filter = createUserFilter(req.query.search);
      const [usersList, total] = await Promise.all([
        deps.User.find(filter).select(USER_FIELDS).sort({ createdAt: -1 }).skip(offset).limit(limit)
          .lean<UserLean[]>(),
        deps.User.countDocuments(filter),
      ]);

      const userIds = usersList.map((user) => user._id);
      const [tokenTotals, sessions, subscriptions, familyPlans, balances] = await Promise.all([
        getTokenTotalsByUser(deps.Transaction, userIds),
        getActiveSessionsByUser(deps.Session, userIds),
        deps.Subscription.find({ user: { $in: userIds } }).lean<ISubscription[]>(),
        deps.FamilyPlan.find({
          status: { $in: ACTIVE_STATUSES },
          $or: [{ owner: { $in: userIds } }, { 'members.user': { $in: userIds } }],
        }).lean<IFamilyPlan[]>(),
        deps.Balance.find({ user: { $in: userIds } }).lean<IBalance[]>(),
      ]);

      const balanceMap = new Map(
        balances.map((b) => [b.user.toString(), b.tokenCredits]),
      );

      const subscriptionMap = new Map(
        subscriptions.map((subscription) => [subscription.user.toString(), subscription]),
      );
      const familyMap = new Map<string, IFamilyPlan>();
      for (const plan of familyPlans) {
        familyMap.set(plan.owner.toString(), plan);
        for (const member of plan.members) {
          familyMap.set(member.user.toString(), plan);
        }
      }

      const mapped = usersList.map((user) => {
        const id = user._id.toString();
        const usage = tokenTotals.get(id);
        const directSubscription = subscriptionMap.get(id);
        const familyPlan = familyMap.get(id);
        const familySubscription =
          familyPlan == null
            ? undefined
            : {
              id: familyPlan._id.toString(),
              userId: id,
              plan: 'family',
              status: familyPlan.status,
              source: 'family',
              expiresAt: dateToIso(familyPlan.currentPeriodEnd),
              createdAt: dateToIso(familyPlan.createdAt),
              updatedAt: dateToIso(familyPlan.updatedAt),
            };

        return {
          id,
          name: user.name ?? '',
          username: user.username ?? '',
          email: user.email ?? '',
          avatar: user.avatar ?? '',
          role: user.role ?? 'USER',
          provider: user.provider ?? 'local',
          createdAt: dateToIso(user.createdAt),
          updatedAt: dateToIso(user.updatedAt),
          activeSessions: sessions.get(id) ?? 0,
          tokenUsage: {
            totalTokens: usage?.totalTokens ?? 0,
            tokenValue: usage?.tokenValue ?? 0,
          },
          tokenBalance: balanceMap.get(id) ?? 0,
          subscription: mapSubscription(directSubscription) ??
            familySubscription ?? { userId: id, plan: 'free', status: 'active', source: 'none' },
        };
      });


      return res.status(200).json({ users: mapped, total, limit, offset });
    } catch (error) {
      logger.error('[adminConsole] users error:', error);
      return res.status(500).json({ error: 'Failed to load users' });
    }
  }

  async function upsertSubscription(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const body = req.body as SubscriptionPayload;
      if (!body.userId || !Types.ObjectId.isValid(body.userId)) {
        return res.status(400).json({ error: 'Valid userId is required' });
      }
      if (!isPlan(body.plan)) {
        return res.status(400).json({ error: 'Valid plan is required' });
      }
      const status = body.status ?? 'active';
      if (!isSubscriptionStatus(status)) {
        return res.status(400).json({ error: 'Valid status is required' });
      }

      const user = await deps.User.findById(body.userId).select(USER_FIELDS).lean<UserLean | null>();
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentSubscription = await deps.Subscription.findOne({ user: user._id }).lean<ISubscription | null>();
      const planChanged = !currentSubscription || currentSubscription.plan !== body.plan;

      const expiresAt = parseOptionalDate(body.expiresAt);
      const subscription = await deps.Subscription.findOneAndUpdate(
        { user: user._id },
        {
          $set: {
            user: user._id,
            plan: body.plan,
            status,
            source: 'manual',
            allowedModels: Array.isArray(body.allowedModels) ? body.allowedModels : undefined,
            notes: body.notes,
            expiresAt,
            updatedBy: getActorId(req),
          },
          $setOnInsert: { startsAt: new Date() },
        },
        { new: true, upsert: true },
      ).lean<ISubscription>();

      if (body.plan === 'family' && status !== 'cancelled') {
        await ensureFamilyPlan({ deps, user, expiresAt });
      } else {
        await deps.FamilyPlan.updateMany({ owner: user._id }, { $set: { status: 'cancelled' } });
      }

      if (typeof body.tokenBalance === 'number') {
        let tokenCredits = body.tokenBalance;
        let planConfig = null;
        
        if (planChanged && tokenCredits === 0) {
          planConfig = await deps.PlanConfig.findOne({ plan: body.plan }).lean();
          tokenCredits = planConfig?.tokenQuota ?? (
            body.plan === 'free' ? 50000 :
            body.plan === 'individual' ? 500000 :
            body.plan === 'family' ? 1000000 :
            body.plan === 'developer' ? 2000000 : 50000
          );
        }

        if (!planConfig) {
          planConfig = await deps.PlanConfig.findOne({ plan: body.plan }).lean();
        }

        const renewalPeriod = planConfig?.renewalPeriod ?? 'monthly';
        let renewalUnit = 'months';
        let renewalValue = 1;
        if (renewalPeriod === 'weekly') renewalUnit = 'weeks';
        if (renewalPeriod === 'daily') renewalUnit = 'days';
        if (renewalPeriod === 'yearly') renewalUnit = 'years';

        await deps.Balance.findOneAndUpdate(
          { user: user._id },
          { 
            $set: { 
              tokenCredits,
              autoRefillEnabled: true,
              refillAmount: planConfig?.tokenQuota ?? tokenCredits,
              refillIntervalUnit: renewalUnit,
              refillIntervalValue: renewalValue,
            },
            $setOnInsert: { lastRefill: new Date() }
          },
          { new: true, upsert: true },
        );
      }

      const effective = await getEffectiveSubscription(user._id.toString(), deps);
      return res.status(200).json({ subscription: mapSubscription(subscription), effective });
    } catch (error) {
      logger.error('[adminConsole] upsertSubscription error:', error);
      return res.status(500).json({ error: 'Failed to save subscription' });
    }

  }

  async function models(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const [modelsConfig, rules, usage] = await Promise.all([
        deps.loadModels(req),
        deps.ModelAccess.find({}).lean<IModelAccess[]>(),
        deps.Transaction.aggregate<ModelAggregate>([
          { $match: { model: { $type: 'string', $ne: '' } } },
          {
            $group: {
              _id: '$model',
              totalTokens: { $sum: { $abs: { $ifNull: ['$rawAmount', 0] } } },
              requests: { $sum: 1 },
            },
          },
        ]),
      ]);

      const rulesByKey = new Map(rules.map((rule) => [modelKey(rule.endpoint, rule.model), rule]));
      const usageByModel = new Map(usage.map((row) => [row._id ?? '', row]));
      const seen = new Set<string>();

      // Compute provider-level disabled status maps from wildcard rules
      const providerRules = rules.filter((rule) => rule.model === '*');
      const isEndpointDisabledMap = new Map(
        Object.keys(modelsConfig).map((ep) => {
          const rule = providerRules.find((r) => r.endpoint === ep);
          return [ep, rule?.enabled === false];
        })
      );

      const mapped = Object.entries(modelsConfig).flatMap(([endpoint, modelNames]) => {
        const isEndpointDisabled = isEndpointDisabledMap.get(endpoint) === true;
        return modelNames.map((model) => {
          const key = modelKey(endpoint, model);
          const rule = rulesByKey.get(key);
          const modelUsage = usageByModel.get(model);
          seen.add(key);

          const isEnabled = isEndpointDisabled ? false : (rule?.enabled ?? true);

          return {
            endpoint,
            model,
            enabled: isEnabled,
            label: rule?.label,
            allowedPlans:
              rule && rule.allowedPlans.length > 0 ? rule.allowedPlans : getDefaultAllowedPlans(model),
            notes: rule?.notes,
            apiStatus: isEnabled === false ? 'hidden' : 'available',
            totalTokens: modelUsage?.totalTokens ?? 0,
            requests: modelUsage?.requests ?? 0,
          };
        });
      });

      const orphanRules = rules
        .filter((rule) => rule.model !== '*' && !seen.has(modelKey(rule.endpoint, rule.model)))
        .map((rule) => {
          const isEndpointDisabled = isEndpointDisabledMap.get(rule.endpoint) === true;
          const isEnabled = isEndpointDisabled ? false : rule.enabled;
          return {
            endpoint: rule.endpoint,
            model: rule.model,
            enabled: isEnabled,
            label: rule.label,
            allowedPlans: rule.allowedPlans,
            notes: rule.notes,
            apiStatus: 'missing',
            totalTokens: usageByModel.get(rule.model)?.totalTokens ?? 0,
            requests: usageByModel.get(rule.model)?.requests ?? 0,
          };
        });

      const providersStatus = Object.fromEntries(
        Array.from(isEndpointDisabledMap.entries()).map(([endpoint, isDisabled]) => [
          endpoint,
          { enabled: !isDisabled }
        ])
      );

      return res.status(200).json({
        models: [...mapped, ...orphanRules],
        providers: providersStatus,
      });
    } catch (error) {
      logger.error('[adminConsole] models error:', error);
      return res.status(500).json({ error: 'Failed to load model access' });
    }
  }

  async function updateModel(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const body = req.body as ModelRulePayload;
      const endpoint = body.endpoint?.trim();
      const model = body.model?.trim();
      if (!endpoint || !model) {
        return res.status(400).json({ error: 'endpoint and model are required' });
      }

      const rule = await deps.ModelAccess.findOneAndUpdate(
        { endpoint, model },
        {
          $set: {
            endpoint,
            model,
            enabled: body.enabled ?? true,
            label: body.label?.trim(),
            allowedPlans: normalizeAllowedPlans(body.allowedPlans),
            notes: body.notes,
          },
        },
        { new: true, upsert: true },
      ).lean<IModelAccess>();

      return res.status(200).json({
        model: {
          endpoint: rule.endpoint,
          model: rule.model,
          enabled: rule.enabled,
          label: rule.label,
          allowedPlans: rule.allowedPlans,
          notes: rule.notes,
        },
      });
    } catch (error) {
      logger.error('[adminConsole] updateModel error:', error);
      return res.status(500).json({ error: 'Failed to save model access' });
    }
  }

  async function supportTickets(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const { limit, offset } = parsePagination(req.query);
      const status = asString(req.query.status);
      const filter: FilterQuery<ISupportTicket> = {};
      if (isSupportStatus(status)) {
        filter.status = status;
      }

      const [tickets, total] = await Promise.all([
        deps.SupportTicket.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit)
          .lean<ISupportTicket[]>(),
        deps.SupportTicket.countDocuments(filter),
      ]);

      return res.status(200).json({ tickets: tickets.map(mapTicket), total, limit, offset });
    } catch (error) {
      logger.error('[adminConsole] supportTickets error:', error);
      return res.status(500).json({ error: 'Failed to load support tickets' });
    }
  }

  async function updateSupportTicket(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params as { id: string };
      const status = asString((req.body as any)?.status);

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid ticket id' });
      }
      if (!isSupportStatus(status)) {
        return res.status(400).json({ error: 'Valid status is required' });
      }

      const ticket = await deps.SupportTicket.findByIdAndUpdate(
        id,
        { $set: { status } },
        { new: true },
      ).lean<ISupportTicket | null>();

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      return res.status(200).json({ ticket: mapTicket(ticket) });
    } catch (error) {
      logger.error('[adminConsole] updateSupportTicket error:', error);
      return res.status(500).json({ error: 'Failed to update support ticket' });
    }
  }

  async function getPlans(_req: ServerRequest, res: Response): Promise<Response> {
    try {
      const defaultConfigs: Array<{ plan: SubscriptionPlan; tokenQuota: number; renewalPeriod: string }> = [
        { plan: 'free', tokenQuota: 50000, renewalPeriod: 'monthly' },
        { plan: 'individual', tokenQuota: 500000, renewalPeriod: 'monthly' },
        { plan: 'family', tokenQuota: 1000000, renewalPeriod: 'monthly' },
        { plan: 'developer', tokenQuota: 2000000, renewalPeriod: 'monthly' },
      ];

      const existing = await deps.PlanConfig.find({}).lean<IPlanConfig[]>();
      const existingByPlan = new Map(existing.map((p) => [p.plan, p]));

      const plans = defaultConfigs.map(({ plan, tokenQuota, renewalPeriod }) => {
        const config = existingByPlan.get(plan);
        return config
          ? {
            plan: config.plan,
            displayName: config.displayName,
            description: config.description,
            priceText: config.priceText,
            features: config.features,
            tokenQuota: config.tokenQuota,
            renewalPeriod: config.renewalPeriod,
            familyMinMembers: config.familyMinMembers,
            familyMemberTokenQuota: config.familyMemberTokenQuota,
            familyMemberRenewalPeriod: config.familyMemberRenewalPeriod,
            modelTokenLimits: config.modelTokenLimits,
          }
          : { plan, tokenQuota, renewalPeriod, familyMinMembers: plan === 'family' ? 2 : undefined, familyMemberTokenQuota: undefined, familyMemberRenewalPeriod: undefined, modelTokenLimits: [], features: [] };
      });

      return res.status(200).json({ plans });
    } catch (error) {
      logger.error('[adminConsole] getPlans error:', error);
      return res.status(500).json({ error: 'Failed to load plan configs' });
    }
  }

  async function updatePlan(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const { plan } = req.params as { plan: string };
      if (!isPlan(plan)) {
        return res.status(400).json({ error: 'Valid plan is required' });
      }

      const body = req.body as {
        displayName?: string;
        description?: string;
        priceText?: string;
        features?: string[];
        tokenQuota?: number;
        renewalPeriod?: string;
        familyMinMembers?: number;
        familyMemberTokenQuota?: number;
        familyMemberRenewalPeriod?: string;
        modelTokenLimits?: Array<{ endpoint: string; model: string; tokensPerPeriod: number }>;
      };

      const renewalPeriod = asString(body.renewalPeriod);
      if (renewalPeriod !== undefined && !isRenewalPeriod(renewalPeriod)) {
        return res.status(400).json({ error: 'Valid renewalPeriod is required' });
      }

      const $set: Partial<IPlanConfig> = { plan };
      if (typeof body.displayName === 'string') {
        $set.displayName = body.displayName.trim();
      }
      if (typeof body.description === 'string') {
        $set.description = body.description.trim();
      }
      if (typeof body.priceText === 'string') {
        $set.priceText = body.priceText.trim();
      }
      if (Array.isArray(body.features)) {
        $set.features = body.features.map(f => String(f).trim());
      }
      if (typeof body.tokenQuota === 'number') {
        $set.tokenQuota = Math.max(0, body.tokenQuota);
      }
      if (renewalPeriod) {
        $set.renewalPeriod = renewalPeriod;
      }
      if (plan === 'family') {
        if (typeof body.familyMinMembers === 'number') {
          $set.familyMinMembers = Math.max(2, body.familyMinMembers);
        }
        if (typeof body.familyMemberTokenQuota === 'number') {
          $set.familyMemberTokenQuota = Math.max(0, body.familyMemberTokenQuota);
        }
        const familyMemberRenewalPeriod = asString(body.familyMemberRenewalPeriod);
        if (familyMemberRenewalPeriod && isRenewalPeriod(familyMemberRenewalPeriod)) {
          $set.familyMemberRenewalPeriod = familyMemberRenewalPeriod;
        }
      }
      if (Array.isArray(body.modelTokenLimits)) {
        $set.modelTokenLimits = body.modelTokenLimits.map((m) => ({
          endpoint: String(m.endpoint).trim(),
          model: String(m.model).trim(),
          tokensPerPeriod: Math.max(0, Number(m.tokensPerPeriod) || 0),
        }));
      }
      const updated = await deps.PlanConfig.findOneAndUpdate(
        { plan },
        { $set },
        { new: true, upsert: true },
      ).lean<IPlanConfig>();

      // Update balances for all users with this plan
      if (typeof body.tokenQuota === 'number' || (plan === 'family' && typeof body.familyMemberTokenQuota === 'number')) {
        const newQuota = plan === 'family' && typeof body.familyMemberTokenQuota === 'number'
          ? body.familyMemberTokenQuota
          : body.tokenQuota;

        if (typeof newQuota === 'number') {
          if (plan === 'free') {
            // Find non-free direct active users
            const nonFreeDirectUsers = await deps.Subscription.find({
              plan: { $in: ['individual', 'family', 'developer'] },
              status: 'active',
            }).distinct('user');

            // Find all active family plan owners/members
            const activeFamilyPlans = await deps.FamilyPlan.find({ status: 'active' }).lean();
            const familyUserIds = new Set<string>();
            for (const fp of activeFamilyPlans) {
              if (fp.owner) {
                familyUserIds.add(fp.owner.toString());
              }
              if (fp.members) {
                for (const m of fp.members) {
                  if (m.user) {
                    familyUserIds.add(m.user.toString());
                  }
                }
              }
            }

            const excludedUserIds = Array.from(
              new Set([
                ...nonFreeDirectUsers.map((id) => id.toString()),
                ...Array.from(familyUserIds),
              ])
            ).map((id) => new Types.ObjectId(id));

            // Update balance for free users (those who don't have non-free plans/subscriptions)
            await deps.Balance.updateMany(
              { user: { $nin: excludedUserIds } },
              { $set: { tokenCredits: newQuota } },
            );
          } else if (plan === 'family') {
            // Find direct family subscribers
            const directUserIds = await deps.Subscription.find({
              plan: 'family',
              status: 'active',
            }).distinct('user');

            // Find all active family plan owners/members
            const activeFamilyPlans = await deps.FamilyPlan.find({ status: 'active' }).lean();
            const familyUserIds = new Set<string>();
            for (const fp of activeFamilyPlans) {
              if (fp.owner) {
                familyUserIds.add(fp.owner.toString());
              }
              if (fp.members) {
                for (const m of fp.members) {
                  if (m.user) {
                    familyUserIds.add(m.user.toString());
                  }
                }
              }
            }

            const allFamilyUsers = Array.from(
              new Set([
                ...directUserIds.map((id) => id.toString()),
                ...Array.from(familyUserIds),
              ])
            ).map((id) => new Types.ObjectId(id));

            await deps.Balance.updateMany(
              { user: { $in: allFamilyUsers } },
              { $set: { tokenCredits: newQuota } },
            );
          } else {
            // For individual / developer plans
            const activeSubscribedUsers = await deps.Subscription.find({
              plan,
              status: 'active',
            }).distinct('user');

            const activeSubscribedUserObjectIds = activeSubscribedUsers.map(
              (id) => new Types.ObjectId(id.toString()),
            );

            await deps.Balance.updateMany(
              { user: { $in: activeSubscribedUserObjectIds } },
              { $set: { tokenCredits: newQuota } },
            );
          }
        }
      }

      return res.status(200).json({ plan: updated });
    } catch (error) {
      logger.error('[adminConsole] updatePlan error:', error);
      return res.status(500).json({ error: 'Failed to update plan config' });
    }
  }

  async function getAdmins(_req: ServerRequest, res: Response): Promise<Response> {
    try {
      const admins = await deps.User.find({ role: { $in: ADMIN_ROLES } })
        .select('_id name username email avatar role provider createdAt')
        .lean<UserLean[]>();

      return res.status(200).json({
        admins: admins.map((u) => ({
          id: u._id.toString(),
          name: u.name ?? '',
          username: u.username ?? '',
          email: u.email ?? '',
          avatar: u.avatar ?? '',
          role: u.role ?? 'USER',
          provider: u.provider ?? 'local',
          createdAt: dateToIso(u.createdAt),
        })),
      });
    } catch (error) {
      logger.error('[adminConsole] getAdmins error:', error);
      return res.status(500).json({ error: 'Failed to load admin users' });
    }
  }

  async function addAdmin(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const { email, role } = req.body as { email?: string; role?: string };
      const trimmedEmail = email?.trim().toLowerCase();
      if (!trimmedEmail) {
        return res.status(400).json({ error: 'Email is required' });
      }
      if (!isAdminRole(role)) {
        return res.status(400).json({ error: 'Role must be ADMIN or EDITOR' });
      }

      const user = await deps.User.findOneAndUpdate(
        { email: trimmedEmail },
        { $set: { role } },
        { new: true },
      ).lean<UserLean | null>();

      if (!user) {
        return res.status(404).json({ error: 'No registered user found with that email address' });
      }

      return res.status(200).json({
        admin: {
          id: user._id.toString(),
          name: user.name ?? '',
          username: user.username ?? '',
          email: user.email ?? '',
          avatar: user.avatar ?? '',
          role: user.role ?? role,
          provider: user.provider ?? 'local',
        },
      });
    } catch (error) {
      logger.error('[adminConsole] addAdmin error:', error);
      return res.status(500).json({ error: 'Failed to add admin user' });
    }
  }

  async function updateAdmin(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params as { userId: string };
      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const { role } = req.body as { role?: string };
      if (!isAdminRole(role)) {
        return res.status(400).json({ error: 'Role must be ADMIN or EDITOR' });
      }

      const callerId = req.user?.id ?? req.user?._id?.toString();
      if (callerId === userId) {
        return res.status(403).json({ error: 'Cannot modify your own role' });
      }

      const user = await deps.User.findByIdAndUpdate(
        userId,
        { $set: { role } },
        { new: true },
      ).lean<UserLean | null>();

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        admin: {
          id: user._id.toString(),
          name: user.name ?? '',
          email: user.email ?? '',
          role: user.role ?? role,
        },
      });
    } catch (error) {
      logger.error('[adminConsole] updateAdmin error:', error);
      return res.status(500).json({ error: 'Failed to update admin user' });
    }
  }

  async function removeAdmin(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params as { userId: string };
      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const callerId = req.user?.id ?? req.user?._id?.toString();
      if (callerId === userId) {
        return res.status(403).json({ error: 'Cannot remove your own admin role' });
      }

      const adminCount = await deps.User.countDocuments({ role: 'ADMIN' });
      const [targetUser] = await deps.User.find({ _id: userId }).select('role').limit(1).lean();
      if (targetUser?.role === 'ADMIN' && adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin user' });
      }

      await deps.User.findByIdAndUpdate(userId, { $set: { role: 'USER' } });

      return res.status(200).json({ message: 'Admin role removed successfully' });
    } catch (error) {
      logger.error('[adminConsole] removeAdmin error:', error);
      return res.status(500).json({ error: 'Failed to remove admin role' });
    }
  }

  async function getFeatures(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const configDoc = (await deps.Config.findOne({
        principalType: 'role',
        principalId: '__base__',
      }).lean()) as any;

      const interfaceConfig = configDoc?.overrides?.interface || {};

      return res.status(200).json({
        slides: interfaceConfig.slides !== false,
        audio: interfaceConfig.audio !== false,
        document: interfaceConfig.document !== false,
        spreadsheet: interfaceConfig.spreadsheet !== false,
        research: interfaceConfig.research !== false,
      });
    } catch (error) {
      logger.error('[adminConsole] getFeatures error:', error);
      return res.status(500).json({ error: 'Failed to load features toggle settings' });
    }
  }

  async function updateFeatures(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const { slides, audio, document, spreadsheet, research } = req.body as {
        slides: boolean;
        audio: boolean;
        document: boolean;
        spreadsheet: boolean;
        research: boolean;
      };

      if (
        typeof slides !== 'boolean' ||
        typeof audio !== 'boolean' ||
        typeof document !== 'boolean' ||
        typeof spreadsheet !== 'boolean' ||
        typeof research !== 'boolean'
      ) {
        return res.status(400).json({ error: 'All feature toggles (slides, audio, document, spreadsheet, research) must be boolean values' });
      }

      await deps.Config.findOneAndUpdate(
        { principalType: 'role', principalId: '__base__' },
        {
          $set: {
            principalType: 'role',
            principalId: '__base__',
            principalModel: 'Role',
            priority: 10,
            isActive: true,
            'overrides.interface.slides': slides,
            'overrides.interface.audio': audio,
            'overrides.interface.document': document,
            'overrides.interface.spreadsheet': spreadsheet,
            'overrides.interface.research': research,
          },
        },
        { upsert: true, new: true },
      );

      const tenantId = (req.user as { tenantId?: string })?.tenantId;
      if (deps.invalidateConfigCaches) {
        await deps.invalidateConfigCaches(tenantId).catch((err) =>
          logger.error('[adminConsole] Cache invalidation failed after updateFeatures:', err),
        );
      }

      return res.status(200).json({ message: 'Features toggle configuration saved successfully' });
    } catch (error) {
      logger.error('[adminConsole] updateFeatures error:', error);
      return res.status(500).json({ error: 'Failed to update features toggle settings' });
    }
  }

  return {
    overview,
    users,
    upsertSubscription,
    models,
    updateModel,
    supportTickets,
    updateSupportTicket,
    getPlans,
    updatePlan,
    getAdmins,
    addAdmin,
    updateAdmin,
    removeAdmin,
    getFeatures,
    updateFeatures,
  };
}

export function createSupportHandlers(deps: AdminConsoleDeps): {
  createTicket: (req: ServerRequest, res: Response) => Promise<Response>;
} {
  async function createTicket(req: ServerRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id ?? req.user?._id?.toString();
      if (!userId || !Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const body = req.body as SupportPayload;
      const subject = body.subject?.trim();
      const message = body.message?.trim();
      if (!subject || subject.length > 160) {
        return res.status(400).json({ error: 'Subject is required and must be short' });
      }
      if (!message || message.length > 8000) {
        return res.status(400).json({ error: 'Message is required and must be under 8000 chars' });
      }

      const ticket = await deps.SupportTicket.create({
        user: new Types.ObjectId(userId),
        email: req.user?.email ?? '',
        name: req.user?.name ?? req.user?.username,
        subject,
        message,
        status: 'open',
        emailStatus: 'skipped',
      });

      let emailResult: SupportEmailResult = { status: 'skipped' };
      if (deps.sendSupportEmail) {
        emailResult = await deps.sendSupportEmail({
          to: process.env.SUPPORT_EMAIL_TO || 'abdelrahmanabuzaid311@gmail.com',
          fromEmail: req.user?.email ?? '',
          fromName: req.user?.name ?? req.user?.username,
          subject,
          message,
          userId,
        });
      }

      ticket.emailStatus = emailResult.status;
      ticket.emailError = emailResult.error;
      await ticket.save();

      return res.status(201).json({ ticket: mapTicket(ticket) });
    } catch (error) {
      logger.error('[support] createTicket error:', error);
      return res.status(500).json({ error: 'Failed to send support request' });
    }
  }

  return { createTicket };
}

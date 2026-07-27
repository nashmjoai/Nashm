import { logger } from '@nashm/data-schemas';
import { getRefillEligibilityDate, ViolationTypes } from 'nashm-data-provider';
import type { BalanceConfig, IBalanceUpdate } from '@nashm/data-schemas';
import type { RefillIntervalUnit } from 'nashm-data-provider';
import type { Response } from 'express';
import type { ServerRequest } from '~/types/http';

interface BalanceRecord {
  tokenCredits: number;
  autoRefillEnabled?: boolean;
  refillAmount?: number;
  lastRefill?: Date;
  refillIntervalValue?: number;
  refillIntervalUnit?: RefillIntervalUnit;
}

interface TxData {
  user: string;
  conversationId?: string;
  model?: string;
  endpoint?: string;
  valueKey?: string;
  tokenType?: string;
  amount: number;
  endpointTokenConfig?: unknown;
  generations?: unknown[];
}

export interface CheckBalanceDeps {
  findBalanceByUser: (user: string) => Promise<BalanceRecord | null>;
  getMultiplier: (params: Record<string, unknown>) => number;
  createAutoRefillTransaction: (
    data: Record<string, unknown>,
  ) => Promise<{ balance: number } | undefined>;
  logViolation: (
    req: unknown,
    res: unknown,
    type: string,
    errorMessage: Record<string, unknown>,
    score: number,
  ) => Promise<void>;
  /** Balance config for lazy initialization when no record exists */
  balanceConfig?: BalanceConfig;
  /** Upsert function for lazy initialization when no record exists */
  upsertBalanceFields?: (userId: string, fields: IBalanceUpdate) => Promise<BalanceRecord | null>;
  /** Optional function to get transactions for a given filter */
  getTransactions?: (filter: Record<string, unknown>) => Promise<any[]>;
}

/** Checks a user's balance record and handles auto-refill if needed. */
async function checkBalanceRecord(
  txData: TxData,
  deps: CheckBalanceDeps,
): Promise<{ canSpend: boolean; balance: number; tokenCost: number }> {
  const { user, conversationId, model, endpoint, valueKey, tokenType, amount, endpointTokenConfig } = txData;
  const multiplier = deps.getMultiplier({
    valueKey,
    tokenType,
    model,
    endpoint,
    endpointTokenConfig,
  });
  const tokenCost = amount * multiplier;

  // 1. GLOBAL BALANCE & AUTO-REFILL CHECK
  let globalBalance = 0;
  const record = await deps.findBalanceByUser(user);
  
  if (!record) {
    if (deps.balanceConfig?.startBalance != null && deps.upsertBalanceFields) {
      logger.debug('[Balance.check] Lazy-initializing balance record for user', {
        user,
        startBalance: deps.balanceConfig.startBalance,
      });
      try {
        const fields: IBalanceUpdate = {
          user,
          tokenCredits: deps.balanceConfig.startBalance,
        };
        const config = deps.balanceConfig;
        if (
          config.autoRefillEnabled &&
          config.refillIntervalValue != null &&
          config.refillIntervalUnit != null &&
          config.refillAmount != null
        ) {
          fields.autoRefillEnabled = config.autoRefillEnabled;
          fields.refillIntervalValue = config.refillIntervalValue;
          fields.refillIntervalUnit = config.refillIntervalUnit;
          fields.refillAmount = config.refillAmount;
          fields.lastRefill = new Date();
        }
        const created = await deps.upsertBalanceFields(user, fields);
        globalBalance = created?.tokenCredits ?? deps.balanceConfig.startBalance;
      } catch (error) {
        logger.error('[Balance.check] Failed to lazy-initialize balance record', { user, error });
        return { canSpend: false, balance: 0, tokenCost };
      }
    } else {
      logger.debug('[Balance.check] No balance record found for user', { user });
      return { canSpend: false, balance: 0, tokenCost };
    }
  } else {
    globalBalance = record.tokenCredits;
    
    logger.debug('[Balance.check] Initial global state', {
      user,
      model,
      endpoint,
      valueKey,
      tokenType,
      amount,
      globalBalance,
      multiplier,
    });

    if (
      globalBalance - tokenCost <= 0 &&
      record.autoRefillEnabled &&
      record.refillAmount &&
      record.refillAmount > 0
    ) {
      const lastRefillDate = new Date(record.lastRefill ?? 0);
      const now = new Date();
      if (
        isNaN(lastRefillDate.getTime()) ||
        now >=
          getRefillEligibilityDate(
            lastRefillDate,
            record.refillIntervalValue ?? 0,
            record.refillIntervalUnit ?? 'days',
          )
      ) {
        try {
          const result = await deps.createAutoRefillTransaction({
            user,
            tokenType: 'credits',
            context: 'autoRefill',
            rawAmount: record.refillAmount,
          });
          if (result) {
            globalBalance = result.balance;
          }
        } catch (error) {
          logger.error('[Balance.check] Failed to record transaction for auto-refill', error);
        }
      }
    }
  }

  // 2. PER-CONVERSATION LIMIT CHECK
  let conversationBalance = globalBalance; // Default to global limit if no conversation limit applies
  if (conversationId && deps.getTransactions) {
    try {
      const transactions = await deps.getTransactions({ conversationId, user });
      const totalConsumed = transactions.reduce((acc: number, curr: any) => {
        if (curr.tokenType === 'credits') return acc;
        const val = curr.tokenValue != null ? Math.abs(curr.tokenValue) : Math.abs((curr.rawAmount || 0) * multiplier);
        return acc + val;
      }, 0);
      const limit = deps.balanceConfig?.startBalance ?? 50000;
      conversationBalance = limit - totalConsumed;
      logger.debug('[Balance.check] Per-conversation check', { conversationId, limit, totalConsumed, conversationBalance, tokenCost });
    } catch (error) {
      logger.error('[Balance.check] Failed per-conversation check', { user, conversationId, error });
    }
  }

  // 3. EFFECTIVE BALANCE (Minimum of Global vs Conversation)
  const effectiveBalance = Math.min(globalBalance, conversationBalance);

  logger.debug('[Balance.check] Token cost and effective balance', { tokenCost, globalBalance, conversationBalance, effectiveBalance });
  return { canSpend: effectiveBalance >= tokenCost, balance: effectiveBalance, tokenCost };
}

/**
 * Checks balance for a user and logs a violation if they cannot spend.
 * Throws an error with the balance info if insufficient funds.
 */
export async function checkBalance(
  { req, res, txData }: { req: ServerRequest; res: Response; txData: TxData },
  deps: CheckBalanceDeps,
): Promise<boolean> {
  const { canSpend, balance, tokenCost } = await checkBalanceRecord(txData, deps);
  if (canSpend) {
    return true;
  }

  const type = ViolationTypes.TOKEN_BALANCE;
  const errorMessage: Record<string, unknown> = {
    type,
    balance,
    tokenCost,
    promptTokens: txData.amount,
  };

  if (txData.generations && txData.generations.length > 0) {
    errorMessage.generations = txData.generations;
  }

  await deps.logViolation(req, res, type, errorMessage, 0);
  throw new Error(JSON.stringify(errorMessage));
}

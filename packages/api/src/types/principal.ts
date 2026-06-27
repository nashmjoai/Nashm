import type { PrincipalType } from 'nashm-data-provider';
import type { Types } from 'mongoose';

export interface ResolvedPrincipal {
  principalType: PrincipalType;
  principalId?: string | Types.ObjectId;
}

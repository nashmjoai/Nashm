import type { Model } from 'mongoose';
import type { IFamilyPlan } from '@nashm/data-schemas';

interface FamilyServiceDeps {
  FamilyPlan: Model<IFamilyPlan>;
}

/**
 * Resolves the active family plan for a user — either as the owner (parent)
 * or as a member (child). Returns null if the user has no active plan.
 */
export async function getActiveFamilyPlan(
  userId: string,
  { FamilyPlan }: FamilyServiceDeps,
): Promise<IFamilyPlan | null> {
  return FamilyPlan.findOne({
    status: { $in: ['active', 'trialing'] },
    $or: [{ owner: userId }, { 'members.user': userId }],
  }).lean() as Promise<IFamilyPlan | null>;
}

/**
 * Returns true when the user has access via an active family plan.
 * Use this as the access gate in the message-sending middleware.
 */
export async function verifyFamilyAccess(
  userId: string,
  deps: FamilyServiceDeps,
): Promise<boolean> {
  const plan = await getActiveFamilyPlan(userId, deps);
  return plan !== null;
}

/**
 * Returns true when the given userId is the owner (parent) of a family plan.
 * Only the owner has permission to add/remove child members.
 */
export async function isParentUser(
  userId: string,
  { FamilyPlan }: FamilyServiceDeps,
): Promise<boolean> {
  const count = await FamilyPlan.countDocuments({
    owner: userId,
    status: { $in: ['active', 'trialing'] },
  });
  return count > 0;
}

/**
 * Adds a child member to the parent's family plan.
 * Enforces the 4-child limit and prevents duplicate membership.
 */
export async function addFamilyMember(
  parentUserId: string,
  childUserId: string,
  childEmail: string,
  deps: FamilyServiceDeps,
): Promise<IFamilyPlan> {
  const plan = await deps.FamilyPlan.findOne({
    owner: parentUserId,
    status: { $in: ['active', 'trialing'] },
  });

  if (!plan) {
    throw new Error('No active family plan found for this user');
  }

  const alreadyMember = plan.members.some((m) => m.user.toString() === childUserId);
  if (alreadyMember) {
    throw new Error('User is already a member of this family plan');
  }

  const children = plan.members.filter((m) => m.role === 'child');
  if (children.length >= 4) {
    throw new Error('Family plan has reached the maximum of 4 child members');
  }

  plan.members.push({
    user: childUserId as unknown as import('mongoose').Types.ObjectId,
    email: childEmail,
    role: 'child',
    addedAt: new Date(),
  });

  return plan.save();
}

/**
 * Removes a child member from the parent's family plan by userId.
 * Only children can be removed — the owner cannot be removed.
 */
export async function removeFamilyMember(
  parentUserId: string,
  childUserId: string,
  deps: FamilyServiceDeps,
): Promise<IFamilyPlan> {
  const plan = await deps.FamilyPlan.findOne({
    owner: parentUserId,
    status: { $in: ['active', 'trialing'] },
  });

  if (!plan) {
    throw new Error('No active family plan found for this user');
  }

  const memberIndex = plan.members.findIndex(
    (m) => m.user.toString() === childUserId && m.role === 'child',
  );
  if (memberIndex === -1) {
    throw new Error('Child member not found in family plan');
  }

  plan.members.splice(memberIndex, 1);
  return plan.save();
}

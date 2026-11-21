import { Shop, ShopPlan } from '../../entities';

export interface PlanDefinition {
  plan: ShopPlan;
  name: string;
  /** Paise per 30 days. */
  price: number;
  maxProducts: number;
  customDomain: boolean;
  /** AI credits added each time the plan is bought or renewed. */
  aiCredits: number;
}

export const PLAN_PERIOD_DAYS = 30;

export const PLANS: Record<ShopPlan, PlanDefinition> = {
  [ShopPlan.FREE]: { plan: ShopPlan.FREE, name: 'Free', price: 0, maxProducts: 25, customDomain: false, aiCredits: 0 },
  [ShopPlan.STARTER]: {
    plan: ShopPlan.STARTER,
    name: 'Starter',
    price: 29_900,
    maxProducts: 500,
    customDomain: true,
    aiCredits: 100,
  },
  [ShopPlan.GROWTH]: {
    plan: ShopPlan.GROWTH,
    name: 'Growth',
    price: 79_900,
    maxProducts: 10_000,
    customDomain: true,
    aiCredits: 400,
  },
};

export interface CreditPack {
  key: string;
  credits: number;
  /** Paise. */
  price: number;
}

export const CREDIT_PACKS: readonly CreditPack[] = [
  { key: 'credits-100', credits: 100, price: 9_900 },
  { key: 'credits-500', credits: 500, price: 39_900 },
];

/** A lapsed plan falls back to Free; nothing is deleted. */
export function activePlan(shop: Pick<Shop, 'plan' | 'planExpiresAt'>, now = new Date()): PlanDefinition {
  if (shop.plan !== ShopPlan.FREE && shop.planExpiresAt && shop.planExpiresAt > now) return PLANS[shop.plan];
  return PLANS[ShopPlan.FREE];
}

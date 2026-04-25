export type FrontendPlanType = "payg" | "basic" | "premium";

import { hasPendingOnboardingTour } from "@/lib/onboardingTour";

const PENDING_PLAN_KEY = "elimutime:selected-plan:pending";
const SCHOOL_PLAN_KEY_PREFIX = "elimutime:selected-plan:school:";
const PENDING_PLAN_SNAPSHOT_KEY = "elimutime:selected-plan:snapshot:pending";
const SCHOOL_PLAN_SNAPSHOT_KEY_PREFIX = "elimutime:selected-plan:snapshot:school:";
const PENDING_GENERATION_KEY = "elimutime:generation:pending";
const SCHOOL_GENERATION_KEY_PREFIX = "elimutime:generation:school:";

export interface PricingSnapshot {
  plan_type: FrontendPlanType;
  teachers_count: number;
  streams_count: number;
  calculated_price: number;
  generation_timestamp: string;
  paygPrice: number;
  basicPrice: number;
  premiumPrice: number;
  basicBasePrice: number;
  basicHasOverage: boolean;
}

function getSchoolPlanKey(schoolId: string) {
  return `${SCHOOL_PLAN_KEY_PREFIX}${schoolId}`;
}

function getSchoolPlanSnapshotKey(schoolId: string) {
  return `${SCHOOL_PLAN_SNAPSHOT_KEY_PREFIX}${schoolId}`;
}

function getSchoolGenerationKey(schoolId: string) {
  return `${SCHOOL_GENERATION_KEY_PREFIX}${schoolId}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function mapSubscriptionPlanToFrontendPlan(planType: string | null | undefined): FrontendPlanType | null {
  switch (planType) {
    case "payg":
      return "payg";
    case "basic":
    case "starter":
      return "basic";
    case "premium":
    case "growth":
    case "international":
      return "premium";
    default:
      return null;
  }
}

export function calculatePricing(teachersCount: number, streamsCount: number) {
  const teachers = Math.max(0, teachersCount);
  const streams = Math.max(0, streamsCount);
  const paygPrice = teachers * 8 + streams * 11;
  const extraTeachers = Math.max(0, teachers - 33);
  const extraStreams = Math.max(0, streams - 27);
  const basicBasePrice = 500;
  const basicPrice = basicBasePrice + extraTeachers * 5 + extraStreams * 8;
  const premiumPrice = 2499;

  return {
    paygPrice,
    basicPrice,
    premiumPrice,
    basicBasePrice,
    basicHasOverage: extraTeachers > 0 || extraStreams > 0,
  };
}

export function buildPricingSnapshot(
  planType: FrontendPlanType,
  teachersCount: number,
  streamsCount: number,
  timestamp = new Date().toISOString(),
): PricingSnapshot {
  const pricing = calculatePricing(teachersCount, streamsCount);

  return {
    plan_type: planType,
    teachers_count: Math.max(0, teachersCount),
    streams_count: Math.max(0, streamsCount),
    calculated_price:
      planType === "payg" ? pricing.paygPrice : planType === "basic" ? pricing.basicPrice : pricing.premiumPrice,
    generation_timestamp: timestamp,
    ...pricing,
  };
}

function isPricingSnapshot(value: unknown): value is PricingSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Record<string, unknown>;
  return (
    (snapshot.plan_type === "payg" || snapshot.plan_type === "basic" || snapshot.plan_type === "premium") &&
    typeof snapshot.teachers_count === "number" &&
    typeof snapshot.streams_count === "number" &&
    typeof snapshot.calculated_price === "number" &&
    typeof snapshot.generation_timestamp === "string"
  );
}

export function getSelectedFrontendPlan(schoolId?: string | null): FrontendPlanType | null {
  if (!canUseStorage()) {
    return null;
  }

  const schoolPlan = schoolId ? window.localStorage.getItem(getSchoolPlanKey(schoolId)) : null;
  const pendingPlan = !schoolId || hasPendingOnboardingTour() ? window.localStorage.getItem(PENDING_PLAN_KEY) : null;
  const value = schoolPlan || pendingPlan;

  return value === "payg" || value === "basic" || value === "premium" ? value : null;
}

export function getSelectedPricingSnapshot(schoolId?: string | null): PricingSnapshot | null {
  if (!canUseStorage()) {
    return null;
  }

  const schoolSnapshot = schoolId ? window.localStorage.getItem(getSchoolPlanSnapshotKey(schoolId)) : null;
  const pendingSnapshot =
    !schoolId || hasPendingOnboardingTour() ? window.localStorage.getItem(PENDING_PLAN_SNAPSHOT_KEY) : null;
  const rawSnapshot = schoolSnapshot || pendingSnapshot;

  if (!rawSnapshot) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSnapshot) as unknown;
    return isPricingSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setSelectedFrontendPlan(
  planType: FrontendPlanType,
  schoolId?: string | null,
  snapshot?: PricingSnapshot,
) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(PENDING_PLAN_KEY, planType);
  if (snapshot) {
    window.localStorage.setItem(PENDING_PLAN_SNAPSHOT_KEY, JSON.stringify(snapshot));
  }

  if (schoolId) {
    window.localStorage.setItem(getSchoolPlanKey(schoolId), planType);
    if (snapshot) {
      window.localStorage.setItem(getSchoolPlanSnapshotKey(schoolId), JSON.stringify(snapshot));
    }
    window.localStorage.removeItem(PENDING_PLAN_KEY);
    window.localStorage.removeItem(PENDING_PLAN_SNAPSHOT_KEY);
  }
}

export function hydrateSelectedFrontendPlan(
  schoolId?: string | null,
  subscriptionPlanType?: string | null,
): FrontendPlanType | null {
  const storedPlan = getSelectedFrontendPlan(schoolId);
  if (storedPlan) {
    if (schoolId) {
      setSelectedFrontendPlan(storedPlan, schoolId, getSelectedPricingSnapshot(schoolId) || undefined);
    }
    return storedPlan;
  }

  const mappedPlan = mapSubscriptionPlanToFrontendPlan(subscriptionPlanType);
  if (mappedPlan) {
    setSelectedFrontendPlan(mappedPlan, schoolId);
    return mappedPlan;
  }

  return null;
}

export function recordPlanGeneration(snapshot: PricingSnapshot, schoolId?: string | null) {
  if (!canUseStorage()) {
    return;
  }

  const serialized = JSON.stringify(snapshot);
  window.localStorage.setItem(PENDING_GENERATION_KEY, serialized);

  if (schoolId) {
    window.localStorage.setItem(getSchoolGenerationKey(schoolId), serialized);
  }
}

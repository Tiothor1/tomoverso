import { getUserActiveSubscription } from "@/lib/subscriptions";
export { authorPlusAssets, authorPlusBenefits, authorPlusTrails, buildAssetFile } from "@/lib/author-plus-content";

export function isAuthorPlusSubscription(sub: any | null | undefined): boolean {
  if (!sub) return false;
  const role = String(sub.role_granted || "").toLowerCase();
  const plan = String(sub.plan_name || sub.name || sub.plan_id || "").toLowerCase();
  return role === "author" || plan.includes("autor") || plan.includes("author");
}

export function getAuthorPlusStatus(db: any, userId?: string | null) {
  if (!userId) return { active: false, subscription: null as any };
  const subscription = getUserActiveSubscription(db, userId);
  return { active: isAuthorPlusSubscription(subscription), subscription };
}

// RevenueCat wrapper. Purchases happen natively through StoreKit; afterwards the
// server re-verifies the entitlement with RevenueCat (subscription-sync), and
// feature access is decided ONLY from the server's entitlement record.
import { Linking, Platform } from "react-native";
import Purchases, { type PurchasesOffering, type PurchasesPackage, PURCHASES_ERROR_CODE } from "react-native-purchases";
import { config, isBillingConfigured } from "./config";
import { AppError } from "./errors";

let configured = false;
const canUse = () => Platform.OS === "ios" && isBillingConfigured;

function ensureConfigured(appUserID?: string) {
  if (!canUse() || configured) return;
  Purchases.configure({ apiKey: config.revenueCatIosKey, appUserID: appUserID ?? null });
  configured = true;
}

export function purchasesLogIn(userId: string) {
  if (!canUse()) return;
  try {
    if (!configured) ensureConfigured(userId);
    else Purchases.logIn(userId).catch(() => undefined);
  } catch {
    /* Billing is optional at runtime — never block sign-in on it. */
  }
}

export function purchasesLogOut() {
  if (!canUse() || !configured) return;
  Purchases.logOut().catch(() => undefined);
}

export type BillingAvailability = { available: true } | { available: false; reason: string };

export function billingAvailability(): BillingAvailability {
  if (Platform.OS !== "ios") return { available: false, reason: "Subscriptions are available in the TapKit iOS app." };
  if (!isBillingConfigured) return { available: false, reason: "In-app purchases aren't configured in this build yet." };
  return { available: true };
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!canUse()) return null;
  ensureConfigured();
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

function mapPurchaseError(e: unknown): AppError {
  const err = e as { code?: string; userCancelled?: boolean | null; message?: string };
  if (err.userCancelled || err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return new AppError("Purchase cancelled.", "cancelled");
  switch (err.code) {
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return new AppError("Your payment is pending approval. Pro will unlock once it completes.", "pending");
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
      return new AppError("Network problem — please check your connection and try again.", "offline");
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return new AppError("Purchases aren't allowed on this device.", "not_allowed");
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
      return new AppError("You already own this subscription. Try Restore Purchases.", "already_owned");
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
      return new AppError("The App Store had a problem. Please try again later.", "store");
    default:
      return new AppError(err.message ?? "The purchase couldn't be completed.", "billing");
  }
}

export async function purchase(pkg: PurchasesPackage): Promise<void> {
  try {
    await Purchases.purchasePackage(pkg);
  } catch (e) {
    throw mapPurchaseError(e);
  }
}

export async function restore(): Promise<{ hasPro: boolean }> {
  const availability = billingAvailability();
  if (!availability.available) throw new AppError(availability.reason, "unavailable");
  ensureConfigured();
  try {
    const info = await Purchases.restorePurchases();
    return { hasPro: Boolean(info.entitlements.active.pro) };
  } catch (e) {
    throw mapPurchaseError(e);
  }
}

export async function openManageSubscriptions() {
  if (canUse()) {
    try {
      await Purchases.showManageSubscriptions();
      return;
    } catch {
      /* fall through */
    }
  }
  await Linking.openURL("https://apps.apple.com/account/subscriptions");
}

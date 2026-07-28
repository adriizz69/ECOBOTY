import Stripe from "stripe";

let stripeClient = null;

const DEFAULT_STRIPE_API_VERSION = "2025-03-31.basil";

export const getStripeClient = () => {
  const secretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!secretKey) {
    throw new Error("stripe_not_configured");
  }
  if (!stripeClient) {
    const apiVersion = String(process.env.STRIPE_API_VERSION || DEFAULT_STRIPE_API_VERSION).trim();
    stripeClient = new Stripe(secretKey, {
      apiVersion
    });
  }
  return stripeClient;
};

export const isStripeConfigured = () => Boolean(String(process.env.STRIPE_SECRET_KEY || "").trim());

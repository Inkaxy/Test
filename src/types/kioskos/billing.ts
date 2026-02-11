export interface PlanDetails {
  id: string;
  name: string;
  price: string;
  maxDevices: number;
  features: string[];
}

export const PLANS: Record<string, PlanDetails> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 'kr 0/mnd',
    maxDevices: 2,
    features: [
      '2 enheter',
      'Grunnleggende funksjoner',
      'LAN-kontroll',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 'kr 49/mnd per enhet',
    maxDevices: 999,
    features: [
      'Alt i Free',
      'Bevegelsesdeteksjon',
      'Skykontroll',
      'Ladeplanlegging',
      'Live preview',
      'Ubegrenset enheter',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Kontakt oss',
    maxDevices: 99999,
    features: [
      'Alt i Pro',
      'SSO/SAML',
      'Dedikert MQTT',
      'SLA',
      'On-premise',
      'Ubegrenset enheter',
    ],
  },
};

export interface CheckoutResponse {
  url: string;
}

export interface BillingPortalResponse {
  url: string;
}

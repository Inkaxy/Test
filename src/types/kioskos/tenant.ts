export type TenantPlan = 'free' | 'pro' | 'enterprise';
export type MemberRole = 'owner' | 'admin' | 'viewer';

export interface Tenant {
  id: string;
  owner_id: string | null;
  name: string;
  plan: TenantPlan;
  max_devices: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: MemberRole;
  invited_by: string | null;
  created_at: string;
}

export interface TenantWithMembers extends Tenant {
  tenant_members: TenantMember[];
}

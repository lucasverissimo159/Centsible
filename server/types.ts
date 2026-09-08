export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
export type EntityName = 'categories' | 'transactions' | 'budgets' | 'recurringRules';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
}

export interface OrganizationRecord {
  id: string;
  name: string;
}

export interface MembershipRecord {
  userId: string;
  organizationId: string;
  role: Role;
}

export interface CategoryRecord {
  id: string;
  organizationId: string;
  name: string;
  color: string;
  icon: string;
  kind: 'income' | 'expense' | 'both';
  isDefault: boolean;
}

export interface TransactionRecord {
  id: string;
  organizationId: string;
  type: 'income' | 'expense';
  amountCents: number;
  categoryId: string;
  description: string;
  date: string;
  notes?: string;
  recurringRuleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringRuleRecord {
  id: string;
  organizationId: string;
  type: 'income' | 'expense';
  amountCents: number;
  categoryId: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  startDate: string;
  endDate?: string;
  lastMaterializedDate?: string;
  isPaused: boolean;
}

export interface BudgetRecord {
  id: string;
  organizationId: string;
  categoryId: string;
  monthlyLimitCents: number;
}

export interface AuditRecord {
  id: string;
  organizationId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ImportResult {
  imported: number;
  duplicate: boolean;
}

export interface OrganizationMemberRecord {
  id: string;
  email: string;
  role: Role;
}

export interface Repository {
  createAccount(input: { email: string; passwordHash: string; organizationName: string }): Promise<{
    user: UserRecord;
    organization: OrganizationRecord;
    membership: MembershipRecord;
  }>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findMembership(userId: string, organizationId: string): Promise<MembershipRecord | null>;
  listOrganizations(userId: string): Promise<OrganizationRecord[]>;
  listUsers(organizationId: string): Promise<OrganizationMemberRecord[]>;
  updateUserRole(organizationId: string, userId: string, role: Role): Promise<OrganizationMemberRecord | null>;
  list(entity: EntityName, organizationId: string): Promise<unknown[]>;
  create(entity: EntityName, organizationId: string, input: Record<string, unknown>): Promise<unknown>;
  update(entity: EntityName, organizationId: string, id: string, input: Record<string, unknown>): Promise<unknown | null>;
  remove(entity: EntityName, organizationId: string, id: string): Promise<boolean>;
  importTransactions(organizationId: string, input: { idempotencyKey: string; transactions: Record<string, unknown>[] }): Promise<ImportResult>;
  listAudit(organizationId: string): Promise<AuditRecord[]>;
  audit(input: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<void>;
}

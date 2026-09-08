import { randomUUID } from 'node:crypto';
import type {
  AuditRecord,
  BudgetRecord,
  CategoryRecord,
  EntityName,
  ImportResult,
  MembershipRecord,
  OrganizationRecord,
  RecurringRuleRecord,
  Repository,
  Role,
  TransactionRecord,
  UserRecord,
} from './types.js';

const now = () => new Date().toISOString();
const id = () => randomUUID();

const defaultCategories = [
  { name: 'Other', color: '#64748b', icon: 'tag', kind: 'both' as const },
  { name: 'Salary', color: '#16a34a', icon: 'briefcase', kind: 'income' as const },
  { name: 'Groceries', color: '#f97316', icon: 'shopping-cart', kind: 'expense' as const },
];

export class MemoryRepository implements Repository {
  readonly users = new Map<string, UserRecord>();
  readonly organizations = new Map<string, OrganizationRecord>();
  readonly memberships: MembershipRecord[] = [];
  readonly categories: CategoryRecord[] = [];
  readonly transactions: TransactionRecord[] = [];
  readonly recurringRules: RecurringRuleRecord[] = [];
  readonly budgets: BudgetRecord[] = [];
  readonly audits: AuditRecord[] = [];
  readonly importKeys = new Set<string>();

  async createAccount(input: { email: string; passwordHash: string; organizationName: string }) {
    if ([...this.users.values()].some((user) => user.email === input.email)) {
      throw new Error('EMAIL_TAKEN');
    }
    const user = { id: id(), email: input.email, passwordHash: input.passwordHash };
    const organization = { id: id(), name: input.organizationName };
    const membership = { userId: user.id, organizationId: organization.id, role: 'OWNER' as Role };
    this.users.set(user.id, user);
    this.organizations.set(organization.id, organization);
    this.memberships.push(membership);
    for (const category of defaultCategories) {
      this.categories.push({ id: id(), organizationId: organization.id, ...category, isDefault: true });
    }
    return { user, organization, membership };
  }

  async findUserByEmail(email: string) {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findMembership(userId: string, organizationId: string) {
    return this.memberships.find((item) => item.userId === userId && item.organizationId === organizationId) ?? null;
  }

  async listOrganizations(userId: string) {
    return this.memberships
      .filter((membership) => membership.userId === userId)
      .map((membership) => this.organizations.get(membership.organizationId))
      .filter((organization): organization is OrganizationRecord => organization !== undefined);
  }

  async listUsers(organizationId: string) {
    return this.memberships
      .filter((membership) => membership.organizationId === organizationId)
      .map((membership) => ({
        id: membership.userId,
        email: this.users.get(membership.userId)?.email ?? '',
        role: membership.role,
      }))
      .filter((member) => member.email.length > 0);
  }

  async updateUserRole(organizationId: string, userId: string, role: Role) {
    const membership = this.memberships.find((item) => item.userId === userId && item.organizationId === organizationId);
    if (!membership) return null;
    membership.role = role;
    const user = this.users.get(userId);
    if (!user) return null;
    return { id: user.id, email: user.email, role: membership.role };
  }

  async list(entity: EntityName, organizationId: string) {
    return this.collection(entity).filter((item) => item.organizationId === organizationId);
  }

  async create(entity: EntityName, organizationId: string, input: Record<string, unknown>) {
    const record = { id: id(), organizationId, ...input } as never;
    this.collection(entity).push(record);
    return record;
  }

  async update(entity: EntityName, organizationId: string, recordId: string, input: Record<string, unknown>) {
    const collection = this.collection(entity);
    const index = collection.findIndex((item) => item.id === recordId && item.organizationId === organizationId);
    if (index < 0) return null;
    const updated = { ...collection[index], ...input, id: recordId, organizationId } as never;
    collection[index] = updated;
    return updated;
  }

  async remove(entity: EntityName, organizationId: string, recordId: string) {
    const collection = this.collection(entity);
    const index = collection.findIndex((item) => item.id === recordId && item.organizationId === organizationId);
    if (index < 0) return false;
    collection.splice(index, 1);
    return true;
  }

  async importTransactions(organizationId: string, input: { idempotencyKey: string; transactions: Record<string, unknown>[] }): Promise<ImportResult> {
    const key = `${organizationId}:${input.idempotencyKey}`;
    if (this.importKeys.has(key)) return { imported: 0, duplicate: true };
    this.importKeys.add(key);
    for (const transaction of input.transactions) await this.create('transactions', organizationId, transaction);
    return { imported: input.transactions.length, duplicate: false };
  }

  async listAudit(organizationId: string) {
    return this.audits.filter((event) => event.organizationId === organizationId);
  }

  async audit(input: Omit<AuditRecord, 'id' | 'createdAt'>) {
    this.audits.push({ ...input, id: id(), createdAt: now() });
  }

  private collection(entity: EntityName): Array<{ id: string; organizationId: string }> {
    switch (entity) {
      case 'categories': return this.categories;
      case 'transactions': return this.transactions;
      case 'budgets': return this.budgets;
      case 'recurringRules': return this.recurringRules;
    }
  }
}

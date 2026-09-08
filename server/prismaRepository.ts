import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { EntityName, ImportResult, Repository, Role } from './types.js';

const modelNames = {
  categories: 'category',
  transactions: 'transaction',
  budgets: 'budget',
  recurringRules: 'recurringRule',
} as const;

type ModelLike = {
  findMany(args: unknown): Promise<unknown[]>;
  findFirst(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
};

export class PrismaRepository implements Repository {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient) {
    this.db = db;
  }

  async createAccount(input: { email: string; passwordHash: string; organizationName: string }) {
    return this.db.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { name: input.organizationName } });
      const user = await tx.user.create({ data: { email: input.email, passwordHash: input.passwordHash } });
      const membership = await tx.membership.create({
        data: { userId: user.id, organizationId: organization.id, role: 'OWNER' },
      });
      const defaults = [
        { name: 'Other', color: '#64748b', icon: 'tag', kind: 'both' as const },
        { name: 'Salary', color: '#16a34a', icon: 'briefcase', kind: 'income' as const },
        { name: 'Groceries', color: '#f97316', icon: 'shopping-cart', kind: 'expense' as const },
      ];
      await tx.category.createMany({
        data: defaults.map((category) => ({ ...category, organizationId: organization.id, isDefault: true })),
      });
      return { user, organization, membership };
    });
  }

  async findUserByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  async findMembership(userId: string, organizationId: string) {
    return this.db.membership.findUnique({ where: { userId_organizationId: { userId, organizationId } } });
  }

  async listOrganizations(userId: string) {
    const memberships = await this.db.membership.findMany({ where: { userId }, include: { organization: true } });
    return memberships.map((membership) => membership.organization);
  }

  async listUsers(organizationId: string) {
    const memberships = await this.db.membership.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { user: { email: 'asc' } },
    });
    return memberships.map((membership) => ({ id: membership.user.id, email: membership.user.email, role: membership.role }));
  }

  async updateUserRole(organizationId: string, userId: string, role: Role) {
    const membership = await this.db.membership.findUnique({ where: { userId_organizationId: { userId, organizationId } }, include: { user: true } });
    if (!membership) return null;
    const updated = await this.db.membership.update({
      where: { userId_organizationId: { userId, organizationId } },
      data: { role },
      include: { user: true },
    });
    return { id: updated.user.id, email: updated.user.email, role: updated.role };
  }

  async list(entity: EntityName, organizationId: string) {
    return this.model(entity).findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  }

  async create(entity: EntityName, organizationId: string, input: Record<string, unknown>) {
    return this.model(entity).create({ data: { ...input, organizationId } });
  }

  async update(entity: EntityName, organizationId: string, id: string, input: Record<string, unknown>) {
    const record = await this.model(entity).findFirst({ where: { id, organizationId } });
    if (!record) return null;
    return this.model(entity).update({ where: { id }, data: input });
  }

  async remove(entity: EntityName, organizationId: string, id: string) {
    const record = await this.model(entity).findFirst({ where: { id, organizationId } });
    if (!record) return false;
    await this.model(entity).delete({ where: { id } });
    return true;
  }

  async importTransactions(organizationId: string, input: { idempotencyKey: string; transactions: Record<string, unknown>[] }): Promise<ImportResult> {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.importBatch.findUnique({
        where: { organizationId_idempotencyKey: { organizationId, idempotencyKey: input.idempotencyKey } },
      });
      if (existing) return { imported: 0, duplicate: true };
      await tx.importBatch.create({ data: { organizationId, idempotencyKey: input.idempotencyKey } });
      await tx.transaction.createMany({
        data: input.transactions.map((transaction) => ({
          ...transaction,
          id: typeof transaction.id === 'string' ? transaction.id : randomUUID(),
          organizationId,
          amountCents: Number(transaction.amountCents),
        })) as never,
      });
      return { imported: input.transactions.length, duplicate: false };
    });
  }

  async listAudit(organizationId: string) {
    const events = await this.db.auditEvent.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
    return events.map((event) => ({
      ...event,
      entityId: event.entityId ?? undefined,
      metadata: event.metadata as Record<string, unknown>,
      createdAt: event.createdAt.toISOString(),
    }));
  }

  async audit(input: { organizationId: string; userId: string; action: string; entityType: string; entityId?: string; metadata: Record<string, unknown> }) {
    await this.db.auditEvent.create({ data: input as never });
  }

  private model(entity: EntityName): ModelLike {
    return (this.db as unknown as Record<string, ModelLike>)[modelNames[entity]];
  }
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

export type { Role };

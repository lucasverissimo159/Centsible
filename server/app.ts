import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { EntityName, Repository, Role } from './types.js';

type JwtPayload = { sub: string; email: string; organizationId: string; role: Role };

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

const entitySchema = z.enum(['categories', 'transactions', 'budgets', 'recurringRules']);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const categoryInput = z.object({ name: z.string().trim().min(1).max(80), color: z.string().regex(/^#[0-9a-f]{6}$/i), icon: z.string().trim().min(1).max(60), kind: z.enum(['income', 'expense', 'both']), isDefault: z.boolean().optional() });
const transactionInput = z.object({ type: z.enum(['income', 'expense']), amountCents: z.number().int().positive().safe(), categoryId: z.string().min(1), description: z.string().trim().min(1).max(240), date: dateSchema, notes: z.string().max(2000).optional(), recurringRuleId: z.string().optional() });
const budgetInput = z.object({ categoryId: z.string().min(1), monthlyLimitCents: z.number().int().positive().safe() });
const recurringInput = z.object({ type: z.enum(['income', 'expense']), amountCents: z.number().int().positive().safe(), categoryId: z.string().min(1), description: z.string().trim().min(1).max(240), frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']), interval: z.number().int().positive().safe(), startDate: dateSchema, endDate: dateSchema.optional(), lastMaterializedDate: dateSchema.optional(), isPaused: z.boolean().optional() });
const inputs: Record<EntityName, z.ZodType> = { categories: categoryInput, transactions: transactionInput, budgets: budgetInput, recurringRules: recurringInput };
const patchInputs: Record<EntityName, z.ZodType> = { categories: categoryInput.partial(), transactions: transactionInput.partial(), budgets: budgetInput.partial(), recurringRules: recurringInput.partial() };
const registerInput = z.object({ email: z.string().email().transform((value) => value.toLowerCase()), password: z.string().min(10).max(200), organizationName: z.string().trim().min(2).max(120) });
const loginInput = z.object({ email: z.string().email().transform((value) => value.toLowerCase()), password: z.string().min(1), organizationId: z.string().optional() });
const roleInput = z.object({ role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']) });
const importInput = z.object({ idempotencyKey: z.string().trim().min(8).max(200), transactions: z.array(transactionInput).max(10000) });

const writeRoles: Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR'];
const adminRoles: Role[] = ['OWNER', 'ADMIN'];

function bearer(request: FastifyRequest, reply: FastifyReply) {
  return request.jwtVerify().catch(() => reply.code(401).send({ error: 'Unauthorized' }));
}

function requireRole(roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await bearer(request, reply);
    if (reply.sent) return;
    if (!roles.includes(request.user.role)) return reply.code(403).send({ error: 'Forbidden' });
  };
}

function organizationId(request: FastifyRequest): string {
  return request.headers['x-organization-id']?.toString() || request.user.organizationId;
}

async function audit(repository: Repository, request: FastifyRequest, action: string, entityType: string, entityId: string | undefined, metadata: Record<string, unknown> = {}) {
  await repository.audit({ organizationId: organizationId(request), userId: request.user.sub, action, entityType, entityId, metadata });
}

export async function createApp(repository: Repository, jwtSecret = process.env.JWT_SECRET ?? 'development-only-secret'): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: jwtSecret });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Validation failed', details: error.flatten() });
    if (error instanceof Error && error.message === 'EMAIL_TAKEN') return reply.code(409).send({ error: 'Email already registered' });
    app.log.error(error);
    return reply.code(500).send({ error: 'Internal server error' });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.post('/api/auth/register', async (request, reply) => {
    const input = registerInput.parse(request.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const account = await repository.createAccount({ ...input, passwordHash });
    const token = app.jwt.sign({ sub: account.user.id, email: account.user.email, organizationId: account.organization.id, role: account.membership.role });
    return reply.code(201).send({ token, user: { id: account.user.id, email: account.user.email }, organization: account.organization, role: account.membership.role });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const input = loginInput.parse(request.body);
    const user = await repository.findUserByEmail(input.email);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return reply.code(401).send({ error: 'Invalid credentials' });
    const organizations = await repository.listOrganizations(user.id);
    const selected = input.organizationId ?? organizations[0]?.id;
    if (!selected) return reply.code(403).send({ error: 'No organization available' });
    const membership = await repository.findMembership(user.id, selected);
    if (!membership) return reply.code(403).send({ error: 'Organization access denied' });
    const token = app.jwt.sign({ sub: user.id, email: user.email, organizationId: selected, role: membership.role });
    return { token, user: { id: user.id, email: user.email }, organizations, role: membership.role };
  });

  app.get('/api/me', { preHandler: bearer }, async (request) => ({ user: { id: request.user.sub, email: request.user.email }, organizationId: organizationId(request), role: request.user.role }));

  app.get('/api/organizations', { preHandler: bearer }, async (request) => ({ organizations: await repository.listOrganizations(request.user.sub) }));

  app.get('/api/users', { preHandler: requireRole(adminRoles) }, async (request) => ({ users: await repository.listUsers(organizationId(request)) }));

  app.patch('/api/users/:userId/role', { preHandler: requireRole(adminRoles) }, async (request, reply) => {
    const input = roleInput.parse(request.body);
    const currentOrgId = organizationId(request);
    const existing = await repository.findMembership(request.params.userId, currentOrgId);
    if (!existing) return reply.code(404).send({ error: 'User not found in this organization' });
    const updated = await repository.updateUserRole(currentOrgId, request.params.userId, input.role);
    if (!updated) return reply.code(404).send({ error: 'User not found in this organization' });
    return { user: updated };
  });

  app.get('/api/audit', { preHandler: requireRole(adminRoles) }, async (request) => ({ events: await repository.listAudit(organizationId(request)) }));

  app.get<{ Params: { entity: string } }>('/api/:entity', { preHandler: bearer }, async (request, reply) => {
    const entity = entitySchema.safeParse(request.params.entity);
    if (!entity.success) return reply.code(404).send({ error: 'Not found' });
    return { data: await repository.list(entity.data, organizationId(request)) };
  });

  app.post<{ Params: { entity: string } }>('/api/:entity', { preHandler: requireRole(writeRoles) }, async (request, reply) => {
    const entity = entitySchema.parse(request.params.entity);
    const input = inputs[entity].parse(request.body) as Record<string, unknown>;
    const created = await repository.create(entity, organizationId(request), input);
    const createdId = typeof created === 'object' && created !== null && 'id' in created ? String(created.id) : undefined;
    await audit(repository, request, 'CREATE', entity, createdId);
    return reply.code(201).send({ data: created });
  });

  app.patch<{ Params: { entity: string; id: string } }>('/api/:entity/:id', { preHandler: requireRole(writeRoles) }, async (request, reply) => {
    const entity = entitySchema.parse(request.params.entity);
    const input = patchInputs[entity].parse(request.body) as Record<string, unknown>;
    const updated = await repository.update(entity, organizationId(request), request.params.id, input);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    await audit(repository, request, 'UPDATE', entity, request.params.id, { fields: Object.keys(input) });
    return { data: updated };
  });

  app.delete<{ Params: { entity: string; id: string } }>('/api/:entity/:id', { preHandler: requireRole(writeRoles) }, async (request, reply) => {
    const entity = entitySchema.parse(request.params.entity);
    const removed = await repository.remove(entity, organizationId(request), request.params.id);
    if (!removed) return reply.code(404).send({ error: 'Not found' });
    await audit(repository, request, 'DELETE', entity, request.params.id);
    return reply.code(204).send();
  });

  app.post('/api/transactions/import', { preHandler: requireRole(writeRoles) }, async (request, reply) => {
    const input = importInput.parse(request.body);
    const result = await repository.importTransactions(organizationId(request), input);
    if (!result.duplicate) await audit(repository, request, 'IMPORT', 'transactions', undefined, { idempotencyKey: input.idempotencyKey, imported: result.imported });
    return reply.code(result.duplicate ? 200 : 201).send(result);
  });

  return app;
}

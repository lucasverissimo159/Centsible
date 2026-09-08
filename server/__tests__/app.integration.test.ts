import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { MemoryRepository } from '../memoryRepository.js';

async function register(app: Awaited<ReturnType<typeof createApp>>, email: string, organizationName: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'StrongPassword123!', organizationName },
  });
  return { response, body: response.json() as { token: string; organization: { id: string } } };
}

describe('Centsible API', () => {
  it('registers, authenticates, and exposes the organization context', async () => {
    const app = await createApp(new MemoryRepository(), 'test-secret');
    const registered = await register(app, 'owner@example.com', 'Acme');
    expect(registered.response.statusCode).toBe(201);

    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { authorization: `Bearer ${registered.body.token}` } });
    expect(me.statusCode).toBe(200);
    expect(me.json().role).toBe('OWNER');
  });

  it('isolates records between organizations', async () => {
    const repository = new MemoryRepository();
    const app = await createApp(repository, 'test-secret');
    const first = await register(app, 'first@example.com', 'First');
    const second = await register(app, 'second@example.com', 'Second');
    const categoryId = repository.categories.find((category) => category.organizationId === first.body.organization.id)?.id;

    const create = await app.inject({
      method: 'POST',
      url: '/api/transactions',
      headers: { authorization: `Bearer ${first.body.token}` },
      payload: { type: 'expense', amountCents: 2500, categoryId, description: 'Private', date: '2026-09-08' },
    });
    expect(create.statusCode).toBe(201);

    const listed = await app.inject({ method: 'GET', url: '/api/transactions', headers: { authorization: `Bearer ${second.body.token}` } });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().data).toHaveLength(0);
  });

  it('prevents replaying an import with the same idempotency key and audits it once', async () => {
    const repository = new MemoryRepository();
    const app = await createApp(repository, 'test-secret');
    const account = await register(app, 'import@example.com', 'Importer');
    const categoryId = repository.categories.find((category) => category.organizationId === account.body.organization.id)?.id;
    const request = {
      method: 'POST' as const,
      url: '/api/transactions/import',
      headers: { authorization: `Bearer ${account.body.token}` },
      payload: { idempotencyKey: 'bank-file-2026-09', transactions: [{ type: 'expense', amountCents: 100, categoryId, description: 'Coffee', date: '2026-09-08' }] },
    };
    expect((await app.inject(request)).statusCode).toBe(201);
    const replay = await app.inject(request);
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual({ imported: 0, duplicate: true });

    const audit = await app.inject({ method: 'GET', url: '/api/audit', headers: { authorization: `Bearer ${account.body.token}` } });
    expect(audit.json().events).toHaveLength(1);
    expect(audit.json().events[0].action).toBe('IMPORT');
  });

  it('lists members and allows an admin to update roles inside the same organization', async () => {
    const repository = new MemoryRepository();
    const app = await createApp(repository, 'test-secret');
    const owner = await register(app, 'owner.users@example.com', 'Northwind');
    const member = await repository.createAccount({ email: 'member.users@example.com', passwordHash: 'hashed-member', organizationName: 'Sandbox' });
    repository.memberships.push({ userId: member.user.id, organizationId: owner.body.organization.id, role: 'VIEWER' });

    const list = await app.inject({ method: 'GET', url: '/api/users', headers: { authorization: `Bearer ${owner.body.token}` } });
    expect(list.statusCode).toBe(200);
    expect(list.json().users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'owner.users@example.com', role: 'OWNER' }),
        expect.objectContaining({ email: 'member.users@example.com', role: 'VIEWER' }),
      ])
    );

    const update = await app.inject({
      method: 'PATCH',
      url: `/api/users/${member.user.id}/role`,
      headers: { authorization: `Bearer ${owner.body.token}` },
      payload: { role: 'MANAGER' },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().user.role).toBe('MANAGER');
  });

  it('rejects invalid credentials and malformed financial input', async () => {
    const app = await createApp(new MemoryRepository(), 'test-secret');
    await register(app, 'validation@example.com', 'Validation');
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'validation@example.com', password: 'wrong' } });
    expect(login.statusCode).toBe(401);
    const invalid = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'bad', password: 'short', organizationName: '' } });
    expect(invalid.statusCode).toBe(400);
  });
});
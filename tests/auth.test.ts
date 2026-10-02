import { beforeEach, describe, expect, it } from 'vitest';
import { applyPassword, currentUser, loadUsers, login, logout, saveUsers } from '../src/lib/auth';
import type { AppUser } from '../src/lib/auth';
import { installMemoryStorage } from './memoryStorage';

const baseUser: AppUser = { id: 1, name: 'Admin', login: 'admin', role: 'ADMIN', active: true };

async function createUser(password = 'senha-segura') {
  const user = await applyPassword(baseUser, password);
  saveUsers([user]);
  return user;
}

describe('auth', () => {
  beforeEach(() => {
    installMemoryStorage().clear();
  });

  it('não aceita senha com menos de 8 caracteres', async () => {
    await expect(applyPassword(baseUser, '1234567')).rejects.toThrow('8 caracteres');
  });

  it('não guarda a senha em texto puro', async () => {
    const user = await createUser('senha-segura');
    expect(user.passwordHash).toMatch(/^[0-9a-f]{64}$/);
    expect(user.passwordSalt).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(loadUsers())).not.toContain('senha-segura');
  });

  it('entra com usuário e senha corretos, sem diferenciar maiúsculas no login', async () => {
    await createUser();
    const result = await login('  ADMIN ', 'senha-segura');
    expect(result.user?.id).toBe(1);
    expect(currentUser()?.id).toBe(1);
    logout();
    expect(currentUser()).toBeNull();
  });

  it('recusa senha errada e usuário inexistente', async () => {
    await createUser();
    expect(await login('admin', 'errada-123')).toEqual({ user: null, reason: 'INVALID' });
    expect(await login('outro', 'senha-segura')).toEqual({ user: null, reason: 'INVALID' });
  });

  it('bloqueia após 5 tentativas erradas, mesmo com a senha certa', async () => {
    await createUser();
    for (let i = 0; i < 4; i++) expect((await login('admin', 'errada-123')).reason).toBe('INVALID');
    expect((await login('admin', 'errada-123')).reason).toBe('LOCKED');
    expect((await login('admin', 'senha-segura')).reason).toBe('LOCKED');
    expect(loadUsers()[0].lockedUntil).not.toBeNull();
  });

  it('não permite login de usuário inativo', async () => {
    const user = await createUser();
    saveUsers([{ ...user, active: false }]);
    expect((await login('admin', 'senha-segura')).user).toBeNull();
  });
});

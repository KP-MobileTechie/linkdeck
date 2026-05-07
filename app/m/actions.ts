'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db/client';
import {
  getLinkByTokenHash, updateDestination, setDisabled, deleteLink,
} from '@/lib/db/queries';
import { hashToken } from '@/lib/token';
import { validateTargetUrl } from '@/lib/validate';

/** Every mutation re-verifies the token — possession is the only authorization. */
async function authorize(token: string) {
  return getLinkByTokenHash(getDb(), hashToken(token));
}

export async function updateDestinationAction(token: string, url: string): Promise<{ ok: boolean; error?: string }> {
  const link = await authorize(token);
  if (!link) return { ok: false, error: 'Not found.' };
  const check = validateTargetUrl(url);
  if (!check.ok) return { ok: false, error: check.reason };
  await updateDestination(getDb(), link.id, check.url);
  revalidatePath(`/m/${token}`);
  return { ok: true };
}

export async function setDisabledAction(token: string, disabled: boolean): Promise<{ ok: boolean }> {
  const link = await authorize(token);
  if (!link) return { ok: false };
  await setDisabled(getDb(), link.id, disabled);
  revalidatePath(`/m/${token}`);
  return { ok: true };
}

export async function deleteLinkAction(token: string): Promise<{ ok: boolean }> {
  const link = await authorize(token);
  if (!link) return { ok: false };
  await deleteLink(getDb(), link.id);
  return { ok: true };
}

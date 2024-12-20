import { Context } from 'hono';
import { options } from '../cli';
import path from 'node:path';
import { cacheResponse } from './cacheResponse';
import chalk from 'chalk';

const createRequestBody = async (c: Context): Promise<string | undefined> => {
  if (c.req.method === 'GET') return undefined;
  try {
    return JSON.stringify(await c.req.json());
  } catch (error) {
    console.error('Failed to parse request body: ', error);
    throw new Error('Invalid request body');
  }
};

const forwardRequest = async (url: string, method: string, body?: string) => {
  const headers = { 'Content-Type': 'application/json' };
  return fetch(url, { method, headers, body });
};

const handleError = (c: Context, error: unknown): Response => {
  console.error(chalk.bold.red('PROXY ERROR: ') + error);
  c.status(500);
  return c.body('Internal App Error');
};

export const proxy = async (c: Context) => {
  if (!options.origin) {
    return handleError(c, 'Origin url cannot be empty');
  }
  const url = path.join(options.origin, c.req.path);

  try {
    const body = await createRequestBody(c);
    const response = await forwardRequest(url, c.req.method, body);
    const responseBody = await response.json();

    await cacheResponse(c, responseBody);

    return c.json(responseBody, { status: response.status });
  } catch (error) {
    return handleError(c, error);
  }
};

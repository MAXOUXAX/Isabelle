/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { readFile } from 'node:fs/promises';

const DISCORD_EMBED_DESCRIPTION_LIMIT = 4096;
const GITHUB_REPOSITORY_PATTERN = /^[^/\s]+\/[^/\s]+$/u;
const MAX_WEBHOOK_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;
const TRANSIENT_HTTP_STATUS_CODES = new Set([
  408, 425, 429, 500, 502, 503, 504,
]);

interface WebhookSendResult {
  success: boolean;
  status: number | null;
  body: string;
  attempts: number;
}

function normalizeVersion(version: string): string {
  return version.startsWith('v') ? version : `v${version}`;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function parseRetryAfterHeader(retryAfterHeader: string | null): number | null {
  if (!retryAfterHeader) {
    return null;
  }

  const retryAfterSeconds = Number(retryAfterHeader);

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return retryAfterSeconds * 1_000;
  }

  const retryAtTimestamp = Date.parse(retryAfterHeader);

  if (Number.isNaN(retryAtTimestamp)) {
    return null;
  }

  return Math.max(retryAtTimestamp - Date.now(), 0);
}

function extractRetryAfterFromBody(body: string): number | null {
  try {
    const parsedBody: unknown = JSON.parse(body);

    if (
      typeof parsedBody === 'object' &&
      parsedBody !== null &&
      'retry_after' in parsedBody
    ) {
      const retryAfter = parsedBody.retry_after;

      if (typeof retryAfter === 'number' && Number.isFinite(retryAfter)) {
        return Math.max(retryAfter * 1_000, 0);
      }
    }
  } catch {
    return null;
  }

  return null;
}

function isRetryableStatusCode(status: number): boolean {
  return TRANSIENT_HTTP_STATUS_CODES.has(status);
}

function getRetryDelayMs(
  retryAfterHeader: string | null,
  responseBody: string,
  fallbackDelayMs: number,
): number {
  const retryAfterMsFromHeader = parseRetryAfterHeader(retryAfterHeader);

  if (retryAfterMsFromHeader !== null) {
    return retryAfterMsFromHeader;
  }

  const retryAfterMsFromBody = extractRetryAfterFromBody(responseBody);

  if (retryAfterMsFromBody !== null) {
    return retryAfterMsFromBody;
  }

  return fallbackDelayMs;
}

function normalizeRepositorySlug(repository: string): string | null {
  const normalizedRepository = repository.trim().replace(/\.git$/u, '');

  return GITHUB_REPOSITORY_PATTERN.test(normalizedRepository)
    ? normalizedRepository
    : null;
}

function findChunkBoundary(text: string, maxLength: number): number {
  const candidate = text.slice(0, maxLength + 1);
  const lastWhitespaceIndex = Math.max(
    candidate.lastIndexOf('\n'),
    candidate.lastIndexOf(' '),
    candidate.lastIndexOf('\t'),
  );

  return lastWhitespaceIndex > 0 ? lastWhitespaceIndex : maxLength;
}

function splitReleaseNotes(notes: string, maxLength: number): string[] {
  const normalizedNotes = notes.trim();

  if (normalizedNotes.length <= maxLength) {
    return [normalizedNotes];
  }

  const chunks: string[] = [];
  let remainingNotes = normalizedNotes;

  while (remainingNotes.length > 0) {
    if (remainingNotes.length <= maxLength) {
      chunks.push(remainingNotes);
      break;
    }

    const splitIndex = findChunkBoundary(remainingNotes, maxLength);
    const chunk = remainingNotes.slice(0, splitIndex).trimEnd();

    if (chunk.length === 0) {
      chunks.push(remainingNotes.slice(0, maxLength));
      remainingNotes = remainingNotes.slice(maxLength).trimStart();
      continue;
    }

    chunks.push(chunk);
    remainingNotes = remainingNotes.slice(splitIndex).trimStart();
  }

  return chunks;
}

async function sendWebhookPayload(
  webhookUrl: URL,
  payload: { content?: string; embeds: Record<string, unknown>[] },
): Promise<WebhookSendResult> {
  const body = JSON.stringify(payload);
  let retryDelayMs = INITIAL_RETRY_DELAY_MS;

  for (let attempt = 1; attempt <= MAX_WEBHOOK_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      const responseBody = await res.text();

      if (res.ok) {
        return {
          success: true,
          status: res.status,
          body: responseBody,
          attempts: attempt,
        };
      }

      if (attempt < MAX_WEBHOOK_ATTEMPTS && isRetryableStatusCode(res.status)) {
        const retryDelay = getRetryDelayMs(
          res.headers.get('Retry-After'),
          responseBody,
          retryDelayMs,
        );

        console.warn(
          `Webhook Discord refusé temporairement (tentative ${String(attempt)}/${String(MAX_WEBHOOK_ATTEMPTS)}, statut ${String(res.status)}). Nouvelle tentative dans ${String(retryDelay)} ms.`,
        );

        await wait(retryDelay);
        retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_DELAY_MS);
        continue;
      }

      return {
        success: false,
        status: res.status,
        body: responseBody,
        attempts: attempt,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur réseau inconnue.';

      if (attempt < MAX_WEBHOOK_ATTEMPTS) {
        console.warn(
          `Erreur réseau pendant l'envoi du webhook Discord (tentative ${String(attempt)}/${String(MAX_WEBHOOK_ATTEMPTS)}). Nouvelle tentative dans ${String(retryDelayMs)} ms.`,
          error,
        );

        await wait(retryDelayMs);
        retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_DELAY_MS);
        continue;
      }

      return {
        success: false,
        status: null,
        body: errorMessage,
        attempts: attempt,
      };
    }
  }

  return {
    success: false,
    status: null,
    body: 'Nombre maximal de tentatives atteint.',
    attempts: MAX_WEBHOOK_ATTEMPTS,
  };
}

async function sendDiscordNotification() {
  const requiredEnvVars = {
    NEXT_RELEASE_VERSION: process.env.NEXT_RELEASE_VERSION,
    NEXT_RELEASE_NOTES_FILE: process.env.NEXT_RELEASE_NOTES_FILE,
    GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  } as const;

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      console.error(
        `Erreur : La variable d'environnement ${key} n'est pas définie.`,
      );
      return;
    }
  }

  const version = requiredEnvVars.NEXT_RELEASE_VERSION!;
  const normalizedVersion = normalizeVersion(version);
  const githubRepo = requiredEnvVars.GITHUB_REPOSITORY!;
  const webhookUrl = requiredEnvVars.DISCORD_WEBHOOK_URL!;
  const normalizedRepository = normalizeRepositorySlug(githubRepo);

  if (!normalizedRepository) {
    console.error(
      "Erreur : GITHUB_REPOSITORY doit être au format 'owner/repo'.",
    );
    return;
  }

  const repositoryUrl = `https://github.com/${normalizedRepository}`;
  const releaseUrl = `${repositoryUrl}/releases/tag/${normalizedVersion}`;

  let notes = '';
  if (process.env.NEXT_RELEASE_NOTES_FILE) {
    try {
      notes = await readFile(process.env.NEXT_RELEASE_NOTES_FILE, 'utf8');
    } catch (error) {
      console.error(
        `Erreur lors de la lecture de ${process.env.NEXT_RELEASE_NOTES_FILE} :`,
        error,
      );
      return;
    }
  }

  if (!notes || notes.trim() === '') {
    console.log('Aucune note de version à envoyer. Notification annulée.');
    return;
  }

  const url = new URL(webhookUrl);

  const noteChunks = splitReleaseNotes(notes, DISCORD_EMBED_DESCRIPTION_LIMIT);
  const timestamp = new Date().toISOString();
  let sentChunks = 0;

  for (const [index, chunk] of noteChunks.entries()) {
    const partNumber = index + 1;
    const totalParts = noteChunks.length;
    const partLabel = `${String(partNumber)}/${String(totalParts)}`;

    const sendResult = await sendWebhookPayload(url, {
      content:
        index === 0
          ? `# 🚀 Une nouvelle version d'Isabelle vient d'être publiée !`
          : undefined,
      embeds: [
        {
          title:
            totalParts === 1
              ? `🎉 Version ${normalizedVersion}`
              : `🎉 Version ${normalizedVersion} (${partLabel})`,
          url: releaseUrl,
          description: chunk,
          color: 5814783,
          footer: {
            text:
              totalParts === 1
                ? `Notes de version pour Isabelle ${normalizedVersion}`
                : `Notes de version pour Isabelle ${normalizedVersion} · Partie ${partLabel}`,
          },
          timestamp,
        },
      ],
    });

    if (!sendResult.success) {
      console.error(
        `Échec de l'envoi de la notification Discord pour la partie ${partLabel} après ${String(sendResult.attempts)} tentative${sendResult.attempts > 1 ? 's' : ''}.`,
        sendResult.status !== null
          ? `${String(sendResult.status)} ${sendResult.body}`
          : sendResult.body,
      );
      break;
    }

    sentChunks += 1;
  }

  if (sentChunks !== noteChunks.length) {
    console.warn(
      `Notification Discord partiellement envoyée (${String(sentChunks)}/${String(noteChunks.length)} message${noteChunks.length > 1 ? 's' : ''}).`,
    );
    return;
  }

  console.log(
    `Notification Discord envoyée avec succès ! (${String(noteChunks.length)} message${noteChunks.length > 1 ? 's' : ''})`,
  );
}

void sendDiscordNotification();

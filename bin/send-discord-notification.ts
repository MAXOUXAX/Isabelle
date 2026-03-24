/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { readFile } from 'node:fs/promises';

const DISCORD_EMBED_DESCRIPTION_LIMIT = 4096;
const GITHUB_REPOSITORY_PATTERN = /^[^/\s]+\/[^/\s]+$/u;

function normalizeVersion(version: string): string {
  return version.startsWith('v') ? version : `v${version}`;
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
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error(
      "Erreur lors de l'envoi de la notification Discord :",
      res.status.toString() + ' ' + res.statusText,
      await res.text(),
    );
    throw new Error('Discord webhook request failed.');
  }
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

  for (const [index, chunk] of noteChunks.entries()) {
    const partNumber = index + 1;
    const totalParts = noteChunks.length;
    const partLabel = `${String(partNumber)}/${String(totalParts)}`;

    await sendWebhookPayload(url, {
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
  }

  console.log(
    `Notification Discord envoyée avec succès ! (${String(noteChunks.length)} message${noteChunks.length > 1 ? 's' : ''})`,
  );
}

void sendDiscordNotification();

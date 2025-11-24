/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { readFile } from 'node:fs/promises';

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
  const githubRepo = requiredEnvVars.GITHUB_REPOSITORY!;
  const webhookUrl = requiredEnvVars.DISCORD_WEBHOOK_URL!;

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

  const payload = {
    content: `# 🚀 Une nouvelle version d'Isabelle vient d'être publiée !`,
    embeds: [
      {
        title: `🎉 Version ${version}`,
        url: `https://github.com/${githubRepo}/releases/tag/v${version}`,
        description: `Voici les changements inclus dans cette nouvelle mise à jour :\n${notes}`,
        color: 5814783,
        footer: {
          text: `Notes de version pour Isabelle v${version}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const data = JSON.stringify(payload);
  const url = new URL(webhookUrl);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data,
  });

  if (!res.ok) {
    console.error(
      "Erreur lors de l'envoi de la notification Discord :",
      res.statusText,
    );
  } else {
    console.log('Notification Discord envoyée avec succès !');
  }
}

void sendDiscordNotification();

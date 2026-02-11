export interface AiFooterOptions {
  disclaimer: string;
  totalTokens: number;
  modelVersion?: string;
  generatedAt?: Date;
}

export function buildAiFooter({
  disclaimer,
  totalTokens,
  modelVersion,
  generatedAt = new Date(),
}: AiFooterOptions): string {
  const generationDateTime = generatedAt.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const modelInfo = modelVersion ? ` • ${modelVersion}` : '';

  return `\n\n-# ${disclaimer}\n-# ${generationDateTime}${modelInfo} • ${totalTokens.toString()} tokens`;
}

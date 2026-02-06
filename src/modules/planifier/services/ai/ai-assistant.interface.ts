/**
 * Common interface for AI assistants.
 * Each assistant takes input and returns a typed result or null on failure.
 */
export interface AiAssistant<TInput, TOutput> {
  /**
   * Execute the AI assistant with the given input.
   * Returns the result or null if the operation fails.
   */
  execute(input: TInput): Promise<TOutput | null>;
}

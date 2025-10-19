const ENVIRONMENT =
  process.env.NODE_ENV === 'development' ? 'development' : 'production';
export type Environment = 'development' | 'production';

export const environment: Environment = ENVIRONMENT;

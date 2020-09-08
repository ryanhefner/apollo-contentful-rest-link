import type { ApolloLink } from '@apollo/client'

/**
 * ContentfulRestLink
 */

export interface ClientOptions {
  space: string;
  accessToken: string;
  previewAccessToken?: string;
  environment?: string;
  insecure?: boolean;
  host?: string;
  basePath?: string;
  httpAgent?:	any;
  httpsAgent?: any;
  proxy?:	any;
  headers?:	any;
  adapter?:	() => void;
  resolveLinks?: boolean;
  removeUnresolved?: boolean;
  retryOnError?: boolean;
  logHandler?: () => void;
  application?: string;
  integration?: string;
  timeout?:	number;
  retryLimit?: number;
}

export interface QueryDefaults {
  include?: number;
}

export declare class ContentfulRestLink extends ApolloLink {
  constructor(clientOptions: ClientOptions, queryDefaults?: QueryDefaults);
}

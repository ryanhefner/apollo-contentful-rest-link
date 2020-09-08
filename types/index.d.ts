import type { ApolloLink } from '@apollo/client'

/**
 * ContentfulRestLink
 */

interface ClientOptions {
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

interface QueryDefaults {
  include?: number;
}

interface ContentfulRestLink extends ApolloLink {}

declare var ContentfulRestLink: {
  new (clientOptions: ClientOptions, queryDefaults?: QueryDefaults): ContentfulRestLink;
}

# 🔗 apollo-contentful-rest-link

[![npm](https://img.shields.io/npm/v/apollo-contentful-rest-link?style=flat-square)](https://www.pkgstats.com/pkg:apollo-contentful-rest-link)
[![NPM](https://img.shields.io/npm/l/apollo-contentful-rest-link?style=flat-square)](https://www.pkgstats.com/pkg:apollo-contentful-rest-link)
[![npm](https://img.shields.io/npm/dt/apollo-contentful-rest-link?style=flat-square)](https://www.pkgstats.com/pkg:apollo-contentful-rest-link)

Perform GraphQL queries against Contentful’s Rest API. No more, query size limits! No more, query complexities!!

## Install

Via [npm](https://npmjs.com/package/apollo-contentful-rest-link)

```sh
npm install --save apollo-contentful-rest-link
```

Via [Yarn](https://yarn.fyi/apollo-contentful-rest-link)

```sh
yarn add apollo-contentful-rest-link
```

## How to use

```js
import ApolloClient from 'apollo-client'
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory'
import ContentfulRestLink from 'apollo-contentful-rest-link'
import introspectionQueryResultData from 'schema/fragmentTypes.json'

const space = process.env.CONTENTFUL_SPACE
const accessToken = process.env.CONTENTFUL_ACCESS_TOKEN

const fragmentMatcher = new IntrospectionFragmentMatcher({
  introspectionQueryResultData,
})

const apolloClient = new ApolloClient({
  link: new ContentfulRestLink({
    space,
    accessToken,
  }, {
    include: 10,
  }),
  cache: new InMemoryCache({ fragmentMatcher }),
});
```

## License

[MIT](LICENSE) © [Ryan Hefner](https://www.ryanhefner.com)

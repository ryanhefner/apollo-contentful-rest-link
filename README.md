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

`ContentfulRestLink` makes it easy to query the Contentful REST API via GraphQL +
Apollo, without all the fuss about query size, nor complexity, limit issues. Simply
setup the `link` when you are creating your `ApolloClient`, then feel free to
perform your `GraphQL` queries like you normally do.

The `ContentfulRestLink` class accepts two arguments, `clientOptions` and `queryDefaults` _(optional)_.

* `clientOptions` - Accepts all Contentful Client options, reference available [here](https://contentful.github.io/contentful.js/contentful/7.14.6/contentful.html#.createClient).

_The only exception is that if you plan to use the Contentful Preview API, you’ll have to include an optional `previewAccessToken`, which will create a client for all queries where `preview` variable is `true`._

* `queryDefaults` - This is just a handy tool if you happen to have some defaults
that you would like to include for all queries being made to Contentful. Handy ones
that you might use would be, `{ include: 10, locale: 'en-US' }`. Where `include` sets
the depth of linked references to include in responses, [Link docs](https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/links),
and `locale` specifies the localization of the entry(ies) returned, [Localization docs](https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/localization).

## Example

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

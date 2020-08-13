import { ApolloLink, Observable } from '@apollo/client'
import { graphql } from 'graphql-anywhere/lib/async'
import omit from 'lomit'
import { graphqlParser, contentfulResolver } from 'contentful-parsers'

const contentful = require('contentful')

export default class ContentfulRestLink extends ApolloLink {
  constructor(clientOptions, queryDefaults = {}) {
    super()

    this.clientOptions = clientOptions
    this.queryDefaults = queryDefaults

    this.client = contentful.createClient({
      ...clientOptions,
    })
  }

  request(operation, forward) {
    const { query, variables } = operation

    const obs = forward
      ? foward(operation)
      : Observable.of({ data: {} })

    // Find operationName to apply to root property of the GraphQL data response
    const operationName = query.definitions
      .find(definition => definition.operation === 'query')
      ?.selectionSet.selections
      .find(selection => selection.name.kind === 'Name')
      ?.name.value;

    return obs.flatMap(({ data, errors }) => new Observable(observer => {
      const queryMethod = variables.hasOwnProperty('id')
        ? 'getEntry'
        : 'getEntries'
      const queryArgs = operationName.endsWith('Collection')
        ? [{ ...variables, ...this.queryDefaults, content_type: operationName.replace('Collection', '')}]
        : [variables.id, { ...this.queryDefaults, ...omit(variables, ['id']) }]

      // Contentful query
      this.client[queryMethod](...queryArgs)
        .then(contentfulData => {
          // Query contentfulData via GraphQL query
          graphql(
            contentfulResolver,
            query,
            graphqlParser(operationName, contentfulData),
          )
            .then(data => {
              observer.next({ data, errors })
              observer.complete()
            })
        })
        .catch(error => {
          observer.error(error)
        })
    }))
  }
}

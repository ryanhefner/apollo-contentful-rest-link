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
    const { query, variables, operationName } = operation

    const obs = forward
      ? foward(operation)
      : Observable.of({ data: {} })

    // Find name to apply as root field of the GraphQL data
    const rootField = query[operationName].definitions
      .find(definition => definition.operation === 'query')
      ?.selectionSet.selections
      .find(selection => selection.name.kind === 'Name')
      ?.name.value;

    // Convert the query variables to a format the Contentful API understands
    const parseQueryVariables = (query, variables) => {
      const operationVariables = query[operationName].definitions
        .find(definition => definition.operation === 'query')
        ?.variableDefinitions.map(variableDefinition => variableDefinition.variable.name.value)

      const operationQueries = Object.keys(variables)
        .filter(variableKey => operationVariables.includes(variableKey))
        .map(variableKey => {
          // @todo Confirm if [in] is the proper default to apply to these - Ryan
          const queryKey = `fields.${variableKey}[in]`
          return { [queryKey]: variables[variableKey] }
        })
        .reduce((acc, cur) => {
          return {...acc, ...cur }
        }, {});

      return { ...operationQueries, ...omit(variables, operationVariables) }
    }

    return obs.flatMap(({ data, errors }) => new Observable(observer => {
      const queryMethod = variables.hasOwnProperty('id')
        ? 'getEntry'
        : 'getEntries'
      const queryArgs = variables.hasOwnProperty('id')
        ? [variables.id, { ...this.queryDefaults, ...parseQueryVariables(query, omit(variables, ['id'])) }]
        : [{
            ...parseQueryVariables(query, variables),
            ...this.queryDefaults,
            content_type: rootField.replace('Collection', '')
          }]

      // Contentful query
      this.client[queryMethod](...queryArgs)
        .then(contentfulData => {
          // Query contentfulData via GraphQL query
          graphql(
            contentfulResolver,
            query,
            graphqlParser(rootField, contentfulData),
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

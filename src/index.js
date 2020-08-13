import { ApolloLink, Observable } from '@apollo/client'
import { graphql } from 'graphql-anywhere/lib/async'
import omit from 'lomit'
import { graphqlParser, contentfulResolver } from 'contentful-parsers'

const contentful = require('contentful')

/**
 * Contentful API - Search Parameters
 * @ref https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/search-parameters
 */
const contentfulReservedParameters = [
  'access_token',
  'include',
  'locale',
  'content_type',
  'select',
  'query',
  'links_to_entry',
  'links_to_asset',
  'order',
  'limit',
  'skip',
  'mimetype_group',
  'where',
  'preview',
]

export default class ContentfulRestLink extends ApolloLink {
  constructor(clientOptions, queryDefaults = {}) {
    super()

    this.clientOptions = clientOptions
    this.queryDefaults = queryDefaults

    this.client = contentful.createClient({
      ...clientOptions,
    })

    if (clientOptions.hasOwnProperty('previewAccessToken')) {
      this.previewClient = contentful.createClient({
        ...clientOptions,
        accessToken: clientOptions.previewAccessToken,
        host: 'preview.contentful.com',
      })
    }
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
          // @todo See if we should also just extract variables, returning null and
          // running filter after this. - Ryan

          // If the variable key is known search parameter for the Contentful API,
          // just pass it through, un-parsed
          if (contentfulReservedParameters.includes(variableKey)) {
            return { [variableKey]: variables[variableKey] }
          }

          // Convert variable into query format supported in Contentful API
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

      // Choose client based on `preview` variable
      const client =
        variables.hasOwnProperty('preview') &&
        variables.preview &&
        this.previewClient
          ? this.previewClient
          : this.client

      // Contentful query
      client[queryMethod](...queryArgs)
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

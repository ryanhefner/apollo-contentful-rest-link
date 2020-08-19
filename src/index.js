import { ApolloLink, Observable } from '@apollo/client'
import { graphqlParser, contentfulResolver } from 'contentful-parsers'
import omit from 'lomit'
import { graphql } from 'graphql-anywhere/lib/async'

const contentful = require('contentful')

const VariableKind = {
  Argument: 'Argument',
  ObjectField: 'ObjectField',
};

const DefinitionKind = {
  OperationDefinition: 'OperationDefinition',
  FramentDefinition: 'FragmentDefinition',
}

const SelectionKind = {
  Field: 'Field',
  FragmentSpread: 'FragmentSpread',
}

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
  'preview',
]

const getSearchKey = (variableKey) => {
  if (variableKey.endsWith('_in')) {
    return `fields.${variableKey.replace('_in', '')}[in]`
  }

  if (variableKey.endsWith('_not')) {
    return `fields.${variableKey.replace('_not', '')}[ne]`
  }

  if (variableKey.endsWith('_exists')) {
    return `fields.${variableKey.replace('_exists', '')}[exists]`
  }

  if (variableKey.endsWith('_not_in')) {
    return `fields.${variableKey.replace('_not_in', '')}[nin]`
  }

  // if (variableKey.endsWith('_contains')) {
  //   return `fields.${variableKey.replace('_contains', '')}[?]`
  // }

  // if (variableKey.endsWith('_not_contains')) {
  //   return `fields.${variableKey.replace('_not_contains', '')}[?]`
  // }

  // @todo Add support for `x[all]` - Ryan
  // @todo Add support for `x[match]` - Ryan
  // @todo Add support for `x[gt]` - Ryan
  // @todo Add support for `x[gte]` - Ryan
  // @todo Add support for `x[lt]` - Ryan
  // @todo Add support for `x[lte]` - Ryan
  // @todo Add support for `x[near]` - Ryan
  // @todo Add support for `x[within]` - Ryan

  return `fields.${variableKey}`
}

const buildVariableMap = (operation) => {
  const { query, operationName } = operation

  const variableMap = {}

  query[operationName].definitions
    .filter(definition => definition.kind === DefinitionKind.OperationDefinition)
    .forEach(definition => {
      definition.selectionSet.selections.forEach(selection => {
        selection.arguments.forEach(argument => {
          if (argument?.value?.fields) {
            argument.value.fields.forEach(field => {
              if (field?.value?.name?.value && field?.kind && field?.name?.value) {
                variableMap[field.value.name.value] = {
                  kind: field.kind,
                  field: field.name.value,
                }
              }
            })
          } else if (argument?.value?.name?.value && argument?.kind && argument?.name?.value) {
            variableMap[argument.value.name.value] = {
              kind: argument.kind,
              field: argument.name.value,
            }
          }
        })
      })
    })

  return variableMap
}

const extractSelections = (selectionSet, definitions) => {
  if (!selectionSet || !selectionSet.selections || !selectionSet.selections.length) return null

  const selections = {}

  selectionSet.selections.forEach(selection => {
    if (selection.kind === SelectionKind.Field) {
      if (selection?.name?.value) {
        selections[selection.name.value] = extractSelections(selection.selectionSet, definitions)
      }
    } else if (selection.kind === SelectionKind.FragmentSpread) {
      const fragmentDefinition = definitions.find(
        definition =>
          definition.kind === DefinitionKind.FramentDefinition &&
          definition?.name?.value && selection?.name?.value &&
          definition.name.value === selection.name.value
      )
      if (fragmentDefinition) {
        selections[`...${selection.name.value}`] = extractSelections(fragmentDefinition.selectionSet, definitions)
      }
    }
  })

  return selections
}

const buildDefinitionMap = (operation) => {
  const { query } = operation

  const operationDefinition = query.definitions.find(
    definition => definition.kind === DefinitionKind.OperationDefinition
  )

  if (!operationDefinition) {
    return {}
  }

  if (!operationDefinition?.name?.value) {
    return {}
  }

  return {
    [operationDefinition.name.value]: extractSelections(operationDefinition.selectionSet, query.definitions)
  }
}

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
      ? forward(operation)
      : Observable.of({ data: {} })

    // Find name to apply as root field of the GraphQL data
    const rootField = query[operationName].definitions
      .find(definition => definition.operation === 'query')
      ?.selectionSet?.selections
      .find(selection => selection.name.kind === 'Name')
      ?.name?.value;

    // Convert the query variables to a format the Contentful API understands
    const parseQueryVariables = (query, variables, variableMap) => {
      const operationVariables = query[operationName].definitions
        .find(definition => definition.operation === 'query')
        ?.variableDefinitions.map(variableDefinition => variableDefinition.variable.name.value)

      const operationQueries = Object.keys(variableMap)
        .filter(variableKey => variables.hasOwnProperty(variableKey))
        .map(variableKey => {
          switch (variableMap[variableKey].kind) {
            case VariableKind.Argument:
              // If the variable key is known search parameter for the Contentful API,
              // just pass it through un-parsed
              if (contentfulReservedParameters.includes(variableKey)) {
                return { [variableMap[variableKey].field]: variables[variableKey] }
              }
              break

            case VariableKind.ObjectField:
              // Convert variable into query format supported in Contentful API
              const queryKey = getSearchKey(variableMap[variableKey].field)
              return { [queryKey]: variables[variableKey] }

            default:
              return null
          }

          return null
        })
        .filter(variable => !!variable)
        .reduce((acc, cur) => {
          return {...acc, ...cur }
        }, {});

      return { ...operationQueries, ...omit(variables, operationVariables) }
    }

    const variableMap = buildVariableMap(operation)
    const definitionMap = buildDefinitionMap(operation)

    return obs.flatMap(({ data, errors }) => new Observable(observer => {
      const queryMethod = variables.hasOwnProperty('id')
        ? 'getEntry'
        : 'getEntries'
      const queryArgs = variables.hasOwnProperty('id')
        ? [variables.id, { ...this.queryDefaults, ...parseQueryVariables(query, omit(variables, ['id']), variableMap) }]
        : [{
            ...parseQueryVariables(query, variables, variableMap),
            ...this.queryDefaults,
            content_type: rootField.replace('Collection', '')
          }]

      // Choose client based on `preview` variable or `isPreview` context
      const usePreview = this.previewClient
        && Object.keys(variableMap).find(
          variable => variableMap[variable].field === 'preview'
        )
      const client = usePreview ? this.previewClient : this.client

      // Contentful query
      client[queryMethod](...queryArgs)
        .then(contentfulData => {
          const parsedData = graphqlParser(
            rootField,
            contentfulData,
            definitionMap[operationName]
          )

          // Query contentfulData via GraphQL query
          graphql(
            contentfulResolver,
            query,
            parsedData,
          )
            .then(data => {
              observer.next({ data, errors })
              observer.complete()
            })
            .catch(error => console.error(error))
        })
        .catch(error => {
          observer.error(error)
        })
    }))
  }
}

@description('Azure Cosmos DB account with 8 containers for Blueflame')
param location string
param tags object
param accountName string

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: accountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    capabilities: [
      { name: 'EnableServerless' }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: 'blueflame'
  properties: {
    resource: {
      id: 'blueflame'
    }
  }
}

// Container definitions matching spec Section 13.2
var containers = [
  { name: 'specs',        partitionKey: '/projectId' }
  { name: 'plans',        partitionKey: '/runId' }
  { name: 'locks',        partitionKey: '/runId' }
  { name: 'runs',         partitionKey: '/projectId' }
  { name: 'agents',       partitionKey: '/runId' }
  { name: 'constraints',  partitionKey: '/projectId' }
  { name: 'documents',    partitionKey: '/projectId' }
  { name: 'failures',     partitionKey: '/projectId' }
  // Future: migrate to /orgId for multi-tenant and portfolio-level partitioning
  { name: 'projects',     partitionKey: '/id' }
]

resource cosmosContainers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = [
  for container in containers: {
    parent: database
    name: container.name
    properties: {
      resource: {
        id: container.name
        partitionKey: {
          paths: [container.partitionKey]
          kind: 'Hash'
          version: 2
        }
        indexingPolicy: {
          automatic: true
          indexingMode: 'consistent'
        }
      }
    }
  }
]

output endpoint string = cosmosAccount.properties.documentEndpoint
output accountName string = cosmosAccount.name
output databaseName string = database.name
output primaryKey string = cosmosAccount.listKeys().primaryMasterKey

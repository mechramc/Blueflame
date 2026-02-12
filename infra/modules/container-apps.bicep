@description('Azure Container Apps environment and API app')
param location string
param tags object
param environmentName string
param apiAppName string
param logAnalyticsWorkspaceId string

@description('Container image to deploy (overridden by CI/CD)')
param apiImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Cosmos DB endpoint for API')
@secure()
param cosmosEndpoint string = ''

@description('Cosmos DB key for API')
@secure()
param cosmosKey string = ''

@description('Application Insights connection string')
@secure()
param appInsightsConnectionString string = ''

@description('Entra ID client ID')
param entraClientId string = ''

@description('Entra ID tenant ID')
param entraTenantId string = ''

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: reference(logAnalyticsWorkspaceId, '2023-09-01').customerId
        sharedKey: listKeys(logAnalyticsWorkspaceId, '2023-09-01').primarySharedKey
      }
    }
  }
}

resource apiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: apiAppName
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 4000
        transport: 'http'
        allowInsecure: false
      }
      secrets: [
        { name: 'cosmos-endpoint', value: cosmosEndpoint }
        { name: 'cosmos-key', value: cosmosKey }
        { name: 'appinsights-cs', value: appInsightsConnectionString }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '4000' }
            { name: 'COSMOS_ENDPOINT', secretRef: 'cosmos-endpoint' }
            { name: 'COSMOS_KEY', secretRef: 'cosmos-key' }
            { name: 'COSMOS_DATABASE', value: 'blueflame' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', secretRef: 'appinsights-cs' }
            { name: 'ENTRA_CLIENT_ID', value: entraClientId }
            { name: 'ENTRA_TENANT_ID', value: entraTenantId }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
      }
    }
  }
}

output environmentId string = environment.id
output apiAppFqdn string = apiApp.properties.configuration.ingress.fqdn

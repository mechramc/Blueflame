targetScope = 'resourceGroup'

// ─── Parameters ───────────────────────────────────────────────

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Environment name (dev or prod)')
@allowed(['dev', 'prod'])
param environment string = 'dev'

@description('Entra ID tenant ID for Key Vault')
param tenantId string

// ─── Naming ───────────────────────────────────────────────────

var prefix = 'blueflame'
var suffix = environment
var tags = {
  project: 'blueflame'
  environment: environment
}

// ─── Modules ──────────────────────────────────────────────────

module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'log-analytics'
  params: {
    location: location
    tags: tags
    workspaceName: '${prefix}-logs-${suffix}'
  }
}

module cosmos 'modules/cosmos.bicep' = {
  name: 'cosmos'
  params: {
    location: location
    tags: tags
    accountName: '${prefix}-cosmos-${suffix}'
  }
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    location: location
    tags: tags
    storageAccountName: '${prefix}store${suffix}'
  }
}

module signalr 'modules/signalr.bicep' = {
  name: 'signalr'
  params: {
    location: location
    tags: tags
    signalrName: '${prefix}-signalr-${suffix}'
  }
}

module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    location: location
    tags: tags
    vaultName: '${prefix}-kv-${suffix}'
    tenantId: tenantId
  }
}

module containerApps 'modules/container-apps.bicep' = {
  name: 'container-apps'
  params: {
    location: location
    tags: tags
    environmentName: '${prefix}-env-${suffix}'
    apiAppName: '${prefix}-api-${suffix}'
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceId
  }
}

module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'static-web-app'
  params: {
    location: location
    tags: tags
    appName: '${prefix}-web-${suffix}'
  }
}

// ─── Outputs ──────────────────────────────────────────────────

output cosmosEndpoint string = cosmos.outputs.endpoint
output cosmosAccountName string = cosmos.outputs.accountName
output cosmosDatabaseName string = cosmos.outputs.databaseName
output storageBlobEndpoint string = storage.outputs.blobEndpoint
output signalrHostName string = signalr.outputs.signalrHostName
output keyVaultUri string = keyVault.outputs.vaultUri
output apiFqdn string = containerApps.outputs.apiAppFqdn
output webHostname string = staticWebApp.outputs.defaultHostname
output appInsightsConnectionString string = logAnalytics.outputs.appInsightsConnectionString

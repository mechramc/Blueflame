@description('Azure SignalR Service for real-time dashboard updates')
param location string
param tags object
param signalrName string

resource signalr 'Microsoft.SignalRService/signalR@2024-03-01' = {
  name: signalrName
  location: location
  tags: tags
  sku: {
    name: 'Free_F1'
    capacity: 1
  }
  kind: 'SignalR'
  properties: {
    features: [
      {
        flag: 'ServiceMode'
        value: 'Default'
      }
      {
        flag: 'EnableConnectivityLogs'
        value: 'true'
      }
    ]
    cors: {
      allowedOrigins: ['*']
    }
  }
}

output signalrHostName string = signalr.properties.hostName
output signalrId string = signalr.id

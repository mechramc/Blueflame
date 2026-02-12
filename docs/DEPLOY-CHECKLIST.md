# Blueflame Deployment Checklist

> Step-by-step trial run. Do each step in order. If a step fails, note the step number and exact error, then stop.

---

## Part A: Verify Existing Azure Resources (5 min)

### A1. Login to Azure Portal
1. Open browser → https://portal.azure.com
2. Sign in with your Microsoft account
3. Confirm you see the portal dashboard
- [*]Pass

### A2. Verify Resource Group exists
1. In the portal search bar at top, type `blueflame-rg`
2. Click on it under "Resource Groups"
3. You should see a list of resources
- [*] PASS
- Note: Write down how many resources you see: 3
blueflame-cosmos-dev
Azure Cosmos DB account
Central US
blueflame-openai-dev
Azure OpenAI
East US
ramch-mlig4pj5-swedencentral
Foundry
Sweden Central

### A3. Verify Cosmos DB
1. In the resource group, click on the resource named `blueflame-cosmos-dev` (Type: Azure Cosmos DB account)
2. In the left sidebar, click **Data Explorer**
3. Expand the `blueflame` database
4. You should see 8 containers: `specs`, `plans`, `locks`, `runs`, `agents`, `constraints`, `documents`, `failures`
- [0]FAIL
- Note: If any containers are missing, list them: No containers are visible

### A4. Check if Application Insights exists
1. Go back to `blueflame-rg` (click "Resource Group" in breadcrumb or search again)
2. Look for a resource of type **Application Insights**
3. If it exists, click on it → copy the **Connection String** from the Overview page
4. If it does NOT exist, go to Part B
- DOES NOT EXIST
- Connection string (if exists): ______

---

## Part B: Create Application Insights (skip if A4 exists) (3 min)

### B1. Create the resource
1. In Azure Portal, click **+ Create a resource** (top-left)
2. Search for `Application Insights`
3. Click **Application Insights** → **Create**
4. Fill in:
   - **Subscription**: (your subscription)
   - **Resource Group**: `blueflame-rg`
   - **Name**: `blueflame-insights-dev`
   - **Region**: Same as your other resources (check Cosmos DB's region if unsure)
   - **Resource Mode**: Workspace-based
   - **Log Analytics Workspace**: If one exists in `blueflame-rg`, select it. Otherwise click "Create new" → name it `blueflame-logs-dev`
5. Click **Review + Create** → **Create**
6. Wait for deployment to complete (30-60 seconds)
-PASS

### B2. Copy the connection string
1. Once deployed, click **Go to resource**
2. On the Overview page, find **Connection String** (right side)
3. Click the copy icon next to it
4. Save it — you'll need it in Part C
- PASS
- Connection string: InstrumentationKey=e583b932-a44b-4ccd-8c0a-9d490b0263a9;IngestionEndpoint=https://centralus-2.in.applicationinsights.azure.com/;LiveEndpoint=https://centralus.livediagnostics.monitor.azure.com/;ApplicationId=345405f8-6a96-420a-b864-a365541fc553

---

## Part C: Update .env with Connection String (1 min)

### C1. Tell Claude the connection string
1. Paste the Application Insights connection string here in chat
2. I'll update your `.env` file
- [ ] PASS / FAIL

---

## Part D: Test Local API with Real Cosmos DB (5 min)

### D1. Start the API locally
1. Open a NEW terminal (not this Claude session)
2. Run:
   ```
   cd C:\Github\Blueflame\apps\api
   npx tsx src/index.ts
   ```
3. You should see: `Blueflame API listening on http://localhost:4000`
4. If you see Cosmos/connection errors, note the exact error
- [ ] PASS / FAIL
- Error (if any): ______

### D2. Hit the health endpoint
1. Open browser → http://localhost:4000/health
2. You should see JSON like:
   ```json
   {
     "status": "ok",
     "service": "blueflame-api",
     "version": "0.0.1",
     "telemetry": false,
     "cosmos": true,
     "entra": true,
     "uptime": 5.123
   }
   ```
3. Check: `cosmos` should be `true` (since `COSMOS_ENDPOINT` is set)
4. Check: `entra` should be `true` (since `ENTRA_CLIENT_ID` is set)
5. `telemetry` will be `true` only if you completed Part B/C
- [ ] PASS / FAIL
- Actual JSON: ______

### D3. Test the demo seed endpoint
1. Open browser → http://localhost:4000/api/demo/seed
2. This is a POST endpoint, so use the terminal instead:
   ```
   curl -X POST http://localhost:4000/api/demo/seed
   ```
   Or in PowerShell:
   ```
   Invoke-RestMethod -Method POST -Uri http://localhost:4000/api/demo/seed
   ```
3. You should get a JSON response with seeded data (or an error if already seeded)
- [ ] PASS / FAIL
- Response: ______

### D4. Verify data landed in Cosmos
1. Go back to Azure Portal → `blueflame-cosmos-dev` → **Data Explorer**
2. Expand `blueflame` → click on `specs` container → **Items**
3. You should see document(s) from the seed
4. If empty, the seed may not have written to Cosmos (we'll debug)
- [ ] PASS / FAIL

### D5. Stop the API
1. Go back to the terminal where the API is running
2. Press `Ctrl+C` to stop it

---

## Part E: Docker Build Test (5 min)

### E1. Check Docker is installed
1. Open terminal, run:
   ```
   docker --version
   ```
2. You should see something like `Docker version 24.x` or `27.x`
- [ ] PASS / FAIL (if FAIL, skip to Part F — Docker isn't required for the trial)

### E2. Build the Docker image
1. Run from the repo root:
   ```
   cd C:\Github\Blueflame
   docker build -f apps/api/Dockerfile -t blueflame-api:test .
   ```
2. This takes 1-3 minutes on first run
3. Should end with `Successfully tagged blueflame-api:test`
- [ ] PASS / FAIL
- Error (if any): ______

### E3. Run the Docker container
1. Run:
   ```
   docker run --rm -p 4000:4000 --env-file .env blueflame-api:test
   ```
2. You should see `Blueflame API listening on http://localhost:4000`
3. Open browser → http://localhost:4000/health
4. Same health JSON as D2
- [ ] PASS / FAIL

### E4. Stop the container
1. Press `Ctrl+C` to stop

---

## Part F: GitHub Secrets Setup (5 min)

### F1. Open GitHub repo settings
1. Open browser → https://github.com/mechramc/Blueflame/settings/secrets/actions
2. You should see the "Actions secrets and variables" page
- [ ] PASS / FAIL

### F2. Create Azure Service Principal (for CI/CD)
1. Open a terminal and run:
   ```
   az login
   az ad sp create-for-rbac --name "blueflame-github-deploy" --role contributor --scopes /subscriptions/34036ba6-10fe-486e-854f-0343711f7009/resourceGroups/blueflame-rg --sdk-auth
   ```
2. This outputs a JSON blob — copy the ENTIRE JSON output
3. If you get "insufficient privileges", you may need to use an account with Owner role on the subscription
- [ ] PASS / FAIL
- Note: Save the JSON output securely

### F3. Add AZURE_CREDENTIALS secret
1. Back on GitHub (F1 page), click **New repository secret**
2. Name: `AZURE_CREDENTIALS`
3. Value: Paste the entire JSON from F2
4. Click **Add secret**
- [ ] PASS / FAIL

### F4. Get Static Web Apps API token
1. Azure Portal → `blueflame-rg` → find the Static Web App resource
2. If no Static Web App exists yet, skip this step (we'll create it during Bicep deploy)
3. If it exists: click on it → **Overview** → **Manage deployment token** → Copy
- [ ] PASS / EXISTS BUT NO TOKEN / DOES NOT EXIST

### F5. Add AZURE_STATIC_WEB_APPS_API_TOKEN secret (if F4 succeeded)
1. GitHub → **New repository secret**
2. Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
3. Value: Paste the token from F4
4. Click **Add secret**
- [ ] PASS / FAIL / SKIPPED

### F6. Add AZURE_RESOURCE_GROUP variable
1. On the same GitHub page, click the **Variables** tab (next to Secrets)
2. Click **New repository variable**
3. Name: `AZURE_RESOURCE_GROUP`
4. Value: `blueflame-rg`
5. Click **Add variable**
- [ ] PASS / FAIL

---

## Part G: Test CI Pipeline (3 min)

### G1. Trigger the CI workflow
1. Open browser → https://github.com/mechramc/Blueflame/actions
2. You should see recent workflow runs from the push we just did
3. Click on the most recent "CI" run
4. Check: all steps should be green (build, lint, test)
- [ ] PASS / FAIL
- Failed step (if any): ______

---

## Results Summary

Fill this in and share with Claude:

```
Part A: A1[  ] A2[  ] A3[  ] A4[  ]
Part B: B1[  ] B2[  ] (or SKIPPED)
Part C: C1[  ]
Part D: D1[  ] D2[  ] D3[  ] D4[  ]
Part E: E1[  ] E2[  ] E3[  ] (or SKIPPED)
Part F: F1[  ] F2[  ] F3[  ] F4[  ] F5[  ] F6[  ]
Part G: G1[  ]
```

First failure at step: ______
Error message: ______

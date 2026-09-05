# User Activity Tracking Verification Suite
$baseUrl = "http://localhost:5000/api"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "STARTING USER ACTIVITY TRACKING & LOGIN AUDIT" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$testEmail = "activity_user_${timestamp}@marketwatch.pro"
$password = "SecretPassword123!"

# 1. Register a new user (Session 1)
Write-Host "`n[TEST 1] Registering brand new user (Initial Session 1)..." -ForegroundColor Yellow
$regBody = @{
    email = $testEmail
    password = $password
    name = "Activity Test User"
} | ConvertTo-Json

$regRes = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -ContentType "application/json" -Body $regBody
$token1 = $regRes.data.token
$userId = $regRes.data.user.id
$firstLoginAt = $regRes.data.user.lastLoginAt
$firstPrevLoginAt = $regRes.data.user.previousLoginAt

Write-Host "  -> Registered User: $userId" -ForegroundColor Green
Write-Host "  -> Session 1 lastLoginAt: $firstLoginAt"
Write-Host "  -> Session 1 previousLoginAt: $(if ($null -eq $firstPrevLoginAt) { 'null' } else { $firstPrevLoginAt })"

if ($null -eq $firstLoginAt) {
    Write-Host "FAILED: lastLoginAt should be initialized on registration!" -ForegroundColor Red
    exit 1
}
if ($null -ne $firstPrevLoginAt) {
    Write-Host "FAILED: previousLoginAt should be null for a brand new user!" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: Registration correctly initialized lastLoginAt and kept previousLoginAt as null." -ForegroundColor Green

# 2. Check APIs on Session 1 (Testing fallback for first-time users)
Write-Host "`n[TEST 2] Verifying authenticated APIs return previousLoginAt: null for Session 1..." -ForegroundColor Yellow
$headers1 = @{ "Authorization" = "Bearer $token1" }

$meRes = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $headers1
Write-Host "  -> GET /auth/me previousLoginAt: $(if ($null -eq $meRes.data.previousLoginAt) { 'null' } else { $meRes.data.previousLoginAt })"
if ($null -ne $meRes.data.previousLoginAt) {
    Write-Host "FAILED: GET /auth/me should have previousLoginAt = null" -ForegroundColor Red
    exit 1
}

$stateRes = Invoke-RestMethod -Uri "$baseUrl/user/state" -Method Get -Headers $headers1
Write-Host "  -> GET /user/state previousLoginAt: $(if ($null -eq $stateRes.previousLoginAt) { 'null' } else { $stateRes.previousLoginAt })"
if ($null -ne $stateRes.previousLoginAt) {
    Write-Host "FAILED: GET /user/state should have previousLoginAt = null" -ForegroundColor Red
    exit 1
}

# Setup a quick watchlist so dashboard can load
$wlBody = @{
    name = "Primary Watchlist"
    symbols = @("TCS", "INFY")
} | ConvertTo-Json
Invoke-RestMethod -Uri "$baseUrl/watchlist/setup" -Method Post -ContentType "application/json" -Headers $headers1 -Body $wlBody | Out-Null

$dashRes = Invoke-RestMethod -Uri "$baseUrl/dashboard" -Method Get -Headers $headers1
Write-Host "  -> GET /dashboard previousLoginAt: $(if ($null -eq $dashRes.previousLoginAt) { 'null' } else { $dashRes.previousLoginAt })"
if ($null -ne $dashRes.previousLoginAt) {
    Write-Host "FAILED: GET /dashboard should have previousLoginAt = null" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: All APIs return previousLoginAt = null for first-time login session (triggers fallback)." -ForegroundColor Green

# 3. Wait 1.5 seconds and log in again (Session 2)
Write-Host "`n[TEST 3] Logging in again (Session 2) to trigger previousLoginAt shift..." -ForegroundColor Yellow
Start-Sleep -Milliseconds 1500

$loginBody = @{
    email = $testEmail
    password = $password
} | ConvertTo-Json

$loginRes2 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token2 = $loginRes2.data.token
$secondLoginAt = $loginRes2.data.user.lastLoginAt
$secondPrevLoginAt = $loginRes2.data.user.previousLoginAt

Write-Host "  -> Session 2 lastLoginAt: $secondLoginAt"
Write-Host "  -> Session 2 previousLoginAt: $secondPrevLoginAt"

if ($null -eq $secondPrevLoginAt) {
    Write-Host "FAILED: previousLoginAt must NOT be null on second login!" -ForegroundColor Red
    exit 1
}
if ($secondPrevLoginAt -ne $firstLoginAt) {
    Write-Host "FAILED: previousLoginAt ($secondPrevLoginAt) should equal previous session's lastLoginAt ($firstLoginAt)!" -ForegroundColor Red
    exit 1
}
if ([DateTime]$secondLoginAt -le [DateTime]$secondPrevLoginAt) {
    Write-Host "FAILED: second lastLoginAt should be newer than previousLoginAt!" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: previousLoginAt correctly took the value of previous lastLoginAt, and lastLoginAt updated!" -ForegroundColor Green

# 4. Check APIs on Session 2
Write-Host "`n[TEST 4] Verifying authenticated APIs expose previousLoginAt on Session 2..." -ForegroundColor Yellow
$headers2 = @{ "Authorization" = "Bearer $token2" }

$meRes2 = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $headers2
Write-Host "  -> GET /auth/me previousLoginAt: $($meRes2.data.previousLoginAt)"
if ($meRes2.data.previousLoginAt -ne $firstLoginAt) {
    Write-Host "FAILED: GET /auth/me did not return correct previousLoginAt!" -ForegroundColor Red
    exit 1
}

$stateRes2 = Invoke-RestMethod -Uri "$baseUrl/user/state" -Method Get -Headers $headers2
Write-Host "  -> GET /user/state previousLoginAt: $($stateRes2.previousLoginAt)"
if ($stateRes2.previousLoginAt -ne $firstLoginAt) {
    Write-Host "FAILED: GET /user/state did not return correct previousLoginAt!" -ForegroundColor Red
    exit 1
}

$dashRes2 = Invoke-RestMethod -Uri "$baseUrl/dashboard" -Method Get -Headers $headers2
Write-Host "  -> GET /dashboard previousLoginAt: $($dashRes2.previousLoginAt)"
if ($dashRes2.previousLoginAt -ne $firstLoginAt) {
    Write-Host "FAILED: GET /dashboard did not return correct previousLoginAt!" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: All APIs successfully exposed previousLoginAt timestamp for Session 2!" -ForegroundColor Green

# 5. Wait 1.5 seconds and log in again (Session 3)
Write-Host "`n[TEST 5] Logging in again (Session 3) to verify continuous timestamp progression..." -ForegroundColor Yellow
Start-Sleep -Milliseconds 1500

$loginRes3 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$thirdLoginAt = $loginRes3.data.user.lastLoginAt
$thirdPrevLoginAt = $loginRes3.data.user.previousLoginAt

Write-Host "  -> Session 3 lastLoginAt: $thirdLoginAt"
Write-Host "  -> Session 3 previousLoginAt: $thirdPrevLoginAt"

if ($thirdPrevLoginAt -ne $secondLoginAt) {
    Write-Host "FAILED: Session 3 previousLoginAt should equal Session 2 lastLoginAt!" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: Continuous progression confirmed: Session 3 previousLoginAt matches Session 2 lastLoginAt!" -ForegroundColor Green

# 6. Database Verification
Write-Host "`n[TEST 6] Direct Database audit of User model columns..." -ForegroundColor Yellow
$nodeCode = "const { PrismaClient } = require('c:/Users/angir/Desktop/Smart Market Watchlist/backend/node_modules/@prisma/client'); const prisma = new PrismaClient(); prisma.user.findUnique({ where: { id: '$userId' }, select: { id: true, email: true, lastLoginAt: true, previousLoginAt: true } }).then(u => console.log(JSON.stringify(u))).finally(() => prisma['`$disconnect']());"
$dbUser = node -e $nodeCode | ConvertFrom-Json
Write-Host "  -> DB Record: ID=$($dbUser.id), lastLoginAt=$($dbUser.lastLoginAt), previousLoginAt=$($dbUser.previousLoginAt)"
if ($null -ne $dbUser.lastLoginAt -and $null -ne $dbUser.previousLoginAt) {
    Write-Host "  PASS: User model columns persist and update correctly in PostgreSQL!" -ForegroundColor Green
} else {
    Write-Host "FAILED: Database record missing login timestamp fields!" -ForegroundColor Red
    exit 1
}

# 7. Date Formatting Helper Audit
Write-Host "`n[TEST 7] Testing local timezone formatting helper..." -ForegroundColor Yellow
$testDate = $dbUser.previousLoginAt
$formatTestCode = "const { formatLastActiveTimestamp } = require('./src/lib/dateUtils'); console.log(JSON.stringify({ formatted: formatLastActiveTimestamp('$testDate'), fallback: formatLastActiveTimestamp(null) }));"
$tsCode = "import { formatLastActiveTimestamp } from './src/lib/dateUtils'; console.log(JSON.stringify({ formatted: formatLastActiveTimestamp('$testDate'), fallback: formatLastActiveTimestamp(null) }));"
$formatJson = & ./backend/node_modules/.bin/tsx -e $tsCode
$formatResult = $formatJson | ConvertFrom-Json
Write-Host "  -> Formatted Previous Login: $($formatResult.formatted)"
Write-Host "  -> Fallback for First-Time User: $($formatResult.fallback)"

if ($formatResult.fallback -ne "First Login Session") {
    Write-Host "FAILED: Fallback should be 'First Login Session'!" -ForegroundColor Red
    exit 1
}
if (-not ($formatResult.formatted -match "\d{4}" -and $formatResult.formatted -match "(AM|PM)")) {
    Write-Host "FAILED: Formatted string should match 'Date • Time' pattern!" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: Local timezone formatting and fallback verified!" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "ALL USER ACTIVITY TRACKING AUDIT CHECKS PASSED!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

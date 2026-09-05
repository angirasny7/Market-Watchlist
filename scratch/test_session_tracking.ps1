$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:5000/api"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "1. Testing Backend Health" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
Write-Host "Backend Health: $($health.status) (uptime: $($health.uptime))" -ForegroundColor Green

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "2. Register New User (First Login Session Check)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$randomId = Get-Random -Minimum 1000 -Maximum 9999
$user1Email = "trader_alpha_$randomId@marketwatch.test"
$user1Pass = "Pass1234!@#"
$user1Name = "Alpha Trader"

$regPayload = @{
    email = $user1Email
    password = $user1Pass
    name = $user1Name
    deviceInfo = @{
        type = "Desktop"
        name = "Desktop"
    }
} | ConvertTo-Json

$reg1 = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regPayload -ContentType "application/json"
$token1 = $reg1.data.token

Write-Host "User 1 Registered: $($reg1.data.user.email)" -ForegroundColor White
Write-Host "User 1 previousLoginAt: '$($reg1.data.previousLoginAt)'" -ForegroundColor Yellow

if ($null -ne $reg1.data.previousLoginAt -and $reg1.data.previousLoginAt -ne "") {
    Write-Error "FAIL: Brand new user should have null previousLoginAt!"
} else {
    Write-Host "PASS: First-ever login session has null previousLoginAt" -ForegroundColor Green
}

# Check Dashboard for User 1
$dash1 = Invoke-RestMethod -Uri "$baseUrl/dashboard" -Method Get -Headers @{ Authorization = "Bearer $token1" }
Write-Host "Dashboard previousLoginAt: '$($dash1.previousLoginAt)'" -ForegroundColor Yellow
Write-Host "Dashboard currentDevice: $($dash1.currentDevice.deviceType) ($($dash1.currentDevice.deviceName))" -ForegroundColor White
Write-Host "Dashboard previousDevice: $($dash1.previousDevice)" -ForegroundColor White

if ($null -ne $dash1.previousLoginAt) {
    Write-Error "FAIL: Dashboard previousLoginAt should be null for first login session!"
} else {
    Write-Host "PASS: Dashboard displays First Login Session state on registration" -ForegroundColor Green
}

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "3. User 1 Logout (Persist Logout Timestamp)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$logoutPayload = @{
    deviceInfo = @{
        type = "Desktop"
        name = "Desktop"
    }
} | ConvertTo-Json

$logoutRes = Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method Post -Headers @{ Authorization = "Bearer $token1" } -Body $logoutPayload -ContentType "application/json"
Write-Host "Logout response: $($logoutRes.message)" -ForegroundColor Green

Start-Sleep -Seconds 1

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "4. User 1 Logs Back In From Mobile Device" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$loginPayload = @{
    email = $user1Email
    password = $user1Pass
    deviceInfo = @{
        type = "Mobile"
        name = "iPhone 15 Pro"
    }
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginPayload -ContentType "application/json"
$token1New = $loginRes.data.token

Write-Host "User 1 Logged in again!" -ForegroundColor White
Write-Host "User 1 previousLoginAt: '$($loginRes.data.previousLoginAt)'" -ForegroundColor Yellow

if ($null -eq $loginRes.data.previousLoginAt -or $loginRes.data.previousLoginAt -eq "") {
    Write-Error "FAIL: Returning user MUST have previousLoginAt populated from prior session!"
} else {
    Write-Host "PASS: Returning user previousLoginAt is accurately persisted ($($loginRes.data.previousLoginAt))" -ForegroundColor Green
}

# Fetch Dashboard for User 1 on Mobile
$dash1After = Invoke-RestMethod -Uri "$baseUrl/dashboard" -Method Get -Headers @{ Authorization = "Bearer $token1New" }
Write-Host "Dashboard previousLoginAt: '$($dash1After.previousLoginAt)'" -ForegroundColor Yellow
Write-Host "Dashboard currentDevice: $($dash1After.currentDevice.deviceType) ($($dash1After.currentDevice.deviceName))" -ForegroundColor Green
Write-Host "Dashboard previousDevice: $($dash1After.previousDevice.deviceType) ($($dash1After.previousDevice.deviceName))" -ForegroundColor Green
Write-Host "Dashboard awayDuration: $($dash1After.awayDuration)" -ForegroundColor Yellow

if ($dash1After.currentDevice.deviceType -ne "Mobile") {
    Write-Error "FAIL: Current device should be Mobile!"
}
if ($dash1After.previousDevice.deviceType -ne "Desktop") {
    Write-Error "FAIL: Previous device should be Desktop!"
}
Write-Host "PASS: Device continuity tracks Active on Mobile and Last session: Desktop" -ForegroundColor Green

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "5. Multi-User Isolation Verification" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$user2Email = "trader_beta_$randomId@marketwatch.test"
$user2Pass = "Pass1234!@#"
$user2Name = "Beta Trader"

$reg2Payload = @{
    email = $user2Email
    password = $user2Pass
    name = $user2Name
    deviceInfo = @{
        type = "Tablet"
        name = "iPad Pro"
    }
} | ConvertTo-Json

$reg2 = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $reg2Payload -ContentType "application/json"
$token2 = $reg2.data.token

$dash2 = Invoke-RestMethod -Uri "$baseUrl/dashboard" -Method Get -Headers @{ Authorization = "Bearer $token2" }

Write-Host "User 2 Dashboard previousLoginAt: '$($dash2.previousLoginAt)'" -ForegroundColor Yellow
Write-Host "User 2 Dashboard currentDevice: $($dash2.currentDevice.deviceType)" -ForegroundColor White
Write-Host "User 2 Dashboard previousDevice: $($dash2.previousDevice)" -ForegroundColor White

if ($null -ne $dash2.previousLoginAt) {
    Write-Error "FAIL: User 2 is brand new and must NOT have User 1's session history!"
}
if ($dash2.currentDevice.deviceType -ne "Tablet") {
    Write-Error "FAIL: User 2 current device should be Tablet!"
}
if ($null -ne $dash2.previousDevice) {
    Write-Error "FAIL: User 2 has no previous session and must NOT see User 1's previous device!"
}
Write-Host "PASS: Multi-user isolation completely verified!" -ForegroundColor Green

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "6. Verification of Seed Demo User (usr_angira_001)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$demoLoginPayload = @{
    email = "angira@marketwatch.pro"
    password = "password123"
    deviceInfo = @{
        type = "Desktop"
        name = "Desktop"
    }
} | ConvertTo-Json

$demoLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $demoLoginPayload -ContentType "application/json"
$demoToken = $demoLogin.data.token

$demoDash = Invoke-RestMethod -Uri "$baseUrl/dashboard" -Method Get -Headers @{ Authorization = "Bearer $demoToken" }
Write-Host "Demo User greeting: $($demoDash.greeting)" -ForegroundColor White
Write-Host "Demo User previousLoginAt: $($demoDash.previousLoginAt)" -ForegroundColor Yellow
Write-Host "Demo User awayDuration: $($demoDash.awayDuration)" -ForegroundColor Yellow
Write-Host "Demo User currentDevice: $($demoDash.currentDevice.deviceType)" -ForegroundColor Green
Write-Host "Demo User previousDevice: $($demoDash.previousDevice.deviceType)" -ForegroundColor Green
Write-Host "Demo User eventsAwayCount: $($demoDash.eventsAwayCount)" -ForegroundColor Cyan
Write-Host "Demo User insightsAwayCount: $($demoDash.insightsAwayCount)" -ForegroundColor Cyan

if ($null -eq $demoDash.previousLoginAt) {
    Write-Error "FAIL: Demo user should have a previous session!"
} else {
    Write-Host "PASS: Demo user displays valid returning session with away intelligence!" -ForegroundColor Green
}

Write-Host "`n====================================================" -ForegroundColor Green
Write-Host "ALL 6 SESSION TRACKING & CONTINUITY TESTS PASSED!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

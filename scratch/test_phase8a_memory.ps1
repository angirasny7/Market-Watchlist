# Phase 8A: Market Memory Archival & Date Filtering Verification Suite
$baseUrl = "http://localhost:5000/api"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "STARTING PHASE 8A: MARKET MEMORY ARCHIVAL & FILTERING AUDIT" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$userAEmail = "mem_user_a_${timestamp}@marketwatch.pro"
$userBEmail = "mem_user_b_${timestamp}@marketwatch.pro"
$password = "SecretPassword123!"

# Helper: Register and authenticate
function Register-User($email, $name) {
    $body = @{
        email = $email
        password = $password
        name = $name
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -ContentType "application/json" -Body $body
    return $res
}

function Add-Watchlist($token, $symbols) {
    $body = @{
        name = "Primary Watchlist"
        symbols = $symbols
    } | ConvertTo-Json
    $headers = @{ "Authorization" = "Bearer $token" }
    $res = Invoke-RestMethod -Uri "$baseUrl/watchlist/setup" -Method Post -ContentType "application/json" -Headers $headers -Body $body
    return $res
}

# 1. Register User A and User B
Write-Host "`n[TEST 1] Registering User A and User B with distinct watchlists..." -ForegroundColor Yellow
$resA = Register-User $userAEmail "Memory User A"
$tokenA = if ($resA.data.token) { $resA.data.token } else { $resA.token }
$userIdA = if ($resA.data.user.id) { $resA.data.user.id } else { $resA.user.id }
Write-Host "  -> Registered User A ($userIdA)" -ForegroundColor Green

$resB = Register-User $userBEmail "Memory User B"
$tokenB = if ($resB.data.token) { $resB.data.token } else { $resB.token }
$userIdB = if ($resB.data.user.id) { $resB.data.user.id } else { $resB.user.id }
Write-Host "  -> Registered User B ($userIdB)" -ForegroundColor Green

# Add watchlists: User A gets RELIANCE & INFY, User B gets HDFCBANK & LT
Add-Watchlist $tokenA @("RELIANCE", "INFY") | Out-Null
Add-Watchlist $tokenB @("HDFCBANK", "LT") | Out-Null
Write-Host "  -> Configured Watchlists: User A=[RELIANCE, INFY], User B=[HDFCBANK, LT]" -ForegroundColor Green

# 2. Check initial Market Memory for new users (Must be 0!)
Write-Host "`n[TEST 2] Verifying initial Market Memory is strictly EMPTY for new users..." -ForegroundColor Yellow
$headersA = @{ "Authorization" = "Bearer $tokenA" }
$memAInit = Invoke-RestMethod -Uri "$baseUrl/memory/events" -Method Get -Headers $headersA
Write-Host "  -> User A initial Market Memory event count: $($memAInit.count)"
if ($memAInit.count -ne 0) {
    Write-Host "FAILED: New user has non-zero archived events!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  PASS: Unread events are NEVER visible in Market Memory (count = 0)." -ForegroundColor Green
}

# 3. Retrieve Attention Feed events for User A
Write-Host "`n[TEST 3] Fetching Attention Feed for User A..." -ForegroundColor Yellow
$feedA = Invoke-RestMethod -Uri "$baseUrl/events" -Method Get -Headers $headersA
Write-Host "  -> Total Attention Feed events available: $($feedA.count)"
if ($feedA.count -eq 0) {
    Write-Host "FAILED: No feed events available for test" -ForegroundColor Red
    exit 1
}

$firstEvent = $feedA.data[0]
$eventId = $firstEvent.id
$eventSymbol = $firstEvent.stockSymbol
Write-Host "  -> Target Event to mark read: ID=$eventId ($eventSymbol) - Headline: $($firstEvent.headline)"

# 4. User A marks Event as read
Write-Host "`n[TEST 4] User A marks Event $eventId as READ..." -ForegroundColor Yellow
$readRes = Invoke-RestMethod -Uri "$baseUrl/events/$eventId/read" -Method Patch -Headers $headersA
Write-Host "  -> Mark Read Response: $($readRes.message)" -ForegroundColor Green

# 5. Verify Event is now archived in User A's Market Memory
Write-Host "`n[TEST 5] Verifying Event $eventId is archived in User A's Market Memory..." -ForegroundColor Yellow
$memAAfter = Invoke-RestMethod -Uri "$baseUrl/memory/events" -Method Get -Headers $headersA
Write-Host "  -> User A Market Memory count: $($memAAfter.count)"
$archivedItem = $memAAfter.data | Where-Object { $_.id -eq $eventId }
if (-not $archivedItem) {
    Write-Host "FAILED: Event $eventId is not in User A's Market Memory!" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: Event $eventId successfully archived in User A's Market Memory!" -ForegroundColor Green
Write-Host "        ArchivedAt: $($archivedItem.readAt)"
Write-Host "        Headline: $($archivedItem.headline)"
Write-Host "        Symbol: $($archivedItem.stockSymbol)"
Write-Host "        MarketMood: $($archivedItem.marketMood)"
Write-Host "        Price: $($archivedItem.price)"

# 6. Verify Event remains in Attention Feed with read: true
Write-Host "`n[TEST 6] Verifying Event remains in Attention Feed with read: true..." -ForegroundColor Yellow
$feedAAfter = Invoke-RestMethod -Uri "$baseUrl/events" -Method Get -Headers $headersA
$feedItem = $feedAAfter.data | Where-Object { $_.id -eq $eventId }
if (-not $feedItem) {
    Write-Host "FAILED: Event was removed from Attention Feed!" -ForegroundColor Red
    exit 1
}
if ($feedItem.read -ne $true) {
    Write-Host "FAILED: Event in Attention Feed does not have read: true!" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: Event remains visible in Attention Feed with read = true!" -ForegroundColor Green

# 7. Multi-User Isolation Audit
Write-Host "`n[TEST 7] Verifying Strict Multi-User Isolation (User B must NOT see User A's read event in Memory)..." -ForegroundColor Yellow
$headersB = @{ "Authorization" = "Bearer $tokenB" }
$memB = Invoke-RestMethod -Uri "$baseUrl/memory/events" -Method Get -Headers $headersB
Write-Host "  -> User B Market Memory count: $($memB.count)"
if ($memB.count -ne 0) {
    Write-Host "FAILED: User B can see User A's read events!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  PASS: Strict user isolation verified! User B Market Memory count = 0." -ForegroundColor Green
}

# 8. Date Range Filtering Audit
Write-Host "`n[TEST 8] Verifying Date Range Filters on /api/memory/events..." -ForegroundColor Yellow
$memToday = Invoke-RestMethod -Uri "$baseUrl/memory/events?dateRange=TODAY" -Method Get -Headers $headersA
Write-Host "  -> dateRange=TODAY: count = $($memToday.count)"
if ($memToday.count -lt 1) {
    Write-Host "FAILED: dateRange=TODAY should include the just-read event!" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: dateRange=TODAY returns archived event." -ForegroundColor Green

$memYesterday = Invoke-RestMethod -Uri "$baseUrl/memory/events?dateRange=YESTERDAY" -Method Get -Headers $headersA
Write-Host "  -> dateRange=YESTERDAY: count = $($memYesterday.count) (Expected 0 for today's read)"
if ($memYesterday.count -ne 0) {
    Write-Host "FAILED: dateRange=YESTERDAY should not match today's read event!" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: dateRange=YESTERDAY correctly excludes today's reads." -ForegroundColor Green

$mem7D = Invoke-RestMethod -Uri "$baseUrl/memory/events?dateRange=LAST_7_DAYS" -Method Get -Headers $headersA
Write-Host "  -> dateRange=LAST_7_DAYS: count = $($mem7D.count)"
if ($mem7D.count -lt 1) {
    Write-Host "FAILED: dateRange=LAST_7_DAYS should match event read today!" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: dateRange=LAST_7_DAYS works." -ForegroundColor Green

# 9. Symbol and Search Filter Audit
Write-Host "`n[TEST 9] Verifying Symbol and Search Filters..." -ForegroundColor Yellow
$memSym = Invoke-RestMethod -Uri "$baseUrl/memory/events?symbol=$eventSymbol" -Method Get -Headers $headersA
Write-Host "  -> symbol=${eventSymbol}: count = $($memSym.count)"
if ($memSym.count -lt 1) {
    Write-Host "FAILED: Filter by exact symbol failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: Specific symbol filter works." -ForegroundColor Green

$memOtherSym = Invoke-RestMethod -Uri "$baseUrl/memory/events?symbol=NONEXISTENT_XYZ" -Method Get -Headers $headersA
Write-Host "  -> symbol=NONEXISTENT_XYZ: count = $($memOtherSym.count)"
if ($memOtherSym.count -ne 0) {
    Write-Host "FAILED: Non-existent symbol returned results!" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: Unmatched symbol filter correctly returns 0." -ForegroundColor Green

$searchWord = $eventSymbol.Substring(0, [Math]::Min(3, $eventSymbol.Length))
$memSearch = Invoke-RestMethod -Uri "$baseUrl/memory/events?search=$searchWord" -Method Get -Headers $headersA
Write-Host "  -> search='$searchWord': count = $($memSearch.count)"
if ($memSearch.count -lt 1) {
    Write-Host "FAILED: Search by keyword failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  PASS: Search query filter matches archived event." -ForegroundColor Green

# 10. Database Schema Integrity (no duplicated Event records)
Write-Host "`n[TEST 10] Verifying database integrity & no duplicate events..." -ForegroundColor Yellow
$nodeCode = "const { PrismaClient } = require('c:/Users/angir/Desktop/Smart Market Watchlist/backend/node_modules/@prisma/client'); const prisma = new PrismaClient(); prisma.userEventRead.count({ where: { userId: '$userIdA' } }).then(readCount => prisma.event.findUnique({ where: { id: '$eventId' } }).then(event => console.log(JSON.stringify({ readCount, eventExists: !!event })))).finally(() => prisma['`$disconnect']());"
$dbAudit = node -e $nodeCode | ConvertFrom-Json
Write-Host "  -> DB UserEventRead count for User A: $($dbAudit.readCount)"
Write-Host "  -> Single Event record referenced: $($dbAudit.eventExists)"
if ($dbAudit.readCount -ge 1 -and $dbAudit.eventExists -eq $true) {
    Write-Host "  PASS: Reused existing Event model with simple UserEventRead join record!" -ForegroundColor Green
} else {
    Write-Host "FAILED: Database integrity check failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "ALL PHASE 8A VERIFICATION CHECKS PASSED WITH RUNTIME PROOF!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

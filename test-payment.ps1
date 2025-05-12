<#
.SYNOPSIS
Tests server connectivity and payment processing
#>

param (
    [decimal]$Amount = 29.99,
    [string]$Currency = "USD"
)

$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
}

# 1. Test basic connectivity first
try {
    Write-Host "`n[1/3] Testing local network connectivity..." -ForegroundColor Cyan
    Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Detailed
}
catch {
    Write-Host "❌ Network test failed: $_" -ForegroundColor Red
    exit 1
}

# 2. Test health endpoint
try {
    Write-Host "`n[2/3] Testing server health endpoint..." -ForegroundColor Cyan
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -Headers $headers
    
    Write-Host "✅ Server status: $($healthResponse.status)" -ForegroundColor Green
    Write-Host "   Uptime: $([math]::Round($healthResponse.uptime/60, 2)) minutes"
    Write-Host "   Environment: $($healthResponse.environment)"
}
catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    exit 1
}

# 3. Test payment endpoint
try {
    $orderId = "test_" + (Get-Date -Format "yyyyMMddHHmmss")
    $paymentData = @{
        orderId = $orderId
        amount = $Amount
        currency = $Currency
        customerInfo = @{
            email = "test@example.com"
            name = "Test Customer"
        }
    }

    Write-Host "`n[3/3] Testing payment endpoint..." -ForegroundColor Cyan
    Write-Host "Request payload:" -ForegroundColor DarkCyan
    Write-Host ($paymentData | ConvertTo-Json -Depth 3)

    $response = Invoke-RestMethod -Uri "$baseUrl/payments/create" `
        -Method Post `
        -Body ($paymentData | ConvertTo-Json -Depth 3) `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "`n✅ Payment created successfully!" -ForegroundColor Green
    Write-Host "Payment ID: $($response.paymentId)"
    Write-Host "Status: $($response.status)"
    
    exit 0
}
catch {
    Write-Host "`n❌ Payment failed:" -ForegroundColor Red
    
    $errorDetails = @{
        Timestamp = Get-Date -Format "o"
        Error = $_.Exception.Message
    }

    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        
        $errorDetails["StatusCode"] = $statusCode
        $errorDetails["Status"] = $statusDescription

        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
            $reader.Close()
            
            $errorDetails["Response"] = $errorBody
        }
        catch {
            $errorDetails["ResponseReadError"] = $_.Exception.Message
        }
    }

    Write-Host "`nError Details:" -ForegroundColor Red
    $errorDetails | Format-List | Out-Host

    exit 1
}
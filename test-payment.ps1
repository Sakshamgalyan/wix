<#
.SYNOPSIS
End-to-end test script for Wix Payments API
#>

param (
    [decimal]$Amount = 1.00,  # Test with $1 first
    [string]$Currency = "USD",
    [switch]$DebugMode
)

# Configuration
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
}

if ($DebugMode) {
    $headers.Add("x-debug-mode", "true")
    $DebugPreference = "Continue"
}

function Show-Response {
    param ($response)
    
    Write-Host "`n=== RESPONSE ===" -ForegroundColor Cyan
    $response | Format-List | Out-Host
    
    if ($response.PSObject.Properties.Name -contains "_links") {
        Write-Host "`nAvailable Actions:" -ForegroundColor Cyan
        $response._links | Format-Table @{
            Name="Action"
            Expression={$_.Name}
        }, @{
            Name="URL"
            Expression={$_.Value.href}
        } | Out-Host
    }
}

function Test-Connectivity {
    try {
        Write-Host "`n[1/4] Testing network connectivity..." -ForegroundColor Cyan
        $connection = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Detailed
        if (-not $connection.TcpTestSucceeded) {
            throw "Cannot connect to port 3000"
        }
        Write-Host "✅ Connectivity verified" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Connectivity test failed: $_" -ForegroundColor Red
        exit 1
    }
}

function Test-HealthCheck {
    try {
        Write-Host "`n[2/4] Testing server health..." -ForegroundColor Cyan
        $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -Headers $headers
        
        Write-Host "✅ Server health:" -ForegroundColor Green
        Write-Host "   Status: $($health.status)"
        Write-Host "   Uptime: $([math]::Round($health.uptime/60,2)) minutes"
        Write-Host "   Environment: $($health.environment)"
        
        if ($health.services.wix -ne "connected") {
            throw "Wix service not connected"
        }
    }
    catch {
        Write-Host "❌ Health check failed: $_" -ForegroundColor Red
        exit 1
    }
}

function Test-PaymentsHealth {
    try {
        Write-Host "`n[3/4] Testing payments health..." -ForegroundColor Cyan
        $paymentsHealth = Invoke-RestMethod -Uri "$baseUrl/payments/health" -Method Get -Headers $headers
        
        if ($paymentsHealth.payments -ne "operational") {
            throw "Payments system not operational"
        }
        
        Write-Host "✅ Payments system:" -ForegroundColor Green
        Write-Host "   Status: $($paymentsHealth.payments)"
        Write-Host "   Currency: $($paymentsHealth.currency)"
        Write-Host "   Test Mode: $($paymentsHealth.testMode)"
    }
    catch {
        Write-Host "❌ Payments health check failed: $_" -ForegroundColor Red
        exit 1
    }
}

function Test-PaymentCreation {
    try {
        $orderId = "test_$(Get-Date -Format 'yyyyMMddHHmmss')"
        $payload = @{
            orderId = $orderId
            amount = $Amount
            currency = $Currency
            paymentMethod = @{
                methodType = "PAYMENT_CARD"
            }
            customerInfo = @{
                email = "test_$orderId@example.com"
                name = "Test Customer"
            }
            metadata = @{
                testRun = $true
                scriptVersion = "2.0"
            }
        }

        $jsonPayload = $payload | ConvertTo-Json -Depth 5
        
        Write-Host "`n[4/4] Creating test payment..." -ForegroundColor Cyan
        Write-Host "Request payload:" -ForegroundColor DarkCyan
        Write-Host ($jsonPayload | ConvertFrom-Json | ConvertTo-Json -Depth 5 -Compress) -ForegroundColor Gray

        $response = Invoke-RestMethod -Uri "$baseUrl/payments/create" `
            -Method Post `
            -Body $jsonPayload `
            -Headers $headers `
            -ErrorAction Stop

        Write-Host "`n✅ Payment created successfully!" -ForegroundColor Green
        Show-Response $response
        
        # Write to test log
        @{
            timestamp = Get-Date -Format "o"
            test = "payment_creation"
            status = "success"
            paymentId = $response.paymentId
            amount = $Amount
            currency = $Currency
        } | ConvertTo-Json | Out-File "$PSScriptRoot/payment_test.log" -Append
        
        return 0
    }
    catch {
        Write-Host "`n❌ Payment creation failed:" -ForegroundColor Red
        
        $errorDetails = @{
            timestamp = Get-Date -Format "o"
            error = $_.Exception.Message
            statusCode = $.Exception.Response.StatusCode.value_
            statusDescription = $_.Exception.Response.StatusDescription
            payload = $payload
        }

        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorDetails.response = $reader.ReadToEnd() | ConvertFrom-Json
            $reader.Close()
        }
        catch {
            $errorDetails.responseError = $_.Exception.Message
        }

        Write-Host "`nError Details:" -ForegroundColor Red
        $errorDetails | Format-List | Out-Host

        # Write to error log
        $errorDetails | ConvertTo-Json -Depth 5 | Out-File "$PSScriptRoot/payment_error.log" -Append
        
        return 1
    }
}

# Main execution
Test-Connectivity
Test-HealthCheck
Test-PaymentsHealth
$exitCode = Test-PaymentCreation

exit $exitCode
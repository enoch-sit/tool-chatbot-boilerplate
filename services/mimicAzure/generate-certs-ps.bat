@echo off
echo Generating self-signed SSL certificates using PowerShell...

powershell -Command "& {
    # Create certs directory
    if (!(Test-Path 'certs')) { New-Item -ItemType Directory -Path 'certs' }
    
    # Generate self-signed certificate
    $cert = New-SelfSignedCertificate -DnsName 'localhost', '127.0.0.1' -CertStoreLocation 'cert:\LocalMachine\My' -NotAfter (Get-Date).AddYears(1)
    
    # Export certificate
    $pwd = ConvertTo-SecureString -String 'password' -Force -AsPlainText
    Export-PfxCertificate -Cert $cert -FilePath 'certs\server.pfx' -Password $pwd
    
    # Convert to PEM format (requires OpenSSL alternative)
    Write-Host 'Certificate generated as PFX. Converting to PEM format...'
    
    # Extract certificate and key using .NET
    $pfx = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('certs\server.pfx', 'password', 'Exportable')
    
    # Export certificate
    $certBytes = $pfx.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    $certBase64 = [System.Convert]::ToBase64String($certBytes)
    $certPem = '-----BEGIN CERTIFICATE-----' + [Environment]::NewLine + ($certBase64 -replace '(.{64})', '$1' + [Environment]::NewLine) + [Environment]::NewLine + '-----END CERTIFICATE-----'
    [System.IO.File]::WriteAllText('certs\server.crt', $certPem)
    
    # Export private key (this is more complex, so we'll use a simpler approach)
    Write-Host 'For private key, we recommend using mkcert or OpenSSL'
    Write-Host 'Certificate saved to certs\server.crt'
    Write-Host 'PFX file saved to certs\server.pfx (password: password)'
}"

echo.
echo ✅ Basic certificate generated!
echo.
echo For a complete setup, install mkcert:
echo   1. Download mkcert from: https://github.com/FiloSottile/mkcert/releases
echo   2. Run: mkcert -install
echo   3. Run: mkcert localhost 127.0.0.1
echo   4. Copy mkcert files to certs\ directory
echo.
pause

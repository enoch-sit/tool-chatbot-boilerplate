@echo off
echo Generating self-signed SSL certificates for development...

mkdir certs 2>nul

echo.
echo Creating private key...
openssl genrsa -out certs\server.key 2048

echo.
echo Creating certificate signing request...
openssl req -new -key certs\server.key -out certs\server.csr -subj "/C=US/ST=Dev/L=Development/O=MimicAzure/OU=Dev/CN=localhost"

echo.
echo Creating self-signed certificate...
openssl x509 -req -in certs\server.csr -signkey certs\server.key -out certs\server.crt -days 365

echo.
echo Cleaning up...
del certs\server.csr

echo.
echo ✅ SSL certificates generated successfully!
echo    Key: certs\server.key
echo    Certificate: certs\server.crt
echo.
echo ⚠️  Note: This is a self-signed certificate for development only.
echo    Your browser will show a security warning - click "Advanced" and "Proceed to localhost"
echo.
echo Ready to start HTTPS server!
pause

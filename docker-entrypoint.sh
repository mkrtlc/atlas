#!/bin/sh
# Atlas Docker entrypoint — auto-generate secrets and detect public IP

# Auto-generate secrets if not provided
if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET=$(head -c 32 /dev/urandom | xxd -p -c 64)
  echo "Auto-generated JWT_SECRET"
fi
if [ -z "$JWT_REFRESH_SECRET" ]; then
  export JWT_REFRESH_SECRET=$(head -c 32 /dev/urandom | xxd -p -c 64)
  echo "Auto-generated JWT_REFRESH_SECRET"
fi
if [ -z "$TOKEN_ENCRYPTION_KEY" ]; then
  export TOKEN_ENCRYPTION_KEY=$(head -c 32 /dev/urandom | xxd -p -c 64)
  echo "Auto-generated TOKEN_ENCRYPTION_KEY"
fi

# If CLIENT_PUBLIC_URL is still the default localhost, try to detect public IP
if [ "$CLIENT_PUBLIC_URL" = "http://localhost:3001" ] || [ -z "$CLIENT_PUBLIC_URL" ]; then
  PUBLIC_IP=$(wget -qO- http://ifconfig.me 2>/dev/null || wget -qO- http://api.ipify.org 2>/dev/null || echo "")
  if [ -n "$PUBLIC_IP" ] && echo "$PUBLIC_IP" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
    export CLIENT_PUBLIC_URL="http://${PUBLIC_IP}:${PORT:-3001}"
    export SERVER_PUBLIC_URL="http://${PUBLIC_IP}:${PORT:-3001}"
    export CORS_ORIGINS="http://${PUBLIC_IP}:${PORT:-3001},http://localhost:${PORT:-3001}"
    echo "Auto-detected public IP: ${PUBLIC_IP}"
    echo "CLIENT_PUBLIC_URL=${CLIENT_PUBLIC_URL}"
    echo "CORS_ORIGINS=${CORS_ORIGINS}"
  fi
fi

# Run the original command
exec "$@"

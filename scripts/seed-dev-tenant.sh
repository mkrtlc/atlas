#!/usr/bin/env bash
# Seed a dev tenant with demo data across every app.
#
# Usage:
#   ./scripts/seed-dev-tenant.sh <jwt>
#
# Where <jwt> is an access token for a tenant admin/owner. The quickest
# way to get one locally:
#   1. Log in at http://localhost:5180
#   2. Open DevTools → Application → Local Storage → copy atlasmail_token
#
# Calls every per-app /seed endpoint in order. Idempotent-ish — re-running
# will add more seed rows, not fail. Skip apps with missing endpoints
# silently.
set -u

TOKEN="${1:-}"
API="${ATLAS_API:-http://localhost:3001/api/v1}"

if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <jwt>"
  echo "Grab one from localStorage.atlasmail_token after logging in."
  exit 1
fi

seed() {
  local path="$1"
  local label="$2"
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$API$path")
  case "$code" in
    200|201) printf "  ✓ %-40s (%s)\n" "$label" "$code" ;;
    403)     printf "  ⚠ %-40s forbidden — need admin token\n" "$label" ;;
    404)     printf "  — %-40s endpoint not mounted\n" "$label" ;;
    *)       printf "  ✗ %-40s %s\n" "$label" "$code" ;;
  esac
}

echo "Seeding dev tenant against $API"
echo

echo "CRM:"
seed "/crm/stages/seed"          "deal stages"
seed "/crm/activity-types/seed"  "activity types"
seed "/crm/seed"                 "companies + contacts + deals"
seed "/crm/leads/seed"           "sample leads"
seed "/crm/workflows/seed"       "example workflows"

echo
echo "HR:"
seed "/hr/leave-types/seed"      "leave types"
seed "/hr/leave-policies/seed"   "leave policies"
seed "/hr/expense-categories/seed" "expense categories"
seed "/hr/seed"                  "employees + departments"

echo
echo "Work / Invoices / Sign / Drive / Docs / Draw:"
seed "/invoices/seed"            "invoices"
seed "/sign/seed"                "signature documents"
seed "/sign/templates/seed-starter" "starter sign templates"
seed "/drive/seed"               "drive items"
seed "/docs/seed"                "documents"
seed "/drawings/seed"            "drawings"

echo
echo "Done. Reload the app to see the seeded data."

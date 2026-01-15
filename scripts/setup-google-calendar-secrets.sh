#!/bin/bash

# Script להגדרת Google Calendar Secrets ב-Supabase
# שימוש: ./scripts/setup-google-calendar-secrets.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== הגדרת Google Calendar Secrets ב-Supabase ===${NC}\n"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI לא מותקן${NC}"
    echo -e "התקן עם: npm install -g supabase\n"
    exit 1
fi

# Project reference from URL
PROJECT_REF="vqvczpxmvrwfkecpwovc"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

# Google OAuth credentials
# Replace these with your actual Google OAuth credentials from Google Cloud Console
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
GOOGLE_REDIRECT_URI="${SUPABASE_URL}/functions/v1/google-oauth/callback"

echo -e "${GREEN}Credentials:${NC}"
echo "  Client ID: ${GOOGLE_CLIENT_ID}"
echo "  Redirect URI: ${GOOGLE_REDIRECT_URI}"
echo ""

# Check if project is linked
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  לא מחובר לפרויקט. מנסה להתחבר...${NC}"
    supabase link --project-ref ${PROJECT_REF}
fi

echo -e "${YELLOW}⚠️  Supabase CLI לא תומך בהגדרת secrets ישירות.${NC}"
echo -e "${YELLOW}אנא הגדר את ה-secrets ידנית ב-Dashboard:${NC}\n"

echo -e "${GREEN}הוראות:${NC}"
echo "1. פתח: https://app.supabase.com/project/${PROJECT_REF}/settings/functions"
echo "2. לחץ על 'Secrets' או 'Add secret'"
echo "3. הוסף את ה-secrets הבאים:"
echo ""
echo -e "${GREEN}GOOGLE_CLIENT_ID${NC}"
echo "  ${GOOGLE_CLIENT_ID}"
echo ""
echo -e "${GREEN}GOOGLE_CLIENT_SECRET${NC}"
echo "  ${GOOGLE_CLIENT_SECRET}"
echo ""
echo -e "${GREEN}GOOGLE_REDIRECT_URI${NC}"
echo "  ${GOOGLE_REDIRECT_URI}"
echo ""

# Alternative: Create a secrets file for manual import
SECRETS_FILE="supabase-secrets.txt"
cat > ${SECRETS_FILE} <<EOF
# Supabase Edge Functions Secrets
# העתק את התוכן הזה ל-Supabase Dashboard → Settings → Edge Functions → Secrets

GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI}
EOF

echo -e "${GREEN}✅ נוצר קובץ ${SECRETS_FILE} עם כל ה-secrets${NC}"
echo -e "${YELLOW}קרא את הקובץ והעתק את התוכן ל-Dashboard${NC}\n"

echo -e "${YELLOW}⚠️  חשוב:${NC}"
echo "- ודא שה-Redirect URI מוגדר גם ב-Google Cloud Console"
echo "- ודא ש-Google Calendar API מופעל"
echo "- לאחר הוספת secrets, ייתכן שתצטרך ל-redploy את ה-Edge Functions"
echo ""

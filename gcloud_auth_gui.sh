#!/bin/bash
PASSWORD=$(osascript -e 'Tell application "System Events" to display dialog "Please enter your Mac password to re-authenticate Google Cloud:" default answer "" with hidden answer' -e 'text returned of result' 2>/dev/null)

if [ -n "$PASSWORD" ]; then
    echo "$PASSWORD" | gcloud auth login info@southmarinetrading.com
else
    echo "Authentication cancelled."
fi

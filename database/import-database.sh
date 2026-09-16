#!/usr/bin/env bash

set -euo pipefail

database_name="sportsphere"
script_directory="$(cd "$(dirname "$0")" && pwd)"
collection_directory="$script_directory/collections"

collections=(
  sports
  users
  facilities
  trainers
  products
  reservations
  trainings
  teammateAds
  tournaments
  orders
  facilityReviews
  passwordResetTokens
)

if ! command -v mongoimport >/dev/null 2>&1; then
  echo "mongoimport is not installed or is not available in PATH."
  exit 1
fi

for collection in "${collections[@]}"; do
  collection_file="$collection_directory/$collection.json"

  if [[ ! -f "$collection_file" ]]; then
    echo "Missing collection file: $collection_file"
    exit 1
  fi

  echo "Importing $collection..."

  mongoimport \
    --db "$database_name" \
    --collection "$collection" \
    --file "$collection_file" \
    --jsonArray \
    --drop
done

echo "Database import completed."

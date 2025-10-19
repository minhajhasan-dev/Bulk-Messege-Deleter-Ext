#!/usr/bin/env sh
# Minimal Husky shim for CI environments
if [ "$HUSKY" = "0" ]; then
  exit 0
fi

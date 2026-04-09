#!/bin/bash
cd "$(dirname "$0")"
export PATH="/usr/local/bin:$PATH"
exec npm run dev

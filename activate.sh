#!/usr/bin/env bash
# Project-private Node toolchain. Nothing is installed globally.
# Usage: source ./activate.sh
set -a
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$PROJECT_ROOT/.node/bin:$PATH"
export npm_config_prefix="$PROJECT_ROOT/.node"
set +a
echo "Node $(node -v) / npm $(npm -v) (private)"

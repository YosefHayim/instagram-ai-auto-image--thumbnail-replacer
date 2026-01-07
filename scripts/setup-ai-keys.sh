#!/bin/bash

echo "🤖 Instagram AI Optimizer - API Key Setup"
echo "=========================================="
echo ""

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./scripts/setup-ai-keys.sh <OPENAI_API_KEY> <REPLICATE_API_KEY>"
    echo ""
    echo "Get your keys from:"
    echo "  - OpenAI:    https://platform.openai.com/api-keys"
    echo "  - Replicate: https://replicate.com/account/api-tokens"
    echo ""
    exit 1
fi

OPENAI_KEY=$1
REPLICATE_KEY=$2

echo "Setting OPENAI_API_KEY..."
bunx convex env set OPENAI_API_KEY "$OPENAI_KEY"

echo "Setting REPLICATE_API_KEY..."
bunx convex env set REPLICATE_API_KEY "$REPLICATE_KEY"

echo ""
echo "✅ API keys configured successfully!"
echo ""
echo "You can verify with: bunx convex env list"

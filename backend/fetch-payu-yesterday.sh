#!/bin/bash

echo "==============================================="
echo "   Fetching Yesterday's PayU Payments"
echo "==============================================="
echo ""

cd "$(dirname "$0")"
npm run fetch:payu:yesterday

echo ""
echo "==============================================="
echo "   Script Execution Complete"
echo "==============================================="
echo ""











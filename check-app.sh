#!/bin/bash

echo "Checking if app is running..."
ps aux | grep -i stirling | grep -v grep

echo ""
echo "Recent app logs:"
tail -30 /tmp/stirling-app.log 2>/dev/null | tail -20

echo ""
echo "Looking for data flow messages:"
grep -i "Received\|Processed\|Forwarded\|worker\|WORKER" /tmp/stirling-app.log 2>/dev/null | tail -10










#!/bin/bash
set -e

[ ! -d "ios" ] && echo "Run first-time-setup.sh first" && exit 1

open ios/secondbrain.xcworkspace
echo "Connect iPhone and click Play in Xcode"


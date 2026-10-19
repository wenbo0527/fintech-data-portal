#!/bin/bash
cd "$(dirname "$0")"
exec npx serve -l 8003 -s dist

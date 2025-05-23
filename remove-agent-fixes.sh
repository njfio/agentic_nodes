#!/bin/bash

# Script to backup and remove all agent fix files

echo "Creating backup directory..."
mkdir -p client/backups/agent-fixes

echo "Backing up agent fix files..."

# List of fix files to remove
FIX_FILES=(
  "fix-agent-original-query.js"
  "fix-agent-timeouts.js"
  "fix-agent-iterations.js"
  "fix-agent-completion.js"
  "fix-agent-iterations-ui.js"
  "clean-agent-fix.js"
  "ultimate-agent-fix.js"
  "manual-agent-fix.js"
  "direct-agent-fix.js"
  "immediate-agent-fix.js"
  "final-agent-fix.js"
  "wait-and-fix-agents.js"
  "force-agent-processing.js"
  "force-agent-tool-usage.js"
  "restore-agent-reasoning.js"
  "enhance-agent-planner.js"
  "capture-all-iterations.js"
  "capture-full-agent-history.js"
  "enhance-iteration-display.js"
  "test-agent-immediate.js"
  "test-agent-tools.js"
  "debug-agent-processing.js"
  "debug-agent-tools.js"
  "check-agent-processor.js"
  "fix-browser-search-execution.js"
  "fix-browser-search-tool.js"
  "fix-tool-names.js"
  "fix-mcp-tools.js"
  "fix-mcp-execution.js"
  "fix-mcp-tool-schemas.js"
  "fix-duplicate-tools.js"
  "fix-perplexity-key-passing.js"
  "fix-perplexity-save.js"
  "disable-problematic-tools.js"
)

# Backup each file if it exists
for file in "${FIX_FILES[@]}"; do
  if [ -f "client/$file" ]; then
    echo "Backing up $file..."
    mv "client/$file" "client/backups/agent-fixes/$file"
  fi
done

# Also backup any .bak files related to agent fixes
echo "Moving .bak files..."
find client -name "*agent*.bak*" -exec mv {} client/backups/agent-fixes/ \;

echo "✅ Agent fix files have been backed up to client/backups/agent-fixes/"
echo ""
echo "To restore these files, run:"
echo "  mv client/backups/agent-fixes/* client/"
echo ""
echo "Next steps:"
echo "1. Update index.html to remove references to these files"
echo "2. Add <script src=\"unified-agent-system.js\"></script> instead"
echo "3. Test the unified agent system"
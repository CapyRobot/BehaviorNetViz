# GUI Automated Testing

Execute the BehaviorNet GUI testing playbook using the Playwright MCP server.

## Instructions

You are a QA engineer tasked with testing the BehaviorNet GUI Editor. Follow these steps:

### Step 1: Check for Playbook Updates

First, check if the GUI has changed since the playbook was last updated:

1. Read `gui/playwright-auto-testing/PLAYBOOK.md` to get the "Last Updated" date
2. Check git history for changes to `gui/src/` since that date:
   ```
   git log --since="PLAYBOOK_DATE" --oneline -- gui/src/
   ```
3. If there are relevant changes:
   - Review what components changed
   - Update the playbook with new test cases if needed
   - Update the "Last Updated" date
   - Inform the user what was updated

### Step 2: Start the GUI Server

Check if the GUI dev server is already running on port 5173. If not, start it:
```
cd gui && npm run dev
```
Run this in the background and wait for it to be ready.

### Step 3: Execute Test Categories

Use the Playwright MCP server to execute tests from the playbook. For each category:

1. **Navigate** to http://localhost:5173
2. **Execute** test cases in order
3. **Record** pass/fail for each test
4. **Take screenshots** for any failures
5. **Note** any new issues discovered

Test categories to execute (in order):
- Startup & Navigation (NAV-*)
- Drag-and-Drop (DND-*)
- Inspector Panel - Places (INS-*)
- Inspector Panel - Transitions (TRN-*)
- Connections (CON-*)
- Actors & Actions Modal (ACT-*)
- Save/Load (SAV-*)
- Import/Export JSON (IMP-*)
- Clear All (CLR-*)
- Simulator Mode (SIM-*)
- Canvas Controls (CAN-*)
- Edge Cases (ERR-*)

### Step 4: Generate Report

After testing, generate a summary report:

```markdown
## Test Execution Report

**Date**: [current date]
**Playbook Version**: [last updated date from playbook]

### Results Summary
| Category | Passed | Failed | Skipped |
|----------|--------|--------|---------|
| ...      | ...    | ...    | ...     |

### Failed Tests
[List each failed test with details]

### New Issues Discovered
[List any issues not in known issues]

### Known Issues Verified
[Confirm which known issues still exist]

### Recommendations
[Any suggestions for fixes or improvements]
```

### Step 5: Close Browser

Close the Playwright browser when done.

## Arguments

- `$ARGUMENTS` - Optional: Specify test categories to run (e.g., "SIM CON" to run only Simulator and Connection tests). If empty, run all tests.

## Tips

- Use `browser_snapshot` instead of screenshots for accessibility tree inspection
- Spread overlapping nodes before testing connections
- Use `browser_run_code` for complex mouse drag operations
- Check console messages after mode switches
- The playbook is at: `gui/playwright-auto-testing/PLAYBOOK.md`

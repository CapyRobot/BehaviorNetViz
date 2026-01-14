# BehaviorNet GUI Automated Testing

This directory contains the testing playbook and related files for automated QA testing of the BehaviorNet GUI Editor using Claude Code and the Playwright MCP server.

## Files

- `PLAYBOOK.md` - The main testing playbook with all test cases
- `CHANGELOG.md` - History of playbook updates
- `README.md` - This file

## Usage

### Running Tests via Claude Command

From the repository root, use the Claude command:

```
/test-gui
```

Or to run specific test categories:

```
/test-gui SIM CON
```

This will:
1. Check if the playbook needs updating based on recent GUI changes
2. Start the GUI dev server if needed
3. Execute the test cases using Playwright
4. Generate a test report

### Manual Testing

You can also ask Claude to run specific tests manually:

> "Use Playwright to test the Simulator mode in the GUI"

### Prerequisites

1. **Playwright MCP Server**: Must be configured in Claude Code settings
2. **GUI Dependencies**: Run `npm install` in the `gui/` directory
3. **Dev Server**: Will be started automatically, or run `npm run dev` in `gui/`

## Maintaining the Playbook

### When to Update

Update the playbook when:
- New features are added to the GUI
- Existing features are modified
- Bugs are fixed (remove from known issues)
- New bugs are discovered (add to known issues)

### How to Update

1. Edit `PLAYBOOK.md` with new/modified test cases
2. Update the "Last Updated" date at the top
3. Add an entry to `CHANGELOG.md`
4. Commit changes with a descriptive message

### Test Case Format

Each test case follows this format:

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| CAT-## | Description of action | Expected outcome |

Where:
- `CAT` = Category prefix (e.g., SIM, CON, INS)
- `##` = Sequential number within category

## Test Categories

| Prefix | Category | Description |
|--------|----------|-------------|
| NAV | Navigation | Page load and initial state |
| DND | Drag-and-Drop | Creating elements on canvas |
| INS | Inspector (Places) | Editing place properties |
| TRN | Transitions | Editing transition properties |
| CON | Connections | Creating and managing arcs |
| ACT | Actors & Actions | Managing the registry |
| SAV | Save/Load | Browser storage persistence |
| IMP | Import/Export | JSON file operations |
| CLR | Clear All | Clearing the canvas |
| SIM | Simulator | Simulation mode features |
| CAN | Canvas | Zoom and pan controls |
| ERR | Error Handling | Edge cases and errors |

## Troubleshooting

### Server Won't Start
```bash
cd gui
npm install  # Ensure dependencies are installed
npm run dev  # Start manually
```

### Playwright Can't Connect
- Ensure Playwright MCP server is properly configured
- Check that no firewall is blocking localhost:5173

### Tests Failing Due to Overlapping Nodes
The playbook includes instructions to spread nodes apart using mouse drag operations before testing connections.

# BehaviorNet GUI Testing Playbook

> **Last Updated**: 2026-01-14
> **GUI Version Tested**: Initial release with Editor and Simulator modes

This playbook defines automated QA tests for the BehaviorNet GUI Editor using the Playwright MCP server.

## Pre-requisites

- GUI dev server running at `http://localhost:5173` (start with `cd gui && npm run dev`)
- Playwright MCP server available

## Test Categories

### 1. Startup & Navigation

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| NAV-01 | Navigate to localhost:5173 | Page loads with title "BehaviorNet Editor" |
| NAV-02 | Verify initial state | Shows "0 places, 0 transitions", Editor mode selected |
| NAV-03 | Check all UI sections present | Toolbox, Canvas, Inspector, Control Panel visible |

### 2. Drag-and-Drop Place Creation

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| DND-01 | Drag Entrypoint to canvas | Place created, counter shows "1 places" |
| DND-02 | Drag Resource Pool to canvas | Place created with Resource Pool type |
| DND-03 | Drag Action to canvas | Place created with subplaces (In Progress, S, F, E) |
| DND-04 | Drag Wait with Timeout to canvas | Place created |
| DND-05 | Drag Exit Logger to canvas | Place created |
| DND-06 | Drag Plain to canvas | Place created |
| DND-07 | Drag Transition to canvas | Transition created, shows "Priority: 1" |

### 3. Inspector Panel - Places

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| INS-01 | Click on place | Inspector shows Place properties |
| INS-02 | Edit place ID with valid name | ID updated on canvas and inspector |
| INS-03 | Edit place ID with special characters | Save button disabled, validation message shown |
| INS-04 | Edit place ID to duplicate | Should show error or prevent |
| INS-05 | Edit Description field | Description saved |
| INS-06 | Edit Token Capacity with valid positive number | Value saved |
| INS-07 | Edit Token Capacity with negative number | **KNOWN ISSUE**: Currently accepts negative values |
| INS-08 | Delete Place button | Confirmation dialog, place removed |

### 4. Inspector Panel - Transitions

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| TRN-01 | Click on transition | Inspector shows Transition properties |
| TRN-02 | Edit transition ID | ID updated |
| TRN-03 | Edit Priority with valid positive number | Priority updated, shown on canvas |
| TRN-04 | Edit Priority with negative number | **KNOWN ISSUE**: Currently accepts negative values |
| TRN-05 | Edit Priority with zero | Should validate (priority >= 1) |
| TRN-06 | Delete Transition button | Confirmation dialog, transition removed |

### 5. Connections (Arcs)

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| CON-01 | Connect Place to Transition (drag handle) | Edge created, transition shows input place |
| CON-02 | Connect Transition to Place | Edge created, transition shows output place |
| CON-03 | Try Place to Place connection | Connection rejected (no edge created) |
| CON-04 | Try Transition to Transition connection | Connection rejected |
| CON-05 | Remove connection via "x" button | Connection removed |
| CON-06 | Delete place with connections | Place and its connections removed |
| CON-07 | Delete transition with connections | Transition and its connections removed |
| CON-08 | Action place S/F/E handles | Can connect from success/failure/error subplaces |

### 6. Actors & Actions Modal

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| ACT-01 | Open Actors & Actions modal | Modal opens with Actors/Actions tabs |
| ACT-02 | Add valid actor (e.g., "user::Vehicle") | Actor added to list |
| ACT-03 | Add duplicate actor | Alert "Actor ID already exists" |
| ACT-04 | Delete actor | Actor removed from list |
| ACT-05 | Switch to Actions tab | Actions tab content shown |
| ACT-06 | Add valid action | Action added to list |
| ACT-07 | Add duplicate action | Alert shown |
| ACT-08 | Delete action | Action removed |
| ACT-09 | Close modal | Modal closes, actors/actions persisted |

### 7. Save/Load (Browser Storage)

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| SAV-01 | Click Save button | Alert "Saved to browser storage" |
| SAV-02 | Clear canvas, then Load | Previous state restored |
| SAV-03 | Load with no saved data | Graceful handling (empty or error message) |

### 8. Import/Export JSON

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| IMP-01 | Export JSON | File downloaded as petri-net-config.json |
| IMP-02 | Verify exported JSON structure | Contains actors, actions, places, transitions, _gui_metadata |
| IMP-03 | Import valid JSON | Net restored from file |
| IMP-04 | Import invalid JSON | Error message with parse details |
| IMP-05 | Import JSON with missing fields | Graceful handling |

### 9. Clear All

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| CLR-01 | Click Clear All | Confirmation dialog shown |
| CLR-02 | Accept Clear All | Canvas cleared, "0 places, 0 transitions" |
| CLR-03 | Cancel Clear All | No changes made |

### 10. Simulator Mode

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| SIM-01 | Switch to Simulator mode | Toolbox replaced with simulation controls |
| SIM-02 | Verify simulation controls | Play, Step, Reset buttons; Speed slider; Token/Enabled counts |
| SIM-03 | Inject token via "+" button | Token count increases, log entry added |
| SIM-04 | Remove token via "-" button | Token count decreases |
| SIM-05 | Fire transition manually | Token moves, log entries added |
| SIM-06 | Use Step button | One transition fires |
| SIM-07 | Use Play button | Automatic stepping at speed interval |
| SIM-08 | Use Reset button | All tokens cleared, log cleared |
| SIM-09 | Adjust speed slider | Speed value changes |
| SIM-10 | Clear log button | Log entries cleared |
| SIM-11 | Switch back to Editor mode | Editor UI restored |

### 11. Canvas Controls

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| CAN-01 | Zoom Out button | Canvas zooms out, Zoom In enabled |
| CAN-02 | Zoom In button | Canvas zooms in |
| CAN-03 | Fit View button | All elements fit in viewport |
| CAN-04 | Toggle Interactivity | Node dragging enabled/disabled |
| CAN-05 | Drag node to new position | Node moves, position persisted |
| CAN-06 | Mini map visible | Shows overview of canvas |

### 12. Edge Cases & Error Handling

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| ERR-01 | Empty canvas Export | Valid JSON with empty arrays |
| ERR-02 | Simulator with no transitions | Play/Step disabled |
| ERR-03 | Very long place ID | Handled gracefully (truncated display or scrollable) |
| ERR-04 | Rapid clicking | No crashes or duplicate elements |

## Known Issues (As of Last Update)

1. **Negative Priority Accepted** (TRN-04): Transition priority field accepts negative values
2. **Negative Token Capacity Accepted** (INS-07): Token Capacity accepts negative values
3. **Overlapping Nodes on Drop**: New elements stack at same position
4. **Console Warnings in Simulator**: "Edge type 'draggable' not found" warnings

## Test Execution Notes

- When running automated tests, spread nodes apart using mouse drag operations before testing connections
- Use `browser_run_code` for complex mouse interactions
- Take screenshots at key checkpoints for visual verification
- Check console messages for warnings/errors after mode switches

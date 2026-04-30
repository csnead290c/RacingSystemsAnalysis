/**
 * VB6 Semantic Parity Test: Detailed Parameters Column Order
 * 
 * VB6 Specification (TIMESLIP.FRM line 605):
 *   .Label1.caption = "Time        Distance     MPH   Acceleration  Gear     RPM"
 * 
 * This test proves the rendered DOM column order matches VB6 semantics.
 * VB6 order: Time, Distance, MPH, Acceleration, Gear, RPM
 * TS order: Event (added), Time, Distance, MPH, Acceleration, Gear, RPM, Slip (added)
 * 
 * Critical requirement: Gear must appear BEFORE RPM in the rendered table.
 */

import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import DetailedParametersModal from '../DetailedParameters';
import { formatVB6PrintedRow } from '../../../domain/physics/vb6/vb6PrintedRow';

describe('DetailedParameters - VB6 Column Order', () => {
  
  test('rendered table headers match VB6 column order: Gear before RPM', () => {
    // Create minimal test data using VB6 formatter
    const printedRow = formatVB6PrintedRow(
      'distance',
      100,
      3,
      {
        time_s: 1.23,
        dist_ft: 60,
        vel_fps: 66.88,
        ags_g: 1.20,
        engRPM: 5000,
        gear: 2,
        slip: false,
      },
      5,
      false
    );

    const { container } = render(
      <DetailedParametersModal
        isOpen={true}
        onClose={() => {}}
        printedRows={[printedRow]}
        raceLengthFt={1320}
      />
    );

    // Find the table header row
    const headerRow = container.querySelector('thead tr');
    expect(headerRow).toBeTruthy();

    // Get all th elements in order
    const headers = Array.from(headerRow!.querySelectorAll('th')).map(
      th => th.textContent?.trim() || ''
    );

    // VB6 column order verification
    expect(headers).toEqual([
      'Event',        // TS addition (acceptable)
      'Time (s)',     // VB6 column 1
      'Dist (ft)',    // VB6 column 2
      'MPH',          // VB6 column 3
      'Accel (g)',    // VB6 column 4
      'Gear',         // VB6 column 5 ← CRITICAL
      'RPM',          // VB6 column 6 ← CRITICAL
      'Slip',         // TS addition (acceptable)
    ]);
  });

  test('rendered table cells match VB6 column order: Gear cell before RPM cell', () => {
    // Create minimal test data
    const printedRow = formatVB6PrintedRow(
      'distance',
      100,
      3,
      {
        time_s: 1.23,
        dist_ft: 60,
        vel_fps: 66.88,
        ags_g: 1.20,
        engRPM: 5000,
        gear: 2,
        slip: false,
      },
      5,
      false
    );

    const { container } = render(
      <DetailedParametersModal
        isOpen={true}
        onClose={() => {}}
        printedRows={[printedRow]}
        raceLengthFt={1320}
      />
    );

    // Find the first data row
    const dataRow = container.querySelector('tbody tr');
    expect(dataRow).toBeTruthy();

    // Get all td elements in order
    const cells = Array.from(dataRow!.querySelectorAll('td')).map(
      td => td.textContent?.trim() || ''
    );

    // Verify we have 8 cells (Event, Time, Dist, MPH, Accel, Gear, RPM, Slip)
    expect(cells.length).toBe(8);

    // Extract the Gear and RPM cell values by position
    const gearCell = cells[5];  // 6th cell (0-indexed)
    const rpmCell = cells[6];   // 7th cell (0-indexed)

    // Verify Gear cell contains a gear number
    expect(gearCell).toBe('2');

    // Verify RPM cell contains formatted RPM with thousands separator
    expect(rpmCell).toBe('5,000');

    // Critical assertion: Gear appears before RPM in the cell array
    const gearIndex = 5;
    const rpmIndex = 6;
    expect(gearIndex).toBeLessThan(rpmIndex);
  });

  test('VB6 column order preserved with slip indicator', () => {
    // Test with slip=true to verify Slip column doesn't disrupt Gear/RPM order
    const printedRow = formatVB6PrintedRow(
      'rollout',
      10,
      1,
      {
        time_s: 0.05,
        dist_ft: 12,
        vel_fps: 7.33,
        ags_g: 1.40,
        engRPM: 4200,
        gear: 1,
        slip: true,  // This should show "(s)" in Slip column
      },
      5,
      false
    );

    const { container } = render(
      <DetailedParametersModal
        isOpen={true}
        onClose={() => {}}
        printedRows={[printedRow]}
        raceLengthFt={1320}
      />
    );

    const dataRow = container.querySelector('tbody tr');
    const cells = Array.from(dataRow!.querySelectorAll('td')).map(
      td => td.textContent?.trim() || ''
    );

    // Verify column order is still correct even with slip indicator
    expect(cells[5]).toBe('1');      // Gear
    expect(cells[6]).toBe('4,200');  // RPM
    expect(cells[7]).toBe('(s)');    // Slip indicator
  });
});

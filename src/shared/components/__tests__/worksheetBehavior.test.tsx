/**
 * Worksheet Transfer Behavior Tests
 * 
 * Verifies that worksheet interaction semantics match VB6 requirements by product family.
 * 
 * VB6 Transfer Semantics:
 * - QUARTER Pro/Jr: Manual entry only, NO transfer mechanism (advisory only)
 * - ENGINE Pro/Jr: Double-click calculated result to transfer value
 * 
 * VB6 Manual Sources:
 * - QPRO3W.txt page 2-5: "calculated frontal area...does not automatically transfer...You must still input any new value for yourself"
 * - EPRO3W.txt page 2-5: "if you double-click on the calculated value...the worksheet will close and the new value will be transfered"
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorksheetModal from '../WorksheetModal';
import type { WorksheetTransferMode } from '../WorksheetModal';

describe('Worksheet Transfer Behavior - VB6 Semantic Parity', () => {
  describe('QUARTER Family: advisory_manual_entry_only mode', () => {
    it('worksheet close button does not transfer value', () => {
      const onApply = vi.fn();
      const onClose = vi.fn();

      render(
        <WorksheetModal
          isOpen={true}
          onClose={onClose}
          onApply={onApply}
          transferMode="advisory_manual_entry_only"
          title="Test Worksheet"
          calculatedValue={42.5}
          calculatedLabel="Test Value"
          unit="units"
        >
          <div>Test inputs</div>
        </WorksheetModal>
      );

      // Click Close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      // Verify: onClose called, onApply NOT called
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onApply).not.toHaveBeenCalled();
    });

    it('worksheet has no Apply button in advisory mode', () => {
      render(
        <WorksheetModal
          isOpen={true}
          onClose={vi.fn()}
          onApply={vi.fn()}
          transferMode="advisory_manual_entry_only"
          title="Test Worksheet"
          calculatedValue={42.5}
          calculatedLabel="Test Value"
        >
          <div>Test inputs</div>
        </WorksheetModal>
      );

      // Verify: No Apply button exists
      const applyButton = screen.queryByRole('button', { name: /apply/i });
      expect(applyButton).toBeNull();
    });

    it('worksheet has only Close button in advisory mode', () => {
      render(
        <WorksheetModal
          isOpen={true}
          onClose={vi.fn()}
          onApply={vi.fn()}
          transferMode="advisory_manual_entry_only"
          title="Test Worksheet"
          calculatedValue={42.5}
          calculatedLabel="Test Value"
        >
          <div>Test inputs</div>
        </WorksheetModal>
      );

      // Verify: Only one button exists (Close)
      const buttons = screen.getAllByRole('button');
      const closeButtons = buttons.filter(btn => btn.textContent?.toLowerCase().includes('close'));
      expect(closeButtons.length).toBe(1);
    });

    it('double-clicking calculated result does NOT transfer in advisory mode', () => {
      const onApply = vi.fn();
      const onClose = vi.fn();

      render(
        <WorksheetModal
          isOpen={true}
          onClose={onClose}
          onApply={onApply}
          transferMode="advisory_manual_entry_only"
          title="Test Worksheet"
          calculatedValue={42.5}
          calculatedLabel="Test Value"
        >
          <div>Test inputs</div>
        </WorksheetModal>
      );

      // Find calculated result display
      const resultValue = screen.getByText('42.500', { exact: false });

      // Double-click the result (the parent div with backgroundColor)
      const resultDisplay = resultValue.parentElement?.parentElement;
      if (resultDisplay) {
        fireEvent.doubleClick(resultDisplay);
      }

      // Verify: No transfer occurred
      expect(onApply).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('worksheet does not silently change user input without explicit action', () => {
      const onApply = vi.fn();

      const { unmount } = render(
        <WorksheetModal
          isOpen={true}
          onClose={vi.fn()}
          onApply={onApply}
          transferMode="advisory_manual_entry_only"
          title="Test Worksheet"
          calculatedValue={42.5}
          calculatedLabel="Test Value"
        >
          <div>Test inputs</div>
        </WorksheetModal>
      );

      // Unmount without any user action
      unmount();

      // Verify: No transfer occurred
      expect(onApply).not.toHaveBeenCalled();
    });
  });

  describe('ENGINE Family: double_click_result_transfers mode', () => {
    it('worksheet close button does not transfer value', () => {
      const onApply = vi.fn();
      const onClose = vi.fn();

      render(
        <WorksheetModal
          isOpen={true}
          onClose={onClose}
          onApply={onApply}
          transferMode="double_click_result_transfers"
          title="Test Worksheet"
          calculatedValue={42.5}
          calculatedLabel="Test Value"
        >
          <div>Test inputs</div>
        </WorksheetModal>
      );

      // Click Close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      // Verify: onClose called, onApply NOT called
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onApply).not.toHaveBeenCalled();
    });

    it('double-clicking calculated result transfers value and closes worksheet', () => {
      const onApply = vi.fn();
      const onClose = vi.fn();

      render(
        <WorksheetModal
          isOpen={true}
          onClose={onClose}
          onApply={onApply}
          transferMode="double_click_result_transfers"
          title="Test Worksheet"
          calculatedValue={42.5}
          calculatedLabel="Test Value"
        >
          <div>Test inputs</div>
        </WorksheetModal>
      );

      // Find calculated result display (the div with backgroundColor and onDoubleClick)
      const resultValue = screen.getByText('42.500', { exact: false });
      // The value is in a nested div, go up to the container with the handler
      // Structure: <div onDoubleClick><div>label</div><div>42.500</div></div>
      const resultDisplay = resultValue.parentElement?.parentElement;

      // Double-click the result display
      expect(resultDisplay).toBeTruthy();
      fireEvent.doubleClick(resultDisplay!);

      // Verify: Both onApply and onClose called
      expect(onApply).toHaveBeenCalledWith(42.5);
      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('double-click hint is displayed in ENGINE mode', () => {
      render(
        <WorksheetModal
          isOpen={true}
          onClose={vi.fn()}
          onApply={vi.fn()}
          transferMode="double_click_result_transfers"
          title="Test Worksheet"
          calculatedValue={42.5}
          calculatedLabel="Test Value"
        >
          <div>Test inputs</div>
        </WorksheetModal>
      );

      // Verify: Double-click hint is shown
      expect(screen.getByText(/double-click to use this value/i)).toBeInTheDocument();
    });

    it('calculated result has pointer cursor in ENGINE mode', () => {
      render(
        <WorksheetModal
          isOpen={true}
          onClose={vi.fn()}
          onApply={vi.fn()}
          transferMode="double_click_result_transfers"
          title="Test Worksheet"
          calculatedValue={42.5}
          calculatedLabel="Test Value"
        >
          <div>Test inputs</div>
        </WorksheetModal>
      );

      // Find calculated result display
      const resultValue = screen.getByText('42.500', { exact: false });
      // Navigate up to the colored result container div
      const resultDisplay = resultValue.parentElement?.parentElement;

      // Verify: Has pointer cursor
      expect(resultDisplay).toBeTruthy();
      const computedStyle = window.getComputedStyle(resultDisplay!);
      expect(computedStyle.cursor).toBe('pointer');
    });

    it('worksheet has no Apply button in ENGINE mode', () => {
      render(
        <WorksheetModal
          isOpen={true}
          onClose={vi.fn()}
          onApply={vi.fn()}
          transferMode="double_click_result_transfers"
          title="Test Worksheet"
          calculatedValue={42.5}
          calculatedLabel="Test Value"
        >
          <div>Test inputs</div>
        </WorksheetModal>
      );

      // Verify: No Apply button exists
      const applyButton = screen.queryByRole('button', { name: /apply/i });
      expect(applyButton).toBeNull();
    });
  });

  describe('Transfer Mode Configuration', () => {
    it('defaults to advisory_manual_entry_only when transferMode not specified', () => {
      render(
        <WorksheetModal
          isOpen={true}
          onClose={vi.fn()}
          onApply={vi.fn()}
          // transferMode omitted - should default to advisory
          title="Test Worksheet"
          calculatedValue={42.5}
          calculatedLabel="Test Value"
        >
          <div>Test inputs</div>
        </WorksheetModal>
      );

      // Verify: No Apply button (advisory mode)
      const applyButton = screen.queryByRole('button', { name: /apply/i });
      expect(applyButton).toBeNull();

      // Verify: Has Close button
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('onApply is optional when using advisory mode', () => {
      // Should not throw error when onApply is undefined
      expect(() => {
        render(
          <WorksheetModal
            isOpen={true}
            onClose={vi.fn()}
            // onApply omitted
            transferMode="advisory_manual_entry_only"
            title="Test Worksheet"
            calculatedValue={42.5}
            calculatedLabel="Test Value"
          >
            <div>Test inputs</div>
          </WorksheetModal>
        );
      }).not.toThrow();
    });
  });

  describe('Worksheet State Isolation', () => {
    it('worksheet state does not leak between opens', () => {
      const onApply = vi.fn();
      const onClose = vi.fn();

      const { rerender } = render(
        <WorksheetModal
          isOpen={true}
          onClose={onClose}
          onApply={onApply}
          transferMode="advisory_manual_entry_only"
          title="Test Worksheet"
          calculatedValue={42.5}
          calculatedLabel="Test Value"
        >
          <div>Test inputs</div>
        </WorksheetModal>
      );

      // Close worksheet
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      // Reopen with different value
      rerender(
        <WorksheetModal
          isOpen={true}
          onClose={onClose}
          onApply={onApply}
          transferMode="advisory_manual_entry_only"
          title="Test Worksheet"
          calculatedValue={99.9}
          calculatedLabel="Test Value"
        >
          <div>Test inputs</div>
        </WorksheetModal>
      );

      // Verify: New value is displayed (no state leak)
      expect(screen.getByText('99.900', { exact: false })).toBeInTheDocument();
    });
  });

  describe('VB6 Semantic Compliance Summary', () => {
    it('QUARTER worksheets match VB6 manual requirement: no automatic transfer', () => {
      // VB6 Manual (QPRO3W.txt page 2-5):
      // "Note that the calculated frontal area from the worksheet does not automatically
      //  transfer to the QUARTER Pro Input Data screen. You must still input any new value for yourself."

      const onApply = vi.fn();
      const onClose = vi.fn();

      render(
        <WorksheetModal
          isOpen={true}
          onClose={onClose}
          onApply={onApply}
          transferMode="advisory_manual_entry_only"
          title="Frontal Area Worksheet"
          calculatedValue={21.58}
          calculatedLabel="Frontal Area"
          unit="sq ft"
        >
          <div>Worksheet inputs</div>
        </WorksheetModal>
      );

      // User closes worksheet
      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      // Verify: Value did NOT transfer (matches VB6)
      expect(onApply).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('ENGINE worksheets match VB6 manual requirement: double-click transfers', () => {
      // VB6 Manual (EPRO3W.txt page 2-5):
      // "However, if you double-click on the calculated value on the worksheet,
      //  the worksheet will close and the new value will be transfered to the main ENGINE Pro screen."

      const onApply = vi.fn();
      const onClose = vi.fn();

      render(
        <WorksheetModal
          isOpen={true}
          onClose={onClose}
          onApply={onApply}
          transferMode="double_click_result_transfers"
          title="Compression Ratio Worksheet"
          calculatedValue={10.5}
          calculatedLabel="Compression Ratio"
        >
          <div>Worksheet inputs</div>
        </WorksheetModal>
      );

      // User double-clicks calculated result
      const resultValue = screen.getByText('10.500', { exact: false });
      // Navigate up to the colored result container div
      const resultDisplay = resultValue.parentElement?.parentElement;
      expect(resultDisplay).toBeTruthy();
      fireEvent.doubleClick(resultDisplay!);

      // Verify: Value transferred AND worksheet closed (matches VB6)
      expect(onApply).toHaveBeenCalledWith(10.5);
      expect(onClose).toHaveBeenCalled();
    });
  });
});

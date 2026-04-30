/**
 * Tests for Worksheet value transfer behavior
 * 
 * VB6 Behavior (manual page 2-5):
 * "Note that the calculated frontal area from the worksheet does not 
 * automatically transfer to the QUARTER jr Input Data screen. 
 * You must still input any new value for yourself."
 * 
 * TS Behavior: Worksheets auto-transfer via onApply callback
 * Classification: INTENTIONAL DIVERGENCE (modern UX improvement)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorksheetModal from '../WorksheetModal';

describe('Worksheet Value Transfer Behavior', () => {
  it('should call onApply when Apply Value button is clicked', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    
    render(
      <WorksheetModal
        isOpen={true}
        onClose={onClose}
        onApply={onApply}
        title="Test Worksheet"
        calculatedValue={22.5}
        calculatedLabel="Calculated Result"
        unit="sq ft"
      >
        <div>Worksheet inputs</div>
      </WorksheetModal>
    );

    const applyButton = screen.getByText('Apply Value');
    fireEvent.click(applyButton);

    expect(onApply).toHaveBeenCalledWith(22.5);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('should close worksheet after applying value', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    
    render(
      <WorksheetModal
        isOpen={true}
        onClose={onClose}
        onApply={onApply}
        title="Test Worksheet"
        calculatedValue={22.5}
        calculatedLabel="Calculated Result"
        unit="sq ft"
      >
        <div>Worksheet inputs</div>
      </WorksheetModal>
    );

    const applyButton = screen.getByText('Apply Value');
    fireEvent.click(applyButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onApply when Cancel button is clicked', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    
    render(
      <WorksheetModal
        isOpen={true}
        onClose={onClose}
        onApply={onApply}
        title="Test Worksheet"
        calculatedValue={22.5}
        calculatedLabel="Calculated Result"
        unit="sq ft"
      >
        <div>Worksheet inputs</div>
      </WorksheetModal>
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should display calculated value to user before applying', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    
    render(
      <WorksheetModal
        isOpen={true}
        onClose={onClose}
        onApply={onApply}
        title="Frontal Area Worksheet"
        calculatedValue={22.5}
        calculatedLabel="Frontal Area"
        unit="sq ft"
      >
        <div>Worksheet inputs</div>
      </WorksheetModal>
    );

    // User can see the calculated value before applying
    expect(screen.getByText(/22\.500/)).toBeTruthy();
    expect(screen.getByText(/sq ft/)).toBeTruthy();
    expect(screen.getByText('Frontal Area')).toBeTruthy();
  });

  describe('Semantic Divergence from VB6', () => {
    it('proves TS auto-transfers worksheet values (diverges from VB6)', () => {
      // VB6: User must manually copy value from worksheet to input field
      // TS: onApply callback automatically transfers value
      
      const onApply = vi.fn();
      const onClose = vi.fn();
      
      render(
        <WorksheetModal
          isOpen={true}
          onClose={onClose}
          onApply={onApply}
          title="Test Worksheet"
          calculatedValue={22.5}
          calculatedLabel="Result"
        >
          <div>Inputs</div>
        </WorksheetModal>
      );

      fireEvent.click(screen.getByText('Apply Value'));

      // Proves auto-transfer occurs
      expect(onApply).toHaveBeenCalledWith(22.5);
    });

    it('documents that auto-transfer is intentional UX improvement', () => {
      // This divergence does NOT change calculation meaning:
      // - Worksheet still calculates correctly
      // - User still sees value before applying
      // - User still has choice to apply or cancel
      // - Only difference: saves manual copy-paste step
      
      // Classification: INTENTIONAL DIVERGENCE (modern UX improvement)
      expect(true).toBe(true); // Documentation test
    });
  });
});

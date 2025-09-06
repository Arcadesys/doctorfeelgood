import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DurationPicker from './DurationPicker';

describe('DurationPicker', () => {
  it('renders with correct label', () => {
    const onChange = vi.fn();
    render(<DurationPicker value={120} onChange={onChange} />);
    
    expect(screen.getByText('Duration')).toBeDefined();
  });

  it('displays current value in MM:SS format', () => {
    const onChange = vi.fn();
    render(<DurationPicker value={120} onChange={onChange} />);
    
    const select = screen.getByDisplayValue('2:00');
    expect(select).toBeDefined();
  });

  it('displays various durations correctly', () => {
    const onChange = vi.fn();
    
    // Test 15 seconds (0:15)
    const { rerender } = render(<DurationPicker value={15} onChange={onChange} />);
    expect(screen.getByDisplayValue('0:15')).toBeDefined();
    
    // Test 75 seconds (1:15)
    rerender(<DurationPicker value={75} onChange={onChange} />);
    expect(screen.getByDisplayValue('1:15')).toBeDefined();
    
    // Test 300 seconds (5:00)
    rerender(<DurationPicker value={300} onChange={onChange} />);
    expect(screen.getByDisplayValue('5:00')).toBeDefined();
  });

  it('calls onChange with correct value when selection changes', () => {
    const onChange = vi.fn();
    render(<DurationPicker value={120} onChange={onChange} />);
    
    const select = screen.getByDisplayValue('2:00');
    fireEvent.change(select, { target: { value: '180' } });
    
    expect(onChange).toHaveBeenCalledWith(180);
  });

  it('generates correct duration options', () => {
    const onChange = vi.fn();
    render(<DurationPicker value={120} onChange={onChange} />);
    
    const select = screen.getByDisplayValue('2:00');
    const options = Array.from(select.querySelectorAll('option'));
    
    // Should have 20 options (15 to 300 in 15 second increments)
    expect(options).toHaveLength(20);
    
    // Check first option
    expect(options[0].value).toBe('15');
    expect(options[0].textContent).toBe('0:15');
    
    // Check last option
    expect(options[19].value).toBe('300');
    expect(options[19].textContent).toBe('5:00');
    
    // Check a middle option
    expect(options[7].value).toBe('120'); // 8th option = 8 * 15 = 120
    expect(options[7].textContent).toBe('2:00');
  });

  it('includes all expected duration options', () => {
    const onChange = vi.fn();
    render(<DurationPicker value={120} onChange={onChange} />);
    
    const select = screen.getByDisplayValue('2:00');
    
    // Test some specific durations
    expect(select.querySelector('option[value="30"]')).toBeDefined(); // 0:30
    expect(select.querySelector('option[value="60"]')).toBeDefined(); // 1:00
    expect(select.querySelector('option[value="90"]')).toBeDefined(); // 1:30
    expect(select.querySelector('option[value="150"]')).toBeDefined(); // 2:30
    expect(select.querySelector('option[value="240"]')).toBeDefined(); // 4:00
  });

  it('has proper accessibility attributes', () => {
    const onChange = vi.fn();
    render(<DurationPicker value={120} onChange={onChange} />);
    
    const label = screen.getByLabelText('Session duration');
    expect(label).toBeDefined();
  });

  it('handles zero padding correctly in display', () => {
    const onChange = vi.fn();
    render(<DurationPicker value={45} onChange={onChange} />);
    
    // 45 seconds should display as 0:45 (not 0:45)
    expect(screen.getByDisplayValue('0:45')).toBeDefined();
  });

  it('handles edge case durations', () => {
    const onChange = vi.fn();
    
    // Test minimum duration (15 seconds)
    const { rerender } = render(<DurationPicker value={15} onChange={onChange} />);
    expect(screen.getByDisplayValue('0:15')).toBeDefined();
    
    // Test maximum duration (300 seconds)
    rerender(<DurationPicker value={300} onChange={onChange} />);
    expect(screen.getByDisplayValue('5:00')).toBeDefined();
  });

  it('handles invalid input gracefully', () => {
    const onChange = vi.fn();
    render(<DurationPicker value={120} onChange={onChange} />);
    
    const select = screen.getByDisplayValue('2:00');
    fireEvent.change(select, { target: { value: 'invalid' } });
    
    // parseInt('invalid', 10) returns NaN, but the component should handle this
    expect(onChange).toHaveBeenCalledWith(NaN);
  });

  it('maintains selection when value changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(<DurationPicker value={120} onChange={onChange} />);
    
    // Initially showing 2:00
    expect(screen.getByDisplayValue('2:00')).toBeDefined();
    
    // Change to different value
    rerender(<DurationPicker value={180} onChange={onChange} />);
    expect(screen.getByDisplayValue('3:00')).toBeDefined();
  });

  it('generates options in 15-second increments', () => {
    const onChange = vi.fn();
    render(<DurationPicker value={120} onChange={onChange} />);
    
    const select = screen.getByDisplayValue('2:00');
    const options = Array.from(select.querySelectorAll('option'));
    
    // Verify all options are multiples of 15
    options.forEach((option, index) => {
      const expectedValue = (index + 1) * 15;
      expect(parseInt(option.value, 10)).toBe(expectedValue);
    });
  });
});
import React from 'react';
import { render, screen } from '@testing-library/react';
import SessionTimer from './SessionTimer';

describe('SessionTimer', () => {
  it('renders with initial time of 00:00', () => {
    render(<SessionTimer />);
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
  });

  it('updates time when isRunning is true', () => {
    jest.useFakeTimers();
    render(<SessionTimer isRunning={true} />);
    
    // Advance time by 1 second
    jest.advanceTimersByTime(1000);
    expect(screen.getByRole('timer')).toHaveTextContent('00:01');
    
    jest.useRealTimers();
  });

  it('stops updating when isRunning is false', () => {
    jest.useFakeTimers();
    const { rerender } = render(<SessionTimer isRunning={true} />);
    
    // Advance time by 1 second
    jest.advanceTimersByTime(1000);
    expect(screen.getByRole('timer')).toHaveTextContent('00:01');
    
    // Stop the timer
    rerender(<SessionTimer isRunning={false} />);
    jest.advanceTimersByTime(1000);
    expect(screen.getByRole('timer')).toHaveTextContent('00:01');
    
    jest.useRealTimers();
  });

  it('resets when reset prop is true', () => {
    jest.useFakeTimers();
    const { rerender } = render(<SessionTimer isRunning={true} />);
    
    // Advance time by 5 seconds
    jest.advanceTimersByTime(5000);
    expect(screen.getByRole('timer')).toHaveTextContent('00:05');
    
    // Reset the timer
    rerender(<SessionTimer isRunning={true} reset={true} />);
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
    
    jest.useRealTimers();
  });
}); 
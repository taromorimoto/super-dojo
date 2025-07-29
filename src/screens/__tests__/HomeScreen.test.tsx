import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import { useAuthContext } from '../../context/AuthContext';

// Mock the auth context
jest.mock('../../context/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;

describe('HomeScreen', () => {
  beforeEach(() => {
    mockUseAuthContext.mockReturnValue({
      user: {
        _id: '1',
        email: 'test@example.com',
        role: 'student',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      profile: null,
      isLoading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      currentUserEmail: 'test@example.com',
      setCurrentUserEmail: jest.fn(),
    });
  });

  it('renders correctly without profile', () => {
    const { getByText } = render(<HomeScreen />);
    
    expect(getByText(/Hello, test@example.com!/)).toBeTruthy();
    expect(getByText('Complete Your Profile')).toBeTruthy();
  });

  it('renders correctly with profile', () => {
    mockUseAuthContext.mockReturnValue({
      user: {
        _id: '1',
        email: 'test@example.com',
        role: 'student',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      profile: {
        _id: '1',
        name: 'Test User',
        danKyuGrade: '2 kyu',
        clubId: 'club1',
        sport: 'kendo',
        userId: '1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      isLoading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      currentUserEmail: 'test@example.com',
      setCurrentUserEmail: jest.fn(),
    });

    const { getByText, queryByText } = render(<HomeScreen />);
    
    expect(getByText(/Hello, Test User!/)).toBeTruthy();
    expect(getByText('2 kyu • Kendo')).toBeTruthy();
    expect(queryByText('Complete Your Profile')).toBeNull();
  });
});
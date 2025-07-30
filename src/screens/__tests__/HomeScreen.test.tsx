import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import { useAuthContext } from '../../context/AuthContext';
import { Id } from '../../../convex/_generated/dataModel';

// Mock the auth context
jest.mock('../../context/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;

describe('HomeScreen', () => {
  beforeEach(() => {
    mockUseAuthContext.mockReturnValue({
      user: {
        _id: '1' as Id<"users">,
        email: 'test@example.com',
      },
      profile: null,
      isLoading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      isAuthenticated: false,
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
        _id: '1' as Id<"users">,
        email: 'test@example.com',
      },
      profile: {
        _id: '1' as Id<"profiles">,
        _creationTime: Date.now(),
        name: 'Test User',
        danKyuGrade: '2 kyu',
        clubId: 'club1' as Id<"clubs">,
        sport: 'kendo' as const,
        userId: '1' as Id<"users">,
        userEmail: 'test@example.com',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      isLoading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      isAuthenticated: true,
    });

    const { getByText, queryByText } = render(<HomeScreen />);

    expect(getByText(/Hello, Test User!/)).toBeTruthy();
    expect(getByText('2 kyu • Kendo')).toBeTruthy();
    expect(queryByText('Complete Your Profile')).toBeNull();
  });
});
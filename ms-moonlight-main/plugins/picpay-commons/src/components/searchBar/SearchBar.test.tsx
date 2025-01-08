import React from 'react';
import { fireEvent, render, waitFor, screen } from '@testing-library/react';
import { SearchBar } from './SearchBar';

describe('EntitySearchBar', () => {
  it('should display search value and execute set callback', async () => {
    const onChange = jest.fn();

    render(<SearchBar onChange={onChange} value="hello" />);

    const searchInput = screen.getByDisplayValue('hello');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'world' } });
    await waitFor(() => expect(onChange.mock.calls.length).toBe(1));
    expect(onChange).toHaveBeenCalledWith('world');

    fireEvent.change(searchInput, { target: { value: '' } });
    await waitFor(() => expect(onChange.mock.calls.length).toBe(2));
    expect(onChange).toHaveBeenCalledWith('');
  });
});

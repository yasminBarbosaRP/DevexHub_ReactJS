import React from 'react';
import { render, screen } from '@testing-library/react';
import { MoonlightBreadcrumbs } from './MoonlightBreadcrumbs';

jest.mock('@backstage/plugin-catalog-react', () => ({
  EntityRefLink: ({ title }: { title: string }) => <span>{title}</span>,
}));

describe('MoonlightBreadcrumbs', () => {
  it('renders breadcrumbs correctly', () => {
    const links = [
      { title: 'Home', href: '/' },
      { title: 'Services', href: '/services' },
    ];

    render(
      <MoonlightBreadcrumbs active="About" links={links} inverse={false} />
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();

    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('does not render when there are no non-active links', () => {
    const links = [{ title: 'About', href: '/about' }];

    render(
      <MoonlightBreadcrumbs active="About" links={links} inverse={false} />
    );

    expect(screen.queryByText('About')).not.toBeInTheDocument();
  });

  it('renders breadcrumbs in inverse order when inverse is true', () => {
    const links = [
      { title: 'First', href: '/first' },
      { title: 'Second', href: '/second' },
      { title: 'Third', href: '/third' },
    ];

    render(
      <MoonlightBreadcrumbs active="Current" links={links} inverse />
    );

    const breadcrumbItems = screen.getAllByText(/First|Second|Third|Current/);

    expect(breadcrumbItems.map(item => item.textContent)).toEqual([
      'Third',
      'Second',
      'First',
      'Current',
    ]);
  });

  it('renders custom separator', () => {
    const links = [
      { title: 'Home', href: '/' },
      { title: 'About', href: '/about' },
    ];

    render(
      <MoonlightBreadcrumbs
        active="Contact"
        links={links}
        separator="|"
      />
    );

    const separators = screen.getAllByText('|');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('renders icon component when provided', () => {
    const links = [{ title: 'Home', href: '/' }];
    const IconComponent = <span data-testid="test-icon">🏠</span>;

    render(
      <MoonlightBreadcrumbs
        active="Dashboard"
        links={links}
        iconComponent={IconComponent}
      />
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });
});

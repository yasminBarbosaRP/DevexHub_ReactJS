import { render, waitFor } from '@testing-library/react';
import { wrapInTestApp } from '@backstage/test-utils';
import React from 'react';
import { CustomToolCard } from './CustomToolCard';

const minProps = {
  card: {
    id: 'a',
    title: 'Title',
    description: 'Something something',
    productUrl: 'http://spotify.com/',
    image: 'https://developer.spotify.com/assets/WebAPI_intro.png',
    tags: ['tag1', 'tag2'],
  },
};

describe('<ToolCard />', () => {
  it('renders without exploding', async () => {
    await waitFor(() => {
      const { getByText } = render(
        wrapInTestApp(<CustomToolCard {...minProps} />),
      );
      expect(getByText('Explore')).toBeInTheDocument();
    });
  });

  it('renders props correctly', async () => {
    await waitFor(() => {
      const { getByText } = render(
        wrapInTestApp(<CustomToolCard {...minProps} />),
      );
      expect(getByText(minProps.card.title)).toBeInTheDocument();
      expect(getByText(minProps.card.description)).toBeInTheDocument();
    });
  });

  it('should link out', async () => {
    await waitFor(() => {
      const rendered = render(wrapInTestApp(<CustomToolCard {...minProps} />));
      const anchor = rendered.container.querySelector('a');
      expect(anchor).toHaveAttribute('href', minProps.card.productUrl);
    });
  });

  it('renders default description when missing', async () => {
    const card = {
      id: 'abc-012',
      title: 'Title',
      productUrl: 'http://spotify.com/',
      image: 'https://developer.spotify.com/assets/WebAPI_intro.png',
      tags: ['tag1', 'tag2'],
    };
    await waitFor(() => {
      const { getByText } = render(
        wrapInTestApp(<CustomToolCard card={card} />),
      );
      expect(getByText('Description missing')).toBeInTheDocument();
    });
  });

  it('renders lifecycle correctly', async () => {
    const propsWithLifecycle = {
      card: {
        id: '1233-xyz',
        title: 'Title',
        description: 'Something something',
        productUrl: 'http://spotify.com/',
        image: 'https://developer.spotify.com/assets/WebAPI_intro.png',
        tags: ['tag1', 'tag2'],
      },
    };

    await waitFor(() => {
      const { queryByText } = render(
        wrapInTestApp(<CustomToolCard {...propsWithLifecycle} />),
      );
      expect(queryByText('GA')).not.toBeInTheDocument();
    });
  });

  it('renders tags correctly', async () => {
    await waitFor(() => {
      const { getByText } = render(
        wrapInTestApp(<CustomToolCard {...minProps} />),
      );
      expect(getByText(minProps.card.tags[0])).toBeInTheDocument();
      expect(getByText(minProps.card.tags[1])).toBeInTheDocument();
    });
  });
});

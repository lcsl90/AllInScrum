import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar.tsx';

describe('Avatar', () => {
  it('zeigt ohne Foto die Initialen', () => {
    render(<Avatar name="Anna Schmidt" avatar={null} />);

    expect(screen.getByRole('img', { name: 'Anna Schmidt' })).toHaveTextContent('AS');
  });

  it('zeigt das Foto, wenn eines hochgeladen wurde', () => {
    render(<Avatar name="Anna Schmidt" avatar="data:image/webp;base64,QUJD" />);

    expect(screen.getByRole('img', { name: 'Anna Schmidt' })).toHaveAttribute(
      'src',
      'data:image/webp;base64,QUJD',
    );
  });
});

import { useEffect, useState } from 'react';
import { KeyboardInput } from './KeyboardInput';

export function useKeyboardInput(enabled?: () => boolean) {
  const [input] = useState(() => new KeyboardInput());
  useEffect(() => input.attach(window, document, enabled), [input, enabled]);
  return input;
}

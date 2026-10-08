import { useEffect, useState } from 'react';
import { KeyboardInput } from './KeyboardInput';

export function useKeyboardInput() {
  const [input] = useState(() => new KeyboardInput());
  useEffect(() => input.attach(window, document), [input]);
  return input;
}

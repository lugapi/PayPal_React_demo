export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  emoji: string;
  category: string;
}

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Pro Headphones',
    price: 149.99,
    description: 'Immersive sound, active noise cancellation, 30h battery life.',
    emoji: '🎧',
    category: 'Audio',
  },
  {
    id: '2',
    name: 'Smartwatch',
    price: 249.99,
    description: 'Full health tracking, built-in GPS, 50m water resistance.',
    emoji: '⌚',
    category: 'Wearables',
  },
  {
    id: '3',
    name: 'Mechanical Keyboard',
    price: 89.99,
    description: 'Silent switches, RGB backlight, compact layout.',
    emoji: '⌨️',
    category: 'Peripherals',
  },
  {
    id: '4',
    name: 'Gaming Mouse',
    price: 69.99,
    description: '16,000 DPI, 6 programmable buttons, adjustable weight.',
    emoji: '🖱️',
    category: 'Peripherals',
  },
  {
    id: '5',
    name: '4K Webcam',
    price: 119.99,
    description: '4K resolution, auto light correction, stereo microphone.',
    emoji: '📷',
    category: 'Video',
  },
  {
    id: '6',
    name: 'External SSD 1TB',
    price: 99.99,
    description: '1050 MB/s speed, USB-C, ultra-compact form factor.',
    emoji: '💾',
    category: 'Storage',
  },
];

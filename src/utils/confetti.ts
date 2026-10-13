import confetti from 'canvas-confetti';

// Palette colors for the celebrations
const PURPLE_COLORS = ['#8B5CF6', '#C4B5FD', '#6D28D9'];
const GOLD_COLORS = ['#D4AF37', '#F2D675', '#E5C06E'];
const SILVER_COLORS = ['#C7CBD1', '#E5E7EB', '#9CA3AF'];
const BRONZE_COLORS = ['#CD7F32', '#BF8958', '#D99B66'];

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Third Place Confetti:
 * Falling paper strips and rectangles from top of the screen in bronze, purple, gold, and silver.
 */
export function triggerThirdPlaceConfetti(): void {
  if (prefersReducedMotion()) return;

  const colors = [...BRONZE_COLORS, ...PURPLE_COLORS, '#D4AF37', '#C7CBD1'];

  // Central shower falling gracefully from top
  confetti({
    particleCount: 50,
    angle: 90,
    spread: 80,
    origin: { x: 0.5, y: -0.05 },
    colors,
    shapes: ['square'],
    scalar: 1.1,
    gravity: 0.8,
    drift: 0.1,
    ticks: 240,
    disableForReducedMotion: true,
  });

  // Secondary gentle scatter from top left and right
  setTimeout(() => {
    confetti({
      particleCount: 30,
      angle: 75,
      spread: 60,
      origin: { x: 0.25, y: -0.05 },
      colors,
      shapes: ['square'],
      scalar: 0.9,
      gravity: 0.75,
      ticks: 200,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 30,
      angle: 105,
      spread: 60,
      origin: { x: 0.75, y: -0.05 },
      colors,
      shapes: ['square'],
      scalar: 0.9,
      gravity: 0.75,
      ticks: 200,
      disableForReducedMotion: true,
    });
  }, 250);
}

/**
 * Second Place Confetti:
 * Fresh burst with silver as main accent, supported by royal purple and gold.
 */
export function triggerSecondPlaceConfetti(): void {
  if (prefersReducedMotion()) return;

  const colors = [...SILVER_COLORS, ...PURPLE_COLORS, '#D4AF37', '#F2D675'];

  // Stronger top shower
  confetti({
    particleCount: 75,
    angle: 90,
    spread: 100,
    origin: { x: 0.5, y: -0.05 },
    colors,
    shapes: ['square'],
    scalar: 1.15,
    gravity: 0.85,
    drift: 0.05,
    ticks: 260,
    disableForReducedMotion: true,
  });

  // Side cascades
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 70,
      spread: 70,
      origin: { x: 0.2, y: 0.05 },
      colors,
      shapes: ['square'],
      scalar: 1.0,
      gravity: 0.8,
      ticks: 220,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 40,
      angle: 110,
      spread: 70,
      origin: { x: 0.8, y: 0.05 },
      colors,
      shapes: ['square'],
      scalar: 1.0,
      gravity: 0.8,
      ticks: 220,
      disableForReducedMotion: true,
    });
  }, 250);
}

/**
 * First Place Confetti:
 * The grandest celebration of the entire event!
 * Cascades from top and angled side blasts in gold, purple, and silver over 3.5 seconds.
 */
export function triggerFirstPlaceConfetti(): void {
  if (prefersReducedMotion()) return;

  const colors = [...GOLD_COLORS, ...PURPLE_COLORS, ...SILVER_COLORS];
  const duration = 3200;
  const animationEnd = Date.now() + duration;

  // Immediate prominent central shower
  confetti({
    particleCount: 100,
    angle: 90,
    spread: 110,
    origin: { x: 0.5, y: -0.05 },
    colors,
    shapes: ['square'],
    scalar: 1.25,
    gravity: 0.9,
    ticks: 280,
    disableForReducedMotion: true,
  });

  // Sustained falling paper celebration from top and sides
  const interval: number = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    // Left and right side cannons
    confetti({
      particleCount: 15,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.25 },
      colors,
      shapes: ['square'],
      scalar: 1.1,
      gravity: 0.85,
      ticks: 200,
      disableForReducedMotion: true,
    });

    confetti({
      particleCount: 15,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.25 },
      colors,
      shapes: ['square'],
      scalar: 1.1,
      gravity: 0.85,
      ticks: 200,
      disableForReducedMotion: true,
    });

    // Gentle top flutter
    confetti({
      particleCount: 12,
      angle: 90,
      spread: 80,
      origin: { x: Math.random() * 0.6 + 0.2, y: -0.05 },
      colors,
      shapes: ['square'],
      scalar: 1.0,
      gravity: 0.75,
      ticks: 220,
      disableForReducedMotion: true,
    });
  }, 220);
}

export function clearConfetti(): void {
  try {
    confetti.reset();
  } catch (e) {
    // Canvas confetti might not be active
  }
}

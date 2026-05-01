import { defineSound, ensureReady } from "@web-kits/audio";
import type { SoundId } from "@/lib/types";

const buttonPress = defineSound({
  source: { type: "sine", frequency: { start: 320, end: 220 } },
  envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.015 },
  gain: 0.18,
});

const pop = defineSound({
  source: { type: "sine", frequency: { start: 400, end: 150 } },
  envelope: { decay: 0.05 },
  gain: 0.35,
});

const tabSwitch = defineSound({
  source: { type: "triangle", frequency: { start: 540, end: 360 } },
  envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 },
  gain: 0.14,
});

const toggleTick = defineSound({
  source: { type: "square", frequency: { start: 620, end: 420 } },
  envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.015 },
  gain: 0.1,
});

const synthesizedSounds: Partial<Record<SoundId, () => void>> = {
  pop,
};

const interactionSounds = {
  button: buttonPress,
  tab: tabSwitch,
  toggle: toggleTick,
} as const;

let audioReadyPromise: Promise<void> | null = null;

function ensureAudioReady() {
  audioReadyPromise ??= ensureReady().catch((error) => {
    audioReadyPromise = null;
    throw error;
  });

  return audioReadyPromise;
}

export function playInteractionSound(kind: keyof typeof interactionSounds) {
  void ensureAudioReady()
    .then(() => {
      interactionSounds[kind]();
    })
    .catch(() => {
      // Ignore autoplay/setup failures so UI interactions stay responsive.
    });
}

export async function playUiSound(soundId: SoundId, fallbackFile?: string) {
  const sound = synthesizedSounds[soundId];

  if (sound) {
    await ensureAudioReady();
    sound();
    return;
  }

  if (!fallbackFile) {
    return;
  }

  const audio = new Audio(fallbackFile);
  await audio.play();
}

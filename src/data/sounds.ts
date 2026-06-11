import { SoundOption } from '../types';

export const SOUND_LIST: SoundOption[] = [
  { key: 'school_bell',        label: '🔔 School Bell' },
  { key: 'princess_bell',      label: '👸 Princess Bell' },
  { key: 'pokemon_colo_heal',  label: '🎒 Pokémon Heal' },
];

export const SOUND_DATA: Record<string, string> = {
  "school_bell": "https://raw.githubusercontent.com/Bl3551nq/bell-sound/main/school_bell.mp3",
  "princess_bell": "https://raw.githubusercontent.com/Bl3551nq/bell-sound/main/princess_bell.mp3",
  "pokemon_colo_heal": "https://raw.githubusercontent.com/Bl3551nq/bell-sound/main/pokemon_colo_heal.mp3"
};

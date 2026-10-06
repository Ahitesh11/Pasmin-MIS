import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isSoundEnabled, onSoundChange, playSuccess, setSoundEnabled } from '../../utils/sound';

/** Sound on/off. `variant="icon"` for compact rows, `"menu"` for a labelled menu item. */
export const SoundToggle: React.FC<{ variant?: 'icon' | 'menu' }> = ({ variant = 'icon' }) => {
  const [on, setOn] = useState(isSoundEnabled);

  useEffect(() => {
    const off = onSoundChange(setOn);
    return () => {
      off();
    };
  }, []);

  const toggle = () => {
    setSoundEnabled(!on);
    if (!on) playSuccess(); // confirm sound is back on
  };

  const Icon = on ? Volume2 : VolumeX;
  const label = on ? 'Sound on' : 'Sound off';

  if (variant === 'menu') {
    return (
      <button
        role="menuitem"
        onClick={toggle}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
      >
        <Icon className="w-4 h-4" />
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-lg transition-colors cursor-pointer ${
        on ? 'text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
      }`}
      title={label}
      aria-label={label}
      aria-pressed={on}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};

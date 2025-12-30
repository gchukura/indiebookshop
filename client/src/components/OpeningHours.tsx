import React from 'react';

interface OpeningHoursProps {
  openingHours: {
    open_now: boolean;
    weekday_text: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
}

export const OpeningHours: React.FC<OpeningHoursProps> = ({ openingHours }) => {
  const { open_now, weekday_text } = openingHours;

  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const today = new Date().getDay();
  // Google's weekday_text uses Monday as index 0, so we need to adjust
  // weekday_text[0] = Monday, weekday_text[1] = Tuesday, etc.
  // today: 0=Sunday, 1=Monday, 2=Tuesday, etc.
  // So if today is Monday (1), we want weekday_text[0]
  const todayIndex = today === 0 ? 6 : today - 1; // Sunday becomes index 6

  return (
    <div className="space-y-3">
      {/* Open Now Indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${open_now ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className={`font-semibold ${open_now ? 'text-green-700' : 'text-red-700'}`}>
          {open_now ? 'Open Now' : 'Closed'}
        </span>
      </div>

      {/* Hours List */}
      <div className="space-y-1.5">
        {weekday_text.map((dayHours, index) => {
          // Parse "Monday: 10:00 AM – 7:00 PM" format
          const [day, hours] = dayHours.split(': ');
          const isToday = index === todayIndex;

          return (
            <div
              key={day}
              className={`flex justify-between text-sm ${
                isToday ? 'font-semibold text-[#5F4B32]' : 'text-stone-600'
              }`}
            >
              <span>{day}</span>
              <span>{hours || 'Closed'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

interface DateOfBirthInputProps {
  id?: string;
  value: string; // Stored format, typically ISO YYYY-MM-DD
  onChange: (isoDate: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

/**
 * Converts an ISO string (YYYY-MM-DD) or other date string into MM/DD/YYYY.
 */
function toMmDdYyyy(val: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(isoMatch[2]).padStart(2, '0');
    const d = String(isoMatch[3]).padStart(2, '0');
    return `${m}/${d}/${y}`;
  }
  const slashMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (slashMatch) {
    const m = String(slashMatch[1]).padStart(2, '0');
    const d = String(slashMatch[2]).padStart(2, '0');
    const y = slashMatch[3];
    return `${m}/${d}/${y}`;
  }
  return trimmed;
}

/**
 * Converts MM/DD/YYYY to ISO YYYY-MM-DD if valid.
 */
function toIsoDate(mmDdYyyy: string): string | null {
  if (!mmDdYyyy) return null;
  const match = mmDdYyyy.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  const currentYear = new Date().getFullYear();
  if (month < 1 || month > 12) return null;
  if (year < 1900 || year > currentYear + 1) return null;

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const DateOfBirthInput: React.FC<DateOfBirthInputProps> = ({
  id = 'input-birthdate',
  value,
  onChange,
  className = '',
  placeholder = 'mm/dd/yyyy',
  required = false,
}) => {
  const [textValue, setTextValue] = useState<string>(() => toMmDdYyyy(value));
  const [error, setError] = useState<string>('');
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  // Synchronize when the external value prop changes (e.g. loading a different student record)
  useEffect(() => {
    const formatted = toMmDdYyyy(value);
    // Only update if external value represents a different date than currently in input
    const currentIso = toIsoDate(textValue);
    if (formatted && value && currentIso !== value) {
      setTextValue(formatted);
      setError('');
    } else if (!value && textValue && !currentIso) {
      // External reset
      setTextValue('');
      setError('');
    }
  }, [value]);

  const validateAndEmit = (inputStr: string) => {
    const trimmed = inputStr.trim();
    if (!trimmed) {
      setError('');
      onChange('');
      return;
    }

    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const month = parseInt(match[1], 10);
      const day = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      const currentYear = new Date().getFullYear();

      if (month < 1 || month > 12) {
        setError('Month must be between 01 and 12');
        return;
      }
      if (year < 1900 || year > currentYear + 1) {
        setError(`Year must be between 1900 and ${currentYear}`);
        return;
      }
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day < 1 || day > daysInMonth) {
        setError(`Day must be between 01 and ${daysInMonth} for month ${month}`);
        return;
      }

      // Complete and valid date
      setError('');
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      onChange(iso);
    } else {
      if (trimmed.length === 10) {
        setError('Please use MM/DD/YYYY format');
      } else {
        setError('');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow deleting / backspace freely without any automatic character reinsertion
    if (raw.length < textValue.length) {
      setTextValue(raw);
      validateAndEmit(raw);
      return;
    }

    // Filter to digits and slashes, max 10 chars
    const clean = raw.replace(/[^\d/]/g, '').slice(0, 10);

    // Smooth auto-formatting:
    // If typing 2 digits (MM), append /
    // If typing MM/DD (5 chars with 2 digits after slash), append /
    // If pasting 8 raw digits (MMDDYYYY), format as MM/DD/YYYY
    let formatted = clean;
    if (/^\d{2}$/.test(clean)) {
      formatted = `${clean}/`;
    } else if (/^\d{2}\/\d{2}$/.test(clean)) {
      formatted = `${clean}/`;
    } else if (/^\d{8}$/.test(clean)) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
    }

    setTextValue(formatted);
    validateAndEmit(formatted);
  };

  const handleBlur = () => {
    const trimmed = textValue.trim();
    if (!trimmed) {
      setError('');
      onChange('');
      return;
    }

    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) {
      setError('Please enter a complete date in MM/DD/YYYY format');
      return;
    }

    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const currentYear = new Date().getFullYear();

    if (month < 1 || month > 12) {
      setError('Month must be between 01 and 12');
      return;
    }
    if (year < 1900 || year > currentYear + 1) {
      setError(`Year must be between 1900 and ${currentYear}`);
      return;
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      setError(`Day must be between 01 and ${daysInMonth} for month ${month}`);
      return;
    }

    // Format neatly with 2-digit month and day on blur
    const padded = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
    setTextValue(padded);
    setError('');
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
  };

  // Calendar picker integration
  const handleCalendarClick = () => {
    if (hiddenDateInputRef.current) {
      if (typeof hiddenDateInputRef.current.showPicker === 'function') {
        try {
          hiddenDateInputRef.current.showPicker();
          return;
        } catch {
          // Fallback if browser security blocks showPicker call
        }
      }
      hiddenDateInputRef.current.focus();
    }
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedIso = e.target.value; // Native date input returns YYYY-MM-DD
    if (!selectedIso) return;

    const parts = selectedIso.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      const mmDdYyyy = `${m}/${d}/${y}`;
      setTextValue(mmDdYyyy);
      setError('');
      onChange(selectedIso);
    }
  };

  // Value for the native date picker popup
  const currentIso = toIsoDate(textValue) || (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '');

  return (
    <div className="w-full">
      <div className="relative flex items-center w-full">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          required={required}
          placeholder={placeholder}
          value={textValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={`w-full px-3 py-2 pr-10 border ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-600'
          } rounded-xl text-sm font-semibold text-gray-900 placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:outline-none bg-white transition-colors ${className}`}
        />

        {/* Calendar button and picker trigger */}
        <div className="absolute right-2.5 flex items-center justify-center w-7 h-7">
          <button
            type="button"
            tabIndex={-1}
            onClick={handleCalendarClick}
            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Open calendar picker"
            aria-label="Open calendar picker"
          >
            <Calendar className="w-4 h-4 text-blue-700" />
          </button>
          <input
            ref={hiddenDateInputRef}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            value={currentIso}
            onChange={handleDatePickerChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-red-600 font-medium mt-1 leading-tight">{error}</p>
      )}
    </div>
  );
};

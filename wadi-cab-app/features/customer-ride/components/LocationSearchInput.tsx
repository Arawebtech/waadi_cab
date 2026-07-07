'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { customerBookingApi } from '../api/booking';
import type { Location, PlaceSuggestion } from '../types';

interface Props {
  placeholder: string;
  value?: Location | null;
  onSelect: (loc: Location) => void;
  origin?: { lat: number; lng: number };
  showGpsButton?: boolean;
  onUseGps?: () => void;
  gpsLoading?: boolean;
}

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

function locationKey(loc?: Location | null) {
  if (!loc) return '';
  return `${loc.lat}|${loc.lng}|${loc.address}`;
}

export function LocationSearchInput({
  placeholder,
  value,
  onSelect,
  origin,
  showGpsButton = false,
  onUseGps,
  gpsLoading = false,
}: Props) {
  const [query, setQuery] = useState(value?.address ?? '');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const committedKeyRef = useRef(locationKey(value));
  const skipSearchRef = useRef(false);
  const requestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const originRef = useRef(origin);
  originRef.current = origin;

  // Sync when parent commits a new location (GPS, restore, selection)
  useEffect(() => {
    const key = locationKey(value);
    if (!key || key === committedKeyRef.current) return;
    committedKeyRef.current = key;
    skipSearchRef.current = true;
    setQuery(value!.address);
    setResults([]);
    setOpen(false);
    requestIdRef.current += 1;
  }, [value]);

  // Debounced search — origin read from ref so GPS updates don't retrigger
  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    if (trimmed === value?.address && committedKeyRef.current) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const id = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await customerBookingApi.searchPlaces(trimmed, originRef.current);
        if (requestIdRef.current !== id) return;
        setResults(items);
        setOpen(items.length > 0);
      } catch {
        if (requestIdRef.current !== id) return;
        setResults([]);
        setOpen(false);
      } finally {
        if (requestIdRef.current === id) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, value?.address]);

  const handleChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (text.trim() === value?.address) {
        setResults([]);
        setOpen(false);
      }
    },
    [value?.address]
  );

  const handleSelect = useCallback(
    async (item: PlaceSuggestion) => {
      let lat = item.lat;
      let lng = item.lng;

      if (lat == null || lng == null) {
        try {
          const geo = await customerBookingApi.geocodeAddress(item.description);
          lat = geo.lat;
          lng = geo.lng;
        } catch {
          return;
        }
      }

      const loc: Location = {
        address: item.description,
        lat,
        lng,
        placeId: item.placeId,
      };

      skipSearchRef.current = true;
      committedKeyRef.current = locationKey(loc);
      setQuery(item.description);
      setResults([]);
      setOpen(false);
      requestIdRef.current += 1;
      onSelect(loc);
      inputRef.current?.blur();
    },
    [onSelect]
  );

  const showDropdown = open && results.length > 0 && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100">
        <Search className="h-5 w-5 shrink-0 text-slate-400" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            const trimmed = query.trim();
            if (
              trimmed.length >= MIN_QUERY_LENGTH &&
              trimmed !== value?.address &&
              results.length > 0
            ) {
              setOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
        />

        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}

        {showGpsButton && onUseGps && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onUseGps();
            }}
            disabled={gpsLoading}
            aria-label="Use current location"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
          >
            {gpsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {showDropdown && (
        <ul className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto overscroll-contain rounded-2xl border border-slate-100 bg-white py-1 shadow-xl">
          {results.map((item) => (
            <li key={item.placeId}>
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(item)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{item.mainText}</p>
                  {item.secondaryText && (
                    <p className="truncate text-xs text-slate-500">{item.secondaryText}</p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

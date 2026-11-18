"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import type { AirportSuggestion } from "@/types/flight";
import { cn } from "@/lib/utils";

export function AirportInput({
  label,
  placeholder,
  value,
  defaultText,
  onChange,
  error,
  id,
}: {
  label: string;
  placeholder: string;
  value: string;
  defaultText?: string;
  onChange: (iata: string, label: string) => void;
  error?: string;
  id?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [text, setText] = useState(defaultText ?? "");
  const [lastDefaultText, setLastDefaultText] = useState(defaultText);
  const [items, setItems] = useState<AirportSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(Boolean(value && defaultText));
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Adjust state during render when the parent supplies a new default (React's
  // recommended alternative to syncing props to state in an effect).
  if (defaultText !== lastDefaultText) {
    setLastDefaultText(defaultText);
    if (defaultText !== undefined) setText(defaultText);
  }

  useEffect(() => {
    if (selected) return;
    const query = text.trim();
    if (query.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/airports?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as { airports?: AirportSuggestion[] };
        setItems(payload.airports ?? []);
        setOpen(true);
        setHighlight(0);
      } catch {
        /* aborted or offline: keep previous suggestions */
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, selected]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function choose(item: AirportSuggestion) {
    const label = `${item.city} (${item.iataCode})`;
    setText(label);
    setSelected(true);
    setOpen(false);
    onChange(item.iataCode, label);
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[11px] font-semibold tracking-wide text-navy-500 uppercase"
      >
        {label}
      </label>
      <div className="relative">
        <MapPin
          aria-hidden
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
        />
        <input
          id={inputId}
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${inputId}-listbox`}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            setSelected(false);
            if (next.trim().length < 2) setItems([]);
            if (next.trim() === "") onChange("", "");
          }}
          onFocus={() => {
            if (items.length > 0 && !selected) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (!open) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((index) => Math.min(index + 1, items.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              const item = items[highlight];
              if (item) choose(item);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className={cn(
            "h-12 w-full rounded-xl border bg-white ps-9 pe-9 text-sm font-medium text-navy-900 shadow-xs transition placeholder:font-normal placeholder:text-navy-400",
            error
              ? "border-red-400 focus:ring-2 focus:ring-red-100"
              : "border-navy-200 hover:border-navy-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100",
            "focus:outline-none",
          )}
        />
        {loading ? (
          <Loader2
            aria-hidden
            className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-sky-600"
          />
        ) : value ? (
          <span className="absolute end-3 top-1/2 -translate-y-1/2 rounded-md bg-navy-100 px-1.5 py-0.5 text-[10px] font-bold text-navy-700">
            {value}
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}

      {open && text.trim().length >= 2 && items.length > 0 ? (
        <ul
          id={`${inputId}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-navy-100 bg-white p-1.5 shadow-lifted"
        >
          {items.map((item, index) => (
            <li key={`${item.iataCode}-${index}`} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(item)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-start transition",
                  index === highlight ? "bg-sky-50" : "hover:bg-navy-50",
                )}
              >
                <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded-md bg-navy-900 text-[11px] font-bold text-white">
                  {item.iataCode}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy-900">
                    {item.city}
                  </span>
                  <span className="block truncate text-xs text-navy-500">
                    {item.name} · {item.country}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

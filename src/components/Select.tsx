"use client";
import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

/**
 * Dropdown in the site's colours (native <select> menus use the phone/OS colours and can't be styled).
 * Works controlled (value + onChange) or inside a plain <form> (name + defaultValue).
 */
export default function Select({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  options,
  placeholder = "Select",
  className = "",
  ariaLabel,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const autoId = useId();
  const btnId = id || `sel-${autoId}`;
  const listId = `${btnId}-list`;
  const [inner, setInner] = useState(defaultValue);
  const current = value !== undefined ? value : inner;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [up, setUp] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === current);

  function choose(v: string) {
    if (value === undefined) setInner(v);
    onChange?.(v);
    setOpen(false);
    btn.current?.focus();
  }

  function openList() {
    const r = btn.current?.getBoundingClientRect();
    setUp(Boolean(r && window.innerHeight - r.bottom < 280 && r.top > 280));
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  }

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // keep the active option in view
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[active]) choose(options[active].value);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1) {
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  }

  return (
    <div ref={wrap} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={current} />}
      <button
        ref={btn}
        id={btnId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 text-left text-base outline-none transition ${
          open ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-300 hover:border-slate-400"
        } focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-100`}
      >
        <span className={`truncate ${selected ? "text-slate-900" : "text-slate-400"}`}>{selected ? selected.label : placeholder}</span>
        <svg
          className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
        >
          <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-labelledby={btnId}
          tabIndex={-1}
          onKeyDown={onKey}
          className={`absolute left-0 right-0 z-40 max-h-64 overflow-y-auto rounded-lg border border-slate-300 bg-white p-1.5 shadow-lg shadow-slate-900/10 ${
            up ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {options.map((o, i) => {
            const isSel = o.value === current;
            return (
              <li
                key={o.value}
                data-i={i}
                role="option"
                aria-selected={isSel}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o.value)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-base ${
                  i === active ? "bg-brand-50" : ""
                } ${isSel ? "font-semibold text-brand-700" : "text-slate-800"}`}
              >
                <span className="truncate">{o.label}</span>
                {isSel && (
                  <svg className="h-4 w-4 shrink-0 text-brand-600" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

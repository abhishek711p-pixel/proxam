"use client";
import { useState } from "react";
import McAdminForm, { type McFormValues } from "./McAdminForm";

export default function NewMasterclass({ initial }: { initial: McFormValues }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button className="btn-primary btn-sm" onClick={() => setOpen(!open)}>
        {open ? "Close" : "New masterclass"}
      </button>
      {open && (
        <div className="mt-4">
          <McAdminForm initial={initial} onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

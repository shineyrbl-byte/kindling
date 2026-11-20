"use client";
import { COLORS } from "@/lib/catalog";

export default function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <fieldset className="colors">
      <legend className="label">Your color</legend>
      {COLORS.map((c) => (
        <label key={c} className={`swatch${value === c ? " on" : ""}`} style={{ background: c }}>
          <input type="radio" name="color" value={c} checked={value === c} onChange={() => onChange(c)} aria-label={`Color ${c}`} />
        </label>
      ))}
    </fieldset>
  );
}

import Picker from "react-mobile-picker";
import { QuantityPickerProps } from "../types";

export function QuantityPicker({ value, onChange }: QuantityPickerProps) {
  // Generate 1 to 100 as strings
  const quantity = Array.from({ length: 100 }, (_, i) => (i + 1).toString());

  return (
    <Picker
      value={{ quantity: value.toString() }}
      onChange={val => onChange(Number(val.quantity))}
      height={150}
      itemHeight={36}
    />
  );
}

import porridge from "@/assets/porridge.jpg";
import puffpuff from "@/assets/puffpuff.jpg";
import koose from "@/assets/koose.jpg";
import groundnut from "@/assets/groundnut.jpg";
import milk from "@/assets/milk.jpg";

const MAP: { match: string; src: string }[] = [
  { match: "porridge", src: porridge },
  { match: "puff", src: puffpuff },
  { match: "koose", src: koose },
  { match: "groundnut", src: groundnut },
  { match: "milk", src: milk },
];

export function productImage(name: string): string {
  const lower = name.toLowerCase();
  return MAP.find((entry) => lower.includes(entry.match))?.src ?? porridge;
}

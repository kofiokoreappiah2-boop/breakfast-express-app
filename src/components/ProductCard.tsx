import { useState } from "react";
import { toast } from "sonner";
import { QuantityStepper } from "@/components/QuantityStepper";
import { useCart } from "@/lib/cart";
import { formatCedis } from "@/lib/format";
import { productImage } from "@/lib/product-images";

export type Product = {
  id: string;
  name: string;
  description: string;
  size: string | null;
  price: number;
  available: boolean;
  imageUrl?: string | null;
};

export function ProductCard({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const label = product.size ? `${product.name} — ${product.size}` : product.name;

  return (
    <article className="surface-card flex flex-col overflow-hidden">
      <img
        src={product.imageUrl ?? productImage(product.name)}
        alt={label}
        loading="lazy"
        width={800}
        height={800}
        className="h-40 w-full object-cover sm:h-44"
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-snug">{product.name}</h3>
          {product.size ? (
            <span className="mt-1 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
              {product.size}
            </span>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        </div>

        <p className="font-display text-2xl font-bold text-primary">
          {formatCedis(product.price)}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <QuantityStepper value={quantity} onChange={setQuantity} label={label} />
          <button
            type="button"
            disabled={!product.available}
            onClick={() => {
              addItem(
                {
                  productId: product.id,
                  name: product.name,
                  size: product.size,
                  price: product.price,
                },
                quantity,
              );
              toast.success(`${label} × ${quantity} added to cart`);
              setQuantity(1);
            }}
            className="h-11 flex-1 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
          >
            {product.available ? "Add to cart" : "Sold out"}
          </button>
        </div>
      </div>
    </article>
  );
}

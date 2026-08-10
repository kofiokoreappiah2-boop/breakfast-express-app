import { useQuery } from "@tanstack/react-query";
import { getStorefront, type Storefront } from "@/lib/storefront.functions";

export function useStorefront() {
  return useQuery<Storefront>({
    queryKey: ["storefront"],
    queryFn: () => getStorefront(),
    staleTime: 30_000,
  });
}

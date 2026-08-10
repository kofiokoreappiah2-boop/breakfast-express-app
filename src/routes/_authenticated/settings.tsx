import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  deleteProduct,
  deleteWindowException,
  getControlCenter,
  saveBusinessSettings,
  saveLocation,
  saveProduct,
  saveWindow,
  saveWindowException,
  uploadImage,
  type AdminLocation,
  type AdminProduct,
  type AdminWindow,
  type ControlCenterData,
} from "@/lib/control-center.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Business Control Center — Einyornose" },
      { name: "description", content: "Manage the Einyornose menu, delivery and store settings." },
      { property: "og:title", content: "Business Control Center — Einyornose" },
      {
        property: "og:description",
        content: "Manage the Einyornose menu, delivery and store settings.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ControlCenterPage,
});

const input =
  "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary";
const label = "block text-sm font-semibold";
const button =
  "inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60";
const ghost =
  "inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium";

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function ControlCenterPage() {
  const queryClient = useQueryClient();
  const load = useServerFn(getControlCenter);
  const query = useQuery<ControlCenterData>({ queryKey: ["control-center"], queryFn: () => load() });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["control-center"] });
    void queryClient.invalidateQueries({ queryKey: ["storefront"] });
  };

  if (query.isLoading) {
    return <p className="p-8 text-center text-muted-foreground">Loading control center…</p>;
  }

  if (query.error || !query.data) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Administrator access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only staff accounts with administrator access can open the control center.
        </p>
        <Link to="/admin" className={`${ghost} mt-6`}>
          Back to orders
        </Link>
      </div>
    );
  }

  const data = query.data;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold sm:text-2xl">
              Business control center
            </h1>
            <p className="text-xs text-muted-foreground">
              Menu, delivery, payments and homepage content.
            </p>
          </div>
          <Link to="/admin" className={`${ghost} shrink-0`}>
            Orders
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <StoreSection settings={data.settings} onSaved={refresh} />
        <MenuSection products={data.products} onSaved={refresh} />
        <LocationsSection locations={data.locations} onSaved={refresh} />
        <WindowsSection windows={data.windows} onSaved={refresh} />
      </main>
    </div>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-5">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StoreSection({
  settings,
  onSaved,
}: {
  settings: ControlCenterData["settings"];
  onSaved: () => void;
}) {
  const save = useServerFn(saveBusinessSettings);
  const upload = useServerFn(uploadImage);
  const [form, setForm] = useState(settings);

  useEffect(() => setForm(settings), [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { heroImageUrl: _ignored, ...rest } = form;
      await save({ data: rest });
    },
    onSuccess: () => {
      toast.success("Settings saved");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save settings."),
  });

  const heroUpload = useMutation({
    mutationFn: async (file: File) => {
      await upload({
        data: {
          target: "hero",
          fileName: file.name,
          contentType: file.type,
          base64: await fileToBase64(file),
        },
      });
    },
    onSuccess: () => {
      toast.success("Homepage image updated");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not upload the image."),
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Card title="Store, payments & homepage" description="Controls what customers see and can do.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Toggle
          label="Accepting orders"
          checked={form.acceptingOrders}
          onChange={(v) => set("acceptingOrders", v)}
        />
        <label className={label}>
          Closed message
          <input
            className={`${input} mt-1`}
            value={form.closedMessage}
            onChange={(e) => set("closedMessage", e.target.value)}
          />
        </label>
        <label className={label}>
          Business name
          <input
            className={`${input} mt-1`}
            value={form.businessName}
            onChange={(e) => set("businessName", e.target.value)}
          />
        </label>
        <label className={label}>
          Parent business
          <input
            className={`${input} mt-1`}
            value={form.parentName}
            onChange={(e) => set("parentName", e.target.value)}
          />
        </label>
        <label className={label}>
          Contact phone
          <input
            className={`${input} mt-1`}
            value={form.contactPhone}
            onChange={(e) => set("contactPhone", e.target.value)}
          />
        </label>
        <label className={label}>
          WhatsApp number
          <input
            className={`${input} mt-1`}
            value={form.whatsappNumber}
            onChange={(e) => set("whatsappNumber", e.target.value)}
          />
        </label>
        <Toggle
          label="Mobile Money enabled"
          checked={form.momoEnabled}
          onChange={(v) => set("momoEnabled", v)}
        />
        <Toggle
          label="Payment on delivery enabled"
          checked={form.podEnabled}
          onChange={(v) => set("podEnabled", v)}
        />
        <label className={label}>
          MoMo number
          <input
            className={`${input} mt-1`}
            value={form.momoNumber}
            onChange={(e) => set("momoNumber", e.target.value)}
          />
        </label>
        <label className={label}>
          MoMo account name
          <input
            className={`${input} mt-1`}
            value={form.momoAccountName}
            onChange={(e) => set("momoAccountName", e.target.value)}
          />
        </label>
        <label className={label}>
          Hero heading
          <input
            className={`${input} mt-1`}
            value={form.heroHeading}
            onChange={(e) => set("heroHeading", e.target.value)}
          />
        </label>
        <label className={label}>
          Hero subheading
          <input
            className={`${input} mt-1`}
            value={form.heroSubheading}
            onChange={(e) => set("heroSubheading", e.target.value)}
          />
        </label>
        <Toggle
          label="Show promo banner"
          checked={form.promoEnabled}
          onChange={(v) => set("promoEnabled", v)}
        />
        <label className={label}>
          Promo message
          <input
            className={`${input} mt-1`}
            value={form.promoMessage}
            onChange={(e) => set("promoMessage", e.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {settings.heroImageUrl ? (
          <img
            src={settings.heroImageUrl}
            alt="Current homepage hero"
            className="h-16 w-24 rounded-lg object-cover"
          />
        ) : null}
        <label className={`${ghost} cursor-pointer`}>
          {heroUpload.isPending ? "Uploading…" : "Upload hero image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) heroUpload.mutate(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <button
        type="button"
        className={`${button} mt-4`}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Saving…" : "Save settings"}
      </button>
    </Card>
  );
}

function Toggle({
  label: text,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex h-11 items-center gap-3 text-sm font-semibold">
      <input
        type="checkbox"
        className="h-5 w-5 accent-[var(--color-primary)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {text}
    </label>
  );
}

const emptyProduct = {
  name: "",
  description: "",
  size: "",
  price: 0,
  available: true,
  sortOrder: 0,
};

function MenuSection({ products, onSaved }: { products: AdminProduct[]; onSaved: () => void }) {
  const save = useServerFn(saveProduct);
  const remove = useServerFn(deleteProduct);
  const upload = useServerFn(uploadImage);
  const [draft, setDraft] = useState<(typeof emptyProduct) & { id?: string }>(emptyProduct);

  const saveMutation = useMutation({
    mutationFn: async () =>
      save({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          name: draft.name,
          description: draft.description,
          size: draft.size.trim() === "" ? null : draft.size,
          price: Number(draft.price),
          available: draft.available,
          sortOrder: Number(draft.sortOrder),
        },
      }),
    onSuccess: () => {
      toast.success("Menu item saved");
      setDraft(emptyProduct);
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the item."),
  });

  const imageMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) =>
      upload({
        data: {
          target: "product",
          productId: id,
          fileName: file.name,
          contentType: file.type,
          base64: await fileToBase64(file),
        },
      }),
    onSuccess: () => {
      toast.success("Image updated");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not upload the image."),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Item hidden from the storefront");
      onSaved();
    },
    onError: () => toast.error("Could not remove the item."),
  });

  return (
    <Card title="Menu" description="Availability changes show on the storefront immediately.">
      <ul className="space-y-3">
        {products.map((product) => (
          <li key={product.id} className="rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center gap-3">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-14 w-14 rounded-lg object-cover"
                />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-lg bg-secondary text-xs">
                  No image
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {product.name}
                  {product.size ? ` (${product.size})` : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  GH₵ {product.price.toFixed(2)} · sort {product.sortOrder} ·{" "}
                  {product.available ? "Available" : "Hidden"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={ghost}
                  onClick={() =>
                    setDraft({
                      id: product.id,
                      name: product.name,
                      description: product.description,
                      size: product.size ?? "",
                      price: product.price,
                      available: product.available,
                      sortOrder: product.sortOrder,
                    })
                  }
                >
                  Edit
                </button>
                <label className={`${ghost} cursor-pointer`}>
                  Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) imageMutation.mutate({ id: product.id, file });
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className={ghost}
                  onClick={() => removeMutation.mutate(product.id)}
                >
                  Hide
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-xl border border-dashed border-border p-4">
        <h3 className="font-semibold">{draft.id ? "Edit menu item" : "Add menu item"}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Name
            <input
              className={`${input} mt-1`}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label className={label}>
            Variant / size
            <input
              className={`${input} mt-1`}
              value={draft.size}
              onChange={(e) => setDraft({ ...draft, size: e.target.value })}
            />
          </label>
          <label className={`${label} sm:col-span-2`}>
            Description
            <input
              className={`${input} mt-1`}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
          <label className={label}>
            Price (GH₵)
            <input
              type="number"
              step="0.5"
              min="0"
              className={`${input} mt-1`}
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
            />
          </label>
          <label className={label}>
            Sort order
            <input
              type="number"
              min="0"
              className={`${input} mt-1`}
              value={draft.sortOrder}
              onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
            />
          </label>
          <Toggle
            label="Available"
            checked={draft.available}
            onChange={(v) => setDraft({ ...draft, available: v })}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className={button}
            disabled={saveMutation.isPending || draft.name.trim() === ""}
            onClick={() => saveMutation.mutate()}
          >
            {draft.id ? "Save changes" : "Add item"}
          </button>
          {draft.id ? (
            <button type="button" className={ghost} onClick={() => setDraft(emptyProduct)}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function LocationsSection({
  locations,
  onSaved,
}: {
  locations: AdminLocation[];
  onSaved: () => void;
}) {
  const save = useServerFn(saveLocation);
  const [draft, setDraft] = useState<{ id?: string; name: string; active: boolean; sortOrder: number }>({
    name: "",
    active: true,
    sortOrder: 0,
  });

  const mutation = useMutation({
    mutationFn: async (payload: { id?: string; name: string; active: boolean; sortOrder: number }) =>
      save({ data: payload }),
    onSuccess: () => {
      toast.success("Delivery location saved");
      setDraft({ name: "", active: true, sortOrder: 0 });
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the location."),
  });

  return (
    <Card
      title="Delivery locations"
      description="Disabled locations disappear from checkout but stay on past orders."
    >
      <ul className="space-y-2">
        {locations.map((location) => (
          <li
            key={location.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
          >
            <span className="min-w-0 flex-1 truncate font-medium">{location.name}</span>
            <span className="text-sm text-muted-foreground">sort {location.sortOrder}</span>
            <button
              type="button"
              className={ghost}
              onClick={() => mutation.mutate({ ...location, active: !location.active })}
            >
              {location.active ? "Disable" : "Enable"}
            </button>
            <button type="button" className={ghost} onClick={() => setDraft({ ...location })}>
              Edit
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
        <input
          className={input}
          placeholder="Location name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <input
          type="number"
          min="0"
          className={input}
          value={draft.sortOrder}
          onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
        />
        <button
          type="button"
          className={button}
          disabled={draft.name.trim() === "" || mutation.isPending}
          onClick={() => mutation.mutate(draft)}
        >
          {draft.id ? "Save" : "Add"}
        </button>
      </div>
    </Card>
  );
}

const emptyWindow = { label: "", startTime: "06:30", endTime: "07:15", active: true, sortOrder: 0 };

function WindowsSection({ windows, onSaved }: { windows: AdminWindow[]; onSaved: () => void }) {
  const save = useServerFn(saveWindow);
  const saveException = useServerFn(saveWindowException);
  const removeException = useServerFn(deleteWindowException);
  const [draft, setDraft] = useState<(typeof emptyWindow) & { id?: string }>(emptyWindow);
  const [exceptionDate, setExceptionDate] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async (payload: (typeof emptyWindow) & { id?: string }) => save({ data: payload }),
    onSuccess: () => {
      toast.success("Delivery period saved");
      setDraft(emptyWindow);
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the period."),
  });

  const exceptionMutation = useMutation({
    mutationFn: async (payload: { windowId: string; date: string }) =>
      saveException({ data: { ...payload, available: false, note: "" } }),
    onSuccess: () => {
      toast.success("Date marked unavailable");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the date."),
  });

  const removeExceptionMutation = useMutation({
    mutationFn: async (id: string) => removeException({ data: { id } }),
    onSuccess: () => {
      toast.success("Date exception removed");
      onSaved();
    },
    onError: () => toast.error("Could not remove the date exception."),
  });

  return (
    <Card
      title="Delivery periods"
      description="Set the daily windows and block specific dates when you can't deliver."
    >
      <ul className="space-y-3">
        {windows.map((window) => (
          <li key={window.id} className="rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1 truncate font-medium">{window.label}</span>
              <span className="text-sm text-muted-foreground">
                {window.startTime}–{window.endTime} · sort {window.sortOrder}
              </span>
              <button
                type="button"
                className={ghost}
                onClick={() => {
                  const { exceptions: _ex, ...rest } = window;
                  mutation.mutate({ ...rest, active: !window.active });
                }}
              >
                {window.active ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                className={ghost}
                onClick={() => {
                  const { exceptions: _ex, ...rest } = window;
                  setDraft(rest);
                }}
              >
                Edit
              </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,200px)_auto]">
              <input
                type="date"
                className={input}
                value={exceptionDate[window.id] ?? ""}
                onChange={(e) =>
                  setExceptionDate({ ...exceptionDate, [window.id]: e.target.value })
                }
              />
              <button
                type="button"
                className={ghost}
                disabled={!exceptionDate[window.id]}
                onClick={() =>
                  exceptionMutation.mutate({
                    windowId: window.id,
                    date: exceptionDate[window.id] as string,
                  })
                }
              >
                Mark unavailable
              </button>
            </div>

            {window.exceptions.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {window.exceptions.map((exception) => (
                  <li
                    key={exception.id}
                    className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold"
                  >
                    {exception.date} {exception.available ? "available" : "unavailable"}
                    <button
                      type="button"
                      aria-label={`Remove exception on ${exception.date}`}
                      onClick={() => removeExceptionMutation.mutate(exception.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className={label}>
          Label shown to customers
          <input
            className={`${input} mt-1`}
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
        </label>
        <label className={label}>
          Sort order
          <input
            type="number"
            min="0"
            className={`${input} mt-1`}
            value={draft.sortOrder}
            onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
          />
        </label>
        <label className={label}>
          Start time
          <input
            type="time"
            className={`${input} mt-1`}
            value={draft.startTime}
            onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
          />
        </label>
        <label className={label}>
          End time
          <input
            type="time"
            className={`${input} mt-1`}
            value={draft.endTime}
            onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
          />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={button}
          disabled={draft.label.trim() === "" || mutation.isPending}
          onClick={() => mutation.mutate(draft)}
        >
          {draft.id ? "Save changes" : "Add period"}
        </button>
        {draft.id ? (
          <button type="button" className={ghost} onClick={() => setDraft(emptyWindow)}>
            Cancel
          </button>
        ) : null}
      </div>
    </Card>
  );
}

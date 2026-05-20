import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { X, UploadCloud, Loader2, GripVertical, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { COLOMBIA_CITIES } from "@/lib/colombia-cities";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slugify";
import { formatCOP } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type Property = Database["public"]["Tables"]["properties"]["Row"];
type PropertyType = Database["public"]["Enums"]["property_type"];
type ListingType = Database["public"]["Enums"]["listing_type"];
type PropertyStatus = Database["public"]["Enums"]["property_status"];

const PROPERTY_TYPES: PropertyType[] = ["apartamento","casa","local","oficina","lote","bodega"];
const STATUS_OPTIONS: PropertyStatus[] = ["disponible","vendido","arrendado","reservado"];
const SUGGESTED_AMENITIES = [
  "Parqueadero","Balcón","Piscina","Vigilancia 24h","Gimnasio","Ascensor",
  "Depósito","Terraza","Chimenea","Walk-in closet","Cocina integral","Cuarto de servicio",
];

const schema = z.object({
  title: z.string().trim().min(3, "Título mínimo 3 caracteres").max(200),
  description: z.string().trim().min(10, "Descripción mínimo 10 caracteres").max(5000),
  type: z.enum(["venta","arriendo"]),
  property_type: z.enum(["apartamento","casa","local","oficina","lote","bodega"]),
  price: z.number().positive("Precio requerido"),
  area_m2: z.number().positive("Área requerida"),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  city: z.string().min(1),
  neighborhood: z.string().max(200).optional(),
  address: z.string().max(300).optional(),
  slug: z.string().min(3, "Slug requerido").regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  amenities: z.array(z.string()),
  status: z.enum(["disponible","vendido","arrendado","reservado"]),
  is_featured: z.boolean(),
  images: z.array(z.string()),
  administration_fee: z.number().min(0).nullable().optional(),
  video_url: z.string().trim().url("URL inválida").or(z.literal("")).optional(),
  stratum: z.number().int().min(1).max(6).nullable().optional(),
  built_year: z.number().int().min(1800).max(2100).nullable().optional(),
  garages: z.number().int().min(0),
  storage_rooms: z.number().int().min(0),
});

export type PropertyFormValues = z.infer<typeof schema>;

interface Props {
  initial?: Property;
  mode: "create" | "edit";
}

const blank: PropertyFormValues = {
  title: "",
  description: "",
  type: "venta",
  property_type: "apartamento",
  price: 0,
  area_m2: 0,
  bedrooms: 0,
  bathrooms: 0,
  city: "Bogotá",
  neighborhood: "",
  address: "",
  slug: "",
  amenities: [],
  status: "disponible",
  is_featured: false,
  images: [],
  administration_fee: null,
  video_url: "",
  stratum: null,
  built_year: null,
  garages: 0,
  storage_rooms: 0,
};

function pathFromPublicUrl(url: string): string | null {
  const idx = url.indexOf("/property-images/");
  if (idx < 0) return null;
  return url.slice(idx + "/property-images/".length);
}

export function PropertyForm({ initial, mode }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<PropertyFormValues>(() =>
    initial
      ? {
          title: initial.title,
          description: initial.description,
          type: initial.type as ListingType,
          property_type: initial.property_type as PropertyType,
          price: Number(initial.price),
          area_m2: Number(initial.area_m2),
          bedrooms: initial.bedrooms,
          bathrooms: initial.bathrooms,
          city: initial.city,
          neighborhood: initial.neighborhood ?? "",
          address: initial.address ?? "",
          slug: initial.slug,
          amenities: initial.amenities ?? [],
          status: initial.status as PropertyStatus,
          is_featured: initial.is_featured,
          images: initial.images ?? [],
          administration_fee:
            initial.administration_fee != null ? Number(initial.administration_fee) : null,
          video_url: initial.video_url ?? "",
          stratum: initial.stratum ?? null,
          built_year: initial.built_year ?? null,
          garages: initial.garages ?? 0,
          storage_rooms: initial.storage_rooms ?? 0,
        }
      : blank
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [amenityInput, setAmenityInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cityOpen, setCityOpen] = useState(false);

  function update<K extends keyof PropertyFormValues>(key: K, val: PropertyFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  // Auto-slug from title
  useEffect(() => {
    if (!slugTouched) {
      setValues((v) => ({ ...v, slug: slugify(v.title) }));
    }
  }, [values.title, slugTouched]);

  // Verificar unicidad de slug al perder foco
  async function checkSlugUnique() {
    if (!values.slug) return;
    const { data } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", values.slug)
      .limit(1);
    if (data && data.length > 0 && data[0].id !== initial?.id) {
      setErrors((e) => ({ ...e, slug: "Slug ya existe, ajústalo" }));
    }
  }

  function addAmenity(value: string) {
    const v = value.trim();
    if (!v) return;
    if (values.amenities.includes(v)) return;
    update("amenities", [...values.amenities, v]);
    setAmenityInput("");
  }

  function removeAmenity(value: string) {
    update("amenities", values.amenities.filter((a) => a !== value));
  }

  // Image upload
  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < arr.length; i++) {
        const file = arr[i];
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const path = `${initial?.id ?? "draft"}/${fileName}`;
        const { error } = await supabase.storage
          .from("property-images")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("property-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
        setUploadProgress(Math.round(((i + 1) / arr.length) * 100));
      }
      update("images", [...values.images, ...uploaded]);
      toast.success(`${uploaded.length} imagen${uploaded.length === 1 ? "" : "es"} subida${uploaded.length === 1 ? "" : "s"}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al subir";
      toast.error(msg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function removeImage(url: string) {
    const path = pathFromPublicUrl(url);
    if (path) {
      await supabase.storage.from("property-images").remove([path]);
    }
    update("images", values.images.filter((u) => u !== url));
  }

  function moveImage(from: number, to: number) {
    if (to < 0 || to >= values.images.length) return;
    const next = [...values.images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update("images", next);
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: PropertyFormValues) => {
      if (mode === "create") {
        const { data, error } = await supabase
          .from("properties")
          .insert({
            title: payload.title,
            description: payload.description,
            type: payload.type,
            property_type: payload.property_type,
            price: payload.price,
            area_m2: payload.area_m2,
            bedrooms: payload.bedrooms,
            bathrooms: payload.bathrooms,
            city: payload.city,
            neighborhood: payload.neighborhood || null,
            address: payload.address || null,
            slug: payload.slug,
            amenities: payload.amenities,
            status: payload.status,
            is_featured: payload.is_featured,
            images: payload.images,
            administration_fee:
              payload.type === "venta" ? payload.administration_fee ?? null : null,
            video_url: payload.video_url || null,
            stratum: payload.stratum ?? null,
            built_year: payload.built_year ?? null,
            garages: payload.garages,
            storage_rooms: payload.storage_rooms,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("properties")
          .update({
            title: payload.title,
            description: payload.description,
            type: payload.type,
            property_type: payload.property_type,
            price: payload.price,
            area_m2: payload.area_m2,
            bedrooms: payload.bedrooms,
            bathrooms: payload.bathrooms,
            city: payload.city,
            neighborhood: payload.neighborhood || null,
            address: payload.address || null,
            slug: payload.slug,
            amenities: payload.amenities,
            status: payload.status,
            is_featured: payload.is_featured,
            images: payload.images,
            administration_fee:
              payload.type === "venta" ? payload.administration_fee ?? null : null,
            video_url: payload.video_url || null,
            stratum: payload.stratum ?? null,
            built_year: payload.built_year ?? null,
            garages: payload.garages,
            storage_rooms: payload.storage_rooms,
          })
          .eq("id", initial!.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Propiedad creada" : "Cambios guardados");
      qc.invalidateQueries({ queryKey: ["admin", "properties"] });
      navigate({ to: "/admin/propiedades" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path.join(".")] = issue.message;
      }
      setErrors(errs);
      toast.error(parsed.error.issues[0]?.message ?? "Revisa los campos");
      return;
    }
    saveMutation.mutate(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sección 1: Información básica */}
      <Card className="rounded-lg border-border p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Información básica</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={values.title}
              onChange={(e) => update("title", e.target.value)}
              className="mt-1.5"
              placeholder="Ej: Apartamento moderno en Chapinero"
            />
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              rows={4}
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              className="mt-1.5"
              placeholder="Detalles, acabados, ubicación, vistas…"
            />
            {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
          </div>
          <div>
            <Label>Tipo de operación *</Label>
            <Select value={values.type} onValueChange={(v) => update("type", v as ListingType)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="venta">Venta</SelectItem>
                <SelectItem value="arriendo">Arriendo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de inmueble *</Label>
            <Select value={values.property_type} onValueChange={(v) => update("property_type", v as PropertyType)}>
              <SelectTrigger className="mt-1.5 capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="price">Precio (COP) *</Label>
            <Input
              id="price"
              inputMode="numeric"
              value={values.price === 0 ? "" : new Intl.NumberFormat("es-CO").format(values.price)}
              onChange={(e) => {
                const clean = e.target.value.replace(/\D/g, "");
                update("price", clean ? Number(clean) : 0);
              }}
              className="mt-1.5"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted-foreground">{formatCOP(values.price)}</p>
            {errors.price && <p className="mt-1 text-xs text-destructive">{errors.price}</p>}
          </div>
          <div>
            <Label htmlFor="area">Área (m²) *</Label>
            <Input
              id="area"
              type="number"
              min={0}
              value={values.area_m2 || ""}
              onChange={(e) => update("area_m2", Number(e.target.value) || 0)}
              className="mt-1.5"
            />
            {errors.area_m2 && <p className="mt-1 text-xs text-destructive">{errors.area_m2}</p>}
          </div>
          <div>
            <Label htmlFor="bedrooms">Habitaciones</Label>
            <Input
              id="bedrooms"
              type="number"
              min={0}
              value={values.bedrooms}
              onChange={(e) => update("bedrooms", Math.max(0, Number(e.target.value) || 0))}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="bathrooms">Baños</Label>
            <Input
              id="bathrooms"
              type="number"
              min={0}
              value={values.bathrooms}
              onChange={(e) => update("bathrooms", Math.max(0, Number(e.target.value) || 0))}
              className="mt-1.5"
            />
          </div>
        </div>
      </Card>

      {/* Sección 2: Ubicación */}
      <Card className="rounded-lg border-border p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Ubicación</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Ciudad / Municipio</Label>
            <Popover open={cityOpen} onOpenChange={setCityOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={cityOpen}
                  className="mt-1.5 w-full justify-between font-normal"
                >
                  <span className="truncate">{values.city || "Selecciona municipio…"}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command
                  filter={(value, search) =>
                    value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                  }
                >
                  <CommandInput placeholder="Buscar municipio…" />
                  <CommandList>
                    <CommandEmpty>Sin resultados.</CommandEmpty>
                    <CommandGroup>
                      {COLOMBIA_CITIES.map((c) => {
                        const label = `${c.name}, ${c.department}`;
                        return (
                          <CommandItem
                            key={label}
                            value={label}
                            onSelect={() => {
                              update("city", c.name);
                              setCityOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                values.city === c.name ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span>{c.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {c.department}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="neighborhood">Barrio / Sector</Label>
            <Input
              id="neighborhood"
              value={values.neighborhood ?? ""}
              onChange={(e) => update("neighborhood", e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Dirección completa (privada, solo para mapa)</Label>
            <Input
              id="address"
              value={values.address ?? ""}
              onChange={(e) => update("address", e.target.value)}
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              No se muestra en la ficha pública; solo ubica el pin en el mapa.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={values.slug}
              onChange={(e) => { setSlugTouched(true); update("slug", slugify(e.target.value)); }}
              onBlur={checkSlugUnique}
              className="mt-1.5 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">/propiedades/{values.slug || "tu-propiedad"}</p>
            {errors.slug && <p className="mt-1 text-xs text-destructive">{errors.slug}</p>}
          </div>
        </div>
      </Card>

      {/* Sección 2.5: Detalles del inmueble */}
      <Card className="rounded-lg border-border p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Detalles del inmueble
        </h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Estrato</Label>
            <Select
              value={values.stratum != null ? String(values.stratum) : "none"}
              onValueChange={(v) =>
                update("stratum", v === "none" ? null : (Number(v) as PropertyFormValues["stratum"]))
              }
            >
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin especificar</SelectItem>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="built_year">Año de construcción</Label>
            <Input
              id="built_year"
              type="number"
              min={1800}
              max={2100}
              value={values.built_year ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                update("built_year", v === "" ? null : Number(v));
              }}
              className="mt-1.5"
              placeholder="Ej: 2018"
            />
          </div>
          <div>
            <Label htmlFor="garages">Garajes</Label>
            <Input
              id="garages"
              type="number"
              min={0}
              value={values.garages}
              onChange={(e) => update("garages", Math.max(0, Number(e.target.value) || 0))}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="storage_rooms">Depósitos</Label>
            <Input
              id="storage_rooms"
              type="number"
              min={0}
              value={values.storage_rooms}
              onChange={(e) => update("storage_rooms", Math.max(0, Number(e.target.value) || 0))}
              className="mt-1.5"
            />
          </div>
          {values.type === "venta" && (
            <div>
              <Label htmlFor="administration_fee">Administración mensual (COP)</Label>
              <Input
                id="administration_fee"
                inputMode="numeric"
                value={
                  values.administration_fee
                    ? new Intl.NumberFormat("es-CO").format(values.administration_fee)
                    : ""
                }
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, "");
                  update("administration_fee", clean ? Number(clean) : null);
                }}
                className="mt-1.5"
                placeholder="0"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {values.administration_fee
                  ? formatCOP(values.administration_fee)
                  : "Opcional — solo se muestra para Venta"}
              </p>
            </div>
          )}
          <div className={values.type === "venta" ? "" : "sm:col-span-2 lg:col-span-2"}>
            <Label htmlFor="video_url">URL de video (YouTube)</Label>
            <Input
              id="video_url"
              type="url"
              value={values.video_url ?? ""}
              onChange={(e) => update("video_url", e.target.value)}
              className="mt-1.5"
              placeholder="https://www.youtube.com/watch?v=…"
            />
            {errors.video_url && (
              <p className="mt-1 text-xs text-destructive">{errors.video_url}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Sección 3: Imágenes */}
      <Card className="rounded-lg border-border p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Imágenes</h2>
        <p className="mt-1 text-xs text-muted-foreground">La primera imagen se usa como portada.</p>

        <div
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:border-accent hover:bg-accent/5"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="mt-3 text-sm font-medium text-foreground">Subiendo… {uploadProgress}%</p>
              <Progress value={uploadProgress} className="mt-3 w-64" />
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Arrastra imágenes aquí o <span className="text-accent">haz clic</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP (sin límite de cantidad)</p>
            </>
          )}
        </div>

        {values.images.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {values.images.map((url, idx) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                <img src={url} alt={`Imagen ${idx + 1}`} className="h-full w-full object-cover" />
                {idx === 0 && (
                  <Badge className="absolute left-2 top-2 bg-amber-500 text-white hover:bg-amber-500">Portada</Badge>
                )}
                <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveImage(idx, idx - 1)} disabled={idx === 0}
                      className="rounded bg-background/90 p-1 text-foreground disabled:opacity-30">
                      <GripVertical className="h-3 w-3 -rotate-90" />
                    </button>
                    <button type="button" onClick={() => moveImage(idx, idx + 1)} disabled={idx === values.images.length - 1}
                      className="rounded bg-background/90 p-1 text-foreground disabled:opacity-30">
                      <GripVertical className="h-3 w-3 rotate-90" />
                    </button>
                  </div>
                  <button type="button" onClick={() => removeImage(url)}
                    className="rounded bg-destructive p-1 text-destructive-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Sección 4: Características */}
      <Card className="rounded-lg border-border p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Características</h2>

        <div className="mt-5">
          <Label htmlFor="amenity-input">Amenidades</Label>
          <div className="mt-1.5 flex flex-wrap gap-2 rounded-lg border border-input bg-background p-2">
            {values.amenities.map((a) => (
              <Badge key={a} variant="secondary" className="gap-1 rounded-md">
                {a}
                <button type="button" onClick={() => removeAmenity(a)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <input
              id="amenity-input"
              value={amenityInput}
              onChange={(e) => setAmenityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addAmenity(amenityInput);
                } else if (e.key === "Backspace" && !amenityInput && values.amenities.length) {
                  removeAmenity(values.amenities[values.amenities.length - 1]);
                }
              }}
              placeholder="Escribe y presiona Enter…"
              className="min-w-[160px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTED_AMENITIES.filter((a) => !values.amenities.includes(a)).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => addAmenity(a)}
                className="rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-accent hover:text-accent"
              >
                + {a}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="featured" className="text-sm font-medium">Propiedad destacada</Label>
              <p className="text-xs text-muted-foreground">Aparece en la home</p>
            </div>
            <Switch
              id="featured"
              checked={values.is_featured}
              onCheckedChange={(c) => update("is_featured", c)}
            />
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={values.status} onValueChange={(v) => update("status", v as PropertyStatus)}>
              <SelectTrigger className="mt-1.5 capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/propiedades" })}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saveMutation.isPending} className="rounded-lg">
          {saveMutation.isPending ? "Guardando…" : mode === "create" ? "Crear propiedad" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

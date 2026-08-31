/**
 * Listado curado de municipios principales de Colombia.
 * Incluye capitales departamentales y los municipios con mayor actividad
 * inmobiliaria en Cundinamarca y zonas metropolitanas.
 */
export interface ColombiaCity {
  name: string;
  department: string;
}

export const COLOMBIA_CITIES: ColombiaCity[] = [
  // Capitales departamentales
  { name: "Bogotá", department: "Cundinamarca" },
  { name: "Medellín", department: "Antioquia" },
  { name: "Cali", department: "Valle del Cauca" },
  { name: "Barranquilla", department: "Atlántico" },
  { name: "Cartagena", department: "Bolívar" },
  { name: "Cúcuta", department: "Norte de Santander" },
  { name: "Bucaramanga", department: "Santander" },
  { name: "Pereira", department: "Risaralda" },
  { name: "Santa Marta", department: "Magdalena" },
  { name: "Ibagué", department: "Tolima" },
  { name: "Manizales", department: "Caldas" },
  { name: "Villavicencio", department: "Meta" },
  { name: "Pasto", department: "Nariño" },
  { name: "Neiva", department: "Huila" },
  { name: "Armenia", department: "Quindío" },
  { name: "Popayán", department: "Cauca" },
  { name: "Sincelejo", department: "Sucre" },
  { name: "Valledupar", department: "Cesar" },
  { name: "Montería", department: "Córdoba" },
  { name: "Tunja", department: "Boyacá" },
  { name: "Riohacha", department: "La Guajira" },
  { name: "Florencia", department: "Caquetá" },
  { name: "Yopal", department: "Casanare" },
  { name: "Quibdó", department: "Chocó" },
  { name: "Mocoa", department: "Putumayo" },
  { name: "San Andrés", department: "San Andrés y Providencia" },
  { name: "Leticia", department: "Amazonas" },
  { name: "Arauca", department: "Arauca" },
  { name: "Inírida", department: "Guainía" },
  { name: "San José del Guaviare", department: "Guaviare" },
  { name: "Mitú", department: "Vaupés" },
  { name: "Puerto Carreño", department: "Vichada" },

  // Cundinamarca — Sabana de Bogotá y municipios clave
  { name: "Chía", department: "Cundinamarca" },
  { name: "Cajicá", department: "Cundinamarca" },
  { name: "Zipaquirá", department: "Cundinamarca" },
  { name: "Cota", department: "Cundinamarca" },
  { name: "Sopó", department: "Cundinamarca" },
  { name: "La Calera", department: "Cundinamarca" },
  { name: "Mosquera", department: "Cundinamarca" },
  { name: "Funza", department: "Cundinamarca" },
  { name: "Madrid", department: "Cundinamarca" },
  { name: "Facatativá", department: "Cundinamarca" },
  { name: "Soacha", department: "Cundinamarca" },
  { name: "Tenjo", department: "Cundinamarca" },
  { name: "Tabio", department: "Cundinamarca" },
  { name: "Tocancipá", department: "Cundinamarca" },
  { name: "Gachancipá", department: "Cundinamarca" },
  { name: "Nemocón", department: "Cundinamarca" },
  { name: "Sesquilé", department: "Cundinamarca" },
  { name: "Guatavita", department: "Cundinamarca" },
  { name: "Suesca", department: "Cundinamarca" },
  { name: "Briceño", department: "Cundinamarca" },
  { name: "Subachoque", department: "Cundinamarca" },
  { name: "El Rosal", department: "Cundinamarca" },
  { name: "Bojacá", department: "Cundinamarca" },
  { name: "Sibaté", department: "Cundinamarca" },
  { name: "Fusagasugá", department: "Cundinamarca" },
  { name: "Girardot", department: "Cundinamarca" },
  { name: "Anapoima", department: "Cundinamarca" },
  { name: "La Mesa", department: "Cundinamarca" },
  { name: "Tocaima", department: "Cundinamarca" },
  { name: "Melgar", department: "Tolima" },
  { name: "Ricaurte", department: "Cundinamarca" },
  { name: "Villeta", department: "Cundinamarca" },
  { name: "Pacho", department: "Cundinamarca" },
  { name: "Ubaté", department: "Cundinamarca" },
  { name: "Chocontá", department: "Cundinamarca" },
  { name: "Cogua", department: "Cundinamarca" },

  // Antioquia — Área Metropolitana del Valle de Aburrá
  { name: "Bello", department: "Antioquia" },
  { name: "Envigado", department: "Antioquia" },
  { name: "Itagüí", department: "Antioquia" },
  { name: "Sabaneta", department: "Antioquia" },
  { name: "La Estrella", department: "Antioquia" },
  { name: "Caldas", department: "Antioquia" },
  { name: "Copacabana", department: "Antioquia" },
  { name: "Girardota", department: "Antioquia" },
  { name: "Barbosa", department: "Antioquia" },
  { name: "Rionegro", department: "Antioquia" },
  { name: "La Ceja", department: "Antioquia" },
  { name: "El Retiro", department: "Antioquia" },
  { name: "Guarne", department: "Antioquia" },
  { name: "Marinilla", department: "Antioquia" },
  { name: "Apartadó", department: "Antioquia" },
  { name: "Turbo", department: "Antioquia" },

  // Valle del Cauca
  { name: "Palmira", department: "Valle del Cauca" },
  { name: "Buenaventura", department: "Valle del Cauca" },
  { name: "Tuluá", department: "Valle del Cauca" },
  { name: "Buga", department: "Valle del Cauca" },
  { name: "Cartago", department: "Valle del Cauca" },
  { name: "Jamundí", department: "Valle del Cauca" },
  { name: "Yumbo", department: "Valle del Cauca" },

  // Atlántico
  { name: "Soledad", department: "Atlántico" },
  { name: "Malambo", department: "Atlántico" },
  { name: "Puerto Colombia", department: "Atlántico" },
  { name: "Sabanalarga", department: "Atlántico" },

  // Bolívar
  { name: "Magangué", department: "Bolívar" },
  { name: "Turbaco", department: "Bolívar" },
  { name: "Arjona", department: "Bolívar" },

  // Santander
  { name: "Floridablanca", department: "Santander" },
  { name: "Girón", department: "Santander" },
  { name: "Piedecuesta", department: "Santander" },
  { name: "Barrancabermeja", department: "Santander" },
  { name: "San Gil", department: "Santander" },
  { name: "Socorro", department: "Santander" },

  // Norte de Santander
  { name: "Villa del Rosario", department: "Norte de Santander" },
  { name: "Los Patios", department: "Norte de Santander" },
  { name: "Ocaña", department: "Norte de Santander" },
  { name: "Pamplona", department: "Norte de Santander" },

  // Risaralda / Caldas / Quindío (Eje Cafetero)
  { name: "Dosquebradas", department: "Risaralda" },
  { name: "Santa Rosa de Cabal", department: "Risaralda" },
  { name: "La Virginia", department: "Risaralda" },
  { name: "Villamaría", department: "Caldas" },
  { name: "Chinchiná", department: "Caldas" },
  { name: "La Dorada", department: "Caldas" },
  { name: "Calarcá", department: "Quindío" },
  { name: "Montenegro", department: "Quindío" },
  { name: "Quimbaya", department: "Quindío" },
  { name: "Salento", department: "Quindío" },
  { name: "Filandia", department: "Quindío" },

  // Tolima / Huila / Meta
  { name: "Espinal", department: "Tolima" },
  { name: "Honda", department: "Tolima" },
  { name: "Mariquita", department: "Tolima" },
  { name: "Pitalito", department: "Huila" },
  { name: "Garzón", department: "Huila" },
  { name: "La Plata", department: "Huila" },
  { name: "Acacías", department: "Meta" },
  { name: "Granada", department: "Meta" },
  { name: "Puerto López", department: "Meta" },
  { name: "Restrepo", department: "Meta" },

  // Magdalena / Cesar / Guajira / Córdoba / Sucre
  { name: "Ciénaga", department: "Magdalena" },
  { name: "Aguachica", department: "Cesar" },
  { name: "Maicao", department: "La Guajira" },
  { name: "Uribia", department: "La Guajira" },
  { name: "Lorica", department: "Córdoba" },
  { name: "Cereté", department: "Córdoba" },
  { name: "Sahagún", department: "Córdoba" },
  { name: "Corozal", department: "Sucre" },

  // Nariño / Cauca
  { name: "Ipiales", department: "Nariño" },
  { name: "Tumaco", department: "Nariño" },
  { name: "Túquerres", department: "Nariño" },
  { name: "Santander de Quilichao", department: "Cauca" },

  // Boyacá
  { name: "Duitama", department: "Boyacá" },
  { name: "Sogamoso", department: "Boyacá" },
  { name: "Chiquinquirá", department: "Boyacá" },
  { name: "Paipa", department: "Boyacá" },
  { name: "Villa de Leyva", department: "Boyacá" },

  // Casanare / Arauca
  { name: "Aguazul", department: "Casanare" },
  { name: "Tauramena", department: "Casanare" },
  { name: "Saravena", department: "Arauca" },
  { name: "Tame", department: "Arauca" },
];

export const COLOMBIA_CITY_NAMES: string[] = COLOMBIA_CITIES.map((c) => c.name);

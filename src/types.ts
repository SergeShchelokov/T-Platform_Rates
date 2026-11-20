export interface Service {
  id: string;
  name: string;
  priceCents: number;
}
export interface Version {
  id: string;
  date: string;
  priceCents: number;
  calculated: boolean;
  services: Service[];
}
export interface Rate {
  id: string;
  name: string;
  comment: string;
  versions: Version[];
  organizations?: { id: string; name: string; objects: number }[];
}
export interface VersionDraft {
  id: string;
  date: string;
  price: string;
  services: { id: string; name: string; price: string }[];
}

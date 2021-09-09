import { Writable, writable, derived, Readable } from "svelte/store";

export type GeoJson = {
  type: string;
  features: GeoJsonFeature[];
};

export type GeoJsonFeature = {
  type: string;
  properties: {
    [index: string]: string | number | null;
  };
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
};

export type DBMatch = {
  id: number;
  import_id: number;
  file: number;
  matches: number[];
  message: string;
  matches_count: number[];
  table_name: string;
  difference: {
    source_id: number;
    target_id: number;
    dist: number;
  }[];
};

export type DBMatchDetails = {
  file: string;
  url: string;
  name: string;
  file_name: string;
  description: string;
  function: string;
  abstract: string;
  format: string;
};

export const ready: Writable<boolean> = writable(false);
export const matches: Writable<DBMatch[]> = writable([]);
export const selected: Writable<number | null> = writable(null);
export const thematics: Writable<{id: number, name: string, group: string}[]> = writable([]);

export const load: () => Promise<void> = async () => {
  fetch(`http://localhost:${__global.env.SPATIAL_PORT}/matches/list`)
    .then(response => response.json())
    .then(json => {
      matches.set(json);
      return fetch(`http://localhost:${__global.env.SPATIAL_PORT}/thematic/topics`)
    })
    .then(response => response.json())
    .then(json => {
      thematics.set(json);
      ready.set(true);
    })
    .catch(err => {
      console.log(err);
    });
};

export const details: Readable<DBMatchDetails[] | null> = derived([selected, matches], ([selected, matches], set) => {
  if (selected) {
    let importId: null | number = null;
    if (matches) {
      matches.forEach(m => {
        if (m.id === selected) {
          importId = m.import_id;
        }
      });
    }
    if (importId) {
      fetch(`http://localhost:${__global.env.SPATIAL_PORT}/matches/details/${importId}`)
        .then(response => response.json())
        .then(json => {
          set(json);
        });
    } else {
      set(null);
    }
  }
});

export const geojson: Readable<GeoJson | null> = derived(selected, (selected, set) => {
  if (selected) {
    fetch(`http://localhost:${__global.env.SPATIAL_PORT}/matches/geojson/${selected}`)
      .then(response => response.json())
      .then(json => {
        set(json);
      });
  }
});

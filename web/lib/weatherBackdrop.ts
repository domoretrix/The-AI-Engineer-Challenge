import type { WeatherType } from "./types";

/**
 * Static artwork shipped under `public/weather/{type}.svg`.
 * `null` uses the neutral welcome / pre-forecast image.
 */
export function weatherBackdropUrl(type: WeatherType | null): string {
  if (!type) return "/weather/default.svg";
  return `/weather/${type}.svg`;
}

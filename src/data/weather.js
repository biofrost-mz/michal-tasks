/**
 * Weather modul — OpenWeatherMap Current Weather API
 * Čte VITE_OWM_API_KEY z .env.local
 * Cache: 15 minut (aby se neplýtvalo free tier limitem 1000 calls/day)
 *
 * Výchozí lokace: Praha (50.0755, 14.4378)
 */

const API_KEY = import.meta.env.VITE_OWM_API_KEY || "";
// Brno
const DEFAULT_LAT = 49.1951;
const DEFAULT_LNG = 16.6068;
const CACHE_MS = 15 * 60 * 1000; // 15 minut

let cache = null;
let cacheTime = 0;

/**
 * Mapování OWM weather condition code → ikona + český label
 */
const CONDITION_MAP = {
  // Group 2xx: Thunderstorm
  200: { icon: "cloud-lightning", label: "bouřka" },
  201: { icon: "cloud-lightning", label: "bouřka s deštěm" },
  202: { icon: "cloud-lightning", label: "silná bouřka" },
  210: { icon: "cloud-lightning", label: "lehká bouřka" },
  211: { icon: "cloud-lightning", label: "bouřka" },
  212: { icon: "cloud-lightning", label: "silná bouřka" },
  221: { icon: "cloud-lightning", label: "bouřky" },
  230: { icon: "cloud-lightning", label: "bouřka s mrholením" },
  231: { icon: "cloud-lightning", label: "bouřka s mrholením" },
  232: { icon: "cloud-lightning", label: "bouřka s deštěm" },

  // Group 3xx: Drizzle
  300: { icon: "cloud-drizzle", label: "mrholení" },
  301: { icon: "cloud-drizzle", label: "mrholení" },
  302: { icon: "cloud-drizzle", label: "silné mrholení" },
  310: { icon: "cloud-drizzle", label: "lehký déšť" },
  311: { icon: "cloud-drizzle", label: "mrholení" },
  312: { icon: "cloud-drizzle", label: "silné mrholení" },
  313: { icon: "cloud-drizzle", label: "přeháňky" },
  314: { icon: "cloud-drizzle", label: "silné přeháňky" },
  321: { icon: "cloud-drizzle", label: "přeháňky" },

  // Group 5xx: Rain
  500: { icon: "cloud-rain", label: "lehký déšť" },
  501: { icon: "cloud-rain", label: "déšť" },
  502: { icon: "cloud-rain", label: "silný déšť" },
  503: { icon: "cloud-rain", label: "velmi silný déšť" },
  504: { icon: "cloud-rain", label: "přívalový déšť" },
  511: { icon: "cloud-snow", label: "mrznoucí déšť" },
  520: { icon: "cloud-rain", label: "přeháňky" },
  521: { icon: "cloud-rain", label: "déšť" },
  522: { icon: "cloud-rain", label: "silné přeháňky" },
  531: { icon: "cloud-rain", label: "přeháňky" },

  // Group 6xx: Snow
  600: { icon: "cloud-snow", label: "lehké sněžení" },
  601: { icon: "cloud-snow", label: "sněžení" },
  602: { icon: "cloud-snow", label: "silné sněžení" },
  611: { icon: "cloud-snow", label: "plískanice" },
  612: { icon: "cloud-snow", label: "plískanice" },
  613: { icon: "cloud-snow", label: "plískanice" },
  615: { icon: "cloud-snow", label: "déšť se sněhem" },
  616: { icon: "cloud-snow", label: "déšť se sněhem" },
  620: { icon: "cloud-snow", label: "lehké sněžení" },
  621: { icon: "cloud-snow", label: "sněhové přeháňky" },
  622: { icon: "cloud-snow", label: "silné sněžení" },

  // Group 7xx: Atmosphere
  701: { icon: "cloud", label: "mlha" },
  711: { icon: "cloud", label: "kouř" },
  721: { icon: "cloud", label: "opar" },
  731: { icon: "cloud", label: "prach" },
  741: { icon: "cloud", label: "mlha" },
  751: { icon: "cloud", label: "písek" },
  761: { icon: "cloud", label: "prach" },
  762: { icon: "cloud", label: "sopečný popel" },
  771: { icon: "cloud", label: "vichřice" },
  781: { icon: "cloud", label: "tornádo" },

  // Group 800: Clear
  800: { icon: "sun", label: "jasno" },

  // Group 80x: Clouds
  801: { icon: "sun", label: "skoro jasno" },
  802: { icon: "cloud", label: "polojasno" },
  803: { icon: "cloud", label: "oblačno" },
  804: { icon: "cloud", label: "zataženo" },
};

function getCondition(code) {
  return CONDITION_MAP[code] || { icon: "cloud", label: "oblačno" };
}

/**
 * Načte aktuální počasí z OpenWeatherMap.
 * Vrací null pokud API klíč chybí nebo dojde k chybě.
 *
 * @param {number} [lat]
 * @param {number} [lng]
 * @returns {Promise<{ temp: number, feelsLike: number, icon: string, label: string, wind: number, humidity: number, city: string } | null>}
 */
export async function fetchWeather(lat = DEFAULT_LAT, lng = DEFAULT_LNG) {
  if (!API_KEY) return null;

  // Cache hit
  if (cache && Date.now() - cacheTime < CACHE_MS) return cache;

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&lang=cs&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[weather] OWM response:", res.status);
      return cache; // vrať starý cache pokud existuje
    }

    const data = await res.json();
    const w = data.weather?.[0];
    const cond = getCondition(w?.id);

    cache = {
      temp: Math.round(data.main?.temp ?? 0),
      feelsLike: Math.round(data.main?.feels_like ?? 0),
      icon: cond.icon,
      label: cond.label,
      wind: Math.round((data.wind?.speed ?? 0) * 3.6), // m/s → km/h
      humidity: data.main?.humidity ?? 0,
      city: data.name || "Praha",
    };
    cacheTime = Date.now();
    return cache;
  } catch (err) {
    console.warn("[weather] fetch error:", err);
    return cache; // fallback na cache
  }
}

/**
 * Hook-friendly: vrátí cached data synchronně, nebo null.
 * Volej fetchWeather() v useEffect pro async load.
 */
export function getCachedWeather() {
  if (cache && Date.now() - cacheTime < CACHE_MS) return cache;
  return null;
}

/**
 * Zjistí, zda je API klíč nakonfigurovaný.
 */
export function hasWeatherApiKey() {
  return !!API_KEY;
}

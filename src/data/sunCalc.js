/**
 * Výpočet svítání a soumraku — čistá matematika, žádné API.
 * Algoritmus: US Naval Observatory / NOAA solar calculator (zjednodušený).
 * Výchozí lokace: Praha (50.0755° N, 14.4378° E)
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

// Brno
const DEFAULT_LAT = 49.1951;
const DEFAULT_LNG = 16.6068;

/**
 * Julian Day Number z Date
 */
function toJulian(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Juliánské století od J2000.0
 */
function julianCentury(jd) {
  return (jd - 2451545) / 36525;
}

/**
 * Geometrická střední délka Slunce (°)
 */
function geomMeanLongSun(T) {
  return (280.46646 + T * (36000.76983 + 0.0003032 * T)) % 360;
}

/**
 * Geometrická střední anomálie Slunce (°)
 */
function geomMeanAnomalySun(T) {
  return 357.52911 + T * (35999.05029 - 0.0001537 * T);
}

/**
 * Excentricita oběžné dráhy Země
 */
function eccentEarthOrbit(T) {
  return 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
}

/**
 * Rovnice středu Slunce (°)
 */
function sunEqOfCenter(T) {
  const M = geomMeanAnomalySun(T) * RAD;
  return Math.sin(M) * (1.9146 - T * (0.004817 + 0.000014 * T))
       + Math.sin(2 * M) * (0.019993 - 0.000101 * T)
       + Math.sin(3 * M) * 0.000289;
}

/**
 * Deklinace Slunce (°)
 */
function sunDeclination(T) {
  const L0 = geomMeanLongSun(T);
  const C = sunEqOfCenter(T);
  const sunTrue = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = sunTrue - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const obliq = 23.439291 - T * (0.0130042 + 0.00000016 * T);
  const obliqCorr = obliq + 0.00256 * Math.cos(omega * RAD);
  return Math.asin(Math.sin(obliqCorr * RAD) * Math.sin(lambda * RAD)) * DEG;
}

/**
 * Rovnice času (minuty)
 */
function eqOfTime(T) {
  const L0 = geomMeanLongSun(T) * RAD;
  const e = eccentEarthOrbit(T);
  const M = geomMeanAnomalySun(T) * RAD;
  const obliq = (23.439291 - T * 0.0130042) * RAD;
  const y = Math.tan(obliq / 2) ** 2;

  return 4 * DEG * (
    y * Math.sin(2 * L0)
    - 2 * e * Math.sin(M)
    + 4 * e * y * Math.sin(M) * Math.cos(2 * L0)
    - 0.5 * y * y * Math.sin(4 * L0)
    - 1.25 * e * e * Math.sin(2 * M)
  );
}

/**
 * Hodinový úhel východu/západu (°)
 * @param {number} zenith - úhel zenitu (90.833 pro oficiální východ/západ)
 */
function hourAngleSunrise(lat, decl, zenith = 90.833) {
  const latR = lat * RAD;
  const declR = decl * RAD;
  const cos_ha = (Math.cos(zenith * RAD) - Math.sin(latR) * Math.sin(declR))
               / (Math.cos(latR) * Math.cos(declR));
  if (cos_ha > 1) return null;   // slunce nevyjde (polární noc)
  if (cos_ha < -1) return null;  // slunce nezapadne (polární den)
  return Math.acos(cos_ha) * DEG;
}

/**
 * Formátuje minuty od půlnoci → "HH:MM"
 */
function minutesToHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Vypočítá čas svítání a soumraku pro dané datum a lokaci.
 *
 * @param {Date} [date] - datum (default: dnes)
 * @param {number} [lat] - zeměpisná šířka (default: Praha)
 * @param {number} [lng] - zeměpisná délka (default: Praha)
 * @returns {{ sunrise: string, sunset: string, dayLength: string } | null}
 */
export function getSunTimes(date = new Date(), lat = DEFAULT_LAT, lng = DEFAULT_LNG) {
  // Půlnoc lokálního dne v UTC
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const noon = new Date(Date.UTC(year, month, day, 12, 0, 0));

  const jd = toJulian(noon);
  const T = julianCentury(jd);

  const eqTime = eqOfTime(T);
  const decl = sunDeclination(T);
  const ha = hourAngleSunrise(lat, decl);

  if (ha === null) return null; // polární den/noc

  // Timezone offset (minuty od UTC) — používáme lokální offset prohlížeče
  const tzOffset = -date.getTimezoneOffset();

  // Čas v minutách od půlnoci (lokální)
  const solarNoon = (720 - 4 * lng - eqTime + tzOffset);
  const sunriseMin = solarNoon - 4 * ha;
  const sunsetMin = solarNoon + 4 * ha;
  const dayLenMin = 8 * ha;

  const dayH = Math.floor(dayLenMin / 60);
  const dayM = Math.round(dayLenMin % 60);

  return {
    sunrise: minutesToHHMM(sunriseMin),
    sunset: minutesToHHMM(sunsetMin),
    dayLength: `${dayH}h ${dayM}m`,
    sunriseMin,
    sunsetMin,
  };
}

/**
 * Vrátí pozdrav podle aktuální hodiny.
 * @param {number} [hour] - hodina (0-23), default: aktuální
 * @returns {string}
 */
export function getGreeting(hour) {
  const h = hour ?? new Date().getHours();
  if (h < 5) return "Dobrý večer";
  if (h < 12) return "Dobré ráno";
  if (h < 18) return "Dobré odpoledne";
  return "Dobrý večer";
}

/**
 * Vrátí emoji ikonu počasí podle hodiny (den/noc).
 * Bez API vrací jen orientační ikonu slunce/měsíce.
 * @param {Date} [date]
 * @param {number} [lat]
 * @param {number} [lng]
 * @returns {{ icon: string, label: string }}
 */
export function getDayPhaseIcon(date = new Date(), lat = DEFAULT_LAT, lng = DEFAULT_LNG) {
  const sun = getSunTimes(date, lat, lng);
  if (!sun) return { icon: "sun", label: "den" };

  const nowMin = date.getHours() * 60 + date.getMinutes();

  if (nowMin < sun.sunriseMin - 30) return { icon: "moon", label: "noc" };
  if (nowMin < sun.sunriseMin + 30) return { icon: "sunrise", label: "svítání" };
  if (nowMin < sun.sunsetMin - 60) return { icon: "sun", label: "den" };
  if (nowMin < sun.sunsetMin + 30) return { icon: "sunset", label: "soumrak" };
  return { icon: "moon", label: "noc" };
}

export type SeedAirport = {
  iataCode: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

/** Real airports with approximate coordinates. Used for seeding + demo distance math. */
export const AIRPORTS: SeedAirport[] = [
  // Tunisia
  { iataCode: "TUN", name: "Aéroport Tunis-Carthage", city: "Tunis", country: "Tunisie", countryCode: "TN", latitude: 36.851, longitude: 10.227, timezone: "Africa/Tunis" },
  { iataCode: "DJE", name: "Aéroport Djerba-Zarzis", city: "Djerba", country: "Tunisie", countryCode: "TN", latitude: 33.875, longitude: 10.775, timezone: "Africa/Tunis" },
  { iataCode: "SFA", name: "Aéroport Sfax-Thyna", city: "Sfax", country: "Tunisie", countryCode: "TN", latitude: 34.718, longitude: 10.691, timezone: "Africa/Tunis" },
  { iataCode: "NBE", name: "Aéroport Enfidha-Hammamet", city: "Enfidha", country: "Tunisie", countryCode: "TN", latitude: 36.076, longitude: 10.439, timezone: "Africa/Tunis" },
  { iataCode: "TOE", name: "Aéroport Tozeur-Nefta", city: "Tozeur", country: "Tunisie", countryCode: "TN", latitude: 33.94, longitude: 8.11, timezone: "Africa/Tunis" },
  { iataCode: "GAF", name: "Aéroport Gafsa-Ksar", city: "Gafsa", country: "Tunisie", countryCode: "TN", latitude: 34.42, longitude: 8.82, timezone: "Africa/Tunis" },
  // France
  { iataCode: "CDG", name: "Aéroport Paris Charles de Gaulle", city: "Paris", country: "France", countryCode: "FR", latitude: 49.009, longitude: 2.547, timezone: "Europe/Paris" },
  { iataCode: "ORY", name: "Aéroport Paris Orly", city: "Paris", country: "France", countryCode: "FR", latitude: 48.723, longitude: 2.379, timezone: "Europe/Paris" },
  { iataCode: "LYS", name: "Aéroport Lyon-Saint Exupéry", city: "Lyon", country: "France", countryCode: "FR", latitude: 45.725, longitude: 5.081, timezone: "Europe/Paris" },
  { iataCode: "MRS", name: "Aéroport Marseille Provence", city: "Marseille", country: "France", countryCode: "FR", latitude: 43.439, longitude: 5.221, timezone: "Europe/Paris" },
  { iataCode: "NCE", name: "Aéroport Nice Côte d'Azur", city: "Nice", country: "France", countryCode: "FR", latitude: 43.665, longitude: 7.215, timezone: "Europe/Paris" },
  { iataCode: "BVA", name: "Aéroport Beauvais-Tillé", city: "Beauvais", country: "France", countryCode: "FR", latitude: 49.454, longitude: 2.113, timezone: "Europe/Paris" },
  // Europe
  { iataCode: "IST", name: "Aéroport Istanbul", city: "Istanbul", country: "Turquie", countryCode: "TR", latitude: 41.275, longitude: 28.752, timezone: "Europe/Istanbul" },
  { iataCode: "SAW", name: "Aéroport Istanbul Sabiha Gökçen", city: "Istanbul", country: "Turquie", countryCode: "TR", latitude: 40.898, longitude: 29.309, timezone: "Europe/Istanbul" },
  { iataCode: "FCO", name: "Aéroport Rome-Fiumicino", city: "Rome", country: "Italie", countryCode: "IT", latitude: 41.8, longitude: 12.238, timezone: "Europe/Rome" },
  { iataCode: "MXP", name: "Aéroport Milan-Malpensa", city: "Milan", country: "Italie", countryCode: "IT", latitude: 45.63, longitude: 8.723, timezone: "Europe/Rome" },
  { iataCode: "BCN", name: "Aéroport Barcelone-El Prat", city: "Barcelone", country: "Espagne", countryCode: "ES", latitude: 41.297, longitude: 2.078, timezone: "Europe/Madrid" },
  { iataCode: "MAD", name: "Aéroport Madrid-Barajas", city: "Madrid", country: "Espagne", countryCode: "ES", latitude: 40.493, longitude: -3.567, timezone: "Europe/Madrid" },
  { iataCode: "LIS", name: "Aéroport Lisbonne-Humberto Delgado", city: "Lisbonne", country: "Portugal", countryCode: "PT", latitude: 38.774, longitude: -9.134, timezone: "Europe/Lisbon" },
  { iataCode: "OPO", name: "Aéroport Porto-Francisco Sá Carneiro", city: "Porto", country: "Portugal", countryCode: "PT", latitude: 41.248, longitude: -8.681, timezone: "Europe/Lisbon" },
  { iataCode: "AMS", name: "Aéroport Amsterdam-Schiphol", city: "Amsterdam", country: "Pays-Bas", countryCode: "NL", latitude: 52.31, longitude: 4.764, timezone: "Europe/Amsterdam" },
  { iataCode: "BRU", name: "Aéroport Bruxelles-National", city: "Bruxelles", country: "Belgique", countryCode: "BE", latitude: 50.901, longitude: 4.484, timezone: "Europe/Brussels" },
  { iataCode: "FRA", name: "Aéroport Francfort", city: "Francfort", country: "Allemagne", countryCode: "DE", latitude: 50.037, longitude: 8.562, timezone: "Europe/Berlin" },
  { iataCode: "MUC", name: "Aéroport Munich", city: "Munich", country: "Allemagne", countryCode: "DE", latitude: 48.353, longitude: 11.786, timezone: "Europe/Berlin" },
  { iataCode: "BER", name: "Aéroport Berlin-Brandebourg", city: "Berlin", country: "Allemagne", countryCode: "DE", latitude: 52.366, longitude: 13.503, timezone: "Europe/Berlin" },
  { iataCode: "ZRH", name: "Aéroport Zurich", city: "Zurich", country: "Suisse", countryCode: "CH", latitude: 47.458, longitude: 8.555, timezone: "Europe/Zurich" },
  { iataCode: "GVA", name: "Aéroport Genève", city: "Genève", country: "Suisse", countryCode: "CH", latitude: 46.238, longitude: 6.109, timezone: "Europe/Zurich" },
  { iataCode: "VIE", name: "Aéroport Vienne-Schwechat", city: "Vienne", country: "Autriche", countryCode: "AT", latitude: 48.11, longitude: 16.57, timezone: "Europe/Vienna" },
  { iataCode: "LHR", name: "Aéroport Londres-Heathrow", city: "Londres", country: "Royaume-Uni", countryCode: "GB", latitude: 51.47, longitude: -0.454, timezone: "Europe/London" },
  { iataCode: "LGW", name: "Aéroport Londres-Gatwick", city: "Londres", country: "Royaume-Uni", countryCode: "GB", latitude: 51.153, longitude: -0.182, timezone: "Europe/London" },
  { iataCode: "STN", name: "Aéroport Londres-Stansted", city: "Londres", country: "Royaume-Uni", countryCode: "GB", latitude: 51.885, longitude: 0.235, timezone: "Europe/London" },
  { iataCode: "DUB", name: "Aéroport Dublin", city: "Dublin", country: "Irlande", countryCode: "IE", latitude: 53.421, longitude: -6.27, timezone: "Europe/Dublin" },
  { iataCode: "ATH", name: "Aéroport Athènes", city: "Athènes", country: "Grèce", countryCode: "GR", latitude: 37.936, longitude: 23.944, timezone: "Europe/Athens" },
  { iataCode: "PRG", name: "Aéroport Prague-Václav Havel", city: "Prague", country: "Tchéquie", countryCode: "CZ", latitude: 50.101, longitude: 14.26, timezone: "Europe/Prague" },
  { iataCode: "WAW", name: "Aéroport Varsovie-Chopin", city: "Varsovie", country: "Pologne", countryCode: "PL", latitude: 52.166, longitude: 20.967, timezone: "Europe/Warsaw" },
  { iataCode: "CPH", name: "Aéroport Copenhague", city: "Copenhague", country: "Danemark", countryCode: "DK", latitude: 55.618, longitude: 12.656, timezone: "Europe/Copenhagen" },
  { iataCode: "ARN", name: "Aéroport Stockholm-Arlanda", city: "Stockholm", country: "Suède", countryCode: "SE", latitude: 59.651, longitude: 17.918, timezone: "Europe/Stockholm" },
  { iataCode: "OSL", name: "Aéroport Oslo-Gardermoen", city: "Oslo", country: "Norvège", countryCode: "NO", latitude: 60.194, longitude: 11.1, timezone: "Europe/Oslo" },
  { iataCode: "HEL", name: "Aéroport Helsinki-Vantaa", city: "Helsinki", country: "Finlande", countryCode: "FI", latitude: 60.317, longitude: 24.963, timezone: "Europe/Helsinki" },
  // MENA
  { iataCode: "DXB", name: "Aéroport Dubaï", city: "Dubaï", country: "Émirats arabes unis", countryCode: "AE", latitude: 25.253, longitude: 55.365, timezone: "Asia/Dubai" },
  { iataCode: "AUH", name: "Aéroport Abu Dhabi-Zayed", city: "Abu Dhabi", country: "Émirats arabes unis", countryCode: "AE", latitude: 24.433, longitude: 54.651, timezone: "Asia/Dubai" },
  { iataCode: "DOH", name: "Aéroport Doha-Hamad", city: "Doha", country: "Qatar", countryCode: "QA", latitude: 25.273, longitude: 51.608, timezone: "Asia/Qatar" },
  { iataCode: "JED", name: "Aéroport Djeddah-King Abdulaziz", city: "Djeddah", country: "Arabie saoudite", countryCode: "SA", latitude: 21.679, longitude: 39.157, timezone: "Asia/Riyadh" },
  { iataCode: "RUH", name: "Aéroport Riyad-King Khalid", city: "Riyad", country: "Arabie saoudite", countryCode: "SA", latitude: 24.957, longitude: 46.699, timezone: "Asia/Riyadh" },
  { iataCode: "MCT", name: "Aéroport Mascate", city: "Mascate", country: "Oman", countryCode: "OM", latitude: 23.593, longitude: 58.284, timezone: "Asia/Muscat" },
  { iataCode: "CAI", name: "Aéroport Le Caire", city: "Le Caire", country: "Égypte", countryCode: "EG", latitude: 30.121, longitude: 31.406, timezone: "Africa/Cairo" },
  { iataCode: "AMM", name: "Aéroport Amman-Queen Alia", city: "Amman", country: "Jordanie", countryCode: "JO", latitude: 31.723, longitude: 35.993, timezone: "Asia/Amman" },
  { iataCode: "BEY", name: "Aéroport Beyrouth-Rafic Hariri", city: "Beyrouth", country: "Liban", countryCode: "LB", latitude: 33.821, longitude: 35.488, timezone: "Asia/Beirut" },
  { iataCode: "ALG", name: "Aéroport Alger-Houari Boumediene", city: "Alger", country: "Algérie", countryCode: "DZ", latitude: 36.691, longitude: 3.215, timezone: "Africa/Algiers" },
  { iataCode: "CMN", name: "Aéroport Casablanca-Mohammed V", city: "Casablanca", country: "Maroc", countryCode: "MA", latitude: 33.367, longitude: -7.59, timezone: "Africa/Casablanca" },
  { iataCode: "RAK", name: "Aéroport Marrakech-Menara", city: "Marrakech", country: "Maroc", countryCode: "MA", latitude: 31.607, longitude: -8.036, timezone: "Africa/Casablanca" },
  { iataCode: "TIP", name: "Aéroport Tripoli-Mitiga", city: "Tripoli", country: "Libye", countryCode: "LY", latitude: 32.664, longitude: 13.159, timezone: "Africa/Tripoli" },
  // Africa
  { iataCode: "NBO", name: "Aéroport Nairobi-Jomo Kenyatta", city: "Nairobi", country: "Kenya", countryCode: "KE", latitude: -1.319, longitude: 36.928, timezone: "Africa/Nairobi" },
  { iataCode: "ADD", name: "Aéroport Addis-Abeba-Bole", city: "Addis-Abeba", country: "Éthiopie", countryCode: "ET", latitude: 8.978, longitude: 38.799, timezone: "Africa/Addis_Ababa" },
  { iataCode: "DKR", name: "Aéroport Dakar-Blaise Diagne", city: "Dakar", country: "Sénégal", countryCode: "SN", latitude: 14.67, longitude: -17.073, timezone: "Africa/Dakar" },
  { iataCode: "ABJ", name: "Aéroport Abidjan-Félix Houphouët-Boigny", city: "Abidjan", country: "Côte d'Ivoire", countryCode: "CI", latitude: 5.261, longitude: -3.926, timezone: "Africa/Abidjan" },
  { iataCode: "LOS", name: "Aéroport Lagos-Murtala Muhammed", city: "Lagos", country: "Nigéria", countryCode: "NG", latitude: 6.577, longitude: 3.321, timezone: "Africa/Lagos" },
  // Americas
  { iataCode: "JFK", name: "Aéroport New York-John F. Kennedy", city: "New York", country: "États-Unis", countryCode: "US", latitude: 40.641, longitude: -73.778, timezone: "America/New_York" },
  { iataCode: "MIA", name: "Aéroport Miami", city: "Miami", country: "États-Unis", countryCode: "US", latitude: 25.793, longitude: -80.291, timezone: "America/New_York" },
  { iataCode: "YUL", name: "Aéroport Montréal-Trudeau", city: "Montréal", country: "Canada", countryCode: "CA", latitude: 45.471, longitude: -73.741, timezone: "America/Toronto" },
  { iataCode: "YYZ", name: "Aéroport Toronto-Pearson", city: "Toronto", country: "Canada", countryCode: "CA", latitude: 43.677, longitude: -79.631, timezone: "America/Toronto" },
  { iataCode: "GRU", name: "Aéroport São Paulo-Guarulhos", city: "São Paulo", country: "Brésil", countryCode: "BR", latitude: -23.435, longitude: -46.473, timezone: "America/Sao_Paulo" },
  // Asia
  { iataCode: "BKK", name: "Aéroport Bangkok-Suvarnabhumi", city: "Bangkok", country: "Thaïlande", countryCode: "TH", latitude: 13.69, longitude: 100.75, timezone: "Asia/Bangkok" },
  { iataCode: "SIN", name: "Aéroport Singapour-Changi", city: "Singapour", country: "Singapour", countryCode: "SG", latitude: 1.364, longitude: 103.991, timezone: "Asia/Singapore" },
  { iataCode: "KUL", name: "Aéroport Kuala Lumpur", city: "Kuala Lumpur", country: "Malaisie", countryCode: "MY", latitude: 2.746, longitude: 101.71, timezone: "Asia/Kuala_Lumpur" },
  { iataCode: "HKG", name: "Aéroport Hong Kong", city: "Hong Kong", country: "Chine", countryCode: "HK", latitude: 22.309, longitude: 113.915, timezone: "Asia/Hong_Kong" },
  { iataCode: "PEK", name: "Aéroport Pékin-Capitale", city: "Pékin", country: "Chine", countryCode: "CN", latitude: 40.08, longitude: 116.584, timezone: "Asia/Shanghai" },
  { iataCode: "DEL", name: "Aéroport Delhi-Indira Gandhi", city: "Delhi", country: "Inde", countryCode: "IN", latitude: 28.556, longitude: 77.1, timezone: "Asia/Kolkata" },
  { iataCode: "NRT", name: "Aéroport Tokyo-Narita", city: "Tokyo", country: "Japon", countryCode: "JP", latitude: 35.772, longitude: 140.393, timezone: "Asia/Tokyo" },
];

export type SeedAirline = {
  iataCode: string;
  name: string;
  country: string;
  lowCost: boolean;
};

export const AIRLINES: SeedAirline[] = [
  { iataCode: "TU", name: "Tunisair", country: "Tunisie", lowCost: false },
  { iataCode: "BJ", name: "Nouvelair", country: "Tunisie", lowCost: false },
  { iataCode: "TO", name: "Transavia France", country: "France", lowCost: true },
  { iataCode: "AF", name: "Air France", country: "France", lowCost: false },
  { iataCode: "AH", name: "Air Algérie", country: "Algérie", lowCost: false },
  { iataCode: "TK", name: "Turkish Airlines", country: "Turquie", lowCost: false },
  { iataCode: "EK", name: "Emirates", country: "Émirats arabes unis", lowCost: false },
  { iataCode: "QR", name: "Qatar Airways", country: "Qatar", lowCost: false },
  { iataCode: "EY", name: "Etihad Airways", country: "Émirats arabes unis", lowCost: false },
  { iataCode: "SV", name: "Saudia", country: "Arabie saoudite", lowCost: false },
  { iataCode: "MS", name: "EgyptAir", country: "Égypte", lowCost: false },
  { iataCode: "AZ", name: "ITA Airways", country: "Italie", lowCost: false },
  { iataCode: "LH", name: "Lufthansa", country: "Allemagne", lowCost: false },
  { iataCode: "IB", name: "Iberia", country: "Espagne", lowCost: false },
  { iataCode: "VY", name: "Vueling", country: "Espagne", lowCost: true },
  { iataCode: "FR", name: "Ryanair", country: "Irlande", lowCost: true },
  { iataCode: "U2", name: "easyJet", country: "Royaume-Uni", lowCost: true },
  { iataCode: "KL", name: "KLM", country: "Pays-Bas", lowCost: false },
  { iataCode: "A3", name: "Aegean Airlines", country: "Grèce", lowCost: false },
  { iataCode: "AT", name: "Royal Air Maroc", country: "Maroc", lowCost: false },
];

export const AIRPORT_BY_IATA = new Map(
  AIRPORTS.map((airport) => [airport.iataCode, airport]),
);

export const AIRLINE_BY_IATA = new Map(
  AIRLINES.map((airline) => [airline.iataCode, airline]),
);

export const POPULAR_ROUTES: Array<{ origin: string; destination: string }> = [
  { origin: "TUN", destination: "CDG" },
  { origin: "TUN", destination: "IST" },
  { origin: "TUN", destination: "DXB" },
  { origin: "TUN", destination: "FCO" },
  { origin: "TUN", destination: "BCN" },
  { origin: "DJE", destination: "ORY" },
  { origin: "TUN", destination: "JED" },
  { origin: "TUN", destination: "YUL" },
];

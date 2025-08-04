export const dummyBuildings = [
  {
    name: "Kingsmere House",
    units: 45,
    address: "5 Kingsmere Road, Wimbledon, London",
    image: "/images/buildings/placeholder.jpg",
    postcode: "SW19 8QX",
  },
  {
    name: "Westbridge Mews",
    units: 16,
    address: "78 Westbridge Way, Croydon",
    image: "/images/buildings/placeholder.jpg",
    postcode: "CR0 4LD",
  },
  {
    name: "The Oaks",
    units: 32,
    address: "4 Oak Grove, St Albans",
    image: "/images/buildings/placeholder.jpg",
    postcode: "AL1 3RA",
  },
  {
    name: "Harbour View Court",
    units: 24,
    address: "22 Marine Parade, Brighton",
    image: "/images/buildings/placeholder.jpg",
    postcode: "BN2 1TL",
  },
  {
    name: "Beechwood Heights",
    units: 38,
    address: "9 Beechwood Avenue, Manchester",
    image: "/images/buildings/placeholder.jpg",
    postcode: "M20 6HR",
  },
  {
    name: "Elmfield Gardens",
    units: 20,
    address: "3 Elmfield Drive, Bristol",
    image: "/images/buildings/placeholder.jpg",
    postcode: "BS9 1AP",
  },
  {
    name: "Riverbank Place",
    units: 50,
    address: "11 Riverbank Crescent, Norwich",
    image: "/images/buildings/placeholder.jpg",
    postcode: "NR1 4BT",
  },
  {
    name: "Southgate House",
    units: 27,
    address: "101 Southgate Street, Winchester",
    image: "/images/buildings/placeholder.jpg",
    postcode: "SO23 9EH",
  },
  {
    name: "Maple Row",
    units: 12,
    address: "7 Maple Row, Guildford",
    image: "/images/buildings/placeholder.jpg",
    postcode: "GU1 2HE",
  },
  {
    name: "Stonecroft Court",
    units: 36,
    address: "18 Stonecroft Road, Sheffield",
    image: "/images/buildings/placeholder.jpg",
    postcode: "S7 2HQ",
  },
  {
    name: "Highfield Tower",
    units: 60,
    address: "30 Highfield Road, Leeds",
    image: "/images/buildings/placeholder.jpg",
    postcode: "LS6 2NJ",
  },
  {
    name: "Pinehurst House",
    units: 21,
    address: "6 Pinehurst Lane, Cambridge",
    image: "/images/buildings/placeholder.jpg",
    postcode: "CB4 1DU",
  },
  {
    name: "Larkspur Square",
    units: 40,
    address: "2 Larkspur Square, Nottingham",
    image: "/images/buildings/placeholder.jpg",
    postcode: "NG7 1BN",
  },
];

// Type definition for building data
export interface Building {
  name: string;
  units: number;
  address: string;
  image: string;
  postcode: string;
}

// Helper function to get buildings by search term
export function searchBuildings(searchTerm: string): Building[] {
  const term = searchTerm.toLowerCase();
  return dummyBuildings.filter(building => 
    building.name.toLowerCase().includes(term) ||
    building.address.toLowerCase().includes(term) ||
    building.postcode.toLowerCase().includes(term)
  );
}

// Helper function to get building by name
export function getBuildingByName(name: string): Building | undefined {
  return dummyBuildings.find(building => 
    building.name.toLowerCase() === name.toLowerCase()
  );
}

// Helper function to get total units across all buildings
export function getTotalUnits(): number {
  return dummyBuildings.reduce((total, building) => total + building.units, 0);
} 
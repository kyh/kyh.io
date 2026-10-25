// The places the map names and search finds. Heights are the ground's above the ellipsoid
// Google's tiles stand on: in San Francisco that is about 32 m below sea level, so a place's
// height is its elevation less 32.

const GEOID = -32;

export interface Place {
  name: string;
  lat: number;
  lon: number;
  height: number;
}

const place = (name: string, lat: number, lon: number, elevation: number): Place => ({
  height: elevation + GEOID,
  lat,
  lon,
  name,
});

export const PLACES: Place[] = [
  place("Ferry Building", 37.7955, -122.3937, 3),
  place("Salesforce Tower", 37.7897, -122.3972, 5),
  place("Transamerica Pyramid", 37.7952, -122.4028, 10),
  place("Coit Tower", 37.8024, -122.4058, 87),
  place("Pier 39", 37.8087, -122.4098, 3),
  place("Chinatown", 37.7908, -122.4058, 15),
  place("Union Square", 37.788, -122.4075, 20),
  place("Oracle Park", 37.7786, -122.3893, 3),
  place("Bay Bridge", 37.7983, -122.3778, 60),
  place("Lombard Street", 37.8021, -122.4187, 60),
  place("City Hall", 37.7793, -122.4193, 20),
  place("Alcatraz", 37.8267, -122.423, 40),
  place("Palace of Fine Arts", 37.8029, -122.4484, 5),
  place("Golden Gate Bridge", 37.8199, -122.4783, 70),
  place("Painted Ladies", 37.7763, -122.4328, 60),
  place("Mission Dolores", 37.7642, -122.427, 25),
  place("Dolores Park", 37.7596, -122.4269, 35),
  place("Twin Peaks", 37.7544, -122.4477, 280),
  place("de Young", 37.7715, -122.4687, 50),
];

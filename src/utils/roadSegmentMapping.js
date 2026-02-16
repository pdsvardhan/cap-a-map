// Road Segment ID -> Road Name mapping
// Segment IDs are assigned at load time: road reserve polygons sorted south->north, west->east
// Only named road segments need entries here (not all ~3,750)
//
// Source: User's mapping table (Book1.xlsx)
// Status legend:
//   Done = Fully mapped on the map
//   Weird1 = Section or whole road only clickable when zoomed out
//   Weird2 = Section or whole road not clickable at some zoom levels
//   Pending = Needs further investigation

export const SEGMENT_TO_ROAD = {
  // E1 (3 segments)
  3745: 'E1',
  3735: 'E1',
  3403: 'E1',
  // E2
  3655: 'E2',
  // E3
  2524: 'E3',
  // E4
  3130: 'E4',
  // E5
  2439: 'E5',
  // E6
  2702: 'E6',
  // E7
  2303: 'E7',
  // E8
  1733: 'E8',
  // E9
  1194: 'E9',
  // E10
  856: 'E10',
  // E11
  620: 'E11',
  // E12
  503: 'E12',
  // E13
  362: 'E13',
  // E14
  208: 'E14',
  // E15 (Weird1: two parts, right/west side has zoom issues)
  90: 'E15',
  // E16 (Pending: road goes out of city bounds into black zone)
  16: 'E16',
  // N1
  1067: 'N1',
  // N2
  1701: 'N2',
  // N3A
  1744: 'N3A',
  // N3B
  608: 'N3B',
  // N4 (Weird2: top/north and bottom/south parts not clickable)
  1233: 'N4',
  // N5: no segment ID found — entire road not clickable
  // N6 (Weird2: only 30-40% clickable)
  72: 'N6',
  // N7 (Weird2: only 30-40% clickable)
  95: 'N7',
  // N8 (Weird2: only 30-40% clickable)
  91: 'N8',
  // N9 (Weird2: bottom part not clickable)
  2641: 'N9',
  // N10 (9 segments — merge all)
  107: 'N10',
  270: 'N10',
  410: 'N10',
  772: 'N10',
  1436: 'N10',
  2057: 'N10',
  2537: 'N10',
  2851: 'N10',
  3135: 'N10',
  3300: 'N10',
  // N11 (8 segments — merge all)
  1029: 'N11',
  1336: 'N11',
  2084: 'N11',
  2563: 'N11',
  2867: 'N11',
  3183: 'N11',
  3410: 'N11',
  3606: 'N11',
  // N12 (Weird2: top part not clickable)
  1488: 'N12',
  // N13 (Weird2: top part not clickable)
  1420: 'N13',
  // N14 (Weird2: top part not clickable)
  1479: 'N14',
  // N15 (Pending: clickable when zoomed out, not when zoomed in)
  2705: 'N15',
  // N16
  2701: 'N16',
  // N17 (Weird2: bottom part not clickable)
  3318: 'N17',
  // N18
  1497: 'N18',
}

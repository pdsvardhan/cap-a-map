/**
 * Amaravati Capital City - Road Segment to Road Name Mapping
 *
 * Only large anchor segments (>= 100,000 Sq.Yards reserve area) are kept.
 * These are the primary identifiable segments for each grid road.
 * The gap-fill algorithm chains smaller corridor segments from these anchors.
 * Total: 15 anchor segments across 13 named roads.
 *
 * Users can add more roads via the Road Mode naming feature (persisted in localStorage).
 */

export const SEGMENT_TO_ROAD = {
  // E-roads (east-west)
  3403: 'E1',    // 146,403 SqYd
  2702: 'E6',    // 405,927 SqYd
  2304: 'E7',    // 824,486 SqYd
  620: 'E11',    // 414,836 SqYd
  503: 'E12',    // 488,126 SqYd
  362: 'E13',    // 758,998 SqYd
  208: 'E14',    // 507,694 SqYd
  90: 'E15',     // 237,616 SqYd
  16: 'E16',     // 260,721 SqYd

  // N-roads (north-south)
  72: 'N6',      // 851,363 SqYd
  95: 'N7',      // 706,602 SqYd
  91: 'N8',      // 750,502 SqYd
  608: 'N3B',    // 201,772 SqYd
  107: 'N10',    // 138,127 SqYd
  772: 'N10',    // 180,131 SqYd
}

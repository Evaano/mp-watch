/**
 * Parties: their names, and the colours they are known by.
 *
 * The roster prints a bare code — MDP, PNC, DEM — which tells a reader outside
 * Maldivian politics nothing at all. Both the full name and the colour are
 * external facts, so each carries its source, the same way a comparator does.
 *
 * TWO DIFFERENT KINDS OF FACT, and the difference is the point:
 *
 *   `colour`  is the colour the party is *stated* to have, in words, by the
 *             source cited. That is all any source publishes.
 *   the hexes are OURS. No party, and not the Elections Commission that
 *             registers them, publishes a hex value. We pick one per theme to
 *             render the stated colour legibly, and that choice is an
 *             editorial rendering of a sourced fact, not the fact itself.
 *
 * Two parties have no published colour at all — checked against both the
 * Wikipedia infoboxes that carry it for the others and the Elections
 * Commission's own register. They get no colour here rather than a guess, and
 * the parties page says so. An invented colour would be indistinguishable
 * from a sourced one at a glance, which is the whole problem.
 */

export interface Party {
  /** The code exactly as the Majlis roster prints it. */
  code: string;
  name: string;
  /** The colour as the source states it, in words. `null` where none is published. */
  colour: string | null;
  sourceTitle: string;
  sourceUrl: string;
}

const EC = "Elections Commission of Maldives";
const WIKI = "Wikipedia";

export const PARTIES: Party[] = [
  {
    code: "MDP",
    name: "Maldivian Democratic Party",
    colour: "Yellow",
    sourceTitle: `${WIKI}: Maldivian Democratic Party`,
    sourceUrl: "https://en.wikipedia.org/wiki/Maldivian_Democratic_Party",
  },
  {
    code: "PPM",
    name: "Progressive Party of Maldives",
    colour: "Pink",
    sourceTitle: `${WIKI}: Progressive Party of Maldives`,
    sourceUrl: "https://en.wikipedia.org/wiki/Progressive_Party_of_Maldives",
  },
  {
    code: "PNC",
    name: "People's National Congress",
    colour: "Turquoise",
    sourceTitle: `${WIKI}: People's National Congress`,
    sourceUrl:
      "https://en.wikipedia.org/wiki/People%27s_National_Congress_(Maldives)",
  },
  {
    code: "JP",
    name: "Jumhooree Party",
    colour: "Red",
    sourceTitle: `${WIKI}: Jumhooree Party`,
    sourceUrl: "https://en.wikipedia.org/wiki/Jumhooree_Party",
  },
  {
    code: "AP",
    name: "Adhaalath Party",
    colour: "Green",
    sourceTitle: `${WIKI}: Adhaalath Party`,
    sourceUrl: "https://en.wikipedia.org/wiki/Adhaalath_Party",
  },
  {
    code: "DEM",
    // The infobox gives "Baby Blue, Black, White". Only the first is a mark a
    // reader could pick out of a row, so it is the one rendered, and the
    // stated colour below keeps all three so the page does not quietly narrow
    // what the source says.
    name: "The Democrats",
    colour: "Baby blue, black and white",
    sourceTitle: `${WIKI}: The Democrats`,
    sourceUrl: "https://en.wikipedia.org/wiki/The_Democrats_(Maldives)",
  },
  {
    code: "MDA",
    name: "Maldives Development Alliance",
    colour: null,
    sourceTitle: `${EC}: Maldives Development Alliance`,
    sourceUrl: "https://elections.gov.mv/en/political-parties/21",
  },
  {
    code: "MNP",
    name: "Maldives National Party",
    colour: null,
    sourceTitle: `${EC}: Maldives National Party`,
    sourceUrl: "https://www.elections.gov.mv/en/political-parties/26",
  },
];

const BY_CODE = new Map(PARTIES.map((p) => [p.code, p]));

export function party(code: string | null | undefined): Party | undefined {
  return code ? BY_CODE.get(code) : undefined;
}

/**
 * How to describe a seat with no party against it.
 *
 * `IND` is a member who stood as an independent, which the roster states.
 * An empty party is the roster recording nothing, which is a different fact
 * and is never merged into Independent — six independents crossed to PNC
 * within four days of the 2024 election, so the distinction carries weight.
 */
export const INDEPENDENT_CODE = "IND";

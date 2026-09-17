import type { Metadata } from "next";
import Link from "next/link";
import { Numeral } from "@/components/Numeral";
import { StatRow, StatTile } from "@/components/StatTile";
import { MINIMUM_WAGE_MONTHLY } from "@/lib/comparators";
import { dict } from "@/lib/i18n";
import { registry } from "@/lib/registry";
import type { PoliticalPost, PostRank } from "@/lib/schema";

export const metadata: Metadata = {
  title: dict.appointeesHeading,
  description: dict.appointeesIntro,
};

const RANK_LABEL: Record<PostRank, string> = {
  minister: "Minister",
  "state-minister": "Minister of State",
  "deputy-minister": "Deputy Minister",
  "senior-political-director": "Senior Political Director",
  "political-director": "Political Director",
};

/**
 * Identical rows collapsed into one, carrying a count.
 *
 * The Foreign Affairs table is 268 rows and Education is 46, none of which
 * name anybody, so printing them one by one would be 300 lines of the same
 * four figures. Grouping loses nothing: the signature includes every
 * component, so two rows only merge when the document says the same thing
 * twice. Finance is never grouped, because there the names are the point.
 */
function grouped(posts: PoliticalPost[]) {
  const out = new Map<string, { post: PoliticalPost; posts: number }>();
  for (const post of posts) {
    const key = [
      post.designation,
      post.jobType ?? "",
      post.basic ?? "",
      post.statedTotal ?? "",
      post.components.map((c) => `${c.label}:${c.amount}`).join(","),
    ].join("|");
    const seen = out.get(key);
    if (seen) seen.posts += post.posts;
    else out.set(key, { post, posts: post.posts });
  }
  return [...out.values()];
}

/** The component labels this body prints, in the order its document prints them. */
function labelsOf(posts: PoliticalPost[]) {
  const labels: string[] = [];
  for (const post of posts) {
    for (const component of post.components) {
      if (!labels.includes(component.label)) labels.push(component.label);
    }
  }
  return labels;
}

function amountFor(post: PoliticalPost, label: string) {
  return post.components.find((c) => c.label === label)?.amount;
}

/**
 * A printed nil renders as a dash, the way the document prints it.
 *
 * The CSV keeps 0 and blank apart on purpose - one is the ministry saying
 * this post gets nothing, the other is the ministry not saying - and a grid
 * of zeroes buries the figures that matter. The dash preserves both the
 * distinction and the document's own look.
 */
function Amount({ value }: { value: number | undefined }) {
  if (value === undefined) return null;
  if (value === 0) return <span className="text-ink-muted">-</span>;
  return <Numeral value={value} />;
}

const TH = "py-2 pe-2 text-start font-medium sm:pe-4 text-ink-muted";
const TH_END = "py-2 pe-2 text-end font-medium sm:pe-4 text-ink-muted";
const TD = "py-2 pe-2 sm:pe-4";
const TD_END = "py-2 pe-2 text-end sm:pe-4";

export default function AppointeesPage() {
  const coverage = registry.politicalPostCoverage();
  const ladder = registry.rankLadder();
  const exceptions = ladder.flatMap((rung) =>
    rung.differing.map((d) => ({ rung, ...d })),
  );
  const bodyName = new Map(coverage.map((c) => [c.bodyId, c.bodyName]));
  const lowest = ladder[ladder.length - 1];

  // The ladder leads with the four ranks below minister: those are the ones
  // every ministry fills, and the tile row holds four.
  const rungs = ladder.filter((r) => r.rank !== "minister");
  const aggregate = registry
    .politicalPosts()
    .filter((p) => p.statedTotalRange || p.posts > 1);
  const perPost = coverage.filter((c) => c.answerKind === "per-post");

  const noteFor: Partial<Record<string, string>> = {
    "foreign-affairs": dict.appointeesForeignNote,
    "health-family-welfare": dict.appointeesHealthOfficeNote,
    finance: dict.appointeesFinanceNote,
    "education-higher-education": dict.appointeesEducationNote,
  };

  return (
    <div className="flex flex-col gap-14">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {dict.appointeesHeading}
        </h1>
        <p className="mt-3 max-w-[62ch] text-ink-muted">
          {dict.appointeesIntro}
        </p>
      </header>

      {/* The lead finding: separate ministries printing the same rates. */}
      <section>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {dict.appointeesLadderHeading}
        </h2>
        <div className="mt-5">
          <StatRow cols={4}>
            {rungs.map((rung) => (
              <StatTile
                key={rung.rank}
                label={RANK_LABEL[rung.rank]}
                value={<Numeral value={rung.basic} currency />}
                note={`${dict.perMonth}, plus ${rung.livingLabels.join(" / ")} of MVR ${rung.living.toLocaleString("en-US")}`}
              />
            ))}
          </StatRow>
        </div>
        <p className="label-note mt-4 max-w-[62ch] text-ink-muted">
          <span className="rounded-card bg-surface-sunken px-1.5 py-0.5">
            {dict.inferredLabel}
          </span>{" "}
          {dict.appointeesLadderNote}
        </p>
        <p className="mt-4 max-w-[62ch] text-sm text-ink-muted">
          {dict.appointeesMinWageNote(lowest.living, MINIMUM_WAGE_MONTHLY.value)}
        </p>

        {exceptions.length ? (
          <div className="mt-5 rounded-card bg-surface-sunken p-4">
            <h3 className="label-eyebrow text-ink-muted">
              {dict.appointeesLadderExceptions}
            </h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {exceptions.map((e) => (
                <li key={`${e.rung.rank}-${e.bodyId}`}>
                  {dict.appointeesLadderException(
                    bodyName.get(e.bodyId) ?? e.bodyId,
                    RANK_LABEL[e.rung.rank],
                    e.readings.join("; "),
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-5 max-w-[62ch] border-s-2 border-line-strong ps-4 text-sm text-ink-muted">
          {dict.appointeesNoTotalNote}
        </p>
      </section>

      {/* Coverage sits second, not last: a short ladder read without it looks
          like the whole picture, and it is not. */}
      <section>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {dict.appointeesCoverageHeading}
        </h2>
        <div
          className="mt-5 overflow-x-auto"
          role="region"
          tabIndex={0}
          aria-label={dict.colBody}
        >
          <table className="w-full border-collapse text-xs sm:text-sm">
            <caption className="sr-only">{dict.appointeesCoverageHeading}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={TH}>
                  {dict.colBody}
                </th>
                <th scope="col" className={TH}>
                  {dict.colAsOf}
                </th>
                <th scope="col" className={TH}>
                  {dict.colAnswer}
                </th>
                <th scope="col" className={TH_END}>
                  {dict.colPostsStated}
                </th>
                <th scope="col" className="py-2 text-end font-medium text-ink-muted">
                  {dict.colPostsItemised}
                </th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((body) => (
                <tr key={body.bodyId} className="border-b border-line/60 align-top">
                  <td className={TD}>
                    {body.bodyName}
                    {body.note ? (
                      <span className="label-note mt-1 block max-w-[52ch] text-ink-muted">
                        {body.note}
                      </span>
                    ) : null}
                  </td>
                  <td className={`${TD} numeral whitespace-nowrap`}>
                    {body.asOf ?? (
                      <span className="text-ink-muted">{dict.notStated}</span>
                    )}
                  </td>
                  <td className={TD}>
                    {body.answerKind === "per-post"
                      ? dict.answerPerPost
                      : body.answerKind === "aggregate"
                        ? dict.answerAggregate
                        : dict.answerUnreadable}
                  </td>
                  <td className={TD_END}>
                    {body.postsStated !== undefined ? (
                      <Numeral value={body.postsStated} />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2 text-end">
                    <Numeral value={body.postsItemised} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* One table per body, each rendering its own document's columns. */}
      <section className="flex flex-col gap-10">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {dict.appointeesBodiesHeading}
        </h2>
        <p className="label-note max-w-[62ch] text-ink-muted">
          {dict.appointeesNilNote}
        </p>

        {perPost.map((body) => {
          const posts = registry.postsByBody(body.bodyId);
          const labels = labelsOf(posts);
          const named = posts.some((p) => p.holderName);
          const rows = named
            ? posts.map((post) => ({ post, posts: post.posts }))
            : grouped(posts);
          const showTotal = posts.some((p) => p.statedTotal !== undefined);

          return (
            <div key={body.bodyId}>
              <h3 className="font-medium">{body.bodyName}</h3>
              {noteFor[body.bodyId] ? (
                <p className="mt-2 max-w-[62ch] text-sm text-ink-muted">
                  {noteFor[body.bodyId]}
                </p>
              ) : null}
              <div
                className="mt-4 overflow-x-auto"
                role="region"
                tabIndex={0}
                aria-label={body.bodyName}
              >
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <caption className="sr-only">{body.bodyName}</caption>
                  <thead>
                    <tr className="border-b border-line">
                      {named ? (
                        <th scope="col" className={TH}>
                          {dict.colHolder}
                        </th>
                      ) : null}
                      <th scope="col" className={TH}>
                        {dict.colDesignation}
                      </th>
                      {named ? (
                        <>
                          <th scope="col" className={TH}>
                            {dict.colFrom}
                          </th>
                          <th scope="col" className={TH}>
                            {dict.colUntil}
                          </th>
                        </>
                      ) : (
                        <th scope="col" className={TH_END}>
                          {dict.colPosts}
                        </th>
                      )}
                      <th scope="col" className={TH_END}>
                        {dict.colBasic}
                      </th>
                      {labels.map((label) => (
                        <th key={label} scope="col" className={TH_END}>
                          {label}
                        </th>
                      ))}
                      {showTotal ? (
                        <th scope="col" className="py-2 text-end font-medium text-ink-muted">
                          {dict.colStatedTotal}
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ post, posts: count }) => (
                      <tr key={post.id} className="border-b border-line/60">
                        {named ? (
                          <td className={`${TD} whitespace-nowrap`}>
                            {post.personId ? (
                              <Link
                                href={`/mp/${post.personId}`}
                                className="text-accent-ink underline underline-offset-4"
                              >
                                {post.holderName}
                              </Link>
                            ) : (
                              post.holderName
                            )}
                          </td>
                        ) : null}
                        <td className={TD}>
                          {post.designation}
                          {post.jobType ? (
                            <span className="label-note ms-2 rounded-card bg-surface-sunken px-1.5 py-0.5 text-ink-muted">
                              {post.jobType}
                            </span>
                          ) : null}
                        </td>
                        {named ? (
                          <>
                            <td className={`${TD} numeral whitespace-nowrap`}>
                              {post.occupiedFrom ?? ""}
                            </td>
                            <td className={`${TD} numeral whitespace-nowrap`}>
                              {post.terminatedOn ?? ""}
                            </td>
                          </>
                        ) : (
                          <td className={TD_END}>
                            <Numeral value={count} />
                          </td>
                        )}
                        <td className={TD_END}>
                          <Amount value={post.basic} />
                        </td>
                        {labels.map((label) => (
                          <td key={label} className={TD_END}>
                            <Amount value={amountFor(post, label)} />
                          </td>
                        ))}
                        {showTotal ? (
                          <td className="py-2 text-end">
                            <Amount value={post.statedTotal} />
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {showTotal ? (
                <p className="label-note mt-3 max-w-[62ch] text-ink-muted">
                  {dict.appointeesForeignTotalNote}
                </p>
              ) : null}
            </div>
          );
        })}
      </section>

      {/* Counts and rates, never multiplied together. */}
      <section>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {dict.appointeesAggregateHeading}
        </h2>
        <div
          className="mt-5 overflow-x-auto"
          role="region"
          tabIndex={0}
          aria-label={dict.colBody}
        >
          <table className="w-full border-collapse text-xs sm:text-sm">
            <caption className="sr-only">{dict.appointeesAggregateHeading}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={TH}>
                  {dict.colBody}
                </th>
                <th scope="col" className={TH}>
                  {dict.colDesignation}
                </th>
                <th scope="col" className={TH_END}>
                  {dict.colPosts}
                </th>
                <th scope="col" className={TH_END}>
                  {dict.colBasic}
                </th>
                <th scope="col" className="py-2 text-end font-medium text-ink-muted">
                  {dict.colRange}
                </th>
              </tr>
            </thead>
            <tbody>
              {aggregate.map((post) => (
                <tr key={post.id} className="border-b border-line/60">
                  <td className={TD}>{post.office}</td>
                  <td className={TD}>{post.designation}</td>
                  <td className={TD_END}>
                    <Numeral value={post.posts} />
                  </td>
                  <td className={TD_END}>
                    {post.basic !== undefined ? (
                      <Numeral value={post.basic} />
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="py-2 text-end whitespace-nowrap">
                    {post.statedTotalRange ? (
                      <>
                        <Numeral value={post.statedTotalRange.min} />
                        {" - "}
                        <Numeral value={post.statedTotalRange.max} />
                      </>
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-[62ch] border-s-2 border-line-strong ps-4 text-sm text-ink-muted">
          {dict.appointeesRangeNote}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {dict.appointeesSourcesHeading}
        </h2>
        <ul className="mt-4 flex flex-col gap-3 text-sm">
          {coverage.map((body) => {
            const source = registry.source(body.sources[0]);
            if (!source) return null;
            return (
              <li key={body.bodyId}>
                <span className="font-medium">{source.title}</span>
                <span className="block text-ink-muted">{source.publisher}</span>
                {source.reference ? (
                  <span className="label-note block text-ink-muted">
                    {dict.appointeesReference}: {source.reference}
                  </span>
                ) : null}
                <a
                  href={source.url}
                  className="mt-1 inline-block text-accent-ink underline underline-offset-4"
                  rel="noreferrer"
                >
                  {dict.appointeesViewDocument}
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

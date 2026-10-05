export const categories = [
  { slug: "animation", label: "Animation" },
  { slug: "action-adventure", label: "Action" },
  { slug: "comedy", label: "Comedy" },
  { slug: "drama", label: "Drama" },
  { slug: "horror", label: "Horror" },
  { slug: "scifi-fantasy", label: "Sci-fi" },
  { slug: "classic", label: "Classic" },
];

const releaseYears = {
  tt2948356: 2016,
  tt0120363: 1999,
  tt1049413: 2009,
  tt4925292: 2017,
  tt0114709: 1995,
  tt0266543: 2003,
  tt0910970: 2007,
  tt0317705: 2004,
  tt0382932: 2005,
  tt0265086: 2001,
  tt0096283: 1988,
  tt0245429: 2001,
  tt0110357: 1994,
  tt0451279: 2017,
  tt1375666: 2010,
  tt0816692: 2014,
  tt0133093: 1999,
  tt0088763: 1985,
  tt0068646: 1972,
  tt0076759: 1977,
  tt0109830: 1994,
  tt0111161: 1994,
  tt0120737: 2001,
  tt0110912: 1994,
  tt0080684: 1980,
  tt0099685: 1990,
  tt0102926: 1991,
  tt0317248: 2003,
};

export function normalizeMovie(record, category) {
  const imdbId =
    record.imdbId || `${category.slug}-${record.id ?? record.title}`;
  return {
    id: imdbId,
    imdbId: record.imdbId,
    title: record.title,
    poster: record.posterURL,
    year: releaseYears[record.imdbId] ?? null,
    genre: category.label,
  };
}

export function normalizeOmdbMovie(record) {
  return {
    id: record.imdbID,
    imdbId: record.imdbID,
    title: record.Title,
    poster: record.Poster && record.Poster !== "N/A" ? record.Poster : null,
    year: Number.parseInt(record.Year, 10) || null,
    genre: "OMDb",
  };
}

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Clapperboard,
  Film,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { categories, normalizeMovie, normalizeOmdbMovie } from "./data.js";

const API_ROOT = "https://api.sampleapis.com/movies";
const OMDB_ROOT = "https://www.omdbapi.com/";
const omdbApiKey = import.meta.env.VITE_OMDB_API_KEY;
const savedKey = "reel-index-watchlist";

function useCatalog() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled(
      categories.map(async (category) => {
        const response = await fetch(`${API_ROOT}/${category.slug}`);
        if (!response.ok) throw new Error(`Could not load ${category.label}`);
        return (await response.json()).map((record) =>
          normalizeMovie(record, category),
        );
      }),
    ).then((results) => {
      if (!active) return;
      const catalog = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      );
      const unique = [
        ...new Map(catalog.map((movie) => [movie.id, movie])).values(),
      ];
      setMovies(unique);
      setError(unique.length === 0);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { movies, loading, error };
}

function Header({ savedCount, onOpenWatchlist }) {
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="Reel Index home">
        <span className="brand-mark">
          <Clapperboard size={18} strokeWidth={2.2} />
        </span>
        <span>Reel Index</span>
      </Link>
      <nav className="header-nav" aria-label="Main navigation">
        <a className="nav-link active" href="/#discover">
          Discover
        </a>
        <a className="nav-link" href="/#library">
          The library
        </a>
      </nav>
      <button className="saved-link" type="button" onClick={onOpenWatchlist}>
        <Bookmark size={15} /> <span>Watchlist</span>
        <span className="saved-count">{savedCount}</span>
      </button>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <Link to="/" className="footer-brand">
        Reel Index <span>© 2026</span>
      </Link>
      <span className="footer-note">A good film is always worth finding.</span>
      <a
        href="https://sampleapis.com/api-list/movies"
        target="_blank"
        rel="noreferrer"
      >
        Movie data <ArrowUpRight size={12} />
      </a>
    </footer>
  );
}

function MovieCard({ movie, saved, onToggleSaved }) {
  return (
    <article className="movie-card">
      <Link
        to={`/movie/${encodeURIComponent(movie.id)}`}
        state={{ movie }}
        className="poster-link"
        aria-label={`View ${movie.title}`}
      >
        {movie.poster ? (
          <>
            <img
              className="movie-poster"
              src={movie.poster}
              alt={`${movie.title} poster`}
              loading="lazy"
              onError={(event) => {
                event.currentTarget.hidden = true;
                event.currentTarget.nextElementSibling.hidden = false;
              }}
            />
            <div className="poster-placeholder" hidden>
              <Film size={30} />
            </div>
          </>
        ) : (
          <div className="poster-placeholder">
            <Film size={30} />
          </div>
        )}
      </Link>
      <div className="movie-meta">
        <div className="movie-title-line">
          <Link
            to={`/movie/${encodeURIComponent(movie.id)}`}
            state={{ movie }}
            className="movie-title"
          >
            {movie.title}
          </Link>
          <button
            className={`save-button ${saved ? "is-saved" : ""}`}
            onClick={() => onToggleSaved(movie.id)}
            aria-label={
              saved
                ? `Remove ${movie.title} from watchlist`
                : `Add ${movie.title} to watchlist`
            }
            title={saved ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="movie-subtitle">
          {movie.year && (
            <>
              <span>{movie.year}</span>
              <span className="meta-dot">·</span>
            </>
          )}
          <span>{movie.genre}</span>
        </div>
      </div>
    </article>
  );
}

function Home({
  movies,
  loading,
  error,
  saved,
  onToggleSaved,
  watchlistOnly,
  onWatchlistChange,
}) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All films");
  const [sort, setSort] = useState("featured");
  const [apiMovies, setApiMovies] = useState([]);
  const [apiSearch, setApiSearch] = useState("idle");
  useEffect(() => {
    const searchTerm = query.trim();
    if (searchTerm.length < 2 || !omdbApiKey) {
      setApiMovies([]);
      setApiSearch(searchTerm.length >= 2 ? "unconfigured" : "idle");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setApiSearch("loading");
      fetch(
        `${OMDB_ROOT}?apikey=${encodeURIComponent(omdbApiKey)}&type=movie&s=${encodeURIComponent(searchTerm)}`,
        { signal: controller.signal },
      )
        .then((response) => response.json())
        .then((result) => {
          if (result.Response !== "True") {
            setApiMovies([]);
            setApiSearch(
              result.Error === "Movie not found!" ? "empty" : "error",
            );
            return;
          }
          setApiMovies((result.Search || []).map(normalizeOmdbMovie));
          setApiSearch("success");
        })
        .catch((reason) => {
          if (reason.name !== "AbortError") {
            setApiMovies([]);
            setApiSearch("error");
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);
  const featuredMovie =
    movies.find((movie) => movie.imdbId === "tt0114709") ||
    movies.find((movie) => movie.poster) ||
    movies[0];
  const visibleMovies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = [...movies, ...apiMovies].filter((movie, index, all) => {
      if (all.findIndex((item) => item.id === movie.id) !== index) return false;
      const matchesQuery =
        !normalizedQuery || movie.title.toLowerCase().includes(normalizedQuery);
      const matchesGenre = genre === "All films" || movie.genre === genre;
      const matchesSaved = !watchlistOnly || saved.includes(movie.id);
      return matchesQuery && matchesGenre && matchesSaved;
    });
    if (sort === "newest")
      filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
    if (sort === "oldest")
      filtered.sort((a, b) => (a.year || Infinity) - (b.year || Infinity));
    if (sort === "title")
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    return filtered;
  }, [movies, apiMovies, query, genre, sort, saved, watchlistOnly]);

  const apiSearchMessage = {
    unconfigured: "Add VITE_OMDB_API_KEY to enable OMDb search.",
    loading: "Searching OMDb...",
    empty: "No OMDb matches.",
    error: "OMDb search is unavailable right now.",
  }[apiSearch];

  return (
    <>
      <main id="discover">
        <section className="spotlight-section">
          <div className="spotlight-copy">
            <h1>
              Find the
              <br />
              <em>right film.</em>
            </h1>
            <p className="spotlight-description">
              Browse the collection and find something worth your evening.
            </p>
            {featuredMovie && (
              <div className="featured-caption">
                <strong>{featuredMovie.title}</strong>
                <span>
                  {featuredMovie.year ? `${featuredMovie.year} · ` : ""}
                  {featuredMovie.genre}
                </span>
                <Link
                  className="featured-link"
                  to={`/movie/${encodeURIComponent(featuredMovie.id)}`}
                >
                  View film <ArrowUpRight size={14} />
                </Link>
              </div>
            )}
          </div>
          <div
            className="spotlight-visual"
            aria-label={
              featuredMovie
                ? `Featured film: ${featuredMovie.title}`
                : "Featured movie poster"
            }
          >
            {featuredMovie?.poster && (
              <img
                className="spotlight-poster"
                src={featuredMovie.poster}
                alt={`${featuredMovie.title} poster`}
                onError={(event) => {
                  event.currentTarget.hidden = true;
                  event.currentTarget.nextElementSibling.hidden = false;
                }}
              />
            )}
            <div
              className="spotlight-placeholder"
              hidden={Boolean(featuredMovie?.poster)}
            >
              <Film size={38} />
            </div>
          </div>
        </section>

        <section className="library-section" id="library">
          <div className="section-heading">
            <div>
              <h2>Browse films</h2>
            </div>
            <span className="collection-count">
              {loading ? "Loading films" : `${visibleMovies.length} films`}
            </span>
          </div>

          <div className="search-row">
            <label className="search-box">
              <Search size={18} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title"
                aria-label="Search movie titles"
              />
              {query && (
                <button
                  className="clear-search"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </label>
            <label className="filter-select">
              <SlidersHorizontal size={15} />
              <span className="sr-only">Filter by genre</span>
              <select
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
              >
                <option>All films</option>
                {[...new Set(movies.map((movie) => movie.genre))]
                  .sort()
                  .map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                {(apiMovies.length > 0 || genre === "OMDb") && (
                  <option>OMDb</option>
                )}
              </select>
            </label>
            <label className="filter-select sort-select">
              <ArrowDownWideNarrow size={15} />
              <span className="sr-only">Sort movies</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="newest">Year: newest</option>
                <option value="oldest">Year: oldest</option>
                <option value="title">Title: A–Z</option>
              </select>
            </label>
          </div>

          <div className="catalog-bar">
            <button
              className={`text-filter ${watchlistOnly ? "filter-active" : ""}`}
              onClick={() => onWatchlistChange(!watchlistOnly)}
            >
              <Bookmark
                size={13}
                fill={watchlistOnly ? "currentColor" : "none"}
              />{" "}
              Saved films
            </button>
            <span className="api-search-status" aria-live="polite">
              {apiSearchMessage || "OMDb"}
            </span>
          </div>

          {loading ? (
            <div className="status-panel">
              <span className="loader" />
              <p>
                Gathering the collection
                <span className="loading-dots">...</span>
              </p>
            </div>
          ) : error ? (
            <div className="status-panel">
              <Film size={27} />
              <p>We couldn't reach the film archive.</p>
              <span>Check your connection and refresh to try again.</span>
            </div>
          ) : visibleMovies.length ? (
            <div className="movie-grid">
              {visibleMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  saved={saved.includes(movie.id)}
                  onToggleSaved={onToggleSaved}
                />
              ))}
            </div>
          ) : (
            <div className="status-panel">
              <Search size={25} />
              <p>No films found for this search.</p>
              <button
                className="reset-button"
                onClick={() => {
                  setQuery("");
                  setGenre("All films");
                  onWatchlistChange(false);
                }}
              >
                Reset filters
              </button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function MovieDetails({ movies, saved, onToggleSaved }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const catalogMovie = movies.find((item) => item.id === id);
  const [apiDetails, setApiDetails] = useState(null);
  const currentApiDetails = apiDetails?.imdbID === id ? apiDetails : null;
  const movie =
    catalogMovie ||
    location.state?.movie ||
    (currentApiDetails
      ? {
          id: currentApiDetails.imdbID,
          imdbId: currentApiDetails.imdbID,
          title: currentApiDetails.Title,
          poster:
            currentApiDetails.Poster !== "N/A"
              ? currentApiDetails.Poster
              : null,
          year: Number.parseInt(currentApiDetails.Year, 10) || null,
          genre: currentApiDetails.Genre || "OMDb",
        }
      : null);

  useEffect(() => {
    setApiDetails(null);
    if (!omdbApiKey || !id.startsWith("tt")) return undefined;
    const controller = new AbortController();
    fetch(
      `${OMDB_ROOT}?apikey=${encodeURIComponent(omdbApiKey)}&plot=full&i=${encodeURIComponent(id)}`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then((result) => {
        if (result.Response === "True") setApiDetails(result);
      })
      .catch((reason) => {
        if (reason.name !== "AbortError") setApiDetails(null);
      });
    return () => controller.abort();
  }, [id]);

  if (!movie)
    return (
      <main className="detail-main">
        <button className="back-link" onClick={() => navigate("/")}>
          <ArrowLeft size={15} /> BACK TO THE INDEX
        </button>
        <div className="status-panel">
          <Film size={27} />
          <p>That film isn't in this collection.</p>
          <Link to="/" className="reset-button">
            Return to the index
          </Link>
        </div>
      </main>
    );

  return (
    <main className="detail-main">
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={15} /> BACK TO THE INDEX
      </button>
      <article className="detail-layout">
        <div className="detail-poster-wrap">
          {movie.poster ? (
            <>
              <img
                className="detail-poster"
                src={movie.poster}
                alt={`${movie.title} poster`}
                onError={(event) => {
                  event.currentTarget.hidden = true;
                  event.currentTarget.nextElementSibling.hidden = false;
                }}
              />
              <div className="poster-placeholder" hidden>
                <Film size={40} />
              </div>
            </>
          ) : (
            <div className="poster-placeholder">
              <Film size={40} />
            </div>
          )}
        </div>
        <div className="detail-copy">
          <p className="eyebrow">
            Film details · {currentApiDetails?.Genre || movie.genre}
          </p>
          <h1>{currentApiDetails?.Title || movie.title}</h1>
          <div className="detail-facts">
            <span>
              {currentApiDetails?.Year ||
                movie.year ||
                "Release year unavailable"}
            </span>
            <span className="meta-dot">·</span>
            <span>{currentApiDetails?.Runtime || movie.genre}</span>
            {currentApiDetails?.imdbRating && (
              <>
                <span className="meta-dot">·</span>
                <span>IMDb {currentApiDetails.imdbRating}</span>
              </>
            )}
          </div>
          <div className="detail-divider" />
          <p className="detail-description">
            {currentApiDetails?.Plot ||
              `A ${movie.genre.toLowerCase()} film in the open movie collection${movie.year ? `, released in ${movie.year}` : ""}.`}
          </p>
          {currentApiDetails?.Director && (
            <p className="detail-credit">
              Directed by {currentApiDetails.Director}
            </p>
          )}
          <div className="detail-actions">
            <button
              className={`watchlist-button ${saved.includes(movie.id) ? "is-saved" : ""}`}
              onClick={() => onToggleSaved(movie.id)}
            >
              <Bookmark
                size={15}
                fill={saved.includes(movie.id) ? "currentColor" : "none"}
              />
              {saved.includes(movie.id)
                ? "In your watchlist"
                : "Add to watchlist"}
            </button>
            {movie.imdbId && (
              <a
                className="imdb-link"
                href={`https://www.imdb.com/title/${movie.imdbId}/`}
                target="_blank"
                rel="noreferrer"
              >
                View on IMDb <ArrowUpRight size={14} />
              </a>
            )}
          </div>
          <div className="detail-index">
            <span>From the open movie index</span>
            <span>{movie.imdbId || "CATALOG ENTRY"}</span>
          </div>
        </div>
      </article>
    </main>
  );
}

export default function App() {
  const navigate = useNavigate();
  const { movies, loading, error } = useCatalog();
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [saved, setSaved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(savedKey) || "[]");
    } catch {
      return [];
    }
  });
  const toggleSaved = (id) =>
    setSaved((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      localStorage.setItem(savedKey, JSON.stringify(next));
      return next;
    });

  return (
    <div className="app-shell">
      <Header
        savedCount={saved.length}
        onOpenWatchlist={() => {
          setWatchlistOnly(true);
          navigate("/#library");
        }}
      />
      <Routes>
        <Route
          path="/"
          element={
            <Home
              movies={movies}
              loading={loading}
              error={error}
              saved={saved}
              onToggleSaved={toggleSaved}
              watchlistOnly={watchlistOnly}
              onWatchlistChange={setWatchlistOnly}
            />
          }
        />
        <Route
          path="/movie/:id"
          element={
            <>
              <MovieDetails
                movies={movies}
                saved={saved}
                onToggleSaved={toggleSaved}
              />
              <Footer />
            </>
          }
        />
      </Routes>
    </div>
  );
}

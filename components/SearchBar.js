"use client";

export default function SearchBar({
  filters,
  onChange,
  onSearch,
  regions = [],
  cities = [],
  categories = [],
}) {
  function handleKeyDown(e) {
    if (e.key === "Enter" && onSearch) {
      e.preventDefault();
      onSearch();
    }
  }

  return (
    <div className="searchBar searchBarAdvanced">
      <input
        type="text"
        name="query"
        placeholder="Buscar evento..."
        value={filters.query}
        onChange={onChange}
        onKeyDown={handleKeyDown}
      />

      <select name="category" value={filters.category} onChange={onChange}>
        <option value="">Categoría</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <select name="region" value={filters.region} onChange={onChange}>
        <option value="">Región</option>
        {regions.map((region) => (
          <option key={region} value={region}>
            {region}
          </option>
        ))}
      </select>

      <select
        name="city"
        value={filters.city}
        onChange={onChange}
        disabled={!filters.region}
      >
        <option value="">Comuna</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>

      <input type="date" name="date" value={filters.date} onChange={onChange} />

      {onSearch && (
        <button
          type="button"
          className="btn btnPrimary searchSubmitButton"
          onClick={onSearch}
        >
          Buscar
        </button>
      )}
    </div>
  );
}
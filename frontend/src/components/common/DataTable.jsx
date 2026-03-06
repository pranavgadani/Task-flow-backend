import React, { useState, useMemo } from "react";

export default function DataTable({
  data = [],
  columns = [],
  onEdit,
  onDelete,
  renderActions,
  rowKey = "_id",
  emptyText = "No records found",
  pageSize = 10,
  searchPlaceholder = "Search...",
}) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search) return data;
    const lowerSearch = search.toLowerCase();
    return data.filter((item) => {
      return columns.some((col) => {
        const value = item[col.key];
        if (value === null || value === undefined) return false;

        // Handle strings, numbers, and arrays/objects by their name
        const stringValue = Array.isArray(value)
          ? value.map((v) => v.name || v).join(" ")
          : typeof value === "object"
            ? value.name || ""
            : String(value);

        return stringValue.toLowerCase().includes(lowerSearch);
      });
    });
  }, [data, search, columns]);

  // Paginate filtered data
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const hasActions = Boolean(onEdit || onDelete || renderActions);

  const getRowKey = (row, index) => {
    if (typeof rowKey === "function") return rowKey(row, index);
    return row?.[rowKey] ?? index;
  };

  return (
    <div className="table-container">
      {/* Search Bar */}
      <div className="table-controls">
        <div className="search-wrapper">
          <span className="search-icon" style={{ display: 'flex', color: '#9ca3af' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /></svg>
          </span>
          <input
            type="text"
            className="search-input"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ fontSize: "13px", color: "#666" }}>
          Total: {filteredData.length} records
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c.key || i} style={{ textAlign: c.align || 'left' }}>{c.header}</th>
            ))}
            {hasActions && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {paginatedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (hasActions ? 1 : 0)} style={{ padding: 16, color: "#6b778c", textAlign: "center" }}>
                {emptyText}
              </td>
            </tr>
          ) : (
            paginatedData.map((row, index) => (
              <tr key={getRowKey(row, index)}>
                {columns.map((c, i) => {
                  const value = row?.[c.key];
                  return (
                    <td key={c.key || i} style={{ textAlign: c.align || 'left' }}>
                      {c.render
                        ? c.render(value, row)
                        : Array.isArray(value)
                          ? value.length > 0 ? value.map(v => v.name || v).join(", ") : "-"
                          : typeof value === "object"
                            ? value?.name || "-"
                            : value ?? "-"}
                    </td>
                  );
                })}

                {hasActions && (
                  <td>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
                      {renderActions ? (
                        renderActions(row)
                      ) : (
                        <>
                          {onEdit && (
                            <button
                              className="btn"
                              onClick={() => onEdit(row)}
                              title="Edit"
                              style={{
                                width: '40px', height: '40px', padding: 0,
                                borderRadius: '50%', color: '#6366f1',
                                boxShadow: 'var(--neu-shadow-sm)'
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              className="btn"
                              onClick={() => onDelete(row?._id)}
                              title="Delete"
                              style={{
                                width: '40px', height: '40px', padding: 0,
                                borderRadius: '50%', color: '#ef4444',
                                boxShadow: 'var(--neu-shadow-sm)'
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-controls" style={{ padding: '16px 24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} records
          </div>
          <div className="pagination-buttons">
            <button
              className="page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{ padding: '0 15px', borderRadius: '12px' }}
            >
              PREV
            </button>

            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                return (
                  <button
                    key={pageNum}
                    className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                return <span key={pageNum} style={{ padding: '0 8px', color: '#94a3b8' }}>...</span>;
              }
              return null;
            })}

            <button
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{ padding: '0 15px', borderRadius: '12px' }}
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import { shared } from "../styles";

const PAGE_SIZE = 10;

export function paginate(items, page) {
  const start = (page - 1) * PAGE_SIZE;
  return { data: items.slice(start, start + PAGE_SIZE), totalPages: Math.ceil(items.length / PAGE_SIZE) };
}

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div style={shared.pagination}>
      <button style={shared.pageBtn} disabled={page === 1} onClick={() => onPageChange(page - 1)}>← Prev</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button key={p} style={p === page ? shared.pageBtnActive : shared.pageBtn} onClick={() => onPageChange(p)}>{p}</button>
      ))}
      <button style={shared.pageBtn} disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>Next →</button>
    </div>
  );
}

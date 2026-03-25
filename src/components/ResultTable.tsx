"use client";

interface ResultTableProps {
  rows: Array<Record<string, unknown>>;
}

export function ResultTable({ rows }: ResultTableProps) {
  if (rows.length === 0) {
    return <p className="emptyState">No preview rows returned.</p>;
  }

  const columns = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>()),
  );

  return (
    <div className="tableWrap">
      <table className="resultTable">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${index}-${columns.map((column) => String(row[column] ?? "")).join("|")}`}>
              {columns.map((column) => (
                <td key={column}>{formatCell(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (value == null) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

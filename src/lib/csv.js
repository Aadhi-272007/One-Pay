export function buildCsv(rows, columns) {
  const head = columns.map((c) => `"${String(c.label).replace(/"/g, '""')}"`).join(",");
  const body = rows
    .map((row) => columns.map((c) => {
      const v = typeof c.value === "function" ? c.value(row) : row[c.value];
      const s = v === null || v === undefined ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    }).join(","))
    .join("\n");
  return head + "\n" + body;
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
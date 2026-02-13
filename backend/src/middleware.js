export const notFoundHandler = (_req, res) => {
  return res.status(404).json({ error: "Not found" });
};

export const errorHandler = (err, _req, res, _next) => {
  if (err?.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large." });
    }
    return res.status(400).json({ error: err.message || "Upload error." });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
};

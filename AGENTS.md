# Repository agent instructions

## CAD / DWG / DXF automation

When a task involves CAD drawings, DWG, DXF, fabrication drawings, boat trailers, pontoons, marina layouts, hull support geometry, or dimensioned technical drawings, use the opencadstudio MCP server whenever it is available.

If the MCP server is unavailable on Windows, run this command from the repository root:

powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-opencadstudio-mcp.ps1

Then restart the Codex or VS Code agent session and retry the CAD task.

For CAD work:

- Use millimetres and true 1:1 model-space geometry unless the task specifies otherwise.
- Inspect the active document/session and available MCP capabilities before editing.
- Preserve original drawings; do not overwrite a customer/source drawing without a verified save path.
- Prefer OpenCADStudio audit / verified-save operations when available.
- Capture the viewport after major geometry changes for visual review.
- Keep measured dimensions separate from inferred or estimated geometry.
- Do not invent dimensions that were not supplied or derived explicitly.

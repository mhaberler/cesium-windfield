/**
 * Serializes a JavaScript object to a JSON string and triggers a browser download.
 *
 * @param objectToSerialize The JavaScript object to serialize and download.
 * @param filename The desired filename for the downloaded file (e.g., "data.json").
 */
export function downloadObjectAsJson(
  objectToSerialize: object,
  filename: string,
): void {
  if (!objectToSerialize || typeof objectToSerialize !== "object") {
    console.error("Error: Invalid object provided for download.");
    return;
  }
  if (!filename || typeof filename !== "string") {
    console.warn(
      "Warning: Invalid or missing filename. Using 'download.json'.",
    );
    filename = "download.json";
  }
  try {
    const jsonString = JSON.stringify(objectToSerialize, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`Successfully triggered download for ${filename}`);
  } catch (error) {
    console.error("Error during JSON serialization or download:", error);
  }
}

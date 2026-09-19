/**
 * Download, share, and copy-link logic for a wallpaper — used by the
 * Home feed, Wallpaper Detail, and Favorites screens alike, so the
 * behavior (and its fallbacks) only has to be right in one place.
 */
const MediaActions = (() => {
  /**
   * Forces a real file download rather than opening the image in a new
   * tab. Fetches the image as a blob first — a plain `<a download>` on
   * a cross-origin URL gets treated as a normal link by most mobile
   * browsers and just navigates to it instead of downloading.
   *
   * @param {{ image_url: string, id: string, source: string }} wallpaper
   */
  async function downloadWallpaper(wallpaper) {
    try {
      const response = await fetch(wallpaper.image_url, { mode: "cors" });
      if (!response.ok) throw new Error("Image fetch failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const extension = guessExtension(wallpaper.image_url);
      const filename = `j-tech-${wallpaper.source}-${sanitizeId(wallpaper.id)}.${extension}`;

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Give the browser a moment to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
      return true;
    } catch (error) {
      // CORS-blocked or offline — fall back to just opening the image
      // full-size so the user can still long-press-save it manually.
      console.error("Download failed, falling back to opening the image:", error.message);
      window.open(wallpaper.image_url, "_blank", "noopener");
      return false;
    }
  }

  /**
   * @param {{ image_url: string, source_url: string, title: string }} wallpaper
   */
  async function shareWallpaper(wallpaper) {
    const shareData = {
      title: wallpaper.title || "J-Tech Display Wallpaper",
      text: "Check out this wallpaper on J-Tech Display",
      url: wallpaper.source_url || wallpaper.image_url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return "shared";
      } catch (error) {
        if (error.name === "AbortError") return "cancelled"; // user dismissed the share sheet
        // fall through to clipboard fallback below
      }
    }

    return copyLink(shareData.url);
  }

  /**
   * @param {string} url
   * @returns {Promise<"copied"|"failed">}
   */
  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      return "copied";
    } catch (error) {
      console.error("Clipboard write failed:", error.message);
      return "failed";
    }
  }

  function guessExtension(url) {
    const match = /\.(jpe?g|png|webp|gif)(\?|$)/i.exec(url);
    return match ? match[1].toLowerCase() : "jpg";
  }

  function sanitizeId(id) {
    return String(id).replace(/[^a-zA-Z0-9]/g, "-");
  }

  return { downloadWallpaper, shareWallpaper, copyLink };
})();

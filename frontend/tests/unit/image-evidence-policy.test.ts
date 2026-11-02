import { describe, expect, it } from "vitest";
import { imageEvidenceBypass, imageEvidenceHeaders, imageEvidenceURL } from "../support/image-evidence-policy";

describe("opt-in image evidence HOST boundary", () => {
  it("uses only three exact hosts and preserves loopback proxying", () => {
    expect(imageEvidenceBypass).toBe("imagenes.compragamer.com,venex.com.ar,www.venex.com.ar,<-loopback>");
    for (const [host, path] of [["imagenes.compragamer.com", "productos"], ["venex.com.ar", "products_images"], ["www.venex.com.ar", "products_images"]]) {
      expect(imageEvidenceURL(`https://${host}/${path}/photo.webp`, "GET", "image")).toBe(`https://${host}/${path}/photo.webp`);
      expect(imageEvidenceURL(`https://${host.toUpperCase()}:443/${path}/photo.PNG`, "GET", "image")).toBe(`https://${host}/${path}/photo.PNG`);
    }
  });
  it("rejects query, fragment, credentials, private/IP/spoof hosts and non443", () => {
    for (const url of [
      "https://venex.com.ar/products_images/a.png?", "https://venex.com.ar/products_images/a.png?x=1", "https://venex.com.ar/products_images/a.png#", "https://venex.com.ar/products_images/a.png#x",
      "http://venex.com.ar/products_images/a.png", "https://u:p@venex.com.ar/products_images/a.png", "https://venex.com.ar:444/products_images/a.png",
      ...["localhost", "127.0.0.1", "10.0.0.1", "[::1]", "venex.com.ar.evil.test", "sub.venex.com.ar", "venex.com.ar."].map(host => `https://${host}/products_images/a.png`),
      "https://venex.com.ar/products_images/a.svg", "https://venex.com.ar/other/a.png", "https://venex.com.ar/products_images/a.png ", "not a URL",
    ]) expect(imageEvidenceURL(url, "GET", "image")).toBeNull();
  });
  it("rejects all external non-image or non-GET traffic", () => {
    const url = "https://venex.com.ar/products_images/a.jpg";
    for (const type of ["document", "script", "font", "xhr", "fetch", "stylesheet"]) expect(imageEvidenceURL(url, "GET", type)).toBeNull();
    for (const method of ["POST", "HEAD", "PUT", "DELETE"]) expect(imageEvidenceURL(url, method, "image")).toBeNull();
  });
  it("strips identity/referrer headers case-insensitively without mutating input", () => {
    const headers = { Authorization: "synthetic", Referer: "synthetic", "X-UJ-Source": "synthetic", "X-CSRF-Token": "synthetic", "X-XSRF-Token": "synthetic", Cookie: "synthetic", Host: "synthetic", "Proxy-Authorization": "synthetic", Accept: "image/webp" };
    expect(imageEvidenceHeaders(headers)).toEqual({ Accept: "image/webp" });
    expect(headers.Authorization).toBe("synthetic");
  });
});

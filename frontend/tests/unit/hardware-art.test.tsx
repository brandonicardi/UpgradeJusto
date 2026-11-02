import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HardwareArt from "../../components/hardware-art";
import { towerKeys, towerCategories } from "../../lib/towers";
describe("v0 category illustrations, never a product photograph or identity", () => {
  it("names all nine categories as illustrations without branded models or technical claims", () => {
    for (const category of towerKeys) {
      const html = renderToStaticMarkup(<HardwareArt category={category} />);
      expect(html).toContain(`Ilustración de categoría: ${towerCategories[category]}`);
      expect(html).not.toMatch(/RYZEN|RTX|GB|MHz|<img|compatible/);
      expect(html).toContain('class="hardware-art art-');
    }
  });
});

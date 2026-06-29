import { describe, expect, it } from "vitest";
import { getDictionary } from "./dictionaries";

// Test de humo: confirma que el harness de pruebas funciona y que el
// diccionario en español está disponible. Sirve de plantilla para los
// tests de lógica de negocio que vendrán después.
describe("getDictionary", () => {
  it("devuelve el diccionario en español por defecto", () => {
    const t = getDictionary();
    expect(t.app.name).toBe("Especialistas Salud");
  });

  it("expone los textos de la página de inicio", () => {
    const t = getDictionary("es");
    expect(t.home.title).toBeTruthy();
    expect(t.home.subtitle).toBeTruthy();
  });
});

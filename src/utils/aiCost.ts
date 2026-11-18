export function costoEstimadoGemini(tokensEntrada: number, tokensSalida: number): number {
  return (tokensEntrada * 0.25 + tokensSalida * 1.50) / 1_000_000;
}

/**
 * `vite build --mode demo` gera uma versão estática do app: roda só no navegador, sem API nem banco,
 * e já abre na demonstração (dados de exemplo no localStorage). Serve para hospedar numa página qualquer.
 */
export const DEMO_BUILD = import.meta.env.VITE_DEMO === '1'

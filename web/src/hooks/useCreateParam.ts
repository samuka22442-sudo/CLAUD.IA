import { useEffect } from 'react'
import { useSearchParams } from 'react-router'

/**
 * O botão "+" do celular navega para `/pagina?novo=1`. Esta função abre o formulário de criação
 * quando o parâmetro aparece e o remove da URL em seguida.
 */
export function useCreateParam(open: () => void): void {
  const [params, setParams] = useSearchParams()
  const wantsNew = params.get('novo') !== null

  useEffect(() => {
    if (!wantsNew) return
    open()
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.delete('novo')
        return next
      },
      { replace: true },
    )
    // `open` costuma ser uma função nova a cada render; só queremos reagir ao parâmetro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsNew])
}

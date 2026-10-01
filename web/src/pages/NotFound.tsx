import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '../components/ui/Button.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'

export function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Página não encontrada"
      description="O endereço que você abriu não existe ou foi movido."
      action={
        <Link to="/">
          <Button>Voltar ao início</Button>
        </Link>
      }
    />
  )
}

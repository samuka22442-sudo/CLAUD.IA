export type DeviceType = 'router' | 'switch' | 'server' | 'pc' | 'laptop' | 'cloud' | 'firewall' | 'ap'
export type CableKind = 'ethernet' | 'fibra' | 'console' | 'wifi'

export interface Device {
  id: string
  type: DeviceType
  name: string
  ports: number
  x: number
  y: number
  color: string
}

export interface PortRef {
  deviceId: string
  port: number
}

export interface Cable {
  id: string
  from: PortRef
  to: PortRef
  kind: CableKind
  color: string
  dash: string
  width: number
  label: string
}

export interface Note {
  id: string
  text: string
  x: number
  y: number
  size: number
  color: string
}

export interface Project {
  id: string
  name: string
  devices: Device[]
  cables: Cable[]
  notes: Note[]
  updatedAt: number
}

export type Selection = { kind: 'device' | 'cable' | 'note'; id: string } | null

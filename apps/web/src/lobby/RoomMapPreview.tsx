import { ARENA_SOLIDS } from '@bubble-arena/shared';
export function RoomMapPreview() {
  return <svg className="room-map-preview" viewBox="0 0 48 56" role="img" aria-label="交叉火线地图预览">
    <rect width="48" height="56" rx="2" fill="#d1e4d0"/>
    <path d="M0 15H48M0 41H48M24 0V56" stroke="#f4ecd2" strokeWidth="5"/>
    <path d="M0 0H48V9H0Z" fill="#76beed"/><path d="M0 47H48V56H0Z" fill="#f18b7e"/>
    {ARENA_SOLIDS.map(s=><rect key={s.id} x={s.position[0]+24-s.size[0]/2} y={s.position[2]+28-s.size[2]/2} width={s.size[0]} height={s.size[2]} rx=".4" fill={s.kind==='cover'?'#e1bd7a':s.kind==='deck'||s.kind==='ramp'?'#92b9ad':'#718e99'} stroke="#ffffffa0" strokeWidth=".35"/>)}
    <circle cx="18" cy="50" r="1.5" fill="#ff5f61" stroke="white" strokeWidth=".5"/><circle cx="18" cy="6" r="1.5" fill="#328fe5" stroke="white" strokeWidth=".5"/>
  </svg>;
}

import type { WeaponId } from '@bubble-arena/shared';
/** Original code-native toy silhouettes. Formal Blender references remain in assets-source. */
export function WeaponIcon({ weapon }: { weapon: WeaponId }) {
  const color = { rifle:'#40b7f2', shotgun:'#ffb351', sniper:'#9d8ded', bubble:'#6adbd6' }[weapon];
  return <svg viewBox="0 0 110 48" width="110" height="48" aria-hidden="true">
    <g stroke="#193e63" strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round">
      {weapon === 'bubble' ? <>
        <path d="M40 13H76Q85 13 85 21V28H58L51 42H39L43 28H31Z" fill={color}/>
        <path d="M57 17H94V26H66" fill="#faf6e6"/><rect x="88" y="17" width="11" height="10" rx="3" fill="#a89bef"/>
        <circle cx="28" cy="21" r="17" fill="#81eaff"/><path d="M16 24Q28 31 42 22" fill="none" stroke="#2aa5df"/>
        <circle cx="23" cy="15" r="5" fill="#eaffff" stroke="none"/><circle cx="34" cy="27" r="3" fill="#d7ffff" stroke="none"/>
      </> : <>
        <path d="M6 18H25V14H62L69 19H94V28H61L53 41H41L44 28H24L9 34Z" fill={color}/>
        <path d="M27 17H58V25H27Z" fill="#f2fbf5"/>
        <path d="M7 18H19V29L8 33Z" fill="#80d9f0"/>
        {weapon === 'rifle' && <><rect x="29" y="6" width="24" height="11" rx="5" fill="#87e8ff"/><path d="M66 20H99V27H66" fill="#ffdc62"/><path d="M42 30H53L49 39H40Z" fill="#3584b9"/></>}
        {weapon === 'shotgun' && <><rect x="57" y="13" width="44" height="8" rx="3" fill="#ffe58c"/><rect x="57" y="22" width="44" height="8" rx="3" fill="#ffe58c"/><path d="M63 18V32H77V18" fill="#ec8d3c"/><path d="M31 12H49V8H31Z" fill="#9beded"/></>}
        {weapon === 'sniper' && <><path d="M66 20H106V25H66" fill="#f5da7f"/><rect x="29" y="5" width="32" height="10" rx="4" fill="#d3cbff"/><rect x="31" y="5" width="8" height="10" rx="2" fill="#6be1fa"/><path d="M72 29L65 42M74 29L80 42" fill="none"/></>}
      </>}
    </g>
  </svg>;
}

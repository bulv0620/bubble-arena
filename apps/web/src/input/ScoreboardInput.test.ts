import { expect,test,vi } from 'vitest';
import { ScoreboardInput } from './ScoreboardInput';
test('hold/release Tab never swallows gameplay keys; settings, blur, hidden and detach clear display',()=>{
  const global=new EventTarget(),doc=Object.assign(new EventTarget(),{hidden:false}),input=new ScoreboardInput();let enabled=true;
  const movement=vi.fn();global.addEventListener('keydown',movement);const detach=input.attach(global,doc,()=>enabled);
  const key=(code:string,type='keydown',fields={})=>{const event=Object.assign(new Event(type,{cancelable:true}),{code,...fields});global.dispatchEvent(event);return event;};
  expect(key('Tab').defaultPrevented).toBe(true);expect(input.getSnapshot()).toBe(true);
  for(const code of ['KeyW','Space','Digit2'])expect(key(code).defaultPrevented).toBe(false);
  expect(movement).toHaveBeenCalledTimes(4);expect(input.getSnapshot()).toBe(true);key('Tab','keyup');expect(input.getSnapshot()).toBe(false);
  for(const exit of ['Escape','blur','hidden']){key('Tab');if(exit==='Escape')key('Escape');if(exit==='blur')global.dispatchEvent(new Event('blur'));if(exit==='hidden'){doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));}expect(input.getSnapshot()).toBe(false);doc.hidden=false;}
  enabled=false;expect(key('Tab').defaultPrevented).toBe(false);expect(input.getSnapshot()).toBe(false);enabled=true;
  key('Tab','keydown',{ctrlKey:true});expect(input.getSnapshot()).toBe(false);
  key('Tab');detach();detach();expect(input.getSnapshot()).toBe(false);key('Tab');expect(input.getSnapshot()).toBe(false);
});

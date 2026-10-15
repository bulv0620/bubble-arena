import { ArenaHud } from '../HUD/ArenaHud';
import { ArenaOpponent } from '../player/ArenaOpponent';
import { MatchHud } from '../HUD/MatchHud';
import { MatchSimulation, MatchResolution } from './MatchSimulation';
import { TeamScoreHint, ScorePracticePanel } from '../HUD/TeamScoreHint';
import { RescueInput } from '../input/RescueInput';
import { RescueSimulation } from '../player/RescueSimulation';
import { RescuePracticePanel, RescueHint, RescuePracticeAlly } from '../HUD/RescuePractice';
import { bindRescueActions } from './bindRescueActions';
import { SettingsPanel } from '../settings/SettingsPanel';
import { bindLifeActions } from './bindLifeActions';
import { PlayerLifeHint } from '../HUD/PlayerLifeHint';
import { PlayerLifeTestPanel } from '../HUD/PlayerLifeTestPanel';
import { PlayerHealthSimulation } from '../player/PlayerHealthSimulation';
import { MOUSE_SETTINGS, readMouseSpeed, saveMouseSpeed, validMouseSpeed } from '../settings/mouseSettings';
import { createTrainingSession, restartTrainingSession } from './trainingSession';
import { ShotEffects } from '../effects';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { AimInput, CrosshairInput } from '../input';
import { Crosshair, AmmoHint, TrainingTargetHint, HealthHint } from '../HUD';
import type { RapierRigidBody } from '@react-three/rapier';
import { CAMERA_CONFIG, PLAYER_CONFIG, WHITEBOX_CONFIG, TRAINING_RANGE_CONFIG, type CameraHeading, ARENA_SPAWNS, ARENA_COLLISION_HASH, ARENA_SPAWN_HASH, WHITEBOX_COLLISION_HASH, WHITEBOX_SPAWN_HASH } from '@bubble-arena/shared';
import { FollowCamera, PointerLockHint, PointerLockInput } from '../camera';
import { WhiteboxMap, ArenaMap } from '../maps';
import { CapsulePlayer, useKeyboardInput } from '../player';
import { PhysicsWorld } from './PhysicsWorld';
import { SpreadHint } from '../HUD/SpreadHint';
import { ReloadProgress } from '../HUD/ReloadProgress';
import '../HUD/gameHud.css';
import { InputDiagnostics } from './InputDiagnostics';
import { TrainingTarget, MuzzleAimDiagnostics, type MuzzleRayResult, AimTargetMarker, type ScreenAimTarget, ReloadInput, FireInput, FireInputHint, RifleSimulation } from '../weapons';
import { WeaponSwitchInput } from '../weapons/WeaponSwitchInput';
import { BubbleVisuals } from '../weapons/BubbleVisuals';
import { bindWeaponChanges, clearWeaponActions } from './bindWeaponChanges';

export function BasicScene() {
  const [pointer] = useState(() => new PointerLockInput());
  const [open, setOpen] = useState(false);
  const opened = useRef(false);
  const [revision, setRevision] = useState(0);
  const [session, setSession] = useState(() => createTrainingSession('rifle', { match: true, arena: true }));
  const matchState = useSyncExternalStore(session.match.subscribe, session.match.getSnapshot);
  const lifeDisabled = useSyncExternalStore(session.loadout.subscribe, () => session.loadout.getSnapshot().lifeStatus !== 'normal' || session.loadout.getSnapshot().rescuing);
  const primary = useSyncExternalStore(session.loadout.subscribe, () => session.loadout.getSnapshot().primary);
  const [speed, setSpeed] = useState(() => {
    try { return readMouseSpeed(window.localStorage); } catch { return MOUSE_SETTINGS.default; }
  });
  const currentSpeed = useRef(speed);
  const enabled = useCallback(() => !opened.current, []);
  const sensitivity = useCallback(() => currentSpeed.current, []);
  const openSettings = useCallback(() => {
    opened.current = true; setOpen(true); pointer.release();
  }, [pointer]);
  useEffect(() => session.match.subscribe(() => { if (session.match.getSnapshot().phase === 'finished') { pointer.release(); opened.current = false; setOpen(false); } }), [session, pointer]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.code === 'Escape') openSettings(); };
    let previous = pointer.getSnapshot();
    const unsubscribe = pointer.subscribe(() => {
      const next = pointer.getSnapshot();
      const lost = previous === 'locked' && next !== 'locked';
      previous = next;
      if (lost) openSettings();
    });
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); unsubscribe(); };
  }, [pointer, openSettings]);
  const restart = useCallback(() => {
    pointer.release();
    setSession(restartTrainingSession(session)); setRevision(value => value + 1);
  }, [pointer, session]);
  const returnWaiting = useCallback(() => { restart(); opened.current = false; setOpen(false); }, [restart]);
  const changeScene = (arena: boolean) => {
    if (arena === session.arena) return;
    pointer.release(); const next = createTrainingSession(session.loadout.getSnapshot().primary, { match: true, config: session.match.rule.config, arena });
    session.dispose(); setSession(next); setRevision(value => value + 1);
  };
  return <>
    <SceneSession session={session} revision={revision} pointer={pointer} enabled={enabled} sensitivity={sensitivity} onRestart={returnWaiting} />
    {open && <SettingsPanel returnLocks={matchState.phase === 'playing' || matchState.phase === 'countdown'} primaryDisabled={lifeDisabled || matchState.phase === 'finished' || matchState.phase === 'countdown'} lifeTest={<><section className="life-test"><label htmlFor="scene-mode">场景</label><select id="scene-mode" value={session.arena ? 'arena' : 'training'} onChange={e => changeScene(e.target.value === 'arena')}><option value="arena">交叉火线 · 单机 1v1 对抗</option><option value="training">原三靶训练场</option></select><small>切换场景会清空本局，回到等待区。</small></section>{!session.arena && <fieldset className="match-test-gate" disabled={!session.match.canPlay()}><PlayerLifeTestPanel player={session.playerHealth} /><ScorePracticePanel score={session.score} player={session.playerHealth} /><RescuePracticePanel practice={session.rescue} /></fieldset>}</>} primary={primary} onPrimary={id => session.loadout.setPrimary(id)} speed={speed} onSpeed={value => {
      if (!validMouseSpeed(value)) return;
      currentSpeed.current = value; setSpeed(value);
      try { saveMouseSpeed(window.localStorage, value); } catch { /* Storage can be blocked. */ }
    }} onReset={restart} onReturn={() => {
      opened.current = false; setOpen(false);
      if (session.match.getSnapshot().phase !== 'waiting' && session.match.getSnapshot().phase !== 'finished') pointer.request(); // Must run directly in this user gesture, before React effects.
    }} />}
  </>;
}

function SceneSession({ session, revision, pointer, enabled, sensitivity, onRestart }: { onRestart: () => void; session: ReturnType<typeof createTrainingSession>; revision: number; pointer: PointerLockInput; enabled: () => boolean; sensitivity: () => number }) {
  const input = useKeyboardInput(enabled);
  const [showAimDiagnostics, setShowAimDiagnostics] = useState(false);
  const grounded = useRef(false);
  const [rescueInput] = useState(() => new RescueInput());
  const playerBody = useRef<RapierRigidBody | null>(null);
  const [aim] = useState(() => new AimInput());
  const [fire] = useState(() => new FireInput(pointer, aim));
  const [reload] = useState(() => new ReloadInput());
  const [switchInput] = useState(() => new WeaponSwitchInput());
  const { range, targets, playerHealth, recoil, feedback, motion, loadout, bubbles, rescue, respawn, score, match, opponent, telemetry, arena, opponentFeedback } = session;
  const phase = useSyncExternalStore(match.subscribe, () => match.getSnapshot().phase);
  const weaponsEnabled = useCallback(() => enabled() && loadout.canOperate(), [enabled, loadout]);
  useEffect(() => reload.attach(window, document, weaponsEnabled), [reload, weaponsEnabled]);
  useEffect(() => switchInput.attach(window, document, weaponsEnabled), [switchInput, weaponsEnabled]);
  const [crosshair] = useState(() => new CrosshairInput(pointer, aim, false));
  const clearWeaponInput = useCallback(() => clearWeaponActions({ aim, fire, reload, switchInput }), [aim, fire, reload, switchInput]);
  const clearInput = useCallback(() => { input.clear(); clearWeaponInput(); rescueInput.clear(); rescue.cancel(); }, [input, clearWeaponInput, rescueInput, rescue]);
  useEffect(() => { clearInput(); return session.bindInputReset(clearInput); }, [session, clearInput]);
  useEffect(() => bindWeaponChanges(loadout, { aim, fire, reload, switchInput }, motion, recoil), [loadout, aim, fire, reload, switchInput, recoil, motion]);
  useEffect(() => bindLifeActions(playerHealth, loadout, { aim, fire, reload, switchInput, keyboard: input, feedback, recoil }),
    [playerHealth, loadout, aim, fire, reload, switchInput, input, feedback, recoil]);
  useEffect(() => match.subscribe(() => { loadout.refreshMatchGate(); if (!match.canPlay()) { clearInput(); loadout.setScoped(false); } }), [match, clearInput, loadout]);
  useEffect(() => bindRescueActions(loadout, { aim, fire, reload, switchInput }, input, recoil), [loadout, aim, fire, reload, switchInput, input, recoil]);
  const collectScores = useCallback(() => {
    if (!arena || !match.canPlay()) return;
    score.step(playerHealth.getTick(), [...playerHealth.drainScoreFacts(), ...(opponent?.drainScoreFacts() ?? [])], false);
  }, [arena, match, score, playerHealth, opponent]);
  const facingYaw = useRef(0);
  const shotRay = useRef<MuzzleRayResult | null>(null);
  const aimTarget = useRef<ScreenAimTarget | null>(null);
  const view = useRef<CameraHeading>({ yaw: 0 });
  return (
    <>
      <Canvas
        camera={{ fov: CAMERA_CONFIG.fov, near: CAMERA_CONFIG.near, far: CAMERA_CONFIG.far }}
        dpr={[1, 1.5]}
        frameloop="always"
        shadows
        fallback={<p className="fallback">当前浏览器无法显示 3D 场景，请启用 WebGL。</p>}
      >
        <color attach="background" args={['#e8eff5']} /><fog attach="fog" args={['#e8eff5', 50, 105]} />
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[16, 25, 12]}
          intensity={2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-36}
          shadow-camera-right={36}
          shadow-camera-top={36}
          shadow-camera-bottom={-36}
          shadow-camera-near={0.5}
          shadow-camera-far={90}
          shadow-normalBias={0.02}
        />
        <Suspense fallback={null}>
          {/* Keep Canvas and its HTML portal host mounted while resetting training. */}
          <PhysicsWorld key={revision} mapHash={arena ? ARENA_COLLISION_HASH : WHITEBOX_COLLISION_HASH} spawnHash={arena ? ARENA_SPAWN_HASH : WHITEBOX_SPAWN_HASH}>
            {arena ? <ArenaMap /> : <WhiteboxMap />}
            <MatchSimulation match={match} />
            <PlayerHealthSimulation player={playerHealth} />
            {!arena && range.entries.map(entry => <TrainingTarget key={entry.id} canPlay={match.canPlay} registry={targets} target={entry.target} label={entry.label} position={entry.position} />)}
            {!arena && <RescuePracticeAlly practice={rescue} />}
            <CapsulePlayer bodyColor={arena ? '#c85f52' : undefined} respawn={respawn} clearInput={clearInput} groundedRef={grounded} loadout={loadout} playerHealth={playerHealth} input={input} bodyRef={playerBody} view={view} motion={motion} facingYaw={facingYaw} position={arena ? (() => { const p = ARENA_SPAWNS.points.find(p => p.team === 'red' && p.primary)!.position; return [p.x, p.y, p.z] as [number, number, number]; })() : [
              TRAINING_RANGE_CONFIG.playerSpawnXZ[0],
              WHITEBOX_CONFIG.groundTopY + PLAYER_CONFIG.height / 2 + PLAYER_CONFIG.spawnClearance,
              TRAINING_RANGE_CONFIG.playerSpawnXZ[1],
            ]} />
            <RifleSimulation playerHealth={playerHealth} aim={aim} bubbles={bubbles} input={fire} switchInput={switchInput} loadout={loadout} motion={motion} reload={reload} body={playerBody} yaw={facingYaw} target={aimTarget} shotRay={shotRay} targets={targets} feedback={feedback} recoil={recoil} />
            {opponent && <ArenaOpponent opponent={opponent} telemetry={telemetry} health={playerHealth} targets={targets} player={playerBody} feedback={opponentFeedback} />}
            {!arena && <RescueSimulation practice={rescue} input={rescueInput} body={playerBody} grounded={grounded} enabled={enabled} pointer={pointer} aim={aim} />}
            <MatchResolution match={match} score={score} collect={collectScores} />
            <ShotEffects feedback={feedback} />{opponent && <ShotEffects feedback={opponentFeedback} />}
            <BubbleVisuals bubbles={bubbles} />
            <FollowCamera respawn={respawn} loadout={loadout} enabled={enabled} sensitivity={sensitivity} target={playerBody} control={pointer} clearInput={clearInput} view={view} aim={aim} crosshair={crosshair} fire={fire} aimTarget={aimTarget} targets={targets} recoil={recoil} />
            {import.meta.env.DEV && showAimDiagnostics && <>
              <AimTargetMarker target={aimTarget} />
              <MuzzleAimDiagnostics loadout={loadout} body={playerBody} yaw={facingYaw} target={aimTarget} />
            </>}
          </PhysicsWorld>
        </Suspense>
      </Canvas>
      <div className="hud-brand"><i>BA</i><span>BUBBLE ARENA<small>{arena ? '单机 1v1 对抗' : '训练模式'}</small></span></div>
      {phase !== 'finished' && <PointerLockHint control={pointer} loadout={loadout} />}
      <SpreadHint loadout={loadout} motion={motion} />
      {phase !== 'finished' && <RescueHint practice={rescue} player={playerHealth} />}
      <MatchHud match={match} arena={arena} onRestart={onRestart} /><TeamScoreHint score={score} arena={arena} /><HealthHint player={playerHealth} />
      {phase !== 'finished' && <PlayerLifeHint player={playerHealth} />}
      <AmmoHint loadout={loadout} />
      {arena && opponent ? <ArenaHud telemetry={telemetry} opponent={opponent} /> : <TrainingTargetHint range={range} />}
      {phase !== 'finished' && <Crosshair loadout={loadout} input={crosshair} motion={motion} />}
      {phase !== 'finished' && <ReloadProgress loadout={loadout} motion={motion} />}
      {import.meta.env.DEV && <details className="hud-debug"><summary>调试</summary><label><input type="checkbox" checked={showAimDiagnostics} onChange={event => setShowAimDiagnostics(event.target.checked)} />显示瞄准调试点</label><FireInputHint loadout={loadout} input={fire} pointer={pointer} /><InputDiagnostics input={input} /></details>}

    </>
  );
}

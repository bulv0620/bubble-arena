import { BubbleRescueProgress } from '../HUD/BubbleRescueProgress';
import { ArenaTelemetrySimulation } from '../player/ArenaTelemetrySimulation';
import { ScoreboardInput } from '../input/ScoreboardInput';
import { Scoreboard } from '../HUD/Scoreboard';
import { ArenaInteractionSimulation } from '../player/ArenaInteractionSimulation';
import { ArenaInteractionHint } from '../HUD/ArenaInteractionHint';
import { SprintEffects } from '../HUD/SprintEffects';
import { CombatFeed } from '../HUD/CombatFeed';
import { FrameStats, FrameSampler, PerformanceHint } from '../HUD/FrameStats';
import { ArenaHud } from '../HUD/ArenaHud';
import { ArenaOpponent } from '../player/ArenaOpponent';
import { MatchHud } from '../HUD/MatchHud';
import { MatchSimulation, MatchResolution } from './MatchSimulation';
import { TeamScoreHint } from '../HUD/TeamScoreHint';
import { RescueInput } from '../input/RescueInput';
import { RescueSimulation } from '../player/RescueSimulation';
import { RescueHint, RescuePracticeAlly } from '../HUD/RescuePractice';
import { bindRescueActions } from './bindRescueActions';
import { SettingsPanel } from '../settings/SettingsPanel';
import { HUD_SETTINGS, readHudScale, saveHudScale, validHudScale } from '../settings/hudSettings';
import { HudScaleLayer, useHudScale } from '../HUD/HudScaleLayer';
import { bindLifeActions } from './bindLifeActions';
import { PlayerLifeHint } from '../HUD/PlayerLifeHint';
import { PlayerHealthSimulation } from '../player/PlayerHealthSimulation';
import { MOUSE_SETTINGS, readMouseSpeed, saveMouseSpeed, validMouseSpeed, SCOPE_MOUSE_SETTINGS, readScopeMouseMultiplier, saveScopeMouseMultiplier, validScopeMouseMultiplier } from '../settings/mouseSettings';
import { createTrainingSession, restartTrainingSession } from './trainingSession';
import { BubblePopEffects } from '../effects/BubblePopEffects';
import { ShotEffects } from '../effects';
import type { Group } from 'three';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { AimInput, CrosshairInput } from '../input';
import { Crosshair, AmmoHint, TrainingTargetHint, HealthHint } from '../HUD';
import type { RapierRigidBody } from '@react-three/rapier';
import { CAMERA_CONFIG, PLAYER_CONFIG, WHITEBOX_CONFIG, TRAINING_RANGE_CONFIG, type CameraHeading, ARENA_SPAWNS, ARENA_COLLISION_HASH, ARENA_SPAWN_HASH, WHITEBOX_COLLISION_HASH, WHITEBOX_SPAWN_HASH } from '@bubble-arena/shared';
import { FollowCamera, PointerLockInput } from '../camera';
import { WhiteboxMap, ArenaMap } from '../maps';
import { CapsulePlayer, useKeyboardInput } from '../player';
import { PhysicsWorld } from './PhysicsWorld';
import { ReloadProgress } from '../HUD/ReloadProgress';
import type { GameLaunch } from '../lobby/localRoom';
import { roomMatchConfig } from '../lobby/localRoom';
import { bindRoomStart } from './bindRoomStart';
import { DeferredScene } from './DeferredScene';
import { TrainingTarget, type MuzzleRayResult, type ScreenAimTarget, ReloadInput, FireInput, RifleSimulation } from '../weapons';
import { WeaponSwitchInput } from '../weapons/WeaponSwitchInput';
import { BubbleVisuals } from '../weapons/BubbleVisuals';
import { bindWeaponChanges, clearWeaponActions } from './bindWeaponChanges';

export function BasicScene({ launch, onLeaveRoom }: { launch?: GameLaunch; onLeaveRoom?: () => void } = {}) {
  const [pointer] = useState(() => new PointerLockInput());
  const [open, setOpen] = useState(false);
  const opened = useRef(false);
  const [revision, setRevision] = useState(0);
  const [session, setSession] = useState(() => createTrainingSession('rifle', { match: true, arena: true, botSeats: launch?.bots, playerSeat: launch?.playerSeat, config: launch ? roomMatchConfig(launch.preset) : undefined }));
  const lifecycle = useRef({ generation: 0 });
  useEffect(() => {
    const owner = lifecycle.current, generation = ++owner.generation;
    return () => {
      // StrictMode replays effects; dispose only after a genuine scene departure.
      queueMicrotask(() => { if (owner.generation === generation) { pointer.release(); session.dispose(); } });
    };
  }, [session, pointer]);
  useEffect(() => launch ? bindRoomStart(session.match) : undefined, [launch, session]);
  const leaveToRoom = onLeaveRoom ? () => { pointer.release(); onLeaveRoom(); } : undefined;
  const [speed, setSpeed] = useState(() => {
    try { return readMouseSpeed(window.localStorage); } catch { return MOUSE_SETTINGS.default; }
  });
  const currentSpeed = useRef(speed);
  const [scopeSpeed, setScopeSpeed] = useState(() => {
    try { return readScopeMouseMultiplier(window.localStorage); } catch { return SCOPE_MOUSE_SETTINGS.default; }
  });
  const currentScopeSpeed = useRef(scopeSpeed);
  const scopeSensitivity = useCallback(() => currentScopeSpeed.current, []);
  const [hudScale, setHudScale] = useState(() => {
    try { return readHudScale(window.localStorage); } catch { return HUD_SETTINGS.default; }
  });
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
  return <>
    <SceneSession hudScale={hudScale} session={session} revision={revision} pointer={pointer} enabled={enabled} sensitivity={sensitivity} scopeSensitivity={scopeSensitivity} onRestart={leaveToRoom ?? returnWaiting} roomManaged={Boolean(launch)} />
    {open && <SettingsPanel scopeSpeed={scopeSpeed} onScopeSpeed={value => {
      if (!validScopeMouseMultiplier(value)) return;
      currentScopeSpeed.current = value; setScopeSpeed(value);
      try { saveScopeMouseMultiplier(window.localStorage, value); } catch { /* Storage can be blocked. */ }
    }} hudScale={hudScale} onHudScale={value => {
      if (!validHudScale(value)) return;
      setHudScale(value);
      try { saveHudScale(window.localStorage, value); } catch { /* Storage can be blocked. */ }
    }} onExit={leaveToRoom ?? returnWaiting} speed={speed} onSpeed={value => {
      if (!validMouseSpeed(value)) return;
      currentSpeed.current = value; setSpeed(value);
      try { saveMouseSpeed(window.localStorage, value); } catch { /* Storage can be blocked. */ }
    }} onReturn={() => {
      opened.current = false; setOpen(false);
      if (session.match.getSnapshot().phase !== 'waiting' && session.match.getSnapshot().phase !== 'finished') pointer.request(); // Must run directly in this user gesture, before React effects.
    }} />}
  </>;
}

function SceneSession({ session, revision, pointer, enabled, sensitivity, scopeSensitivity, onRestart, roomManaged, hudScale }: { hudScale: number; roomManaged: boolean; onRestart: () => void; session: ReturnType<typeof createTrainingSession>; revision: number; pointer: PointerLockInput; enabled: () => boolean; sensitivity: () => number; scopeSensitivity: () => number }) {
  const input = useKeyboardInput(enabled);
  const [scoreboard] = useState(() => new ScoreboardInput());
  useEffect(() => scoreboard.attach(window, document, enabled), [scoreboard, enabled]);
  const [stats] = useState(() => new FrameStats());
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const displayHudScale = useHudScale(hudScale, canvas);
  const grounded = useRef(false);
  const [rescueInput] = useState(() => new RescueInput());
  const playerBody = useRef<RapierRigidBody | null>(null);
  const muzzleAnchor = useRef<Group | null>(null);
  const [aim] = useState(() => new AimInput());
  const [fire] = useState(() => new FireInput(pointer, aim));
  const [reload] = useState(() => new ReloadInput());
  const [switchInput] = useState(() => new WeaponSwitchInput());
  const { range, targets, playerHealth, recoil, feedback, motion, loadout, bubbles, rescue, respawn, score, match, bots, telemetry, arena, combatLog, interactions } = session;
  const phase = useSyncExternalStore(match.subscribe, () => match.getSnapshot().phase);
  const weaponsEnabled = useCallback(() => enabled() && loadout.canOperate(), [enabled, loadout]);
  useEffect(() => reload.attach(window, document, weaponsEnabled), [reload, weaponsEnabled]);
  useEffect(() => switchInput.attach(window, document, weaponsEnabled, canvas ?? undefined), [switchInput, weaponsEnabled, canvas]);
  const [crosshair] = useState(() => new CrosshairInput(pointer, aim, false));
  const clearWeaponInput = useCallback(() => clearWeaponActions({ aim, fire, reload, switchInput }), [aim, fire, reload, switchInput]);
  const clearInput = useCallback(() => { scoreboard.clear(); input.clear(); clearWeaponInput(); rescueInput.clear(); rescue.cancel(); interactions.cancel(); }, [scoreboard, input, clearWeaponInput, rescueInput, rescue, interactions]);
  useEffect(() => { clearInput(); return session.bindInputReset(clearInput); }, [session, clearInput]);
  useEffect(() => bindWeaponChanges(loadout, { aim, fire, reload, switchInput }, motion, recoil), [loadout, aim, fire, reload, switchInput, recoil, motion]);
  useEffect(() => bindLifeActions(playerHealth, loadout, { aim, fire, reload, switchInput, keyboard: input, feedback, recoil }),
    [playerHealth, loadout, aim, fire, reload, switchInput, input, feedback, recoil]);
  useEffect(() => match.subscribe(() => { loadout.refreshMatchGate(); if (!match.canPlay()) { clearInput(); loadout.setScoped(false); } }), [match, clearInput, loadout]);
  useEffect(() => bindRescueActions(loadout, { aim, fire, reload, switchInput }, input, recoil), [loadout, aim, fire, reload, switchInput, input, recoil]);
  const collectScores = useCallback(() => {
    if (!match.canPlay()) return;
    combatLog.step(Math.max(0, playerHealth.getTick()));
    if (!arena) return;
    score.step(playerHealth.getTick(), [...playerHealth.drainScoreFacts(), ...bots.flatMap(bot => bot.drainScoreFacts())], false);
  }, [arena, match, score, playerHealth, bots, combatLog]);
  const facingYaw = useRef(playerHealth.actor.teamId === 'blue' ? Math.PI : 0);
  const shotRay = useRef<MuzzleRayResult | null>(null);
  const aimTarget = useRef<ScreenAimTarget | null>(null);
  const view = useRef<CameraHeading>({ yaw: playerHealth.actor.teamId === 'blue' ? Math.PI : 0 });
  return (
    <>
      <Canvas
        onCreated={({ gl }) => setCanvas(gl.domElement)}
        camera={{ fov: CAMERA_CONFIG.fov, near: CAMERA_CONFIG.near, far: CAMERA_CONFIG.far }}
        dpr={[1, 1.5]}
        frameloop="always"
        shadows
        fallback={<p className="fallback">当前浏览器无法显示 3D 场景，请启用 WebGL。</p>}
      >
        <FrameSampler stats={stats} />
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
        <DeferredScene key={revision}><Suspense fallback={null}>
          {/* Keep Canvas and its HTML portal host mounted while resetting training. */}
          <PhysicsWorld key={revision} mapHash={arena ? ARENA_COLLISION_HASH : WHITEBOX_COLLISION_HASH} spawnHash={arena ? ARENA_SPAWN_HASH : WHITEBOX_SPAWN_HASH}>
            {arena ? <ArenaMap /> : <WhiteboxMap />}
            <MatchSimulation match={match} />
            <PlayerHealthSimulation player={playerHealth} />
            {!arena && range.entries.map(entry => <TrainingTarget key={entry.id} canPlay={match.canPlay} registry={targets} target={entry.target} label={entry.label} position={entry.position} />)}
            {!arena && <RescuePracticeAlly practice={rescue} />}
            <CapsulePlayer muzzleAnchor={muzzleAnchor} bodyColor={arena ? playerHealth.actor.teamId === 'red' ? '#c85f52' : '#287bae' : undefined} respawn={respawn} clearInput={clearInput} groundedRef={grounded} loadout={loadout} playerHealth={playerHealth} input={input} bodyRef={playerBody} view={view} motion={motion} facingYaw={facingYaw} position={arena ? (() => { const p = ARENA_SPAWNS.points.filter(p => p.team === session.playerSeat.teamId)[session.playerSeat.slot].position; return [p.x, p.y, p.z] as [number, number, number]; })() : [
              TRAINING_RANGE_CONFIG.playerSpawnXZ[0],
              WHITEBOX_CONFIG.groundTopY + PLAYER_CONFIG.height / 2 + PLAYER_CONFIG.spawnClearance,
              TRAINING_RANGE_CONFIG.playerSpawnXZ[1],
            ]} />
            <RifleSimulation playerHealth={playerHealth} aim={aim} bubbles={bubbles} input={fire} switchInput={switchInput} loadout={loadout} motion={motion} reload={reload} body={playerBody} yaw={facingYaw} target={aimTarget} shotRay={shotRay} targets={targets} feedback={feedback} recoil={recoil} />
            {bots.map(bot => <ArenaOpponent interaction={interactions} key={bot.actor.playerId} opponent={bot} bots={bots} health={playerHealth} targets={targets} player={playerBody} feedback={bot.feedback} />)}
            {!arena && <RescueSimulation practice={rescue} input={rescueInput} body={playerBody} grounded={grounded} enabled={enabled} pointer={pointer} aim={aim} />}
            {arena && <BubbleRescueProgress interaction={interactions} />}
            {arena && <ArenaInteractionSimulation interaction={interactions} input={rescueInput} body={playerBody} grounded={grounded} enabled={enabled} pointer={pointer} aim={aim} />}
            <ArenaTelemetrySimulation arena={arena} player={playerBody} view={view} health={playerHealth} bots={bots} telemetry={telemetry}/>
            <MatchResolution match={match} score={score} collect={collectScores} />
            <ShotEffects feedback={feedback} muzzleAnchor={muzzleAnchor} />
            {arena && <BubblePopEffects interaction={interactions} />}
            <BubbleVisuals bubbles={bubbles} />
            <FollowCamera initialYaw={playerHealth.actor.teamId === 'blue' ? Math.PI : 0} respawn={respawn} loadout={loadout} enabled={enabled} sensitivity={sensitivity} scopeSensitivity={scopeSensitivity} target={playerBody} control={pointer} clearInput={clearInput} view={view} aim={aim} crosshair={crosshair} fire={fire} aimTarget={aimTarget} targets={targets} recoil={recoil} />
          </PhysicsWorld>
        </Suspense></DeferredScene>
      </Canvas>
      {arena && phase === 'playing' && <Scoreboard input={scoreboard} score={score} telemetry={telemetry}/>}
      <SprintEffects loadout={loadout} />
      <HudScaleLayer scale={displayHudScale}>
      <PerformanceHint stats={stats} /><CombatFeed log={combatLog} arena={arena} />
      {phase !== 'finished' && <RescueHint practice={rescue} player={playerHealth} />}
      <TeamScoreHint score={score} /><HealthHint player={playerHealth} />
      {arena && phase !== 'finished' && <ArenaInteractionHint interaction={interactions} />}
      <AmmoHint loadout={loadout} enabled={weaponsEnabled} onSelect={switchInput.request} />
      <ArenaHud telemetry={telemetry} arena={arena} />
      </HudScaleLayer>
      <MatchHud hudScale={displayHudScale} match={match} arena={arena} onRestart={onRestart} roomManaged={roomManaged} />
      {phase !== 'finished' && <PlayerLifeHint player={playerHealth} />}
      {!arena && <TrainingTargetHint range={range} />}
      {phase !== 'finished' && <Crosshair loadout={loadout} input={crosshair} motion={motion} />}
      {phase !== 'finished' && <ReloadProgress loadout={loadout} motion={motion} />}

    </>
  );
}

import { Mesh, PerspectiveCamera, Vector3, type Object3D } from 'three';
interface Plate { readonly anchor: Object3D; readonly width: number; readonly height: number; readonly distanceFactor: number }
/** Presentation only: project actual own mesh bounds and its HTML plate into the center safe disk. */
export function createSelfViewClearance() {
  const point = new Vector3(), cameraPosition = new Vector3();
  return (root: Object3D, camera: PerspectiveCamera, width: number, height: number, radius: number, plate?: Plate) => {
    if (![width, height, radius].every(Number.isFinite) || width <= 0 || height <= 0 || radius < 0) return true;
    camera.updateMatrixWorld(); root.updateWorldMatrix(true, true);
    const intersects = (minX: number, maxX: number, minY: number, maxY: number) => {
      const dx = Math.max(minX - width / 2, 0, width / 2 - maxX), dy = Math.max(minY - height / 2, 0, height / 2 - maxY);
      return dx * dx + dy * dy <= radius * radius;
    };
    let blocked = false;
    root.traverse(object => {
      if (blocked || !(object instanceof Mesh) || !object.visible) return;
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      const box = object.geometry.boundingBox;
      if (!box) return;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let corner = 0; corner < 8; corner++) {
        point.set(corner & 1 ? box.max.x : box.min.x, corner & 2 ? box.max.y : box.min.y, corner & 4 ? box.max.z : box.min.z)
          .applyMatrix4(object.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
        if (point.z >= -camera.near) { blocked = true; return; }
        point.applyMatrix4(camera.projectionMatrix);
        if (![point.x, point.y].every(Number.isFinite)) { blocked = true; return; }
        const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      blocked = intersects(minX, maxX, minY, maxY);
    });
    if (blocked || !plate) return blocked;
    plate.anchor.getWorldPosition(point); camera.getWorldPosition(cameraPosition);
    const scale = plate.distanceFactor / (2 * Math.tan(camera.fov * Math.PI / 360) * point.distanceTo(cameraPosition));
    point.applyMatrix4(camera.matrixWorldInverse);
    if (!Number.isFinite(scale) || point.z >= -camera.near) return true;
    point.applyMatrix4(camera.projectionMatrix);
    const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
    return intersects(x - plate.width * scale / 2, x + plate.width * scale / 2, y - plate.height * scale / 2, y + plate.height * scale / 2);
  };
}

/** AI 只能选择这些语义动作；坐标始终由本地配置解析。 */
export const NPC_BEHAVIOR_ACTIONS = Object.freeze([
  'work', 'home', 'wander', 'park', 'shop', 'rest',
]);

export const NPC_AI_DECISION_INTERVAL_MINUTES = 45;
export const NPC_AI_DECISION_OFFSETS = Object.freeze({
  neighbor: 0,
  parkKeeper: 15,
  shopClerk: 30,
});

export const DEFAULT_NPC_BEHAVIORS = Object.freeze({
  neighbor: 'work',
  parkKeeper: 'work',
  shopClerk: 'work',
});

/** 所有可到达地点集中配置，避免 AI 或业务系统直接持有任意坐标。 */
export const LOCATION_CONFIG = Object.freeze({
  park: { name: '城市公园', wanderArea: 'park', x: 2180, y: 820 },
  shop: { name: '街边商店', wanderArea: 'shopNorth', x: 1030, y: 1490 },
  neighborHome: { name: '小林家附近', wanderArea: 'residential', x: 920, y: 530 },
  neighborWork: { name: '住宅区工作点', wanderArea: 'residential', x: 1080, y: 760 },
  parkKeeperHome: { name: '陈叔休息处', wanderArea: 'communityNorth', x: 700, y: 1500 },
  parkKeeperWork: { name: '公园工作点', wanderArea: 'park', x: 2180, y: 820 },
  shopClerkHome: { name: '小雨住处附近', wanderArea: 'shopSouth', x: 950, y: 1900 },
  shopClerkWork: { name: '商店工作点', wanderArea: 'shopNorth', x: 1030, y: 1490 },
});

/** 预先人工确认过的空旷点；wander 只会在当前地点附近选择这些点。 */
export const SAFE_WANDER_POINTS = Object.freeze([
  { area: 'residential', name: '住宅区小路', x: 650, y: 700 },
  { area: 'residential', name: '住宅区小路', x: 900, y: 700 },
  { area: 'residential', name: '住宅区出口', x: 1120, y: 780 },
  { area: 'park', name: '公园南侧步道', x: 2100, y: 880 },
  { area: 'park', name: '公园南侧步道', x: 2450, y: 860 },
  { area: 'park', name: '公园东侧步道', x: 2820, y: 880 },
  { area: 'communityNorth', name: '社区中心外', x: 700, y: 1450 },
  { area: 'communityNorth', name: '社区中心外', x: 1200, y: 1450 },
  { area: 'shopNorth', name: '商店北侧街道', x: 1200, y: 1450 },
  { area: 'shopNorth', name: '城市主路', x: 1500, y: 1450 },
  { area: 'shopSouth', name: '商店南侧街道', x: 1200, y: 1900 },
  { area: 'shopSouth', name: '城市主路南段', x: 1500, y: 1900 },
]);

const CITY_ROAD_HUB = Object.freeze({ x: 1530, y: 1135 });
const AREA_ROUTE_PORTALS = Object.freeze({
  residential: { x: 1180, y: 850 },
  park: { x: 2000, y: 900 },
  communityNorth: { x: 1200, y: 1450 },
  shopNorth: { x: 1200, y: 1450 },
  shopSouth: { x: 1200, y: 1900 },
});

export function isAllowedNpcBehavior(action) {
  return NPC_BEHAVIOR_ACTIONS.includes(action);
}

/** 将语义动作解析为本地安全地点；rest/wander 由行为系统结合当前位置处理。 */
export function getBehaviorDestination(profile, action) {
  let locationId = action;
  if (action === 'home') locationId = profile.homeLocation;
  if (action === 'work') locationId = profile.workLocation;
  if (action === 'rest' || action === 'wander') return null;

  const location = LOCATION_CONFIG[locationId];
  return location ? { id: locationId, ...location } : null;
}

/** 从当前地点所属区域选择闲逛点，避免跨区域直线穿过建筑。 */
export function chooseSafeWanderDestination(profile, x, y, random = Math.random) {
  const currentArea = getNearestConfiguredLocation(profile, x, y)?.wanderArea;
  const candidates = SAFE_WANDER_POINTS.filter((point) => {
    const distance = Math.hypot(point.x - x, point.y - y);
    return point.area === currentArea && distance >= 45 && distance <= 560;
  });
  if (!candidates.length) return null;

  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  const { area: _area, ...destination } = candidates[index];
  return { id: 'wander', ...destination };
}

function getNearestConfiguredLocation(profile, x, y) {
  const locationIds = ['park', 'shop', profile.homeLocation, profile.workLocation];
  return [...new Set(locationIds)]
    .map((id) => ({ id, ...LOCATION_CONFIG[id] }))
    .filter((location) => Number.isFinite(location.x) && Number.isFinite(location.y))
    .sort((a, b) => (
      Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)
    ))[0] ?? null;
}

export function getNearestLocationName(profile, x, y) {
  return getNearestConfiguredLocation(profile, x, y)?.name ?? '城市街道';
}

/** 跨区域只经过人工配置的道路中转点，不进行 A* 或动态寻路。 */
export function buildSafeRoute(profile, startX, startY, destination) {
  const startArea = getNearestConfiguredLocation(profile, startX, startY)?.wanderArea;
  const targetArea = destination?.wanderArea;
  const finalPoint = destination ? { x: destination.x, y: destination.y } : null;
  if (!finalPoint) return [];
  if (!startArea || !targetArea || startArea === targetArea) return [finalPoint];

  const route = [
    AREA_ROUTE_PORTALS[startArea],
    CITY_ROAD_HUB,
    AREA_ROUTE_PORTALS[targetArea],
    finalPoint,
  ].filter(Boolean);
  return route.filter((point, index) => (
    index === 0 || point.x !== route[index - 1].x || point.y !== route[index - 1].y
  ));
}

export function getBehaviorStatusText(action, arrived) {
  const labels = {
    work: arrived ? '工作中' : '前往工作地点',
    home: arrived ? '在家休息' : '回家中',
    wander: '散步中',
    park: arrived ? '在公园' : '前往公园',
    shop: arrived ? '在商店' : '前往商店',
    rest: '休息中',
  };
  return labels[action] ?? '按日程活动';
}

export function getAbsoluteGameMinutes(time) {
  return (Math.max(1, Number(time.day) || 1) - 1) * 1440
    + (Number(time.hour) || 0) * 60
    + (Number(time.minute) || 0);
}

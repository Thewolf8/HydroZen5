import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

let _nextId = 5000;
function nextId() { return _nextId++; }

export async function requestPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch { return false; }
}

export async function cancelNotifications(ids: number[]) {
  if (!Capacitor.isNativePlatform() || ids.length === 0) return;
  try {
    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
  } catch {}
}

export async function scheduleWaterReminders(
  times: string[],       // ["08:00", "10:00", ...]
  title: string,
  body: string,
): Promise<Record<string, number>> {
  if (!Capacitor.isNativePlatform()) return {};

  const map: Record<string, number> = {};
  const notifications = times.map(time => {
    const [h, m] = time.split(':').map(Number);
    const id = nextId();
    map[time] = id;
    const scheduleAt = new Date();
    scheduleAt.setHours(h, m, 0, 0);
    if (scheduleAt <= new Date()) scheduleAt.setDate(scheduleAt.getDate() + 1);
    return {
      id,
      title,
      body,
      schedule: { at: scheduleAt, repeats: true, every: 'day' as const },
      smallIcon: 'ic_stat_aquaflow',
    };
  });

  try {
    await LocalNotifications.schedule({ notifications });
  } catch {}

  return map;
}

export async function scheduleGoalAchievedNotification(title: string, body: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: nextId(),
        title,
        body,
        schedule: { at: new Date(Date.now() + 500) },
        smallIcon: 'ic_stat_aquaflow',
      }],
    });
  } catch {}
}

export async function scheduleMorningMotivation(hour: number, title: string, body: string): Promise<number> {
  if (!Capacitor.isNativePlatform()) return -1;
  const id = nextId();
  const at = new Date();
  at.setHours(hour, 0, 0, 0);
  if (at <= new Date()) at.setDate(at.getDate() + 1);
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title,
        body,
        schedule: { at, repeats: true, every: 'day' as const },
        smallIcon: 'ic_stat_aquaflow',
      }],
    });
  } catch {}
  return id;
}

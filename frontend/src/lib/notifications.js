import { playSound } from './sound';

let swRegistration = null;

/**
 * Registers the Service Worker at root scope for background alerts.
 */
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      swRegistration = reg;
      console.log('[PWA] Service Worker registered successfully:', reg.scope);
      return reg;
    } catch (err) {
      console.warn('[PWA] Service Worker registration failed:', err);
      return null;
    }
  }
  return null;
};

/**
 * Requests browser & system notification permission.
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported by browser.');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
    }
    return permission;
  } catch (err) {
    console.warn('Notification permission error:', err);
    return 'denied';
  }
};

/**
 * Speaks an urgent voice announcement for the kitchen & floor staff.
 */
export const speakOrderAlert = (tableNumber) => {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const text = `Attention kitchen: Table ${tableNumber} order has arrived! Please start making it.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;
      utterance.lang = 'en-IN'; // Indian English cadence
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.warn('Speech synthesis alert failed:', e);
  }
};

/**
 * Triggers a multi-channel order arrival notification:
 * 1. Audio siren / kitchen bell
 * 2. Voice announcement ("Table 1 order has arrived! Please start making it")
 * 3. System Push / Lock Screen Notification with vibration pattern
 */
export const triggerStaffOrderNotification = async ({
  tableNumber = '01',
  orderNumber = '',
  itemsSummary = '',
  customerName = 'Guest'
}) => {
  // Format table number clearly
  const digits = String(tableNumber).replace(/\D/g, '');
  const displayTable = digits ? parseInt(digits, 10) : tableNumber;

  // 1. Play kitchen bell sound
  playSound('order');

  // 2. Play spoken audio announcement
  speakOrderAlert(displayTable);

  // 3. Vibrate device (if supported, e.g. Android phone)
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([400, 150, 400, 150, 500]);
    } catch (e) {
      console.warn(e);
    }
  }

  // 4. Send background notification via Service Worker (works on locked phone / background tab)
  const title = `🚨 Table ${displayTable} Order Arrived!`;
  const body = `Table ${displayTable} order #${orderNumber} from ${customerName}. ${itemsSummary ? `Items: ${itemsSummary}` : 'Please start making it now!'}`;

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_ORDER_NOTIFICATION',
        title,
        body,
        tableNumber: displayTable,
        orderNumber,
        tag: `order-${orderNumber || Date.now()}`,
        url: '/?tab=kitchen'
      });
      return;
    } catch (e) {
      console.warn('SW message failed:', e);
    }
  }

  // 5. Fallback: Native Window Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f97316"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"/></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f97316"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"/></svg>',
        vibrate: [400, 150, 400, 150, 500],
        tag: `order-${orderNumber || Date.now()}`,
        renotify: true,
        requireInteraction: true
      });
    } catch (err) {
      console.warn('Native notification failed:', err);
    }
  }
};

/**
 * Speaks an urgent voice announcement for table service calls (Waiter, Water, Bill).
 */
export const speakServiceAlert = (tableNumber, label = 'Assistance') => {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `Attention staff: Table ${tableNumber} has requested ${label}!`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.warn('Speech synthesis service alert failed:', e);
  }
};

/**
 * Triggers a multi-channel service call alert (Waiter/Water/Bill requested from table QR):
 * 1. Audio chime
 * 2. Voice announcement ("Attention staff: Table 1 has requested Floor Waiter!")
 * 3. Vibration & Lock Screen Push Notification
 */
export const triggerStaffServiceNotification = async ({
  tableNumber = '01',
  type = 'WAITER',
  label = 'Floor Waiter Assistance',
  customerName = 'Guest'
}) => {
  const digits = String(tableNumber).replace(/\D/g, '');
  const displayTable = digits ? parseInt(digits, 10) : tableNumber;

  // 1. Play waiter chime
  playSound('waiter');

  // 2. Play spoken audio announcement
  speakServiceAlert(displayTable, label);

  // 3. Vibrate device
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([300, 100, 300, 100, 400]);
    } catch (e) {}
  }

  // 4. Send background notification via Service Worker
  const title = `🔔 Table ${displayTable}: ${label}`;
  const body = `Guest at Table ${displayTable} requested ${label}. Please attend immediately.`;

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_ORDER_NOTIFICATION',
        title,
        body,
        tableNumber: displayTable,
        orderNumber: `srv-${Date.now()}`,
        tag: `service-${displayTable}-${Date.now()}`,
        url: '/?tab=tables'
      });
      return;
    } catch (e) {
      console.warn('SW message failed:', e);
    }
  }

  // 5. Fallback: Native Window Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f97316"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"/></svg>',
        vibrate: [300, 100, 300],
        tag: `service-${displayTable}-${Date.now()}`,
        renotify: true,
        requireInteraction: true
      });
    } catch (err) {
      console.warn('Native notification failed:', err);
    }
  }
};

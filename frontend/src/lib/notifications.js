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
/**
 * Speaks an urgent voice announcement for the kitchen & floor staff.
 */
export const speakOrderAlert = (tableNumber, isAddon = false, itemsSummary = '') => {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const digits = String(tableNumber || '').replace(/\D/g, '');
      const spokenTable = digits ? `Table ${parseInt(digits, 10)}` : (String(tableNumber || '').trim() || 'Table');
      const text = isAddon
        ? `Attention floor staff: ${spokenTable} has placed an add-on order for ${itemsSummary || 'items'}. Please deliver promptly.`
        : `Attention kitchen: ${spokenTable} order has arrived! Please start making it.`;
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
 * Spoken audio test confirmation for the kitchen panel.
 */
export const speakSystemTestAlert = () => {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = 'Kitchen audio system online. Ready for all dining table orders.';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.warn('Speech synthesis test failed:', e);
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
  customerName = 'Guest',
  isAddon = false,
  paymentMode = 'Cash'
}) => {
  // Format table number clearly
  const digits = String(tableNumber).replace(/\D/g, '');
  const displayTable = digits ? parseInt(digits, 10) : tableNumber;

  // 1. Play kitchen bell sound
  playSound(isAddon ? 'waiter' : 'order');

  // 2. Play spoken audio announcement
  speakOrderAlert(displayTable, isAddon, itemsSummary, paymentMode);

  // 3. Vibrate device (if supported, e.g. Android phone)
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(isAddon ? [250, 100, 250, 100, 350] : [400, 150, 400, 150, 500]);
    } catch (e) {
      console.warn(e);
    }
  }

  // 4. Send background notification via Service Worker (works on locked phone / background tab)
  const title = isAddon ? `💧 Table ${displayTable} Add-On: ${itemsSummary || 'Water'}!` : `🚨 Table ${displayTable} Order Arrived!`;
  const body = isAddon
    ? `Table ${displayTable} added ${itemsSummary || 'items'}. Serve promptly!`
    : `Table ${displayTable} order #${orderNumber} from ${customerName}. ${itemsSummary ? `Items: ${itemsSummary}` : 'Please start making it now!'}`;

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
 * Speaks an urgent voice announcement for table cleaning requests.
 */
export const speakTableCleanAlert = (tableNumber) => {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `Attention floor waiter: Table ${tableNumber} needs cleaning! Please clean and reset Table ${tableNumber}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.warn('Speech synthesis clean table alert failed:', e);
  }
};

/**
 * Triggers a multi-channel service call alert (Waiter/Water/Bill/Clean requested from table QR or vacate):
 * 1. Audio chime
 * 2. Voice announcement ("Attention staff: Table 1 has requested Floor Waiter!" or "Table 1 needs cleaning!")
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
  const isCleaningCall = String(type).toLowerCase().includes('clean') || String(label).toLowerCase().includes('clean');

  // 1. Play chime (urgent alert for table cleaning, bell for waiter)
  if (isCleaningCall) {
    playSound('alert');
    speakTableCleanAlert(displayTable);
  } else {
    playSound('waiter');
    speakServiceAlert(displayTable, label);
  }

  // 2. Vibrate device with distinctive pattern
  if ('vibrate' in navigator) {
    try {
      if (isCleaningCall) {
        navigator.vibrate([400, 150, 400, 150, 400]);
      } else {
        navigator.vibrate([300, 100, 300, 100, 400]);
      }
    } catch (e) {}
  }

  // 3. Send background notification via Service Worker
  const title = isCleaningCall ? `🧹 Table ${displayTable}: Clean & Reset Table!` : `🔔 Table ${displayTable}: ${label}`;
  const body = isCleaningCall 
    ? `Table ${displayTable} is vacated or requested cleaning. Please clean & sanitize now.`
    : `Guest at Table ${displayTable} requested ${label}. Please attend immediately.`;

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

/**
 * Triggers a 30-minute turnover notification for floor managers/admin:
 * Prompts admin to check if Table {tableNumber} is empty and vacate or snooze.
 */
export const triggerTableTurnoverNotification = async ({
  tableNumber = '01',
  minutesElapsed = 30
}) => {
  const digits = String(tableNumber).replace(/\D/g, '');
  const displayTable = digits ? parseInt(digits, 10) : tableNumber;

  // 1. Play alert sound
  playSound('alert');

  // 2. Spoken voice announcement
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `Attention floor manager: ${minutesElapsed} minutes have elapsed since food was served at Table ${displayTable}. Please check if the table is empty.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.warn('Speech synthesis turnover alert failed:', e);
  }

  // 3. Vibrate device
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([350, 150, 350, 150, 350]);
    } catch (e) {}
  }

  // 4. Send background notification via Service Worker
  const title = `⏳ Table ${displayTable}: 30m Turnover Check!`;
  const body = `30 minutes have elapsed since food was served at Table ${displayTable}. Check if table is empty to free for waiting guests.`;

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_ORDER_NOTIFICATION',
        title,
        body,
        tableNumber: displayTable,
        orderNumber: `turnover-${Date.now()}`,
        tag: `turnover-${displayTable}`,
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
        tag: `turnover-${displayTable}`,
        renotify: true,
        requireInteraction: true
      });
    } catch (err) {
      console.warn('Native notification failed:', err);
    }
  }
};

/**
 * Speaks food ready alert specifically for the Waiter / Food Runner.
 */
export const speakFoodReadyAlert = (tableNumber, itemsSummary = '') => {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `Attention floor runner: Food for Table ${tableNumber} is ready on the counter! Please collect and deliver to table.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.warn('Speech synthesis food ready alert failed:', e);
  }
};

/**
 * Triggers food ready for pickup alert:
 * 1. Audio pickup triple-tone chime
 * 2. Voice announcement ("Attention floor runner: Food for Table X is ready on counter...")
 * 3. Vibration & Lock Screen Notification
 */
export const triggerWaiterFoodReadyNotification = async ({
  tableNumber = '01',
  orderNumber = '',
  itemsSummary = ''
}) => {
  const digits = String(tableNumber).replace(/\D/g, '');
  const displayTable = digits ? parseInt(digits, 10) : tableNumber;

  // 1. Play pickup chime
  playSound('ready');

  // 2. Play spoken audio announcement
  speakFoodReadyAlert(displayTable, itemsSummary);

  // 3. Vibrate device
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([250, 100, 250, 100, 350]);
    } catch (e) {}
  }

  // 4. Send background notification via Service Worker
  const title = `🍽️ Table ${displayTable}: Food Ready for Pickup!`;
  const body = itemsSummary 
    ? `Order #${orderNumber} (${itemsSummary}) is hot & plated. Collect from kitchen counter and deliver to Table ${displayTable}.`
    : `Plated food waiting on kitchen counter. Collect and deliver to Table ${displayTable}.`;

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_ORDER_NOTIFICATION',
        title,
        body,
        tableNumber: displayTable,
        orderNumber: orderNumber || `ready-${Date.now()}`,
        tag: `ready-${displayTable}-${Date.now()}`,
        url: '/?tab=waiter&sub=ready'
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
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232563eb"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"/></svg>',
        vibrate: [250, 100, 250],
        tag: `ready-${displayTable}-${Date.now()}`,
        renotify: true,
        requireInteraction: true
      });
    } catch (err) {
      console.warn('Native notification failed:', err);
    }
  }
};


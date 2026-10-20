import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cwdsurzzcvsrycklkhrz.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZHN1cnp6Y3Zzcnlja2xraHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMDI1MjcsImV4cCI6MjEwNzg3ODUyN30.DjxPvDPBvVpOFc_GWJvO5zHReY-sRDT87iI3FXGmido';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

// ---------------------------------------------------------------------------
// DATA ACCESS HELPERS (SUPABASE + LOCAL STORAGE CACHE FALLBACK)
// ---------------------------------------------------------------------------

export const getLocalStore = (key, fallback) => {
  try {
    const item = localStorage.getItem(`atmiya_${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error('Storage Read Error:', e);
    return fallback;
  }
};

export const setLocalStore = (key, value) => {
  try {
    localStorage.setItem(`atmiya_${key}`, JSON.stringify(value));
    window.dispatchEvent(new Event('atmiya_data_updated'));
  } catch (e) {
    console.error('Storage Write Error:', e);
  }
};

// Log action to audit_logs
export const recordEmployeeActivity = async (
  employeeName,
  employeeRole,
  actionType,
  details,
  tableNumber = null,
  orderId = null
) => {
  const payload = {
    restaurant_id: RESTAURANT_ID,
    employee_name: employeeName || 'Staff',
    employee_role: employeeRole || 'Admin',
    action_type: actionType,
    details: details || '',
    table_number: tableNumber,
    order_id: orderId,
  };

  try {
    const { error } = await supabase.from('audit_logs').insert([payload]);
    if (error) console.warn('[SUPABASE] Audit log insert notice:', error.message);
  } catch (err) {
    console.warn('[SUPABASE] Audit network fallback:', err);
  }

  // Also cache locally
  const localLogs = getLocalStore('audit_logs', []);
  localLogs.unshift({ ...payload, id: `log_${Date.now()}`, created_at: new Date().toISOString() });
  setLocalStore('audit_logs', localLogs.slice(0, 100));
};

// ---------------------------------------------------------------------------
// ORDER & TABLE SESSION DISPATCH TO SUPABASE CLOUD
// ---------------------------------------------------------------------------

/**
 * Normalizes any table representation (e.g. 'T01', 'Table 1', '1', 'T-01') into 'T-01' format.
 */
export const normalizeTableNumber = (tableNum) => {
  if (!tableNum) return 'T-01';
  const digits = String(tableNum).replace(/\D/g, '');
  if (!digits) return 'T-01';
  return `T-${digits.padStart(2, '0')}`;
};

/**
 * Creates or updates an ACTIVE session in `table_sessions`,
 * inserts the order into `orders`,
 * inserts all items into `order_items`,
 * and persists the customer into `customers` CRM in Supabase Cloud.
 */
export const dispatchOrderToSupabase = async ({
  table_number,
  customer_name,
  customer_phone,
  items = [],
  subtotal = 0,
  tax = 0,
  discount = 0,
  total = 0,
  payment_mode = 'Cash',
  special_note = '',
  order_id = null
}) => {
  const formattedTableNum = normalizeTableNumber(table_number);
  const cleanPhone = customer_phone ? String(customer_phone).replace(/[^0-9]/g, '').slice(-10) : null;
  const guestName = customer_name ? String(customer_name).trim() : 'Walk-in Guest';
  const isOnlinePayment = payment_mode === 'UPI' || payment_mode === 'Online' || payment_mode === 'UPI_COUNTER' || payment_mode === 'ONLINE_RAZORPAY';

  let tableId = null;
  let sessionId = null;
  let sessionCode = null;
  let createdOrder = null;

  try {
    // 1. Resolve Table UUID from restaurant_tables
    const { data: tableData, error: tableErr } = await supabase
      .from('restaurant_tables')
      .select('id, table_number')
      .eq('table_number', formattedTableNum)
      .maybeSingle();

    if (!tableErr && tableData) {
      tableId = tableData.id;
    } else {
      // Fallback: look for table by number without hyphen
      const altNum = formattedTableNum.replace('-', '');
      const { data: altTable } = await supabase
        .from('restaurant_tables')
        .select('id, table_number')
        .eq('table_number', altNum)
        .maybeSingle();
      if (altTable) tableId = altTable.id;
    }

    // Default fallback to first table if not resolved
    if (!tableId) {
      tableId = '4f8bb699-0c21-40d5-8e89-6cdd06d7dd77'; // T-01 ID
    }

    // 2. Find or Create ACTIVE Table Session
    if (tableId) {
      const { data: activeSession, error: sessFindErr } = await supabase
        .from('table_sessions')
        .select('id, session_code, total_amount')
        .eq('table_id', tableId)
        .eq('status', 'ACTIVE')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sessFindErr && activeSession) {
        sessionId = activeSession.id;
        sessionCode = activeSession.session_code;
        // Update session total & customer details
        const currentTotal = parseFloat(activeSession.total_amount) || 0;
        const newTotal = (currentTotal + parseFloat(total || 0)).toFixed(2);
        await supabase
          .from('table_sessions')
          .update({
            total_amount: newTotal,
            customer_name: guestName,
            customer_phone: cleanPhone || activeSession.customer_phone
          })
          .eq('id', activeSession.id);
      }
    }

    // If no active session found for this table, create a fresh one
    if (!sessionId) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randSuffix = Math.floor(100 + Math.random() * 900);
      sessionCode = `SESS-${dateStr}-${formattedTableNum.replace('-', '')}-${randSuffix}`;

      const { data: newSession, error: sessCreateErr } = await supabase
        .from('table_sessions')
        .insert([{
          restaurant_id: RESTAURANT_ID,
          table_id: tableId,
          session_code: sessionCode,
          status: 'ACTIVE',
          customer_name: guestName,
          customer_phone: cleanPhone,
          total_amount: parseFloat(total || 0),
          opened_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (sessCreateErr) {
        console.error('[SUPABASE] Session creation error:', sessCreateErr.message);
      } else if (newSession) {
        sessionId = newSession.id;
        sessionCode = newSession.session_code;
      }
    }

    // 3. Mark Table as OCCUPIED
    if (tableId) {
      try {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'OCCUPIED' })
          .eq('id', tableId);
      } catch (e) {
        console.warn('[SUPABASE] Notice setting table status:', e);
      }
    }

    // 4. Insert Order into `orders`
    const orderNumberStr = order_id ? String(order_id).replace('#', '') : `ORD-${Date.now().toString().slice(-6)}`;
    const paymentMethod = isOnlinePayment ? 'UPI_COUNTER' : 'CASH';
    const paymentStatus = isOnlinePayment ? 'PAID' : 'UNPAID';

    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert([{
        restaurant_id: RESTAURANT_ID,
        session_id: sessionId,
        table_id: tableId,
        table_number: formattedTableNum,
        order_number: orderNumberStr,
        customer_name: guestName,
        customer_phone: cleanPhone,
        status: 'PLACED',
        subtotal: parseFloat(subtotal || 0),
        tax_amount: parseFloat(tax || 0),
        discount_amount: parseFloat(discount || 0),
        total_amount: parseFloat(total || 0),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        special_notes: special_note || '',
        placed_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (orderErr) {
      console.error('[SUPABASE] Order creation error:', orderErr.message);
    } else {
      createdOrder = orderData;
    }

    // 5. Insert Order Items into `order_items`
    if (createdOrder && items && items.length > 0) {
      const orderItemRows = items.map(item => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
        const qty = parseInt(item.qty || item.quantity, 10) || 1;
        const unitPrice = parseFloat(item.price || item.finalPrice || item.unit_price) || 0;
        return {
          order_id: createdOrder.id,
          menu_item_id: isUuid ? item.id : null,
          item_name: item.name || 'Dish Item',
          quantity: qty,
          unit_price: unitPrice,
          total_price: parseFloat((unitPrice * qty).toFixed(2)),
          cooking_note: item.note || item.cooking_note || null,
          status: 'PLACED'
        };
      });

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(orderItemRows);

      if (itemsErr) {
        console.error('[SUPABASE] Order items insert error:', itemsErr.message);
      }
    }

    // 6. Permanently Store / Update Customer Profile in Supabase CRM
    if (cleanPhone && cleanPhone.length === 10) {
      try {
        const { data: existingCust } = await supabase
          .from('customers')
          .select('*')
          .eq('restaurant_id', RESTAURANT_ID)
          .eq('phone', cleanPhone)
          .maybeSingle();

        const spentNow = parseFloat(total || 0);
        const earnedPoints = Math.max(10, Math.round(spentNow * 0.1));

        if (existingCust) {
          const totalOrders = (existingCust.total_orders || 1) + 1;
          const totalSpent = (parseFloat(existingCust.total_spent) || 0) + spentNow;
          const newPoints = (existingCust.loyalty_points || 100) + earnedPoints;

          await supabase
            .from('customers')
            .update({
              name: guestName !== 'Walk-in Guest' ? guestName : existingCust.name,
              total_orders: totalOrders,
              total_spent: totalSpent.toFixed(2),
              loyalty_points: newPoints,
              last_table: formattedTableNum,
              last_order_id: orderNumberStr,
              last_visited_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCust.id);
        } else {
          await supabase
            .from('customers')
            .insert([{
              restaurant_id: RESTAURANT_ID,
              name: guestName,
              phone: cleanPhone,
              total_orders: 1,
              total_spent: spentNow.toFixed(2),
              loyalty_points: 100 + earnedPoints,
              last_table: formattedTableNum,
              last_order_id: orderNumberStr,
              last_visited_at: new Date().toISOString()
            }]);
        }
      } catch (custErr) {
        console.warn('[SUPABASE] Customer CRM sync notice:', custErr);
      }
    }

    console.log(`[SUPABASE] Successfully dispatched order ${orderNumberStr} to Session ${sessionCode || sessionId}`);
    return {
      success: true,
      order: createdOrder,
      sessionId,
      sessionCode
    };

  } catch (globalErr) {
    console.error('[SUPABASE] Global order dispatch exception:', globalErr);
    return {
      success: false,
      error: globalErr.message,
      sessionId,
      sessionCode
    };
  }
};

/**
 * Updates an order's status in Supabase Cloud.
 */
export const updateOrderStatusInSupabase = async (orderIdOrNumber, newStatus) => {
  if (!orderIdOrNumber) return;

  const statusMap = {
    'Placed': 'PLACED',
    'placed': 'PLACED',
    'Preparing': 'PREPARING',
    'preparing': 'PREPARING',
    'Ready': 'READY',
    'ready': 'READY',
    'Served': 'SERVED',
    'served': 'SERVED',
    'Completed': 'SERVED',
    'completed': 'SERVED',
    'Cancelled': 'CANCELLED',
    'cancelled': 'CANCELLED'
  };
  const mapped = statusMap[newStatus] || 'PLACED';

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdOrNumber);
    const updatePayload = {
      status: mapped,
      served_at: mapped === 'SERVED' ? new Date().toISOString() : null
    };

    if (isUuid) {
      await supabase.from('orders').update(updatePayload).eq('id', orderIdOrNumber);
    } else {
      const cleanNum = String(orderIdOrNumber).replace('#', '');
      await supabase.from('orders').update(updatePayload).eq('order_number', cleanNum);
    }
  } catch (err) {
    console.warn('[SUPABASE] Order status update exception:', err);
  }
};

/**
 * Marks table session as COMPLETED, frees table to VACANT, and settles order payment.
 */
export const settleTableSessionInSupabase = async (tableNumber, orderIdOrNumber, paymentMethod = 'Cash') => {
  const formattedTableNum = normalizeTableNumber(tableNumber);
  const mappedPaymentMethod = (paymentMethod === 'Cash' || paymentMethod === 'CASH') ? 'CASH' : 'UPI_COUNTER';

  try {
    // 1. Get Table ID
    const { data: tableData } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('table_number', formattedTableNum)
      .maybeSingle();

    if (tableData?.id) {
      // 2. Complete active session
      await supabase
        .from('table_sessions')
        .update({
          status: 'COMPLETED',
          closed_at: new Date().toISOString()
        })
        .eq('table_id', tableData.id)
        .eq('status', 'ACTIVE');

      // 3. Mark Table as VACANT
      await supabase
        .from('restaurant_tables')
        .update({ status: 'VACANT' })
        .eq('id', tableData.id);
    }

    // 4. Update order payment status to PAID
    if (orderIdOrNumber) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdOrNumber);
      const updatePayload = {
        payment_status: 'PAID',
        payment_method: mappedPaymentMethod,
        status: 'SERVED',
        served_at: new Date().toISOString()
      };

      if (isUuid) {
        await supabase.from('orders').update(updatePayload).eq('id', orderIdOrNumber);
      } else {
        const cleanNum = String(orderIdOrNumber).replace('#', '');
        await supabase.from('orders').update(updatePayload).eq('order_number', cleanNum);
      }
    }
  } catch (err) {
    console.warn('[SUPABASE] Settle table session exception:', err);
  }
};

/**
 * Fetches recent live orders and their items from Supabase Cloud.
 */
export const fetchLiveOrdersFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        restaurant_id,
        session_id,
        table_id,
        table_number,
        order_number,
        customer_name,
        customer_phone,
        status,
        subtotal,
        tax_amount,
        discount_amount,
        total_amount,
        payment_method,
        payment_status,
        special_notes,
        placed_at,
        served_at,
        order_items (
          id,
          item_name,
          quantity,
          unit_price,
          total_price,
          cooking_note,
          status
        )
      `)
      .order('placed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('[SUPABASE] Fetch live orders notice:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[SUPABASE] Fetch live orders exception:', err);
    return null;
  }
};


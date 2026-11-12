// Multi-Language Translation System for Restaurant POS & Guest Menu
// Supported: English (en), Hindi (hi), Gujarati (gu), Hinglish (hinglish)

export const TRANSLATIONS = {
  en: {
    // Brand & Roles
    adminPanel: "Restaurant Admin Panel",
    admin: "Admin",
    goodMorning: "Good Morning",
    restaurantTagline: "Pure Veg • Authentic Taste • Since 2010",
    smallBites: "Small Bites, Big Happiness",
    goodFoodHappyPeople: "Good Food, Happy People",
    poweredByAppwrite: "Powered by Appwrite",
    builtWithLove: "Built with ❤️ for Restaurants",

    // Navigation
    dashboard: "Dashboard",
    orders: "Orders",
    kitchenPanel: "Kitchen Panel",
    tables: "Tables",
    waiterTerminal: "Waiter Terminal",
    menuManagement: "Menu Management",
    employees: "Employees",
    reportsAnalytics: "Reports & Analytics",
    offersCoupons: "Offers & Coupons",
    qrManagement: "QR Management",
    settings: "Settings",
    customerMenu: "Customer Menu",
    kitchenKDS: "Kitchen KDS",
    logout: "Sign Out",
    login: "Log In",
    signup: "Sign Up",

    // Action Buttons
    addOrder: "Add Order",
    addItem: "Add Item",
    generateQR: "Generate QR",
    applyCoupon: "Apply Coupon",
    newOrder: "New Order",
    newBadge: "NEW",
    menuItem: "Menu Item",
    tableQR: "Table QR",
    discount: "Discount",
    viewAll: "View All",
    view: "View",
    save: "Save",
    cancel: "Cancel",
    attend: "Attend",
    markReady: "Mark Ready",
    serve: "Serve",
    printBill: "Print Bill",
    manageMenu: "Manage Menu",
    createCoupon: "Create Coupon",
    viewReports: "View Reports",

    // KPI Cards
    totalOrders: "Total Orders",
    totalSales: "Total Sales",
    activeTables: "Active Tables",
    pendingOrders: "Pending Orders",
    vsYesterday: "vs yesterday",
    inUse: "In Use",
    inKitchen: "In Kitchen",

    // Charts & Overview
    salesOverview: "Sales Overview",
    last7Days: "Last 7 days",
    topSellingItems: "Top Selling Items",
    topFoodCategories: "Top Food Categories",
    recentActivity: "Recent Activity",
    tableStatus: "Table Status",
    quickActions: "Quick Actions",
    todayOrders: "Today's Orders",
    ongoing: "Ongoing",
    completed: "Completed",
    cancelled: "Cancelled",

    // Table Headers
    orderId: "Order ID",
    tableNo: "Table No.",
    items: "Items",
    status: "Status",
    time: "Time",
    action: "Action",
    guestName: "Guest Name",
    amount: "Amount",
    subtotal: "Subtotal",
    tax: "GST (5%)",
    total: "Total",

    // Status Badges
    occupied: "Occupied",
    available: "Available",
    preparing: "Preparing",
    ready: "Ready",
    cooking: "Cooking",
    served: "Served",
    billing: "Billing",

    // Smart Promotion Card
    smartRestaurantManagement: "Smart Restaurant Management",
    fasterOrders: "Faster Digital Orders",
    betterCustomerExperience: "Better Customer Experience",
    higherSales: "Higher Table Turnover & Sales",
    completeControl: "Complete Real-time Control",
    upgradePlan: "Explore Pro Features",

    // Customer Menu UI
    table: "Table",
    pureVeg100: "100% Pure Veg",
    service: "Service",
    searchPlaceholder: "Search orders, tables, menu items... (Ctrl+K)",
    searchMenu: "Search delicious dishes...",
    searchDishesPlaceholder: "Search dishes (e.g. Mysore, Pav Bhaji, Cheese...)",
    vegOnly: "Pure Veg Only",
    spicyOnly: "Spicy",
    jain: "🌱 Jain",
    spicy: "Spicy",
    dishesCount: "Dishes",
    allDishes: "All",
    custom: "Custom",
    add: "ADD",
    extra: "+ Extra",
    addToCart: "Add to Cart",
    cart: "Your Order Cart",
    placeOrder: "Confirm & Place Order",
    callWaiter: "Call Waiter",
    callWaiterDesc: "Water bottle, extra cutlery, or dining assistance.",
    requestWater: "Request Water",
    requestBill: "Request Bill",
    requestBillDesc: "Get final printed bill & settle at table or counter.",
    cleanTable: "Clean & Napkins",
    cleanTableDesc: "Request table wiped or fresh paper napkins.",
    closeService: "Close Service Menu",
    orderPlacedSuccess: "Your order has been sent to the Kitchen!",
    specialInstructions: "Special cooking instructions (e.g. less oil, extra chutney)...",
    paymentMode: "Payment Method",
    payAtCounter: "Pay at Counter (Cash/Card)",
    payUPI: "Pay via UPI QR",

    // Dish Customizer
    selectCustomizations: "Select Customizations:",
    extraAmulButter: "Extra Amul Butter",
    richButterLayer: "Rich golden butter layer",
    extraAmulCheese: "Extra Amul Cheese",
    moltenCheeseTopping: "Grated molten cheese topping",
    jainPrep: "Jain Preparation",
    noOnionGarlic: "Strictly no onion, garlic or root veggies",
    free: "FREE",
    basePrice: "Base Price",
    totalItemPrice: "Total Item Price",
    addToOrder: "Add to Order",

    // Floating Cart & Drawer
    viewCart: "View Cart",
    dishesInCart: "Dishes in Cart",
    orderInKitchen: "Order #{id} in Kitchen",
    tableOrderTitle: "Table {table} Order",
    round2AddOn: "Round 2 Add-On Order",
    round2Note: "Initial meal is cooking. This will be added to your table session!",
    promoCode: "Have a Promo Coupon?",
    apply: "Apply",
    guestDetails: "Guest Details (Table {table})",
    guestRequiredNote: "Required for food serving & earning permanent loyalty rewards.",
    required: "Required",
    yourName: "Your Name",
    namePlaceholder: "Enter your full name (e.g. Rahul Sharma)",
    mobileNumber: "10-Digit Mobile Number",
    choosePayment: "Choose Payment Option",
    payOnlineUpi: "Pay Online (UPI)",
    payOnlineUpiDesc: "Instant UPI QR (GPay, PhonePe, Paytm). Auto-verified.",
    fastKitchenFire: "Fast Kitchen Fire",
    codTitle: "Cash on Delivery",
    codDesc: "Eat first, pay cash or UPI at the cashier desk upon bill.",
    payAtCashierDesk: "Pay at Cashier Desk",
    totalToPay: "Total to Pay:",
    confirmOrderBtn: "Confirm Table {table} Order (₹{amount})",

    // Banners & Concierge
    tableSessionActive: "Table {table} Session Active • Order #{id}",
    cookingMealNote: "Your meal is being prepared with care. Need extra dosas, chaas or dishes? You can order extras below anytime!",
    orderWaterBtn: "💧 Order Water (₹20)",
    trackFood: "Track Food",
    tableConciergeTitle: "Table {table} Service & Concierge",
    conciergeSub: "Direct floor service dispatched instantly to your table",
    mineralWater: "Mineral Water",
    waterModalSub: "Chilled 1L sealed bottle. Added directly to table bill.",

    // 1-Tap Mineral Water Modal
    mineralWater1L: "Packaged Mineral Water (1L)",
    perChilledBottle: "₹20 per Chilled Sealed Bottle",
    bottlesNeeded: "Bottles Needed",
    deliveredChilled: "Delivered chilled to Table {table}",
    waterAddedToBill: "Added Directly to Table {table} Bill",
    waterAddedToBillDesc: "Water charge (₹{amount}) will be added to your table's running bill. Pay together when settling your final bill at exit.",
    addToTableBillBtn: "Add to Table Bill • ₹{amount}",
    chooseWaterPayment: "Payment for Water:",
    payWaterUpi: "⚡ Pay Online via UPI (₹{amount})",
    autoPaid: "Auto-Paid",
    payWaterUpiDesc: "Pay instant ₹{amount} with GPay / PhonePe / Paytm. Receipt auto-verified.",
    payWaterCashWaiter: "💵 Pay Cash to Waiter (₹{amount})",
    atTable: "At Table",
    payWaterCashWaiterDesc: "Floor waiter delivers chilled bottle & collects ₹{amount} cash on delivery.",
    payWaterCounter: "🧾 Add to Table Bill (₹{amount})",
    atExit: "At Exit",
    payWaterCounterDesc: "Added to Table {table} bill. Pay together at the cashier desk when leaving.",
    totalWaterBill: "Total Water Bill",
    confirmWaterOrder: "Add to Table Bill",

    // Success & Tracker Modals
    orderReceived: "Order Received!",
    orderReceivedDesc: "Piping hot pure-veg dishes are now being prepared in the kitchen.",
    assignedTable: "Assigned Table:",
    guest: "Guest:",
    mobile: "Mobile:",
    paidOnlineUpi: "✅ Paid Online (UPI)",
    codAtCounter: "⚠️ Cash on Delivery (At Counter)",
    crmRewardSaved: "Permanent customer record saved with loyalty reward points.",
    continueToMenu: "Continue to Table Menu",
    orderKOTFired: "Order Received & KOT Fired",
    orderKOTDesc: "Sent to kitchen screen & KOT printed",
    cookingInKitchen: "Cooking in Kitchen",
    cookingDesc: "Fresh dosas and food being cooked by kitchen chefs",
    deliveredToTable: "Delivered to Table",
    dishesDeliveredCount: "{served} of {total} dishes delivered to Table {table}",
    allDishesDelivered: "All dishes have been delivered to your table! Enjoy your authentic meal 🍽️",
    foodReadyServing: "Food Ready! Serving to Table",
    deliveredDesc: "Floor staff delivers directly to Table {table}",
    dishesOnTicket: "Dishes on this Ticket",
    qty: "Qty",
    needWaterWhileWaiting: "Need Mineral Water or extra dishes while waiting?",
    billTotal: "Bill Total:",
    closeTracker: "Close Tracker",
    orderNotice: "Order Notice for Table {table}",
    orderCancelledDesc: "Your order could not be fulfilled:",
    selectAlternativeDish: "Please select an alternative dish from our live menu below or notify floor staff.",
    welcomeStripTitle: "Authentic Gujarati & South Indian Tawa Specialties",
    welcomeStripSub: "Freshly prepared upon ordering • Jain options available",

    // Culinary Meta
    tawaDosa: "Tawa Dosa",
    pavBhaji: "Pav Bhaji",
    tawaPulao: "Tawa Pulao",
    wokSpecialty: "Wok Specialty",
    sandwich: "Sandwich",
    tawaPizza: "Tawa Pizza",
    beverageAndWater: "Beverages & Water",
    warmSoup: "Warm Soup",
    dessert: "Dessert",
    chefSpecialty: "Chef Specialty",

    // Auth
    welcomeBack: "Welcome back to your Restaurant Admin",
    createAccount: "Create Restaurant Staff Account",
    fullName: "Full Name",
    emailAddress: "Email Address",
    password: "Password",
    restaurantName: "Restaurant Name",
    role: "Staff Role",
    ownerAdmin: "Owner / Administrator",
    manager: "Floor Manager",
    kitchenStaff: "Chef / Kitchen Staff",
    waiterStaff: "Service Waiter",
    alreadyHaveAccount: "Already have an account? Log In",
    needAccount: "New here? Register Restaurant Account",

    // Language Preference Modal & System
    selectLanguage: "Select Your Language",
    selectLanguageDesc: "Choose your preferred language for menu browsing and instant table ordering.",
    preferredLanguage: "Preferred Language",
    changeLanguage: "Change Language",
    continueButton: "Continue to Menu",
    choosePreferredLanguage: "Choose Preferred Language",
    chooseLangDesc: "All menus, terminals, and notifications will display in your selected language.",
    selectAssignedRole: "Select Assigned Role",
    floorWaiter: "Floor Waiter",
    kitchenChef: "Kitchen Chef",
    staffFullName: "Staff Full Name",
    staffFullNamePlaceholder: "e.g. Ramesh Patel",
    staffIdOrEmail: "Staff ID, Username or Email",
    staffIdPlaceholder: "e.g. WTR-104 or ramesh@atmiyadosa.com",
    setPasswordOrPin: "Set Password or 4-Digit PIN",
    mobileOptional: "Mobile Number",
    optional: "Optional",
    registerAndSignInBtn: "Register Staff Account & Sign In",
    registeringStaff: "Registering Staff...",
    enterTerminalBtn: "Enter {role} Terminal",
    authenticatingTerminal: "Authenticating Terminal...",
    visitingAsDiner: "Visiting as a Diner?",
    openTableMenu: "Open Table QR Customer Menu",
    openMenuBtn: "Open Menu",
    typeCredentialsNote: "Type your assigned ID & password to enter",
    newStaffRegister: "New staff? Register →",
    selectDutyStation: "Select Duty Station",
    terminalAccess: "Terminal Access",
    staffRegistration: "Staff Registration",
    terminalAccessSub: "Choose your role station to launch the touch console",
    staffRegistrationSub: "Register your waiter or chef credentials for floor duty",
    ownerPos: "Owner POS",
    floorService: "Floor Service",
    liveKds: "Live KDS"
  },

  hi: {
    // Brand & Roles
    adminPanel: "रेस्टोरेंट एडमिन पैनल",
    admin: "एडमिन",
    goodMorning: "शुभ प्रभात",
    restaurantTagline: "शुद्ध शाकाहारी • प्रामाणिक स्वाद • 2010 से",
    smallBites: "स्वादिष्ट निवाले, असीम खुशियां",
    goodFoodHappyPeople: "उत्कृष्ट भोजन, प्रसन्न ग्राहक",
    poweredByAppwrite: "Appwrite द्वारा संचालित",
    builtWithLove: "रेस्टोरेंट के लिए ❤️ से निर्मित",

    // Navigation
    dashboard: "डैशबोर्ड",
    orders: "ऑर्डर्स",
    kitchenPanel: "रसोई पैनल",
    tables: "टेबल्स",
    waiterTerminal: "वेटर टर्मिनल",
    menuManagement: "मेन्यू प्रबंधन",
    employees: "कर्मचारी",
    reportsAnalytics: "रिपोर्ट्स और विश्लेषण",
    offersCoupons: "ऑफ़र और कूपन",
    qrManagement: "क्यूआर प्रबंधन",
    settings: "सेटिंग्स",
    customerMenu: "ग्राहक मेन्यू",
    kitchenKDS: "किचन केडीएस",
    logout: "लॉग आउट",
    login: "लॉग इन",
    signup: "साइन अप",

    // Action Buttons
    addOrder: "नया ऑर्डर",
    addItem: "नया व्यंजन",
    generateQR: "क्यूआर बनाएं",
    applyCoupon: "कूपन लगाएं",
    newOrder: "नया ऑर्डर",
    newBadge: "नया",
    menuItem: "मेन्यू व्यंजन",
    tableQR: "टेबल क्यूआर",
    discount: "छूट",
    viewAll: "सभी देखें",
    view: "देखें",
    save: "सहेजें",
    cancel: "रद्द करें",
    attend: "अटेंड करें",
    markReady: "तैयार चिह्नित करें",
    serve: "परोसें",
    printBill: "बिल प्रिंट करें",
    manageMenu: "मेन्यू संभालें",
    createCoupon: "कूपन बनाएं",
    viewReports: "रिपोर्ट देखें",

    // KPI Cards
    totalOrders: "कुल ऑर्डर्स",
    totalSales: "कुल बिक्री",
    activeTables: "सक्रिय टेबल्स",
    pendingOrders: "लंबित ऑर्डर्स",
    vsYesterday: "कल की तुलना में",
    inUse: "उपयोग में",
    inKitchen: "रसोई में",

    // Charts & Overview
    salesOverview: "बिक्री का अवलोकन",
    last7Days: "पिछले 7 दिन",
    topSellingItems: "सर्वाधिक बिकने वाले व्यंजन",
    topFoodCategories: "शीर्ष खाद्य श्रेणियां",
    recentActivity: "हाल की गतिविधियां",
    tableStatus: "टेबल की स्थिति",
    quickActions: "त्वरित कार्य",
    todayOrders: "आज के ऑर्डर्स",
    ongoing: "जारी",
    completed: "पूर्ण",
    cancelled: "रद्द",

    // Table Headers
    orderId: "ऑर्डर आईडी",
    tableNo: "टेबल नं.",
    items: "व्यंजन",
    status: "स्थिति",
    time: "समय",
    action: "कार्रवाई",
    guestName: "अतिथि का नाम",
    amount: "राशि",
    subtotal: "उप-योग",
    tax: "जीएसटी (5%)",
    total: "कुल योग",

    // Status Badges
    occupied: "व्यस्त",
    available: "खाली",
    preparing: "तैयार हो रहा है",
    ready: "तैयार है",
    cooking: "पक रहा है",
    served: "परोसा गया",
    billing: "बिलिंग",

    // Smart Promotion Card
    smartRestaurantManagement: "स्मार्ट रेस्टोरेंट प्रबंधन",
    fasterOrders: "तेज़ डिजिटल ऑर्डर्स",
    betterCustomerExperience: "उत्कृष्ट ग्राहक अनुभव",
    higherSales: "अधिक बिक्री और टर्नओवर",
    completeControl: "पूर्ण वास्तविक समय नियंत्रण",
    upgradePlan: "प्रो सुविधाएं देखें",

    // Customer Menu UI
    table: "टेबल",
    pureVeg100: "100% शुद्ध शाकाहारी",
    service: "सेवा",
    searchPlaceholder: "ऑर्डर, टेबल, मेन्यू खोजें... (Ctrl+K)",
    searchMenu: "स्वादिष्ट व्यंजन खोजें...",
    searchDishesPlaceholder: "व्यंजन खोजें (जैसे मैसूर, पाव भाजी, चीज़...)",
    vegOnly: "केवल शुद्ध शाकाहारी",
    spicyOnly: "तीखा",
    jain: "🌱 जैन",
    spicy: "तीखा",
    dishesCount: "व्यंजन",
    allDishes: "सभी",
    custom: "कस्टम",
    add: "जोड़ें",
    extra: "+ अतिरिक्त",
    addToCart: "कार्ट में जोड़ें",
    cart: "आपकी ऑर्डर कार्ट",
    placeOrder: "ऑर्डर कन्फ़र्म करें",
    callWaiter: "वेटर को बुलाएं",
    callWaiterDesc: "पानी की बोतल, अतिरिक्त चम्मच या सहायता के लिए।",
    requestWater: "पानी का अनुरोध",
    requestBill: "बिल का अनुरोध",
    requestBillDesc: "अंतिम प्रिंटेड बिल प्राप्त करें और भुगतान करें।",
    cleanTable: "टेबल सफाई और नैपकिन",
    cleanTableDesc: "टेबल साफ कराने या नैपकिन मंगाने के लिए।",
    closeService: "सेवा मेनू बंद करें",
    orderPlacedSuccess: "आपका ऑर्डर रसोई में भेज दिया गया है!",
    specialInstructions: "विशेष रसोई निर्देश (जैसे कम तेल, अतिरिक्त चटनी)...",
    paymentMode: "भुगतान का प्रकार",
    payAtCounter: "काउंटर पर भुगतान (नकद/कार्ड)",
    payUPI: "यूपीआई क्यूआर द्वारा भुगतान",

    // Dish Customizer
    selectCustomizations: "पसंद के अनुसार चुनें:",
    extraAmulButter: "अतिरिक्त अमूल बटर",
    richButterLayer: "मक्खन की परत",
    extraAmulCheese: "अतिरिक्त अमूल चीज़",
    moltenCheeseTopping: "कद्दूकस किया हुआ चीज़",
    jainPrep: "जैन तैयारी",
    noOnionGarlic: "बिना प्याज, लहसुन या कंदमूल",
    free: "मुफ़्त",
    basePrice: "मूल कीमत",
    totalItemPrice: "कुल कीमत",
    addToOrder: "ऑर्डर में जोड़ें",

    // Floating Cart & Drawer
    viewCart: "कार्ट देखें",
    dishesInCart: "कार्ट में व्यंजन",
    orderInKitchen: "रसोई में ऑर्डर #{id}",
    tableOrderTitle: "टेबल {table} ऑर्डर",
    round2AddOn: "राउंड 2 नया ऑर्डर",
    round2Note: "पहला खाना पक रहा है। यह आपके इसी टेबल सत्र में जुड़ेगा!",
    promoCode: "क्या आपके पास कूपन है?",
    apply: "लागू करें",
    guestDetails: "अतिथि विवरण (टेबल {table})",
    guestRequiredNote: "खाना परोसने और रिवॉर्ड पॉइंट्स के लिए आवश्यक।",
    required: "आवश्यक",
    yourName: "आपका नाम",
    namePlaceholder: "अपना पूरा नाम दर्ज करें (जैसे राहुल शर्मा)",
    mobileNumber: "10-अंकों का मोबाइल नंबर",
    choosePayment: "भुगतान का तरीका चुनें",
    payOnlineUpi: "ऑनलाइन भुगतान (UPI)",
    payOnlineUpiDesc: "त्वरित UPI QR (GPay, PhonePe, Paytm)। स्वतः सत्यापित।",
    fastKitchenFire: "तेज़ रसोई आदेश",
    codTitle: "कैश ऑन डिलीवरी",
    codDesc: "पहले भोजन करें, बिल आने पर कैशियर डेस्क पर भुगतान करें।",
    payAtCashierDesk: "कैशियर डेस्क पर भुगतान",
    totalToPay: "कुल देय राशि:",
    confirmOrderBtn: "टेबल {table} ऑर्डर कन्फर्म करें (₹{amount})",

    // Banners & Concierge
    tableSessionActive: "टेबल {table} सत्र चालू है • ऑर्डर #{id}",
    cookingMealNote: "आपका भोजन तैयार किया जा रहा है। अतिरिक्त डोसा, छाछ या व्यंजन चाहिए? आप नीचे कभी भी ऑर्डर कर सकते हैं!",
    orderWaterBtn: "💧 पानी मंगाएं (₹20)",
    trackFood: "ऑर्डर ट्रैक करें",
    tableConciergeTitle: "टेबल {table} सेवा और सहायता",
    conciergeSub: "आपके टेबल पर तुरंत सहायता भेजी जाएगी",
    mineralWater: "मिनरल वाटर",
    waterModalSub: "ठंडी 1 लीटर सीलबंद बोतल। सीधे टेबल बिल में जुड़ेगी।",

    // 1-Tap Mineral Water Modal
    mineralWater1L: "पैकेज्ड मिनरल वाटर (1 लीटर)",
    perChilledBottle: "₹20 प्रति ठंडी सीलबंद बोतल",
    bottlesNeeded: "कितनी बोतल चाहिए?",
    deliveredChilled: "टेबल {table} पर ठंडी पहुंचाई जाएगी",
    waterAddedToBill: "सीधे टेबल {table} बिल में जुड़ेगा",
    waterAddedToBillDesc: "पानी का शुल्क (₹{amount}) आपके टेबल के बिल में जुड़ेगा। जाते समय काउंटर पर एक साथ भुगतान करें।",
    addToTableBillBtn: "टेबल बिल में जोड़ें • ₹{amount}",
    chooseWaterPayment: "पानी भुगतान:",
    payWaterUpi: "⚡ ऑनलाइन UPI से भुगतान करें (₹{amount})",
    autoPaid: "स्वतः भुगतान",
    payWaterUpiDesc: "GPay / PhonePe / Paytm से तुरंत ₹{amount} भुगतान करें।",
    payWaterCashWaiter: "💵 वेटर को नकद दें (₹{amount})",
    atTable: "टेबल पर",
    payWaterCashWaiterDesc: "वेटर ठंडी बोतल पहुंचाएगा और टेबल पर ही ₹{amount} नकद लेगा।",
    payWaterCounter: "🧾 टेबल बिल में जोड़ें (₹{amount})",
    atExit: "जाते समय",
    payWaterCounterDesc: "टेबल {table} के बिल में जोड़ा जाएगा। जाते समय काउंटर पर एक साथ भुगतान करें।",
    totalWaterBill: "कुल पानी बिल",
    confirmWaterOrder: "टेबल बिल में जोड़ें",

    // Success & Tracker Modals
    orderReceived: "ऑर्डर प्राप्त हुआ!",
    orderReceivedDesc: "गरमा-गरम शुद्ध शाकाहारी व्यंजन रसोई में तैयार हो रहे हैं।",
    assignedTable: "आवंटित टेबल:",
    guest: "अतिथि:",
    mobile: "मोबाइल:",
    paidOnlineUpi: "✅ ऑनलाइन भुगतान पूर्ण (UPI)",
    codAtCounter: "⚠️ कैश ऑन डिलीवरी (काउंटर पर)",
    crmRewardSaved: "ग्राहक खाते में रिवॉर्ड पॉइंट्स जुड़ गए हैं।",
    continueToMenu: "मेन्यू पर वापस जाएं",
    orderKOTFired: "ऑर्डर प्राप्त और KOT जारी",
    orderKOTDesc: "रसोई स्क्रीन पर भेजा गया और KOT प्रिंट हुआ",
    cookingInKitchen: "रसोई में खाना पक रहा है",
    cookingDesc: "रसोई रसोइयों द्वारा ताजा डोसा और भोजन तैयार किया जा रहा है",
    deliveredToTable: "टेबल पर परोसा गया",
    dishesDeliveredCount: "{total} में से {served} व्यंजन टेबल {table} पर परोसे गए",
    allDishesDelivered: "सभी व्यंजन आपकी टेबल पर परोस दिए गए हैं! स्वादिष्ट भोजन का आनंद लें 🍽️",
    foodReadyServing: "खाना तैयार है! टेबल पर परोसा जा रहा है",
    deliveredDesc: "स्टाफ सीधे टेबल {table} पर परोसेगा",
    dishesOnTicket: "इस टिकट के व्यंजन",
    qty: "मात्रा",
    needWaterWhileWaiting: "प्रतीक्षा के दौरान पानी या अतिरिक्त व्यंजन चाहिए?",
    billTotal: "कुल बिल:",
    closeTracker: "ट्रैकर बंद करें",
    orderNotice: "टेबल {table} के लिए सूचना",
    orderCancelledDesc: "आपका ऑर्डर पूरा नहीं हो सका:",
    selectAlternativeDish: "कृपया नीचे दिए गए मेन्यू से दूसरा व्यंजन चुनें या स्टाफ को सूचित करें।",
    welcomeStripTitle: "प्रामाणिक गुजराती और दक्षिण भारतीय तवा व्यंजन",
    welcomeStripSub: "ऑर्डर पर तुरंत ताजा तैयार • जैन विकल्प उपलब्ध",

    // Culinary Meta
    tawaDosa: "तवा डोसा",
    pavBhaji: "पाव भाजी",
    tawaPulao: "तवा पुलाव",
    wokSpecialty: "चाइनीज स्पेशल",
    sandwich: "सैंडविच",
    tawaPizza: "तवा पिज्जा",
    beverageAndWater: "पेय और पानी",
    warmSoup: "गर्म सूप",
    dessert: "मिठाई",
    chefSpecialty: "शेफ स्पेशल",

    // Auth
    welcomeBack: "आपके रेस्टोरेंट एडमिन में पुनः स्वागत है",
    createAccount: "रेस्टोरेंट स्टाफ खाता बनाएं",
    fullName: "पूरा नाम",
    emailAddress: "ईमेल पता",
    password: "पासवर्ड",
    restaurantName: "रेस्टोरेंट का नाम",
    role: "स्टाफ पद",
    ownerAdmin: "मालिक / प्रशासक",
    manager: "फ्लोर मैनेजर",
    kitchenStaff: "शेफ / रसोई कर्मचारी",
    waiterStaff: "सेवा वेटर",
    alreadyHaveAccount: "क्या आपके पास पहले से खाता है? लॉग इन करें",
    needAccount: "नया खाता बनाएं",

    // Language Preference Modal & System
    selectLanguage: "अपनी भाषा चुनें",
    selectLanguageDesc: "डिजिटल मेन्यू और टेबल ऑर्डर के लिए अपनी पसंदीदा भाषा चुनें।",
    preferredLanguage: "पसंदीदा भाषा",
    changeLanguage: "भाषा बदलें",
    continueButton: "मेन्यू पर आगे बढ़ें",
    choosePreferredLanguage: "पसंदीदा भाषा चुनें",
    chooseLangDesc: "सभी मेन्यू, टर्मिनल और सूचनाएं आपकी चुनी हुई भाषा में प्रदर्शित होंगी।",
    selectAssignedRole: "नियुक्त पद चुनें",
    floorWaiter: "फ्लोर वेटर",
    kitchenChef: "किचन शेफ",
    staffFullName: "स्टाफ का पूरा नाम",
    staffFullNamePlaceholder: "जैसे: रमेश पटेल",
    staffIdOrEmail: "स्टाफ आईडी, यूजरनेम या ईमेल",
    staffIdPlaceholder: "जैसे: WTR-104 या ramesh@atmiyadosa.com",
    setPasswordOrPin: "पासवर्ड या 4-अंकीय पिन बनाएं",
    mobileOptional: "मोबाइल नंबर",
    optional: "वैकल्पिक",
    registerAndSignInBtn: "स्टाफ खाता रजिस्टर करें और प्रवेश करें",
    registeringStaff: "स्टाफ खाता बनाया जा रहा है...",
    enterTerminalBtn: "{role} टर्मिनल में प्रवेश करें",
    authenticatingTerminal: "टर्मिनल सत्यापित किया जा रहा है...",
    visitingAsDiner: "ग्राहक के रूप में आए हैं?",
    openTableMenu: "टेबल क्यूआर ग्राहक मेन्यू खोलें",
    openMenuBtn: "मेन्यू खोलें",
    typeCredentialsNote: "प्रवेश करने के लिए अपनी आईडी और पासवर्ड दर्ज करें",
    newStaffRegister: "नए स्टाफ हैं? रजिस्टर करें →",
    selectDutyStation: "कार्य स्टेशन चुनें",
    terminalAccess: "टर्मिनल एक्सेस",
    staffRegistration: "स्टाफ पंजीकरण",
    terminalAccessSub: "टच कंसोल शुरू करने के लिए अपना स्टेशन चुनें",
    staffRegistrationSub: "फ्लोर ड्यूटी के लिए अपने वेटर या शेफ क्रेडेंशियल रजिस्टर करें",
    ownerPos: "मालिक पीओएस",
    floorService: "फ्लोर सर्विस",
    liveKds: "लाइव केडीएस"
  },

  gu: {
    // Brand & Roles
    adminPanel: "રેસ્ટોરન્ટ એડમિન પેનલ",
    admin: "એડમિન",
    goodMorning: "શુભ સવાર",
    restaurantTagline: "શુદ્ધ શાકાહારી • અસલ સ્વાદ • 2010 થી",
    smallBites: "સ્વાદિષ્ટ કોળીયા, અસીમ ખુશી",
    goodFoodHappyPeople: "શ્રેષ્ઠ ભોજન, ખુશ ગ્રાહકો",
    poweredByAppwrite: "Appwrite દ્વારા સંચાલિત",
    builtWithLove: "રેસ્ટોરન્ટ માટે ❤️ થી બનાવેલ",

    // Navigation
    dashboard: "ડેશબોર્ડ",
    orders: "ઓર્ડર્સ",
    kitchenPanel: "કિચન પેનલ",
    tables: "ટેબલ્સ",
    waiterTerminal: "વેઈટર ટર્મિનલ",
    menuManagement: "મેનૂ મેનેજમેન્ટ",
    employees: "કર્મચારીઓ",
    reportsAnalytics: "રિપોર્ટ્સ અને એનાલિટિક્સ",
    offersCoupons: "ઓફર્સ અને કૂપન્સ",
    qrManagement: "ક્યૂઆર મેનેજમેન્ટ",
    settings: "સેટિંગ્સ",
    customerMenu: "ગ્રાહક મેનૂ",
    kitchenKDS: "કિચન કેડીએસ",
    logout: "સાઇન આઉટ",
    login: "લોગ ઇન",
    signup: "સાઇન અપ",

    // Action Buttons
    addOrder: "ઓર્ડર ઉમેરો",
    addItem: "વાનગી ઉમેરો",
    generateQR: "ક્યૂઆર બનાવો",
    applyCoupon: "કૂપન વાપરો",
    newOrder: "નવો ઓર્ડર",
    newBadge: "નવો",
    menuItem: "મેનૂ વાનગી",
    tableQR: "ટેબલ ક્યૂઆર",
    discount: "ડિસ્કાઉન્ટ",
    viewAll: "બધા જુઓ",
    view: "જુઓ",
    save: "સાચવો",
    cancel: "રદ કરો",
    attend: "હાજરી આપો",
    markReady: "તૈયાર કરો",
    serve: "પીરસો",
    printBill: "બિલ પ્રિન્ટ કરો",
    manageMenu: "મેનૂ ગોઠવો",
    createCoupon: "કૂપન બનાવો",
    viewReports: "રિપોર્ટ જુઓ",

    // KPI Cards
    totalOrders: "કુલ ઓર્ડર્સ",
    totalSales: "કુલ વેચાણ",
    activeTables: "ચાલુ ટેબલ્સ",
    pendingOrders: "બાકી ઓર્ડર્સ",
    vsYesterday: "ગઈકાલ કરતાં",
    inUse: "ઉપયોગમાં",
    inKitchen: "રસોડામાં",

    // Charts & Overview
    salesOverview: "વેચાણ વિહંગાવલોકન",
    last7Days: "છેલ્લા 7 દિવસ",
    topSellingItems: "સૌથી વધુ વેચાતી વાનગીઓ",
    topFoodCategories: "મુખ્ય ફૂડ કેટેગરીઝ",
    recentActivity: "તાજેતરની પ્રવૃત્તિ",
    tableStatus: "ટેબલની સ્થિતિ",
    quickActions: "ઝડપી ક્રિયાઓ",
    todayOrders: "આજના ઓર્ડર્સ",
    ongoing: "ચાલુ",
    completed: "પૂર્ણ",
    cancelled: "રદ થયેલ",

    // Table Headers
    orderId: "ઓર્ડર આઈડી",
    tableNo: "ટેબલ નં.",
    items: "વાનગીઓ",
    status: "સ્થિતિ",
    time: "સમય",
    action: "ક્રિયા",
    guestName: "ગ્રાહકનું નામ",
    amount: "રકમ",
    subtotal: "સબટોટલ",
    tax: "જીએસટી (5%)",
    total: "કુલ રકમ",

    // Status Badges
    occupied: "ભરેલું",
    available: "ખાલી",
    preparing: "બની રહ્યું છે",
    ready: "તૈયાર છે",
    cooking: "રસોઈ ચાલુ છે",
    served: "પીરસાઈ ગયું",
    billing: "બિલિંગ",

    // Smart Promotion Card
    smartRestaurantManagement: "સ્માર્ટ રેસ્ટોરન્ટ સંચાલન",
    fasterOrders: "ઝડપી ડિજિટલ ઓર્ડર્સ",
    betterCustomerExperience: "શ્રેષ્ઠ ગ્રાહક અનુભવ",
    higherSales: "વધુ વેચાણ અને આવક",
    completeControl: "સંપૂર્ણ રીઅલ-ટાઇમ નિયંત્રણ",
    upgradePlan: "પ્રો ફીચર્સ જુઓ",

    // Customer Menu UI
    table: "ટેબલ",
    pureVeg100: "૧૦૦% શુદ્ધ શાકાહારી",
    service: "સેવા",
    searchPlaceholder: "ઓર્ડર, ટેબલ, મેનૂ શોધો... (Ctrl+K)",
    searchMenu: "સ્વાદિષ્ટ વાનગીઓ શોધો...",
    searchDishesPlaceholder: "વાનગીઓ શોધો (જેમ કે માયસોર, પાંઉભાજી, ચીઝ...)",
    vegOnly: "શુદ્ધ શાકાહારી જ",
    spicyOnly: "તીખું",
    jain: "🌱 જૈન",
    spicy: "તીખું",
    dishesCount: "વાનગીઓ",
    allDishes: "બધા",
    custom: "કસ્ટમ",
    add: "ઉમેરો",
    extra: "+ વધારાનું",
    addToCart: "કાર્ટમાં ઉમેરો",
    cart: "તમારું ઓર્ડર કાર્ટ",
    placeOrder: "ઓર્ડર કન્ફર્મ કરો",
    callWaiter: "વેઈટરને બોલાવો",
    callWaiterDesc: "પાણીની બોટલ, વધારાની ચમચી-વાટકી અથવા મદદ માટે.",
    requestWater: "પાણી મંગાવો",
    requestBill: "બિલ મંગાવો",
    requestBillDesc: "છેલ્લું પ્રિન્ટેડ બિલ મેળવો અને ટેબલ કે કાઉન્ટર પર ચૂકવો.",
    cleanTable: "ટેબલ સફાઈ અને નેપકિન",
    cleanTableDesc: "ટેબલ સાફ કરાવવા અથવા નેપકિન મંગાવવા માટે.",
    closeService: "સેવા મેનૂ બંધ કરો",
    orderPlacedSuccess: "તમારો ઓર્ડર કિચનમાં પહોંચી ગયો છે!",
    specialInstructions: "ખાસ સૂચના (જેમ કે ઓછું તેલ, વધુ ચટણી)...",
    paymentMode: "ચૂકવણી પદ્ધતિ",
    payAtCounter: "કાઉન્ટર પર ચૂકવો (રોકડ/કાર્ડ)",
    payUPI: "યુપીઆઈ ક્યૂઆર દ્વારા ચૂકવો",

    // Dish Customizer
    selectCustomizations: "પસંદગી મુજબ ઉમેરો:",
    extraAmulButter: "વધારાનું અમૂલ બટર",
    richButterLayer: "સોનેરી બટર સ્તર",
    extraAmulCheese: "વધારાનું અમૂલ ચીઝ",
    moltenCheeseTopping: "છીણેલું ચીઝ ટોપિંગ",
    jainPrep: "જૈન બનાવટ",
    noOnionGarlic: "કાંદા, લસણ કે કંદમૂળ વગર",
    free: "મફત",
    basePrice: "મૂળ કિંમત",
    totalItemPrice: "કુલ કિંમત",
    addToOrder: "ઓર્ડરમાં ઉમેરો",

    // Floating Cart & Drawer
    viewCart: "કાર્ટ જુઓ",
    dishesInCart: "કાર્ટમાં વાનગીઓ",
    orderInKitchen: "કિચનમાં ઓર્ડર #{id}",
    tableOrderTitle: "ટેબલ {table} ઓર્ડર",
    round2AddOn: "વધારાનો નવો ઓર્ડર",
    round2Note: "પહેલો ઓર્ડર બની રહ્યો છે. આ તમારી વર્તમાન ટેબલ બેઠકમાં ઉમેરાશે!",
    promoCode: "શું તમારી પાસે કૂપન છે?",
    apply: "લાગુ કરો",
    guestDetails: "ગ્રાહકની વિગતો (ટેબલ {table})",
    guestRequiredNote: "વાનગી પીરસવા અને લોયલ્ટી પોઈન્ટ્સ માટે જરૂરી.",
    required: "જરૂરી",
    yourName: "તમારું નામ",
    namePlaceholder: "તમારું પૂરું નામ લખો (જેમ કે રાહુલ પટેલ)",
    mobileNumber: "૧૦-આંકડાનો મોબાઇલ નંબર",
    choosePayment: "ચૂકવણી પદ્ધતિ પસંદ કરો",
    payOnlineUpi: "ઓનલાઇન ચૂકવો (UPI)",
    payOnlineUpiDesc: "ઝડપી UPI QR (GPay, PhonePe, Paytm). આપોઆપ ચકાસાયેલ.",
    fastKitchenFire: "ઝડપી કિચન ઓર્ડર",
    codTitle: "રોકડ ચૂકવણી (COD)",
    codDesc: "પહેલા જમો, બિલ આવે ત્યારે કાઉન્ટર પર રોકડ કે UPI થી ચૂકવો.",
    payAtCashierDesk: "કાઉન્ટર પર ચૂકવણી",
    totalToPay: "કુલ ચૂકવવાપાત્ર:",
    confirmOrderBtn: "ટેબલ {table} ઓર્ડર કન્ફર્મ કરો (₹{amount})",

    // Banners & Concierge
    tableSessionActive: "ટેબલ {table} બેઠક ચાલુ છે • ઓર્ડર #{id}",
    cookingMealNote: "તમારો ઓર્ડર તૈયાર થઈ રહ્યો છે. વધારાના ઢોસા, છાસ કે વાનગીઓ જોઈએ છે? તમે નીચેથી ગમે ત્યારે ઓર્ડર કરી શકો છો!",
    orderWaterBtn: "💧 પાણી મંગાવો (₹૨૦)",
    trackFood: "ઓર્ડર જુઓ",
    tableConciergeTitle: "ટેબલ {table} સેવા અને સહાય",
    conciergeSub: "તમારા ટેબલ પર તાત્કાલિક સ્ટાફ સેવા મોકલવામાં આવશે",
    mineralWater: "મિનરલ વોટર",
    waterModalSub: "ઠંડી ૧ લિટર સીલબંધ બોટલ. સીધા ટેબલ બિલમાં ઉમેરાશે.",

    // 1-Tap Mineral Water Modal
    mineralWater1L: "પેકેજ્ડ મિનરલ વોટર (૧ લીટર)",
    perChilledBottle: "₹૨૦ પ્રતિ ઠંડી સીલબંધ બોટલ",
    bottlesNeeded: "કેટલી બોટલ જોઈએ છે?",
    deliveredChilled: "ટેબલ {table} પર ઠંડી પહોંચાડવામાં આવશે",
    waterAddedToBill: "સીધા ટેબલ {table} બિલમાં ઉમેરાશે",
    waterAddedToBillDesc: "પાણીનો ચાર્જ (₹{amount}) તમારા ટેબલના બિલમાં આપોઆપ ઉમેરાઈ જશે. જતી વખતે કાઉન્ટર પર એકસાથે ચૂકવો.",
    addToTableBillBtn: "ટેબલ બિલમાં ઉમેરો • ₹{amount}",
    chooseWaterPayment: "પાણી ચૂકવણી:",
    payWaterUpi: "⚡ ઓનલાઇન UPI દ્વારા ચૂકવો (₹{amount})",
    autoPaid: "આપોઆપ ચૂકતે",
    payWaterUpiDesc: "GPay / PhonePe / Paytm થી તાત્કાલિક ₹{amount} ચૂકવો. પહોંચ આપોઆપ ચકાસાઈ જશે.",
    payWaterCashWaiter: "💵 વેઈટરને રોકડ ચૂકવો (₹{amount})",
    atTable: "ટેબલ પર",
    payWaterCashWaiterDesc: "વેઈટર ઠંડી બોટલ પહોંચાડીને ટેબલ પર જ ₹{amount} રોકડા મેળવશે.",
    payWaterCounter: "🧾 ટેબલ બિલમાં ઉમેરો (₹{amount})",
    atExit: "જતી વખતે",
    payWaterCounterDesc: "ટેબલ {table} બિલમાં ઉમેરાશે. જતી વખતે કાઉન્ટર પર એકસાથે ચૂકવો.",
    totalWaterBill: "કુલ પાણી બિલ",
    confirmWaterOrder: "ટેબલ બિલમાં ઉમેરો",

    // Success & Tracker Modals
    orderReceived: "ઓર્ડર સ્વીકારાયો!",
    orderReceivedDesc: "ગરમાગરમ શુદ્ધ શાકાહારી વાનગીઓ કિચનમાં બની રહી છે.",
    assignedTable: "ફાળવેલ ટેબલ:",
    guest: "ગ્રાહક:",
    mobile: "મોબાઇલ:",
    paidOnlineUpi: "✅ ઓનલાઇન ચૂકવાઈ ગયું (UPI)",
    codAtCounter: "⚠️ રોકડ ચૂકવણી (કાઉન્ટર પર)",
    crmRewardSaved: "ગ્રાહક ખાતામાં લોયલ્ટી પોઈન્ટ્સ સચવાઈ ગયા છે.",
    continueToMenu: "મેનૂ પર પાછા જાઓ",
    orderKOTFired: "ઓર્ડર મળ્યો અને રસોડામાં ચિઠ્ઠી ગઈ",
    orderKOTDesc: "કિચન સ્ક્રીન પર મોકલાયો અને KOT પ્રિન્ટ થયો",
    cookingInKitchen: "કિચનમાં રસોઈ બની રહી છે",
    cookingDesc: "શેફ દ્વારા તાજા ઢોસા અને વાનગીઓ બની રહી છે",
    deliveredToTable: "ટેબલ પર પીરસાઈ ગયું",
    dishesDeliveredCount: "{total} માંથી {served} વાનગીઓ ટેબલ {table} પર પીરસાઈ ગઈ",
    allDishesDelivered: "બધી વાનગીઓ તમારા ટેબલ પર પીરસાઈ ગઈ છે! સ્વાદિષ્ટ ભોજનનો આનંદ માણો 🍽️",
    foodReadyServing: "વાનગી તૈયાર છે! ટેબલ પર પીરસી રહ્યા છીએ",
    deliveredDesc: "સ્ટાફ સીધા ટેબલ {table} પર પીરસશે",
    dishesOnTicket: "આ ટિકિટની વાનગીઓ",
    qty: "જથ્થો",
    needWaterWhileWaiting: "રાહ જોતી વખતે પાણી કે વધારાની વાનગી જોઈએ છે?",
    billTotal: "કુલ બિલ:",
    closeTracker: "ટ્રેકર બંધ કરો",
    orderNotice: "ટેબલ {table} માટે ઓર્ડર સૂચના",
    orderCancelledDesc: "તમારો ઓર્ડર પૂરો થઈ શક્યો નથી:",
    selectAlternativeDish: "કૃપા કરીને નીચેના મેનૂમાંથી બીજી વાનગી પસંદ કરો અથવા સ્ટાફને જણાવો.",
    welcomeStripTitle: "અસલ ગુજરાતી અને સાઉથ ઇન્ડિયન તવા સ્પેશિયાલિટી",
    welcomeStripSub: "ઓર્ડર આપતા જ તાજું બનાવાય છે • જૈન વિકલ્પ ઉપલબ્ધ",

    // Culinary Meta
    tawaDosa: "તવા ઢોસા",
    pavBhaji: "પાંઉભાજી",
    tawaPulao: "તવા પુલાવ",
    wokSpecialty: "ચાઈનીઝ સ્પેશિયલ",
    sandwich: "સેન્ડવિચ",
    tawaPizza: "તવા પિઝા",
    beverageAndWater: "પીણાં અને પાણી",
    warmSoup: "ગરમ સુપ",
    dessert: "મીઠાઈ",
    chefSpecialty: "શેફ સ્પેશિયલ",

    // Auth
    welcomeBack: "તમારા રેસ્ટોરન્ટ એડમિનમાં સ્વાગત છે",
    createAccount: "નવું સ્ટાફ એકાઉન્ટ બનાવો",
    fullName: "પૂરું નામ",
    emailAddress: "ઈમેલ એડ્રેસ",
    password: "પાસવર્ડ",
    restaurantName: "રેસ્ટોરન્ટનું નામ",
    role: "હોદ્દો",
    ownerAdmin: "માલિક / એડમિનિસ્ટ્રેટર",
    manager: "ફ્લોર મેનેજર",
    kitchenStaff: "શેફ / કિચન સ્ટાફ",
    waiterStaff: "સર્વિસ વેઈટર",
    alreadyHaveAccount: "પહેલેથી એકાઉન્ટ છે? લોગ ઇન કરો",
    needAccount: "નવું એકાઉન્ટ રજીસ્ટર કરો",

    // Language Preference Modal & System
    selectLanguage: "તમારી ભાષા પસંદ કરો",
    selectLanguageDesc: "ડિજિટલ મેનૂ અને ટેબલ ઓર્ડર માટે તમારી પસંદગીની ભાષા પસંદ કરો.",
    preferredLanguage: "પસંદગીની ભાષા",
    changeLanguage: "ભાષા બદલો",
    continueButton: "મેનૂ જુઓ અને આગળ વધો",
    choosePreferredLanguage: "પસંદગીની ભાષા પસંદ કરો",
    chooseLangDesc: "તમામ મેનૂ, ટર્મિનલ અને સૂચનાઓ તમારી પસંદ કરેલી ભાષામાં દેખાશે.",
    selectAssignedRole: "સોંપેલ હોદ્દો પસંદ કરો",
    floorWaiter: "ફ્લોર વેઈટર",
    kitchenChef: "કિચન શેફ",
    staffFullName: "સ્ટાફનું પૂરું નામ",
    staffFullNamePlaceholder: "દા.ત. રમેશ પટેલ",
    staffIdOrEmail: "સ્ટાફ આઈડી, યુઝરનેમ અથવા ઈમેલ",
    staffIdPlaceholder: "દા.ત. WTR-104 અથવા ramesh@atmiyadosa.com",
    setPasswordOrPin: "પાસવર્ડ અથવા 4-અંકનો પિન સેટ કરો",
    mobileOptional: "મોબાઈલ નંબર",
    optional: "વૈકલ્પિક",
    registerAndSignInBtn: "સ્ટાફ એકાઉન્ટ રજીસ્ટર કરો અને લોગ ઇન કરો",
    registeringStaff: "સ્ટાફ એકાઉન્ટ બની રહ્યું છે...",
    enterTerminalBtn: "{role} ટર્મિનલમાં પ્રવેશ કરો",
    authenticatingTerminal: "ટર્મિનલ ચકાસણી થઈ રહી છે...",
    visitingAsDiner: "ગ્રાહક તરીકે આવ્યા છો?",
    openTableMenu: "ટેબલ QR ગ્રાહક મેનૂ ખોલો",
    openMenuBtn: "મેનૂ ખોલો",
    typeCredentialsNote: "પ્રવેશ કરવા માટે તમારો આઈડી અને પાસવર્ડ દાખલ કરો",
    newStaffRegister: "નવા સ્ટાફ છો? રજીસ્ટર કરો →",
    selectDutyStation: "ડ્યુટી સ્ટેશન પસંદ કરો",
    terminalAccess: "ટર્મિનલ એક્સેસ",
    staffRegistration: "સ્ટાફ રજીસ્ટ્રેશન",
    terminalAccessSub: "ટચ કન્સોલ શરૂ કરવા માટે તમારું સ્ટેશન પસંદ કરો",
    staffRegistrationSub: "ફ્લોર ડ્યુટી માટે તમારા વેઈટર અથવા શેફ વિગતો રજીસ્ટર કરો",
    ownerPos: "ઓનર POS",
    floorService: "ફ્લોર સર્વિસ",
    liveKds: "લાઈવ KDS"
  },

  hinglish: {
    // Brand & Roles
    adminPanel: "Restaurant Admin Panel",
    admin: "Admin",
    goodMorning: "Good Morning",
    restaurantTagline: "Pure Veg • Asli Swad • Since 2010",
    smallBites: "Chhote Bites, Badi Khushiyan",
    goodFoodHappyPeople: "Acha Khana, Khush Log",
    poweredByAppwrite: "Powered by Appwrite",
    builtWithLove: "Restaurants ke liye ❤️ se banaya gaya",

    // Navigation
    dashboard: "Dashboard",
    orders: "Orders",
    kitchenPanel: "Kitchen Panel",
    tables: "Tables",
    waiterTerminal: "Waiter Terminal",
    menuManagement: "Menu Sambhalo",
    employees: "Staff / Employees",
    reportsAnalytics: "Reports aur Hisab",
    offersCoupons: "Offers aur Coupons",
    qrManagement: "QR Management",
    settings: "Settings",
    customerMenu: "Customer Menu",
    kitchenKDS: "Kitchen KDS",
    logout: "Logout",
    login: "Login",
    signup: "Signup",

    // Action Buttons
    addOrder: "Order Add Karo",
    addItem: "Dish Add Karo",
    generateQR: "QR Code Banao",
    applyCoupon: "Coupon Lagao",
    newOrder: "Naya Order",
    newBadge: "NEW",
    menuItem: "Menu Item",
    tableQR: "Table QR",
    discount: "Discount",
    viewAll: "Sabhi Dekho",
    view: "Dekho",
    save: "Save Karo",
    cancel: "Cancel",
    attend: "Attend Karo",
    markReady: "Ready Mark Karo",
    serve: "Serve Karo",
    printBill: "Bill Print Karo",
    manageMenu: "Menu Sambhalo",
    createCoupon: "Coupon Banao",
    viewReports: "Reports Dekho",

    // KPI Cards
    totalOrders: "Total Orders",
    totalSales: "Total Bikri (Sales)",
    activeTables: "Active Tables",
    pendingOrders: "Pending Orders",
    vsYesterday: "kal ke mukable",
    inUse: "Occupied Hai",
    inKitchen: "Kitchen me hai",

    // Charts & Overview
    salesOverview: "Sales Overview",
    last7Days: "Pichle 7 din",
    topSellingItems: "Sabse Zyada Bikne Wale Items",
    topFoodCategories: "Top Categories",
    recentActivity: "Recent Activity",
    tableStatus: "Tables ki Halat",
    quickActions: "Quick Actions",
    todayOrders: "Aaj ke Orders",
    ongoing: "Chalu (Ongoing)",
    completed: "Khatam (Done)",
    cancelled: "Cancel",

    // Table Headers
    orderId: "Order ID",
    tableNo: "Table No.",
    items: "Items",
    status: "Status",
    time: "Time",
    action: "Action",
    guestName: "Customer Name",
    amount: "Amount",
    subtotal: "Subtotal",
    tax: "GST (5%)",
    total: "Total",

    // Status Badges
    occupied: "Occupied Hai",
    available: "Khali Hai",
    preparing: "Ban Raha Hai",
    ready: "Taiyar Hai",
    cooking: "Pak Raha Hai",
    served: "Serve Ho Gaya",
    billing: "Bill Ban Raha Hai",

    // Smart Promotion Card
    smartRestaurantManagement: "Smart Restaurant Management",
    fasterOrders: "Tez Digital Orders",
    betterCustomerExperience: "Behtareen Customer Experience",
    higherSales: "Zyada Sales aur Turnover",
    completeControl: "Pura Real-time Control",
    upgradePlan: "Pro Features Dekho",

    // Customer Menu UI
    table: "Table",
    pureVeg100: "100% Pure Veg",
    service: "Service",
    searchPlaceholder: "Orders, tables, menu khojo... (Ctrl+K)",
    searchMenu: "Swadisht dishes khojo...",
    searchDishesPlaceholder: "Dishes search karo (jaise Mysore, Pav Bhaji, Cheese...)",
    vegOnly: "Sirf Pure Veg",
    spicyOnly: "Spicy / Tikha",
    jain: "🌱 Jain",
    spicy: "Tikha",
    dishesCount: "Dishes",
    allDishes: "Sabhi",
    custom: "Custom",
    add: "ADD",
    extra: "+ Extra",
    addToCart: "Cart me Daalo",
    cart: "Aapka Order Cart",
    placeOrder: "Order Confirm Karo",
    callWaiter: "Waiter ko Bulao",
    callWaiterDesc: "Water bottle, extra spoon ya assistance ke liye.",
    requestWater: "Pani Mangwao",
    requestBill: "Bill Mangwao",
    requestBillDesc: "Final printed bill mangwao aur settle karo.",
    cleanTable: "Table Safai & Napkins",
    cleanTableDesc: "Table saaf karwane ya extra napkins ke liye.",
    closeService: "Service Menu Band Karo",
    orderPlacedSuccess: "Aapka order Kitchen me bhej diya gaya hai!",
    specialInstructions: "Special cooking instructions (jaise kam tel, extra chatni)...",
    paymentMode: "Payment Method",
    payAtCounter: "Counter pe Pay Karo (Cash/Card)",
    payUPI: "UPI QR se Pay Karo",

    // Dish Customizer
    selectCustomizations: "Customizations Chuno:",
    extraAmulButter: "Extra Amul Butter",
    richButterLayer: "Swadisht golden butter layer",
    extraAmulCheese: "Extra Amul Cheese",
    moltenCheeseTopping: "Grated molten cheese topping",
    jainPrep: "Jain Preparation",
    noOnionGarlic: "Bina pyaaz, lehsun ya root veggies",
    free: "FREE",
    basePrice: "Base Price",
    totalItemPrice: "Total Price",
    addToOrder: "Order me Daalo",

    // Floating Cart & Drawer
    viewCart: "Cart Dekho",
    dishesInCart: "Dishes Cart me",
    orderInKitchen: "Kitchen me Order #{id}",
    tableOrderTitle: "Table {table} Order",
    round2AddOn: "Round 2 Extra Order",
    round2Note: "Pehle ka order cooking me hai. Ye aapke table session me add hoga!",
    promoCode: "Promo Coupon hai?",
    apply: "Apply Karo",
    guestDetails: "Customer Details (Table {table})",
    guestRequiredNote: "Food serve karne aur points ke liye zaroori.",
    required: "Zaroori",
    yourName: "Aapka Naam",
    namePlaceholder: "Apna pura naam likho (jaise Rahul Sharma)",
    mobileNumber: "10-Digit Mobile Number",
    choosePayment: "Payment Option Chuno",
    payOnlineUpi: "Online Pay Karo (UPI)",
    payOnlineUpiDesc: "Instant UPI QR (GPay, PhonePe, Paytm). Auto-verified.",
    fastKitchenFire: "Fast Kitchen Fire",
    codTitle: "Cash on Delivery",
    codDesc: "Pehle khao, bill aane par counter pe cash ya UPI do.",
    payAtCashierDesk: "Cashier Desk pe Pay Karo",
    totalToPay: "Total Payable:",
    confirmOrderBtn: "Table {table} Order Confirm Karo (₹{amount})",

    // Banners & Concierge
    tableSessionActive: "Table {table} Session Active • Order #{id}",
    cookingMealNote: "Aapka meal prepare ho raha hai. Extra dosas, chaas ya dishes chahiye? Aap niche kabhi bhi order kar sakte ho!",
    orderWaterBtn: "💧 Pani Mangwao (₹20)",
    trackFood: "Food Track Karo",
    tableConciergeTitle: "Table {table} Service & Concierge",
    conciergeSub: "Aapki table pe turant staff aayega",
    mineralWater: "Mineral Water",
    waterModalSub: "Chilled 1L sealed bottle. UPI, Cash ya Bill se pay karo.",

    // 1-Tap Mineral Water Modal
    mineralWater1L: "Packaged Mineral Water (1L)",
    perChilledBottle: "₹20 per Chilled Sealed Bottle",
    bottlesNeeded: "Kitni Bottle Chahiye?",
    deliveredChilled: "Table {table} pe chilled aayegi",
    chooseWaterPayment: "Pani ke liye payment mode chuno:",
    payWaterUpi: "⚡ Online UPI se Pay Karo (₹{amount})",
    autoPaid: "Auto-Paid",
    payWaterUpiDesc: "GPay / PhonePe / Paytm se instant ₹{amount} pay karo.",
    payWaterCashWaiter: "💵 Waiter ko Cash do (₹{amount})",
    atTable: "Table pe",
    payWaterCashWaiterDesc: "Waiter chilled bottle dekar table pe ₹{amount} cash lega.",
    payWaterCounter: "🧾 Table Bill me Add Karo (₹{amount})",
    atExit: "Exit pe",
    payWaterCounterDesc: "Table {table} bill me add hoga. Counter pe jate waqt pay karo.",
    totalWaterBill: "Total Water Bill",
    confirmWaterOrder: "Pani Order Confirm Karo",

    // Success & Tracker Modals
    orderReceived: "Order Mil Gaya!",
    orderReceivedDesc: "Garma-garam pure-veg dishes kitchen me ban rahi hain.",
    assignedTable: "Assigned Table:",
    guest: "Guest:",
    mobile: "Mobile:",
    paidOnlineUpi: "✅ Paid Online (UPI)",
    codAtCounter: "⚠️ Cash on Delivery (At Counter)",
    crmRewardSaved: "Customer record loyalty points ke sath save ho gaya.",
    continueToMenu: "Menu pe Wapas Jao",
    orderKOTFired: "Order Received & KOT Fired",
    orderKOTDesc: "Kitchen screen pe gaya & KOT print hua",
    cookingInKitchen: "Kitchen me Khana Pak Raha Hai",
    cookingDesc: "Kitchen chefs fresh dosas aur dishes bana rahe hain",
    deliveredToTable: "Table pe Serve Ho Gaya",
    dishesDeliveredCount: "{total} me se {served} dishes Table {table} pe deliver ho chuki hain",
    allDishesDelivered: "Saari dishes aapke table pe serve ho chuki hain! Delicious food enjoy karein 🍽️",
    foodReadyServing: "Food Ready! Table pe serve ho raha hai",
    deliveredDesc: "Staff directly Table {table} pe deliver karega",
    dishesOnTicket: "Is Ticket ki Dishes",
    qty: "Qty",
    needWaterWhileWaiting: "Wait karte time pani ya extra dishes chahiye?",
    billTotal: "Bill Total:",
    closeTracker: "Tracker Band Karo",
    orderNotice: "Table {table} ke liye notice",
    orderCancelledDesc: "Aapka order pura nahi ho saka:",
    selectAlternativeDish: "Kripya menu me se dusri dish select karein ya staff ko batayein.",
    welcomeStripTitle: "Authentic Gujarati & South Indian Tawa Specials",
    welcomeStripSub: "Order aane par fresh banta hai • Jain available",

    // Culinary Meta
    tawaDosa: "Tawa Dosa",
    pavBhaji: "Pav Bhaji",
    tawaPulao: "Tawa Pulao",
    wokSpecialty: "Wok Special",
    sandwich: "Sandwich",
    tawaPizza: "Tawa Pizza",
    beverageAndWater: "Drinks & Pani",
    warmSoup: "Hot Soup",
    dessert: "Mithai",
    chefSpecialty: "Chef Special",

    // Auth
    welcomeBack: "Restaurant Admin me firse Swagat Hai",
    createAccount: "Naya Staff Account Banao",
    fullName: "Pura Naam",
    emailAddress: "Email Address",
    password: "Password",
    restaurantName: "Restaurant ka Naam",
    role: "Staff Role",
    ownerAdmin: "Owner / Boss",
    manager: "Floor Manager",
    kitchenStaff: "Chef / Kitchen Staff",
    waiterStaff: "Service Waiter",
    alreadyHaveAccount: "Pehle se account hai? Login karo",
    needAccount: "Naya account register karo"
  }
};

// -------------------------------------------------------------
// CATEGORY TRANSLATIONS FOR ALL CHANNELS
// -------------------------------------------------------------
export const CATEGORY_TRANSLATIONS = {
  "All": {
    en: "All",
    gu: "બધા",
    hi: "सभी",
    hinglish: "Sabhi"
  },
  "Plain Paper Dosa": {
    en: "Plain Paper Dosa",
    gu: "પ્લેન પેપર ઢોસા",
    hi: "प्लेन पेपर डोसा",
    hinglish: "Plain Paper Dosa"
  },
  "Masala Dosa": {
    en: "Masala Dosa",
    gu: "મસાલા ઢોસા",
    hi: "मसाला डोसा",
    hinglish: "Masala Dosa"
  },
  "Chinese Rice": {
    en: "Chinese Rice",
    gu: "ચાઈનીઝ રાઈસ",
    hi: "चाइनीज राइस",
    hinglish: "Chinese Rice"
  },
  "Starter": {
    en: "Starter",
    gu: "સ્ટાર્ટર",
    hi: "स्टार्टर",
    hinglish: "Starter"
  },
  "Mysore Dosa": {
    en: "Mysore Dosa",
    gu: "માયસોર ઢોસા",
    hi: "मैसूर डोसा",
    hinglish: "Mysore Dosa"
  },
  "Fancy Dosa": {
    en: "Fancy Dosa",
    gu: "ફેન્સી ઢોસા",
    hi: "फैंसी डोसा",
    hinglish: "Fancy Dosa"
  },
  "Maggi": {
    en: "Maggi",
    gu: "મેગી",
    hi: "मैगी",
    hinglish: "Maggi"
  },
  "Noodles": {
    en: "Noodles",
    gu: "નુડલ્સ",
    hi: "नूडल्स",
    hinglish: "Noodles"
  },
  "Soup": {
    en: "Soup",
    gu: "સુપ",
    hi: "सूप",
    hinglish: "Soup"
  },
  "Papad": {
    en: "Papad & French Fries",
    gu: "પાપડ અને ફ્રેન્ચ ફ્રાઈસ",
    hi: "पापड़ और फ्रेंच फ्राइज",
    hinglish: "Papad & French Fries"
  },
  "Special Item": {
    en: "Special Item",
    gu: "સ્પેશિયલ આઈટમ",
    hi: "स्पेशल आइटम",
    hinglish: "Special Item"
  },
  "Pav Bhaji": {
    en: "Pav Bhaji",
    gu: "પાંઉભાજી",
    hi: "पाव भाजी",
    hinglish: "Pav Bhaji"
  },
  "Pulav": {
    en: "Pulav",
    gu: "પુલાવ",
    hi: "पुलाव",
    hinglish: "Pulav"
  },
  "Uttapam": {
    en: "Uttapam",
    gu: "ઉત્તપમ",
    hi: "उत्तपम",
    hinglish: "Uttapam"
  },
  "Idali": {
    en: "Idli",
    gu: "ઇડલી",
    hi: "इडली",
    hinglish: "Idli"
  },
  "Idli": {
    en: "Idli",
    gu: "ઇડલી",
    hi: "इडલી",
    hinglish: "Idli"
  },
  "Vada & Dhokala": {
    en: "Vada & Dhokla",
    gu: "વડા અને ઢોકળા",
    hi: "वड़ा और ढोकला",
    hinglish: "Vada & Dhokla"
  },
  "Unlimited - Masala Dosa": {
    en: "Unlimited Masala Dosa",
    gu: "અનલિમિટેડ મસાલા ઢોસા",
    hi: "अनलिमिटेड मसाला डोसा",
    hinglish: "Unlimited Masala Dosa"
  },
  "Unlimited - Chinese": {
    en: "Unlimited Chinese",
    gu: "અનલિમિટેડ ચાઈનીઝ",
    hi: "अनलिमिटेड चाइनीज",
    hinglish: "Unlimited Chinese"
  },
  "Combo": {
    en: "Combo Offers",
    gu: "કોમ્બો ઓફર્સ",
    hi: "कॉम्बो ऑफर्स",
    hinglish: "Combo Deals"
  },
  "Beverages & Water": {
    en: "Beverages & Water",
    gu: "પીણાં અને પાણી",
    hi: "पेय और पानी",
    hinglish: "Beverages & Water"
  },
  "Pav Bhaji & Pulao": {
    en: "Pav Bhaji & Pulao",
    gu: "પાંઉભાજી અને પુલાવ",
    hi: "पाव भाजी और पुलाव",
    hinglish: "Pav Bhaji & Pulav"
  },
  "South Indian": {
    en: "South Indian",
    gu: "સાઉથ ઇન્ડિયન",
    hi: "साउथ इंडियन",
    hinglish: "South Indian"
  },
  "Chinese": {
    en: "Chinese",
    gu: "ચાઈનીઝ",
    hi: "चाइनीज",
    hinglish: "Chinese"
  },
  "Snacks": {
    en: "Snacks",
    gu: "નાસ્તો / સ્નેક્સ",
    hi: "नाश्ता / स्नैक्स",
    hinglish: "Snacks"
  },
  "Beverages": {
    en: "Beverages",
    gu: "પીણાં",
    hi: "पेय पदार्थ",
    hinglish: "Drinks"
  },
  "Desserts": {
    en: "Desserts",
    gu: "મીઠાઈ",
    hi: "मिठाई",
    hinglish: "Desserts"
  }
};

export const getCategoryLabel = (categoryName = '', lang = 'en') => {
  if (!categoryName) return '';
  const item = CATEGORY_TRANSLATIONS[categoryName];
  if (item && item[lang]) return item[lang];
  if (item && item.en) return item.en;
  return categoryName;
};

// -------------------------------------------------------------
// DISH VOCABULARY DICTIONARY (GUJARATI & HINDI TRANSLATION ENGINE)
// -------------------------------------------------------------
const GUJARATI_WORD_MAP = {
  "plain": "પ્લેન",
  "paper": "પેપર",
  "baby": "બેબી",
  "naylon": "નાયલોન",
  "nylon": "નાયલોન",
  "onion": "ડુંગળી",
  "garlic": "લસણ",
  "panner": "પનીર",
  "paneer": "પનીર",
  "chocolate": "ચોકલેટ",
  "sezwan": "શેઝવાન",
  "schezwan": "શેઝવાન",
  "cheese": "ચીઝ",
  "salad": "સલાડ",
  "crunchy": "ક્રન્ચી",
  "khakra": "ખાખરા",
  "jera": "જીરા",
  "jeera": "જીરા",
  "mari": "મરી",
  "peri": "પેરી",
  "masala": "મસાલા",
  "dosa": "ઢોસા",
  "dhosa": "ઢોસા",
  "mysore": "માયસોર",
  "fancy": "ફેન્સી",
  "bahubali": "બાહુબલી",
  "maggi": "મેગી",
  "noodles": "નુડલ્સ",
  "hakka": "હક્કા",
  "soup": "સુપ",
  "manchow": "મંચાવ",
  "manchaw": "મંચાવ",
  "tomato": "ટોમેટો",
  "tomanto": "ટોમેટો",
  "hot": "હોટ",
  "sour": "સોર",
  "papad": "પાપડ",
  "french": "ફ્રેન્ચ",
  "franch": "ફ્રેન્ચ",
  "fries": "ફ્રાઈસ",
  "pav": "પાંઉ",
  "pavu": "પાંઉ",
  "bhaji": "ભાજી",
  "butter": "બટર",
  "amul": "અમૂલ",
  "pulav": "પુલાવ",
  "pulao": "પુલાવ",
  "uttapam": "ઉત્તપમ",
  "idali": "ઇડલી",
  "idli": "ઇડલી",
  "sambhar": "સંભાર",
  "sambar": "સંભાર",
  "vada": "વડા",
  "medu": "મેદુ",
  "mendu": "મેદુ",
  "dhokala": "ઢોકળા",
  "dhokla": "ઢોકળા",
  "rice": "રાઈસ",
  "fried": "ફ્રાઈડ",
  "fry": "ફ્રાઈડ",
  "manchurian": "મંચુરિયન",
  "manchuriyan": "મંચુરિયન",
  "chilli": "ચીલી",
  "chilly": "ચીલી",
  "chili": "ચીલી",
  "dry": "ડ્રાય",
  "gravy": "ગ્રેવી",
  "water": "વોટર",
  "mineral": "મિનરલ",
  "packaged": "પેકેજ્ડ",
  "bottle": "બોટલ",
  "litre": "લીટર",
  "liter": "લીટર",
  "chaas": "છાસ",
  "buttermilk": "છાસ",
  "cold": "કોલ્ડ",
  "drink": "ડ્રિંક્સ",
  "drinks": "ડ્રિંક્સ",
  "special": "સ્પેશિયલ",
  "sp": "સ્પે.",
  "unlimited": "અનલિમિટેડ",
  "combo": "કોમ્બો",
  "extra": "એક્સ્ટ્રા",
  "pair": "જોડી",
  "veg": "વેજ",
  "vegetable": "વેજીટેબલ",
  "jain": "જૈન",
  "boil": "બોઈલ",
  "hub": "હબ",
  "chutney": "ચટણી",
  "oil": "તેલ",
  "crisp": "ક્રિસ્પી",
  "atmiya": "આત્મીય",
  "bhel": "ભેલ",
  "bhurji": "ભુરજી",
  "burji": "ભુરજી",
  "blue": "બ્લૂ",
  "bombay": "બોમ્બે",
  "chilled": "ચીલ્ડ",
  "chinese": "ચાઈનીઝ",
  "coke": "કોક",
  "corn": "કોર્ન",
  "dahi": "દહીં",
  "dilbhar": "દિલભર",
  "dilkush": "દિલખુશ",
  "double": "ડબલ",
  "frankie": "ફ્રેન્કી",
  "ghee": "ઘી",
  "gotala": "ગોટાળા",
  "green": "ગ્રીન",
  "hayderabad": "હૈદરાબાદી",
  "hyderabadi": "હૈદરાબાદી",
  "italian": "ઇટાલિયન",
  "jeeni": "જીની",
  "kaju": "કાજુ",
  "kalifa": "ખલીફા",
  "kashmiri": "કાશ્મીરી",
  "lashaniya": "લસણીયા",
  "maharaja": "મહારાજા",
  "mataka": "મટકા",
  "matar": "વટાણા",
  "mattar": "વટાણા",
  "mix": "મિક્સ",
  "ml": "મિલી",
  "mushroom": "મશરૂમ",
  "narayan": "નારાયણ",
  "open": "ઓપન",
  "palak": "પાલક",
  "pasta": "પાસ્તા",
  "pizza": "પીઝા",
  "potato": "બટાકા",
  "puti": "પોડી",
  "raja": "રાજા",
  "rani": "રાણી",
  "regular": "રેગ્યુલર",
  "roll": "રોલ",
  "rosted": "શેકેલો",
  "roasted": "શેકેલો",
  "singapuri": "સિંગાપુરી",
  "spring": "સ્પ્રિંગ",
  "sprite": "સ્પ્રાઈટ",
  "surti": "સુરતી",
  "swami": "સ્વામી",
  "sweet": "સ્વીટ",
  "thati": "તટ્ટે",
  "thums": "થમ્સ",
  "triple": "ટ્રિપલ",
  "tukada": "ટુકડા",
  "up": "અપ",
  "of": "ના",
  "and": "અને",
  "l": "લીટર"
};

const HINDI_WORD_MAP = {
  "plain": "प्लेन",
  "paper": "पेपर",
  "baby": "बेबी",
  "naylon": "नायलॉन",
  "nylon": "नायलॉन",
  "onion": "प्याज",
  "garlic": "लहसुन",
  "panner": "पनीर",
  "paneer": "पनीर",
  "chocolate": "चॉकलेट",
  "sezwan": "शेजवान",
  "schezwan": "शेजवान",
  "cheese": "चीज़",
  "salad": "सलाद",
  "crunchy": "क्रंची",
  "khakra": "खाखरा",
  "jera": "जीरा",
  "jeera": "जीरा",
  "mari": "काली मिर्च",
  "peri": "पेरी",
  "masala": "मसाला",
  "dosa": "डोसा",
  "dhosa": "डोसा",
  "mysore": "मैसूर",
  "fancy": "फैंसी",
  "bahubali": "बाहुबली",
  "maggi": "मैगी",
  "noodles": "नूडल्स",
  "hakka": "हक्का",
  "soup": "सूप",
  "manchow": "मनचाऊ",
  "manchaw": "मनचाऊ",
  "tomato": "टमाटर",
  "tomanto": "टमाटर",
  "hot": "हॉट",
  "sour": "सॉर",
  "papad": "पापड़",
  "french": "फ्रेंच",
  "franch": "फ्रेंच",
  "fries": "फ्राइज",
  "pav": "पाव",
  "pavu": "पाव",
  "bhaji": "भाजी",
  "butter": "बटर",
  "amul": "अमूल",
  "pulav": "पुलाव",
  "pulao": "पुलाव",
  "uttapam": "उत्तपम",
  "idali": "इडली",
  "idli": "इडली",
  "sambhar": "सांभर",
  "sambar": "सांभर",
  "vada": "वड़ा",
  "medu": "मेदू",
  "mendu": "मेदू",
  "dhokala": "ढोकला",
  "dhokla": "ढोकला",
  "rice": "चावल",
  "fried": "फ्राइड",
  "fry": "फ्राइड",
  "manchurian": "मंचूरियन",
  "manchuriyan": "मंचूरियन",
  "chilli": "चिली",
  "chilly": "चिली",
  "chili": "चिली",
  "dry": "ड्राई",
  "gravy": "ग्रेवी",
  "water": "पानी",
  "mineral": "मिनरल",
  "packaged": "पैकेज्ड",
  "bottle": "बोतल",
  "litre": "लीटर",
  "liter": "लीटर",
  "chaas": "छाछ",
  "buttermilk": "छाछ",
  "cold": "कोल्ड",
  "drink": "ड्रिंक",
  "drinks": "ड्रिंक्स",
  "special": "स्पेशल",
  "sp": "स्पेशल",
  "unlimited": "अनलिमिटेड",
  "combo": "कॉम्बो",
  "extra": "एक्स्ट्रा",
  "pair": "जोड़ी",
  "veg": "वेज",
  "vegetable": "सब्जी",
  "jain": "जैन",
  "boil": "बॉइल",
  "hub": "हब",
  "chutney": "चटनी",
  "oil": "तेल",
  "crisp": "क्रिस्पी",
  "atmiya": "आत्मीय",
  "bhel": "भेल",
  "bhurji": "भुर्जी",
  "burji": "भुर्जी",
  "blue": "ब्लू",
  "bombay": "बॉम्बे",
  "chilled": "चिल्ड",
  "chinese": "चाइनीज",
  "coke": "कोक",
  "corn": "कॉर्न",
  "dahi": "दही",
  "dilbhar": "दिलभर",
  "dilkush": "दिलखुश",
  "double": "डबल",
  "frankie": "फ्रेंकी",
  "ghee": "घी",
  "gotala": "घोटाला",
  "green": "ग्रीन",
  "hayderabad": "हैदराबादी",
  "hyderabadi": "हैदराबादी",
  "italian": "इटैलियन",
  "jeeni": "जीनी",
  "kaju": "काजू",
  "kalifa": "खलीफा",
  "kashmiri": "कश्मीरी",
  "lashaniya": "लहसुनिया",
  "maharaja": "महाराजा",
  "mataka": "मटका",
  "matar": "मटर",
  "mattar": "मटर",
  "mix": "मिक्स",
  "ml": "मिली",
  "mushroom": "मशरूम",
  "narayan": "नारायण",
  "open": "ओपन",
  "palak": "पालक",
  "pasta": "पास्ता",
  "pizza": "पिज़्ज़ा",
  "potato": "आलू",
  "puti": "पोडी",
  "raja": "राजा",
  "rani": "रानी",
  "regular": "रेगुलर",
  "roll": "रोल",
  "rosted": "रोस्टेड",
  "roasted": "रोस्टेड",
  "singapuri": "सिंगापुरी",
  "spring": "स्प्रिंग",
  "sprite": "स्प्राइट",
  "surti": "सुरती",
  "swami": "स्वामी",
  "sweet": "स्वीट",
  "thati": "तट्टे",
  "thums": "थम्स",
  "triple": "ट्रिपल",
  "tukada": "टुकड़ा",
  "up": "अप",
  "of": "के",
  "and": "और",
  "l": "लीटर"
};

// Common compound dishes dictionary for instant, perfect, 100% authentic dish titles
const EXACT_DISH_MAP = {
  "Packaged Mineral Water (1 Litre)": {
    gu: "પેકેજ્ડ મિનરલ વોટર (૧ લીટર)",
    hi: "पैकेज्ड मिनरल वाटर (1 लीटर)"
  },
  "Packaged Mineral Water (1 Litre Bottle)": {
    gu: "પેકેજ્ડ મિનરલ વોટર (૧ લીટર બોટલ)",
    hi: "पैकेज्ड मिनरल वाटर (1 लीटर बोतल)"
  },
  "Amul Masala Buttermilk (Chaas)": {
    gu: "અમૂલ મસાલા છાસ",
    hi: "अमूल मसाला छाछ"
  },
  "Cold Drink (Thums Up / Coke / Sprite 250ml)": {
    gu: "ઠંડુ પીણું (કોલ્ડ ડ્રિંક્સ ૨૫૦ મિલી)",
    hi: "कोल्ड ड्रिंक (250 मिली)"
  },
  "Cold Drink (Chilled 250ml)": {
    gu: "ઠંડુ પીણું (૨૫૦ મિલી)",
    hi: "कोल्ड ड्रिंक (250 मिली)"
  },
  "Extra Butter Pav (Pair of 2)": {
    gu: "એક્સ્ટ્રા બટર પાંઉ (૨ નંગ)",
    hi: "एक्स्ट्रा बटर पाव (2 नग)"
  },
  "Plain Paper": {
    gu: "પ્લેન પેપર ઢોસા",
    hi: "प्लेन पेपर डोसा"
  },
  "Baby Paper": {
    gu: "બેબી પેપર ઢોસા",
    hi: "बेबी पेपर डोसा"
  },
  "Naylon Paper": {
    gu: "નાયલોન પેપર ઢોસા",
    hi: "नायलॉन पेपर डोसा"
  },
  "Onion Paper": {
    gu: "ડુંગળી પેપર ઢોસા",
    hi: "प्याज पेपर डोसा"
  },
  "Garlic Paper": {
    gu: "લસણ પેપર ઢોસા",
    hi: "लहसुन पेपर डोसा"
  },
  "Panner Paper": {
    gu: "પનીર પેપર ઢોસા",
    hi: "पनीर पेपर डोसा"
  },
  "Chocolate Paper": {
    gu: "ચોકલેટ પેપર ઢોસા",
    hi: "चॉकलेट पेपर डोसा"
  },
  "Panner Sezwan Paper": {
    gu: "પનીર શેઝવાન પેપર ઢોસા",
    hi: "पनीर शेजवान पेपर डोसा"
  },
  "Cheese Paper": {
    gu: "ચીઝ પેપર ઢોસા",
    hi: "चीज़ पेपर डोसा"
  },
  "Cheese Garlic Paper": {
    gu: "ચીઝ લસણ પેપર ઢોસા",
    hi: "चीज़ लहसुन पेपर डोसा"
  },
  "Panner Cheese Paper": {
    gu: "પનીર ચીઝ પેપર ઢોસા",
    hi: "पनीर चीज़ पेपर डोसा"
  },
  "Salad Paper": {
    gu: "સલાડ પેપર ઢોસા",
    hi: "सलाद पेपर डोसा"
  },
  "Crunchy Paper": {
    gu: "ક્રન્ચી પેપર ઢોસા",
    hi: "क्रंची पेपर डोसा"
  },
  "Panner Khakra": {
    gu: "પનીર ખાખરા",
    hi: "पनीर खाखरा"
  },
  "Plain Khakra": {
    gu: "પ્લેન ખાખરા",
    hi: "प्लेन खाखरा"
  },
  "Peri Peri Khakra": {
    gu: "પેરી પેરી ખાખરા",
    hi: "पेरी पेरी खाखरा"
  },
  "Garlic Khakra": {
    gu: "ગાર્લિક ખાખરા",
    hi: "लहसुन खाखरा"
  },
  "Cheese Khakra": {
    gu: "ચીઝ ખાખરા",
    hi: "चीज़ खाखरा"
  },
  "Jera Mari Khakra": {
    gu: "જીરા મરી ખાખરા",
    hi: "जीरा काली मिर्च खाखरा"
  },
  "Masala Dosa": {
    gu: "મસાલા ઢોસા",
    hi: "मसाला डोसा"
  },
  "Onion Masala": {
    gu: "ડુંગળી મસાલા ઢોસા",
    hi: "प्याज मसाला डोसा"
  },
  "Garlic Masala": {
    gu: "લસણ મસાલા ઢોસા",
    hi: "लहसुन मसाला डोसा"
  },
  "Sezwan Masala": {
    gu: "શેઝવાન મસાલા ઢોસા",
    hi: "शेजवान मसाला डोसा"
  },
  "Panner Masala": {
    gu: "પનીર મસાલા ઢોસા",
    hi: "पनीर मसाला डोसा"
  },
  "Cheese Masala": {
    gu: "ચીઝ મસાલા ઢોસા",
    hi: "चीज़ मसाला डोसा"
  },
  "Panner Sezwan Masala": {
    gu: "પનીર શેઝવાન મસાલા ઢોસા",
    hi: "पनीर शेजवान मसाला डोसा"
  },
  "Cheese Sezwan Masala": {
    gu: "ચીઝ શેઝવાન મસાલા ઢોસા",
    hi: "चीज़ शेजवान मसाला डोसा"
  },
  "Panner Cheese Masala": {
    gu: "પનીર ચીઝ મસાલા ઢોસા",
    hi: "पनीर चीज़ मसाला डोसा"
  },
  "Mysore Masala Dosa": {
    gu: "માયસોર મસાલા ઢોસા",
    hi: "मैसूर मसाला डोसा"
  },
  "Paneer Mysore Dosa": {
    gu: "પનીર માયસોર ઢોસા",
    hi: "पनीर मैसूर डोसा"
  },
  "Cheese Mysore Dosa": {
    gu: "ચીઝ માયસોર ઢોસા",
    hi: "चीज़ मैसूर डोसा"
  },
  "S.P. Atmiya Mysore": {
    gu: "સ્પે. આત્મીય માયસોર ઢોસા",
    hi: "स्पेशल आत्मीय मैसूर डोसा"
  },
  "Cheese Bhurji Mysore": {
    gu: "ચીઝ ભુરજી માયસોર ઢોસા",
    hi: "चीज़ भुर्जी मैसूर डोसा"
  },
  "Bahubali Dosa": {
    gu: "બાહુબલી ઢોસા",
    hi: "बाहुबली डोसा"
  },
  "Amul Butter Pav Bhaji": {
    gu: "અમૂલ બટર પાંઉભાજી",
    hi: "अमूल बटर पाव भाजी"
  },
  "Cheese Pav Bhaji": {
    gu: "ચીઝ પાંઉભાજી",
    hi: "चीज़ पाव भाजी"
  },
  "Boil Pav Bhaji": {
    gu: "બોઈલ પાંઉભાજી",
    hi: "बॉइल पाव भाजी"
  },
  "Jain Pav Bhaji": {
    gu: "જૈન પાંઉભાજી",
    hi: "जैन पाव भाजी"
  },
  "Vegetable Pulav": {
    gu: "વેજીટેબલ પુલાવ",
    hi: "वेजिटेबल पुलाव"
  },
  "Cheese Pulav": {
    gu: "ચીઝ પુલાવ",
    hi: "चीज़ पुलाव"
  },
  "Paneer Pulav": {
    gu: "પનીર પુલાવ",
    hi: "पनीर पुलाव"
  },
  "Idli Sambhar": {
    gu: "ઇડલી સંભાર",
    hi: "इडली सांभर"
  },
  "Medu Vada": {
    gu: "મેદુ વડા",
    hi: "मेदू वड़ा"
  },
  "Plain Uttapam": {
    gu: "પ્લેન ઉત્તપમ",
    hi: "प्लेन उत्तपम"
  },
  "Onion Uttapam": {
    gu: "ડુંગળી ઉત્તપમ",
    hi: "प्याज उत्तपम"
  },
  "Tomato Uttapam": {
    gu: "ટામેટા ઉત્તપમ",
    hi: "टमाटर उत्तपम"
  },
  "Cheese Uttapam": {
    gu: "ચીઝ ઉત્તપમ",
    hi: "चीज़ उत्तપम"
  },
  "Veg Hakka Noodles": {
    gu: "વેજ હક્કા નુડલ્સ",
    hi: "वेज हक्का नूडल्स"
  },
  "Schezwan Noodles": {
    gu: "શેઝવાન નુડલ્સ",
    hi: "शेजवान नूडल्स"
  },
  "Veg Fried Rice": {
    gu: "વેજ ફ્રાઈડ રાઈસ",
    hi: "वेज फ्राइड राइस"
  },
  "Schezwan Fried Rice": {
    gu: "શેઝવાન ફ્રાઈડ રાઈસ",
    hi: "शेजवान फ्राइड राइस"
  },
  "Veg Manchurian": {
    gu: "વેજ મંચુરિયન",
    hi: "वेज मंचूरियन"
  },
  "Paneer Chilli": {
    gu: "પનીર ચીલી",
    hi: "पनीर चिली"
  },
  "Manchow Soup": {
    gu: "મંચાવ સુપ",
    hi: "मनचाऊ सूप"
  },
  "Tomato Soup": {
    gu: "ટોમેટો સુપ",
    hi: "टमाटर सूप"
  },
  "Hot and Sour Soup": {
    gu: "હોટ એન્ડ સોર સુપ",
    hi: "हॉट एंड सॉर सूप"
  },
  "Roasted Papad": {
    gu: "શેકેલો પાપડ",
    hi: "रोस्टेड पापड़"
  },
  "Fry Papad": {
    gu: "તળેલો પાપડ",
    hi: "फ्राइड पापड़"
  },
  "Masala Papad": {
    gu: "મસાલા પાપડ",
    hi: "मसाला पापड़"
  },
  "Cheese Masala Papad": {
    gu: "ચીઝ મસાલા પાપડ",
    hi: "चीज़ मसाला पापड़"
  },
  "French Fries": {
    gu: "ફ્રેન્ચ ફ્રાઈસ",
    hi: "फ्रेंच फ्राइज"
  },
  "Peri Peri Fries": {
    gu: "પેરી પેરી ફ્રાઈસ",
    hi: "पेरी पेरी फ्राइज"
  }
};

// Phonetic transliterator fallback for any untranslated English words
const transliteratePhonetic = (word, targetScript = 'gu') => {
  const guMap = {
    'ch': 'ચ', 'sh': 'શ', 'th': 'થ', 'dh': 'ધ', 'kh': 'ખ', 'gh': 'ઘ', 'bh': 'ભ', 'ph': 'ફ',
    'k': 'ક', 'g': 'ગ', 'j': 'જ', 't': 'ટ', 'd': 'ડ', 'n': 'ન', 'p': 'પ', 'b': 'બ',
    'm': 'મ', 'y': 'ય', 'r': 'ર', 'l': 'લ', 'v': 'વ', 'w': 'વ', 's': 'સ', 'h': 'હ', 'z': 'ઝ',
    'a': 'ા', 'e': 'ે', 'i': 'િ', 'o': 'ો', 'u': 'ુ'
  };
  const hiMap = {
    'ch': 'च', 'sh': 'श', 'th': 'थ', 'dh': 'ध', 'kh': 'ख', 'gh': 'घ', 'bh': 'भ', 'ph': 'फ',
    'k': 'क', 'g': 'ग', 'j': 'ज', 't': 'ट', 'd': 'ड', 'n': 'न', 'p': 'प', 'b': 'ब',
    'm': 'म', 'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व', 's': 'स', 'h': 'ह', 'z': 'ज़',
    'a': 'ा', 'e': 'े', 'i': 'ि', 'o': 'ो', 'u': 'ु'
  };
  const map = targetScript === 'gu' ? guMap : hiMap;
  let str = word.toLowerCase();
  let out = '';
  let i = 0;
  while (i < str.length) {
    if (i + 2 <= str.length && map[str.slice(i, i + 2)]) {
      out += map[str.slice(i, i + 2)];
      i += 2;
    } else if (map[str[i]]) {
      out += map[str[i]];
      i++;
    } else {
      out += str[i];
      i++;
    }
  }
  return out;
};

// Helper: Translate an English string word-by-word using word dictionary + phonetic fallback
const translateWords = (text, wordMap, targetScript) => {
  if (!text) return '';
  const normalized = text
    .replace(/\bS\.?P\.?\b/gi, 'Special')
    .replace(/\bSp\.?\b/gi, 'Special')
    .replace(/([0-9]+)\s*([a-zA-Z]+)/g, '$1 $2');

  const tokens = normalized.split(/([ \t\n\r\(\)\,\-\:\/\+\.]+)/);
  const result = tokens.map(token => {
    const clean = token.toLowerCase().trim().replace(/[\.]/g, '');
    if (!clean) return token;
    if (wordMap[clean]) return wordMap[clean];
    if (wordMap[token.toLowerCase().trim()]) return wordMap[token.toLowerCase().trim()];
    if (/^[a-zA-Z]+$/.test(clean) && targetScript) {
      return transliteratePhonetic(token, targetScript);
    }
    return token;
  }).join('');

  return result.replace(/\s{2,}/g, ' ').trim();
};

/**
 * Returns the exact dish name strictly in the selected language.
 * Guarantees zero cross-language bleeding (e.g. no English in Gujarati view, no Gujarati in English view).
 */
export const getDishDisplayName = (item, lang = 'en') => {
  if (!item) return '';

  const rawName = item.english_name || item.name || '';
  const gujaratiScriptRegex = /[\u0A80-\u0AFF]/;
  const devanagariScriptRegex = /[\u0900-\u097F]/;

  // Extract English primary part (strip out any parentheses containing non-latin scripts)
  const englishClean = rawName
    .replace(/\s*\([\u0900-\u0AFF\s]+\)/g, '')
    .replace(/\s*\([^)]*[\u0900-\u0AFF][^)]*\)/g, '')
    .trim();

  // Extract Gujarati script if present inside parentheses or fields
  let extractedGujarati = '';
  if (item.gujarati_name && gujaratiScriptRegex.test(item.gujarati_name)) {
    extractedGujarati = item.gujarati_name.replace(/[a-zA-Z]/g, '').trim();
  } else {
    const parenGuMatch = rawName.match(/\(([^)]*[\u0A80-\u0AFF][^)]*)\)/);
    if (parenGuMatch) {
      extractedGujarati = parenGuMatch[1].trim();
    }
  }

  // 1. GUJARATI MODE:
  if (lang === 'gu') {
    if (extractedGujarati) {
      return extractedGujarati;
    }
    // Check exact dictionary match
    if (EXACT_DISH_MAP[englishClean]?.gu) {
      return EXACT_DISH_MAP[englishClean].gu;
    }
    if (EXACT_DISH_MAP[rawName]?.gu) {
      return EXACT_DISH_MAP[rawName].gu;
    }
    return translateWords(englishClean, GUJARATI_WORD_MAP, 'gu');
  }

  // 2. HINDI MODE:
  if (lang === 'hi') {
    if (item.hindi_name && devanagariScriptRegex.test(item.hindi_name)) {
      return item.hindi_name.trim();
    }
    // Check exact dictionary match
    if (EXACT_DISH_MAP[englishClean]?.hi) {
      return EXACT_DISH_MAP[englishClean].hi;
    }
    if (EXACT_DISH_MAP[rawName]?.hi) {
      return EXACT_DISH_MAP[rawName].hi;
    }
    return translateWords(englishClean, HINDI_WORD_MAP, 'hi');
  }

  // 3. HINGLISH MODE:
  if (lang === 'hinglish') {
    return englishClean || rawName;
  }

  // 4. ENGLISH MODE (Default):
  // Return purely English text, zero Gujarati/Hindi script
  return englishClean || rawName;
};

// Helper translation hook / function
export const getTranslation = (lang = 'en', key = '') => {
  const currentLangDict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return currentLangDict[key] || TRANSLATIONS.en[key] || key;
};

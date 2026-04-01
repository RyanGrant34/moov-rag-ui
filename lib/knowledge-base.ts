export interface KBEntry {
  id: string
  category: string
  tags: string[]
  question: string
  answer: string
}

export const KNOWLEDGE_BASE: KBEntry[] = [
  {
    id: "login_001",
    category: "login",
    tags: ["login", "access", "where", "log in", "teacher"],
    question: "Where do I log into MOOV?",
    answer: "Staff log in at staff.joinmoov.com using your school Google or Microsoft account. Students use student.joinmoov.com, same login method.\n\nIf your account isn't working, your school's Super Admin needs to add you. They go to: More > Edit Admin Privileges > Add Admin > enter your email > assign your school > Create Admin. Once that's done you're in."
  },
  {
    id: "reader_001",
    category: "hardware",
    tags: ["reader", "scan", "won't scan", "not scanning", "magic reader", "room"],
    question: "The reader in my room won't scan ID cards. I tried disconnecting and reconnecting.",
    answer: "Try these in order:\n\n1. Unplug the reader, wait 10 seconds, plug back in.\n2. Confirm the reader is assigned to your room. An Admin checks this at Dashboard > Rooms > your room > Change Settings > Magic Readers at the bottom.\n3. The M-number on the back of the reader should match what's listed there.\n\nIf none of that works, reach out with your room number and the M-number on the back of the device. We'll pull the logs and figure out what's going on."
  },
  {
    id: "reader_002",
    category: "hardware",
    tags: ["red", "green", "bathroom", "pass", "authorized", "reader", "bathroom 2"],
    question: "Students with a pass to Bathroom 2 are showing red on the bathroom reader, not green.",
    answer: "Red means the system doesn't see them as authorized for that location, even with a pass. Two things to check:\n\n1. Bathroom 2 needs to be in the same Room Group as your classroom. Go to Dashboard > Rooms > your classroom > Change Settings > Add to Group. Bathroom 2 should be in that group.\n2. Confirm the pass destination is set to Bathroom 2 specifically. A pass to a different bathroom won't authorize a tap at this one.\n\nCheck the room group first. That's usually the issue. Let us know what you find."
  },
  {
    id: "attendance_001",
    category: "attendance",
    tags: ["tapped", "not populated", "didn't populate", "manually", "attendance", "missing"],
    question: "Students all tapped in but none of them populated in attendance. Had to mark them manually.",
    answer: "Three likely causes:\n\n1. The reader isn't assigned to your room. Admin verifies at Dashboard > Rooms > your room > Magic Readers.\n2. The class period wasn't active in MOOV when students tapped. Check that your bell schedule is configured correctly.\n3. A temporary connectivity issue. If it happens again, note the exact time and room number and send it to us.\n\nFor now, manual marking is the right call. We'll make sure the data is there on our end."
  },
  {
    id: "attendance_002",
    category: "attendance",
    tags: ["double period", "second period", "already present", "restart", "science", "period"],
    question: "A teacher with a double science period says the second period shows all students already present from the first period.",
    answer: "It should restart. The reason it isn't is that the double period isn't set up as two separate periods in the bell schedule. MOOV treats it as one continuous block and carries the attendance forward.\n\nThe fix is on the Admin side. They need to configure both periods as distinct entries in the bell schedule. Have your Admin check that, or have them reach out to us and we'll walk them through it.\n\nIn the meantime, the teacher can use Edit Class Details (next to the period name) to manually adjust attendance for the second period."
  },
  {
    id: "attendance_003",
    category: "attendance",
    tags: ["co-teacher", "pass request", "approve", "eSchool", "same attendance", "save"],
    question: "Can co-teachers both receive and approve pass requests? Will attendance be the same in MOOV and eSchool if only one saves it?",
    answer: "On attendance: only one teacher needs to hit Save. Once the green Save button is clicked, it syncs to eSchool. Doesn't matter which co-teacher does it.\n\nOn pass approvals: this depends on how both accounts are scoped. I want to confirm this before pointing you the wrong way. I'll follow up on the co-teacher pass question shortly."
  },
  {
    id: "attendance_004",
    category: "attendance",
    tags: ["excused", "tardy", "note", "late", "eSchool", "excuse"],
    question: "If a student is late with a note, can we mark it excused with a note that reflects in eSchool?",
    answer: "MOOV auto-assigns Tardy Excused when a student returns from an approved hall pass and that syncs to eSchool. For a student who walks in late with a physical note, there's no note field that syncs to eSchool right now.\n\nYou can adjust the status in MOOV manually, but the note itself won't carry over. I'll flag this as a feature request."
  },
  {
    id: "attendance_005",
    category: "attendance",
    tags: ["eSchool", "tardy", "building entry", "entry kiosk", "unexcused", "first period"],
    question: "Students are being marked Tardy Unexcused in eSchool from the building entry tap, even if they never attended first period.",
    answer: "What's happening: the building entry tap is syncing to eSchool as an attendance event. So when a student taps in at the Entry kiosk after the bell but doesn't tap into first period class, MOOV records the building entry and eSchool picks it up as Tardy Unexcused.\n\nThis is a configuration issue in how Entry taps vs. classroom taps are mapped in your eSchool integration. I'm flagging this for our team to review your setup. We'll follow up with next steps."
  },
  {
    id: "attendance_006",
    category: "attendance",
    tags: ["attendance rate", "percentage", "eSchool", "school year", "class rate"],
    question: "eSchool shows an attendance rate percentage for each class. Is there something similar in MOOV?",
    answer: "MOOV has attendance analytics and trend data, but I want to confirm whether a per-class yearly attendance rate exists in the same format before giving you the wrong answer. I'll check and follow up.\n\nIf it's not there yet, I'll pass it along as a feature request."
  },
  {
    id: "passes_001",
    category: "hall_passes",
    tags: ["pass", "expire", "expiration", "time limit", "50 minutes", "running long"],
    question: "Passes are running 50+ minutes over the allotted time and aren't expiring.",
    answer: "The duration set on a pass is a soft limit. The system doesn't force-close a pass when time runs out.\n\nRight now the best fix is manually ending passes from the Halls tab. That view shows every active pass, who's been out, and for how long.\n\nAutomatic expiration after 5 or 10 minutes isn't available yet. Noting it as a feature request."
  },
  {
    id: "passes_002",
    category: "hall_passes",
    tags: ["pass ended", "restarted", "tapped back", "not ending", "active passes"],
    question: "A student's pass ended when they tapped back in. Another student's pass restarted instead of ending. Active passes show no creator and no start time.",
    answer: "A few things happening here:\n\n1. Pass ending on tap-back is correct behavior.\n2. The restart issue, where tapping back in starts a new pass, is a bug. Note the student name, time, and room and send it over. We'll pull the tap log.\n3. Active passes with no creator and no start time is also something we need to investigate. Grab the pass IDs and send them over.\n\nSend those details and we'll get on it."
  },
  {
    id: "passes_003",
    category: "hall_passes",
    tags: ["origin field", "type", "scroll", "location", "typing"],
    question: "Can we type in the origin field instead of scrolling through all the options?",
    answer: "Not right now. The origin field is scroll-only.\n\nAdding a type-ahead or search field there is a reasonable UX improvement. Noted as a feature request."
  },
  {
    id: "kiosk_001",
    category: "hardware",
    tags: ["kiosk", "charging", "not charging", "won't charge", "battery"],
    question: "Our kiosk is not charging.",
    answer: "Press and hold the silver battery button on the top front panel of the kiosk. Release, then press and hold again to restart the battery. Plug it in overnight after that.\n\nIf it still won't charge or won't power on, the battery may need a replacement. Reach out and we'll sort it."
  },
  {
    id: "rooms_001",
    category: "rooms",
    tags: ["rooms", "readers", "assigned", "zero readers", "more than one", "dashboard"],
    question: "Some rooms on the dashboard show more than one reader assigned, or show zero when there should be one.",
    answer: "This usually means a reader was assigned to the wrong room or an assignment didn't save correctly.\n\n1. Dashboard > Rooms > select the room > Change Settings > scroll to Magic Readers.\n2. Check the M-number. It's printed on the back of the physical reader.\n3. If a reader is in the wrong room, remove it and reassign it to the right one.\n4. If a room shows zero but a reader is physically there, add it by M-number in the same panel."
  },
  {
    id: "printer_001",
    category: "printer",
    tags: ["blank card", "printer", "exiting", "back of printer", "not printing"],
    question: "A blank card is exiting the back of the printer.",
    answer: "Blank cards almost always mean the encoding step isn't completing.\n\n1. Open ID-ALL > select the student > go to the Encoding tab.\n2. Confirm OMNIKEY 5122 is selected as the encoder.\n3. Check that the Encoding Field has text. If blank, paste in the script MOOV provided.\n4. Click Refresh and try printing again.\n\nIf you're on an Evolis Primacy 2, also make sure card thickness is set to 30 in your print settings."
  },
  {
    id: "printer_002",
    category: "printer",
    tags: ["ribbon", "replace ribbon", "blank cards", "order", "supplies"],
    question: "How do I replace the printer ribbon? We also need more blank cards.",
    answer: "For ribbon replacement, search 'Evolis Primacy ribbon replacement' on YouTube. Official videos for both Primacy 1 and Primacy 2. Takes about 2 minutes.\n\nFor blank cards and ribbon supplies, send us your school name and roughly how many you need. We'll get you sorted."
  },
  {
    id: "printer_003",
    category: "printer",
    tags: ["wrong photo", "incorrect photo", "john smith", "same photo", "ID card"],
    question: "Every printed ID card shows the same photo. It's always the same student regardless of who we print.",
    answer: "This is a template issue in ID-ALL. The photo field is pointing to a static image instead of the database column.\n\n1. Click the photo area in the card template editing view.\n2. Go to Parameters.\n3. Confirm Database is selected as the source.\n4. Confirm Photo is selected from the column list.\n\nDo a test print after that. If it's still pulling the same image, contact us before changing anything else in the template."
  },
  {
    id: "handheld_001",
    category: "hardware",
    tags: ["handheld", "photos", "not loading", "student photos", "images"],
    question: "Student photos are not loading on my handheld.",
    answer: "Photos not loading means the handheld lost its WiFi connection.\n\n1. Swipe up about 1 inch from the bottom-left corner of the screen.\n2. Contact MOOV Support for the 4-digit unlock code.\n3. Unlock > device settings > reconnect to your school WiFi.\n4. Tap the blue-and-yellow dart icon to relaunch and go back to handheld mode.\n\nPhotos will load once it's back on WiFi."
  },
  {
    id: "pd_001",
    category: "training",
    tags: ["professional development", "PD", "training", "staff", "questions", "open forum"],
    question: "Can we get additional professional development for high school staff?",
    answer: "Yes. Let us know which staff are attending and what topics keep coming up. That way we can make the session actually useful instead of covering things people already know. We'll find a time that works."
  }
]

export const CATEGORIES: Record<string, string> = {
  login: "Login & Access",
  hardware: "Hardware",
  attendance: "Attendance",
  hall_passes: "Hall Passes",
  rooms: "Rooms & Readers",
  printer: "Printer & IDs",
  training: "Training & PD"
}

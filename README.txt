ORBIT SCHOOL 6.2 — ONE APP
==========================

This is one OrbitSchool app for both teachers and students. There are no separate Student, Teacher or Admin editions and no Admin dashboard.

WHAT YOU CAN DO
---------------
STUDENTS
- Sign up or sign in with an email address and a 6-digit one-time code.
- Enter the 8-character class code shared by the teacher.
- Join the live room, use camera/microphone, chat and raise a hand.
- Keep learning in OrbitSchool; signed-in progress syncs to the same account.

TEACHERS
- Sign in with the same email OTP flow.
- Tap “Host / Enter Class” and choose “Host a Class”.
- Create a class and share its 8-character code or invitation link.
- Start a lesson and add subject, topic and notes.
- Open the live room, use camera/microphone, and share the screen.
- See participants and learning reports (XP, quizzes, streak, flashcards and activity).
- End the class when finished.

IMPORTANT TECHNICAL NOTE
-----------------------
The ZIP is one app package, but cross-device class codes, live calls and email OTP require the included Node.js service to run online. It is bundled in this same ZIP; there is no separate server ZIP or Admin app. The service automatically creates a private data file next to itself. You do not open or manage that file.

The classroom uses browser WebRTC. Camera, microphone and screen share require HTTPS (localhost is allowed for testing). For calls across restrictive school/home networks, the host may need a TURN relay service; STUN alone cannot guarantee every network connection. The live-room mesh is designed for small groups (up to 8 students plus the teacher), not a full school lecture hall. This is a small-group classroom prototype, not a full Zoom replacement.

START ON A CHROMEBOOK (LOCAL TEST)
----------------------------------
1. Enable Linux on the Chromebook if it is not already enabled.
2. Extract this ZIP and copy the OrbitSchool-One-App folder into Linux files.
3. Open Terminal and run:
     cd ~/OrbitSchool-One-App
     npm install
     ORBIT_DEV_OTP=true npm start
4. Open Chrome at:
     http://localhost:8080
5. Create an account. The 6-digit OTP will appear in the Terminal because local test mode is enabled.
6. Open another tab/window at the same address to test joining a class.

EMAIL OTP SETUP FOR REAL SCHOOL USE
-----------------------------------
A school-owned email account must be configured once by the adult who manages the school hosting.
1. Copy .env.example to .env.
2. Fill in SMTP_USER, SMTP_PASS and SMTP_FROM. For Gmail SMTP, use a Google App Password created by the account owner. Do not use or share a normal Gmail password.
3. Do NOT set ORBIT_DEV_OTP=true on a public server.
4. Run npm start or deploy the folder to a Node.js host with HTTPS.

After this one-time setup, each student/teacher enters their email in the app and receives their own OTP. No app user needs the SMTP settings.

SHARING THE APP
---------------
Host this one app at one HTTPS address and share that same address with everyone. Students and teachers use the same app. Each teacher creates a classroom inside it. They share the class code (or link with ?join=THECODE); students enter the code in “Enter Class”.

PRIVACY
-------
- Email addresses are used for sign-in and are not displayed to other classroom participants.
- The teacher sees each participant's chosen/display name and learning stats shared by OrbitSchool, including XP, coins, quiz count, flashcards reviewed, streak and recent quiz result.
- Guest accounts may join a class by name, but guest progress is not attached to a registered account.
- Do not use real student data until the school has approved the service, privacy notice and hosting arrangement.

LIMITATIONS
-----------
- This build includes camera, microphone, teacher screen sharing, a teacher-only class snapshot download, participant list, text chat, hand raise and learning-stat reports. A snapshot is saved only to the teacher's device; use it only with school approval and after informing participants.
- It does not include cloud recording, breakout rooms, dial-in telephone audio or all Zoom moderation features.
- Live media reliability depends on the browser, device permissions, bandwidth and network/NAT rules. Test with the school devices before relying on it for lessons.
- The test OTP mode is only for local development. Real email delivery cannot be tested until the school SMTP credentials are configured.

BAM Messaging Update

Upload these files to the matching folders:

Root:
- client-portal.html

js/:
- portal-auth.js
- portal-messages.js
- admin-dashboard.js
- admin-messages.js

css/:
- portal-messages.css

Important:
1. portal-auth.js now reads the same project document used by the admin: users/{uid}/projects/current.
2. client and admin messaging both use users/{uid}/messages.
3. Add the rule block from firestore-messaging-rules.txt inside your existing match /users/{userId} block.
4. After uploading, hard refresh the browser or clear the website cache.

# Climb the Coaching Ladder — deployment and staff setup

This is an independent college-football gaming league website hosted inside the BAM's Website Builder repository, at `/coaching-ladder/`. It is not a BAM portfolio item or demo.

## Public website
- `/coaching-ladder/`: league homepage, team selection, recruiting, scores, news, game rules, creator links, highlights, Discord invite.
- `/coaching-ladder/admin-login`: Firebase email/password sign-in.
- `/coaching-ladder/admin-dashboard`: commissioner content editor.
- All published league content begins with honest placeholders until staff populate it.

## Critical one-time Firebase setup
The site reuses the existing `bam-client-portal` Firebase app for authentication and Firestore, but has **separate league staff permissions**. The new `firestore.rules` rules in the repository MUST be deployed to Firebase before admin access and public updates can work. Vercel deployments alone do not deploy Firestore rules.

Deploy from a trusted workstation with the Firebase CLI and project access:
```sh
firebase deploy --only firestore:rules --project bam-client-portal
```
Review the current Firestore rules and test access before deploying.

1. In Firebase Authentication, create or identify a league commissioner's email/password user (do not share passwords).
2. Copy the user's Firebase Authentication UID.
3. In Firestore, using the Firebase Console or trusted Admin SDK (not the browser), create document `coachingLadderStaff/{UID}` with:
   - `active`: boolean `true`
   - `role`: string `commissioner` (or `staff`)
4. Have the user sign in at `/coaching-ladder/admin-login`.
5. Enter league content in the dashboard and press Publish. It writes `coachingLadder/public/site/content`.
6. Verify the public page shows the published data.

Staff membership documents are not writable from the public browser; granting and revoking access requires a trusted Firebase administrator. Do not add private Discord channel messages or credentials to the public editor.

## Scope and limits
- No Discord messages are scraped or mirrored. Discord is linked using the invite URL supplied by the league.
- Scores are manually maintained, not live game-feed data.
- The editor supports short line-by-line public announcements, scores, team lists, rules and creator links.
- A future full roster/statistics database, live score provider, automated Discord bot, event registration and league role management would require additional backend integrations and configuration.
- Public page remains usable when Firestore has no published content.
- The BAM client/admin portal remains separate from league staff access.

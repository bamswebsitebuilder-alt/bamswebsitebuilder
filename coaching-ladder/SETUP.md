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
- Selected Discord channels can be mirrored through the read-only Vercel API described below.
- Scores can be published by staff or through a designated Discord channel; there is no external sports score provider.
- The editor supports short line-by-line public announcements, scores, team lists, rules and creator links.
- A future full roster/statistics database, live score provider, event registration and league role management would require additional backend integrations and configuration.
- Public page remains usable when Firestore has no published content.
- The BAM client/admin portal remains separate from league staff access.


## Automatic Discord channel feeds (Vercel)
The website calls `/api/coaching-ladder-discord` on load and every 60 seconds while visible. This reads Discord directly using a bot; it does not need a constantly running bot process or new Firebase rules. Firebase staff updates are kept separately and remain visible. The latest 40 messages per selected channel are shown newest first; edits and deletions are reflected on the next successful refresh. This is a current feed, not a permanent archive. CDN caching can add up to another minute. Text, shared-link embed text and attachments are supported. Discord mentions and Markdown appear as plain text. Attachment URLs are fetched again each refresh.

### Activate
1. At https://discord.com/developers/applications create an application named **Coaching Ladder Website**. Open **Bot**, enable **Message Content Intent**, and generate the bot token. Store it only in Vercel's environment variable form; never paste it in a chat, public editor, repository or browser JavaScript.
2. Under **OAuth2 → URL Generator**, select **bot** and permissions **View Channels** and **Read Message History** (permission integer 66560). Open the generated link and add the bot to your league server. Do not grant Administrator or Send Messages. It may show offline: this integration uses REST requests rather than a Gateway connection.
3. In Discord enable **User Settings → Advanced → Developer Mode**. Copy the server ID and IDs of only the text/announcement channels intended for public website publication. All messages in a selected channel, including member replies, become public; use dedicated publishing channels. Forums require selecting individual public thread IDs; forum-wide aggregation is not implemented.
4. In the existing **BAM website Vercel project → Settings → Environment Variables**, add for Production:
   - `COACHING_DISCORD_BOT_TOKEN`: the bot token (sensitive)
   - `COACHING_DISCORD_GUILD_ID`: your server ID
   - `COACHING_DISCORD_CHANNELS`: a JSON object mapping the keys below to channel ID **strings**. Add only selected channels. Do not copy illustrative IDs as real values.
5. Redeploy the website so the environment changes apply. Check `/api/coaching-ladder-discord`: `configured: true` with section data means it is active. `configured: false` means settings are missing; 503 means invalid settings or Discord permissions/content access problems. No secrets are returned.
6. Post a test announcement, check the matching website card, then edit and delete it to verify synchronization. Confirm an unselected channel never appears. Actual live Discord verification remains pending until the bot settings are supplied.

| JSON key | Website section |
|---|---|
| announcements | Announcements |
| breaking | Breaking News |
| advancement | Advancement |
| scores | CFB Scores & Schedule |
| champions | Champions |
| format | League Format |
| available | Available Teams |
| taken | Teams Taken & Waiting List |
| recruiting | CFB Recruiting |
| rules | Gameplay Rules |
| tips | Game Tips |
| playbooks | Playbooks |
| creators | Twitch / Kick / YouTube |
| highlights | Clips & Highlights |

Example shape only: `{"announcements":"YOUR_ANNOUNCEMENTS_CHANNEL_ID","scores":"YOUR_SCORES_CHANNEL_ID"}`. Unknown keys, non-string IDs and channels from other servers are rejected. Channel IDs in query parameters are ignored. The endpoint never sends Discord messages or changes server content. Removing a mapping removes its feed after the next complete refresh. Remove the token and redeploy to disable the integration.

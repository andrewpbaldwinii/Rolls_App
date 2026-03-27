# New Rolls Functionality

Rolls — Sharing & Contribution Functionality
User Story
As a Roll owner, I want to invite other users to contribute photos to my Roll so we can capture a shared moment together, without giving them control over the Roll itself.

Roles & Permissions
Roll Owner
Creates the Roll


Can invite and remove contributors


Can view all photos


Can edit Roll details (name, cover, etc.)


Roll Contributor
Can add photos to the Roll


Cannot:


Edit Roll details


Invite other users


Remove photos from other users


Delete the Roll



Invite Flow Overview
After creating a Roll, the Roll owner can invite others from the Roll Details screen.
Roll Details Screen
Primary action button: Invite Contributors


Tapping this button opens the **Invite contributors** screen.

Invite contributors — sharing options
The screen presents four invite options:
1. **Invite link** — unique `rollsapp://roll/invite/…` URL; copy, share, and auto-generated when the screen opens.
2. **QR code** — encodes the same invite link for in-person scanning.
3. **Username** — invite an existing Rolls user by exact username (they accept in-app).
4. **Email** — record an email invite on the roll (share the link so they can open it in Rolls).

Share Roll Link (Deep Link) — details
Generates a unique, roll-specific invite link. The link is an open invitation to contribute until accepted or policies change.

Sharing: OS share sheet (Messages, WhatsApp, email, etc.). The app does not track who the link is sent to until it is opened.



2. Recipient Experience (Deep Link)
When a recipient opens the link:
If NOT logged in
Prompt to sign up or log in


After authentication, return to invite flow


Invite Confirmation Screen
Displays:


Roll name


Roll owner’s name


Description like:


 “You’ve been invited to contribute photos to this Roll”



Primary CTA:
 Accept Invite


Secondary CTA:
 Decline



3. On Accept Invite
User is added as a Roll Contributor


Roll appears immediately in:


Invited Rolls section


User gains permission to:


Add photos only



4. On Decline
No access is granted


Link remains valid if reopened later (optional decision)


Roll does not appear in Invited Rolls



2. Invite via User Profile
Allows inviting existing app users


Supports search by:


Username


Email


Displays a list of followers first, in a list view


Follower List Behavior
Each user row includes:


Profile avatar


Username


Invite toggle (Invite / Invited / Joined)


Toggling Invite sends a Roll invitation


Invitation Behavior
Invited users receive a notification in the Notifications tab


Notification copy example:


 “[Username] invited you to contribute to a Roll”



User must accept the invite to join


Upon acceptance:


The Roll appears in their Rolls screen under Invited Rolls


They gain contributor permissions



3. Send Email Invite
Allows Roll owner to enter an email address


System sends a transactional email containing:


Roll name


Inviter name


Deep link to join the Roll


Recipient must accept to become a contributor


If recipient does not yet have an account:


Link directs them through account creation, then joins the Roll



Rolls Screen Organization
The Rolls screen is divided into two sections:
My Rolls
Rolls created and owned by the user


Existing behavior remains unchanged


Invited Rolls
Rolls the user has joined as a contributor


Read-only Roll settings


Can add photos only



State Handling & Edge Cases (Optional but recommended)
Invited users should show one of three states:


Not invited


Invited (pending)


Joined


Duplicate invites should be prevented


Roll owner should be able to remove contributors


Leaving a Roll removes it from Invited Rolls




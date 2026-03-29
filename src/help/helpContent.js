/**
 * Help Center articles — bundled copy for offline help.
 * Add or edit entries here; no server required.
 *
 * Optional real screenshots: in HelpArticleScreen, blocks support { type: 'image', source: require('...'), caption }.
 * Add PNGs under src/assets/help/ and reference them with require().
 */

export const HELP_CATEGORIES = [
  'Getting started',
  'Rolls & photos',
  'Social & messages',
  'Account & security',
  'FAQ',
];

/**
 * @typedef {(
 *   | { type: 'p', text: string }
 *   | { type: 'step', n: number, title: string, lines: string[] }
 *   | { type: 'visual', variant: string, caption?: string }
 *   | { type: 'image', source: number, caption?: string }
 * )} HelpBlock
 */

/** @typedef {{ id: string, category: string, title: string, body?: string[], blocks?: HelpBlock[] }} HelpArticle */

/** @type {HelpArticle[]} */
export const HELP_ARTICLES = [
  {
    id: 'create-roll',
    category: 'Rolls & photos',
    title: 'How to create a roll',
    blocks: [
      {
        type: 'p',
        text: 'A roll is a shared album with a name, optional description, deadlines, and privacy settings. Follow these steps to create one from the Rolls tab.',
      },
      {
        type: 'step',
        n: 1,
        title: 'Open the Rolls tab',
        lines: [
          'Tap Rolls in the bottom bar (the tab with the Roll icon).',
          'You will see the My Rolls screen with your owned rolls and invited rolls.',
        ],
      },
      {
        type: 'visual',
        variant: 'rollsHeader',
        caption: 'The + button in the top-right starts creating a new roll.',
      },
      {
        type: 'step',
        n: 2,
        title: 'Start creating',
        lines: [
          'Tap the + (add) button in the header, or tap Create Roll if you do not have any rolls yet.',
        ],
      },
      {
        type: 'visual',
        variant: 'rollsEmpty',
        caption: 'If you have no rolls yet, use the Create Roll button in the empty state.',
      },
      {
        type: 'step',
        n: 3,
        title: 'Fill in Create New Roll',
        lines: [
          'Roll Name (required): Choose a clear name — everyone in the roll will see it.',
          'Description (optional): Add context so contributors know what to post.',
          'Submission Deadline (required): Pick a date in the future. That is the last day people can add photos to this roll.',
          'On iOS, use the date picker and tap Done. On Android, confirm the date in the system picker.',
        ],
      },
      {
        type: 'visual',
        variant: 'createModal',
        caption: 'The form matches what you see in the app — scroll the sheet to see all fields.',
      },
      {
        type: 'step',
        n: 4,
        title: 'Optional: Develop date & title image',
        lines: [
          'Develop Date (optional): If you set this, photos stay hidden until that day (it must be after the submission deadline). Leave it unset if photos should appear as soon as they are added.',
          'Title Image (optional): Tap Select Title Image to pick a cover image for the roll.',
          'Make this roll public: Turn on if you want the roll to appear on your public profile after release (when applicable).',
        ],
      },
      {
        type: 'visual',
        variant: 'createModalExtras',
        caption: 'Scroll down in the same screen for develop date, title image, and public toggle.',
      },
      {
        type: 'step',
        n: 5,
        title: 'Create the roll',
        lines: [
          'Tap Create Roll at the bottom. The app creates the roll and uploads your title image if you chose one.',
          'Your new roll appears under My Rolls. Open it to add photos, invite people, or edit details.',
        ],
      },
      {
        type: 'p',
        text: 'Tip: Submission deadline must be in the future, and the develop date (if set) must be after the submission deadline — the app will show an error if not.',
      },
    ],
  },
  {
    id: 'welcome',
    category: 'Getting started',
    title: 'Welcome to Rolls',
    body: [
      'Rolls is for sharing photo rolls with friends — capture moments, build rolls together, and keep everything in one place.',
      'Use the bottom tabs: Home for your feed, Notifications for activity, the center button to take a photo, Rolls for your rolls, and Profile for your account and settings.',
    ],
  },
  {
    id: 'home-tab',
    category: 'Getting started',
    title: 'Home tab',
    body: [
      'Home shows updates and content from people you follow and rolls you care about.',
      'Pull down to refresh when you want the latest posts.',
    ],
  },
  {
    id: 'camera-roll',
    category: 'Getting started',
    title: 'Taking a photo',
    body: [
      'Tap the camera button in the center of the bottom bar to open the camera and capture a new photo.',
      'After you take a shot, you can choose which roll to add it to or follow the on-screen steps to share it.',
    ],
  },
  {
    id: 'rolls-tab',
    category: 'Rolls & photos',
    title: 'Rolls tab',
    body: [
      'The Rolls tab is where you see your rolls — collections of photos you own or contribute to.',
      'Open a roll to browse photos, see who is involved, and manage details depending on your role.',
    ],
  },
  {
    id: 'contributing',
    category: 'Rolls & photos',
    title: 'Contributing to a roll',
    body: [
      'If someone invites you to a roll, you can add photos according to that roll’s settings.',
      'You may see invites or confirmations in Notifications — tap through to accept or learn more.',
    ],
  },
  {
    id: 'profile-public',
    category: 'Getting started',
    title: 'Your profile',
    body: [
      'Open the Profile tab to see your photo grid, username, and settings.',
      'Use Edit Profile to change your photo, username, email, or password.',
      'You can preview how your public profile looks to others from Profile.',
    ],
  },
  {
    id: 'messages-inbox',
    category: 'Social & messages',
    title: 'Messages',
    body: [
      'Access your inbox from places that link to messages (for example from a profile or notification, depending on your app version).',
      'Conversations are between you and other people on Rolls — send and receive messages like in other chat apps.',
    ],
  },
  {
    id: 'notifications',
    category: 'Social & messages',
    title: 'Notifications',
    body: [
      'The Notifications tab shows invites, mentions, and other activity.',
      'Tap a notification to open the related roll, profile, or message when available.',
    ],
  },
  {
    id: 'change-password-signed-in',
    category: 'Account & security',
    title: 'Change your password (signed in)',
    body: [
      'Go to Profile → tap Edit Profile.',
      'Scroll to the password section. Enter your current password, then your new password twice.',
      'Leave the new password fields blank if you only want to update other profile fields.',
      'Tap Save Changes.',
    ],
  },
  {
    id: 'reset-password-forgot',
    category: 'Account & security',
    title: 'Forgot your password?',
    body: [
      'On the sign-in screen, tap Forgot password (or similar).',
      'Enter the email address for your Rolls account and request a reset.',
      'You will receive an email with a link. Open the link on the same phone where Rolls is installed so the app can handle the reset.',
      'If the email opens in a browser, follow the prompt — you may need to return to Rolls after tapping the link.',
      'After your session is recognized as a recovery, you will be able to set a new password in the app.',
    ],
  },
  {
    id: 'faq-not-seeing-photos',
    category: 'FAQ',
    title: 'I don’t see my photos',
    body: [
      'Check that you are signed into the correct account (Profile shows your username).',
      'Pull to refresh on Home or Rolls.',
      'If you were invited to a roll, confirm the invite was accepted.',
    ],
  },
  {
    id: 'faq-email',
    category: 'FAQ',
    title: 'I didn’t get the password email',
    body: [
      'Check spam or promotions folders.',
      'Make sure you typed the same email you used to sign up.',
      'Wait a minute and try requesting the reset again.',
    ],
  },
];

export function getArticleById(id) {
  return HELP_ARTICLES.find((a) => a.id === id) ?? null;
}

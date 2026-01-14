# Bottom Navigation
# Bottom Navigation Specification v2

## Overview
A 5-tab bottom navigation bar with a centered, prominent camera button for quick photo capture. Includes a notifications tab for time-sensitive alerts like roll invites and expirations.

---

## Navigation Items

| Position | Tab | Icon | Label | Description |
|----------|-----|------|-------|-------------|
| 1 | Home | `home` / `house` | Home | Main feed showing recent photos from friends and shared rolls |
| 2 | Notifications | `bell` | Notifications | Alerts for invites, roll expirations, comments, and activity |
| 3 | Camera | `camera` | — | Primary action button for capturing photos (no label, larger icon) |
| 4 | Rolls | `film` / `images` | Rolls | User's roll collections - active, completed, and shared |
| 5 | Profile | `user` / `person` | Profile | Account settings, stats, and personal information |

---

## Notifications Tab - Alert Types

| Alert Type | Description | Icon Suggestion |
|------------|-------------|-----------------|
| Roll Invites | Someone invited you to join their roll | `user-plus` |
| Roll Expiration | A roll is about to expire/develop | `clock` / `timer` |
| New Photos | Someone added photos to a shared roll | `image-plus` |
| Comments | Someone commented on your photo | `message-circle` |
| Likes | Someone liked your photo | `heart` |
| Friend Requests | New follower or friend request | `users` |
| Roll Developed | A roll has finished and is ready to view | `sparkles` |

### Notification Badge
- **Position:** Top-right of bell icon
- **Size:** 16-18px diameter
- **Color:** Red (`#E53935`) or Gold (`#D4AA3D`)
- **Font:** Bold, 10px, white text
- **Display:** Show count (max "99+")

---

## Design Specs

### Colors
| Element | Color | Hex Code |
|---------|-------|----------|
| Nav background | Teal | `#2DB3AA` |
| Active tab icon | Gold/Yellow | `#D4AA3D` |
| Inactive tab icon | White | `#FFFFFF` |
| Active tab label | Gold/Yellow | `#D4AA3D` |
| Inactive tab label | White (70% opacity) | `rgba(255,255,255,0.7)` |
| Camera button background | White | `#FFFFFF` |
| Camera button icon | Teal | `#2DB3AA` |
| Notification badge | Red or Gold | `#E53935` or `#D4AA3D` |

### Dimensions
| Element | Size |
|---------|------|
| Nav bar height | 60-70px (plus safe area on iOS) |
| Standard icon size | 24px |
| Camera button size | 56px (circular) |
| Camera icon size | 28px |
| Label font size | 10-12px |
| Camera button elevation | Raised 10-15px above nav bar |
| Notification badge | 16-18px diameter |

---

## Camera Button (Center Action)
The camera button should be visually distinct:
- **Shape:** Circular
- **Size:** 56px diameter
- **Position:** Centered, raised above the nav bar
- **Background:** White with subtle shadow
- **Icon:** Teal camera icon, 28px
- **No label** (icon-only)
- **Shadow:** `0 4px 12px rgba(0,0,0,0.15)`

---

## Interaction States

### Default State
- Inactive tabs: White icons and labels
- Active tab: Gold/yellow highlight

### Pressed State
- Slight opacity reduction (0.8)
- Optional: subtle scale animation

### Camera Button Press
- Scale down slightly (0.95)
- Optional: ripple effect
- Navigates to camera/capture screen

### Notification Bell States
| State | Appearance |
|-------|------------|
| No notifications | Standard bell icon |
| Has notifications | Bell icon + red/gold badge with count |
| New urgent notification | Optional: subtle pulse animation |

---

## Accessibility
- Minimum touch target: 44x44px
- Include accessibility labels for screen readers
- Notification badge should announce count (e.g., "Notifications, 3 new")
- Ensure sufficient color contrast (4.5:1 minimum)

---

## Example Icon Libraries
- [Lucide Icons](https://lucide.dev)
- [Feather Icons](https://feathericons.com)
- [Ionicons](https://ionic.io/ionicons)
- [SF Symbols](https://developer.apple.com/sf-symbols/) (iOS)
- [Material Icons](https://fonts.google.com/icons) (Android)

---

## Notes
- Camera button should feel like the primary action
- Consider haptic feedback on camera button press
- Notification badge should be visually prominent but not overwhelming
- Roll expiration alerts are time-sensitive - consider using push notifications as well
- Nav bar should have a subtle top border or shadow to separate from content

# Database Architecture Overview

## 🎯 Purpose
This document explains all the tables in your Rolls app and why each one exists.

## 📊 Table Structure

### Core Tables (4 total)

#### 1. `auth.users` (Managed by Supabase)
**Purpose:** Authentication - stores login credentials
- **Who creates it:** Supabase automatically
- **What it stores:** Email, password hash, user ID
- **You don't manage this:** It's handled by Supabase Auth

#### 2. `public.users` (User Profiles)
**Purpose:** User profile information (username, avatar, display name)
- **Why separate from auth.users:** 
  - Can't modify auth.users directly
  - Need custom fields (username, avatar, bio)
  - Better for displaying user info in your app
- **Relationship:** 1:1 with auth.users (each auth user has one profile)
- **Username:** Run **`USERNAME_AVAILABILITY_RPC.sql`** in the SQL editor: adds a **unique index** on `username` and a **`SECURITY DEFINER` RPC** `is_username_available(p_username, p_exclude_user_id)` (granted to `anon` + `authenticated`) so signup/edit can check availability **without** broad `SELECT` on `users`. The app also stores the handle in **Auth `user_metadata`** and **`public.users`**.

#### 3. `rolls` (The Main Entity)
**Purpose:** Stores information about each "Roll" (photo album)
- **What it stores:**
  - `title` - Name of the roll
  - `description` - Optional description
  - `creator_id` - Who created it (references public.users)
  - `submission_deadline` - When contributors can no longer add photos
  - `release_date` - When photos become visible (Develop date)
  - `status` - active, archived, etc.
- **Relationship:** Many rolls belong to one user (creator)

#### 4. `roll_contributors` (Who Can Add Photos)
**Purpose:** Tracks which users can contribute photos to a roll
- **What it stores:**
  - `roll_id` - Which roll
  - `user_id` - Which user can contribute
  - `role` - owner, contributor, or viewer
- **Relationship:** Many-to-many (users ↔ rolls)
- **Why needed:** Allows inviting others to contribute to your rolls

#### 5. `roll_images` (The Photos)
**Purpose:** Stores the actual photos/images in each roll
- **What it stores:**
  - `roll_id` - Which roll this photo belongs to
  - `image_url` - Where the photo is stored (Supabase Storage)
  - `contributor_id` - Who uploaded it
  - `caption` - Optional caption
- **Relationship:** Many photos belong to one roll

## 🔗 Relationships Diagram

```
auth.users (Supabase Auth)
    ↓ (1:1)
public.users (Profiles)
    ↓ (1:many)
rolls (Photo Albums)
    ↓ (many:many via roll_contributors)
    ↓ (1:many)
roll_images (Photos)
```

## 📋 Complete Setup Checklist

### Tables You Need:
- ✅ `auth.users` - Already exists (Supabase)
- ⚠️ `public.users` - Needs to be created/updated
- ✅ `rolls` - Already exists (you have this)
- ⚠️ `roll_contributors` - Needs to be created
- ⚠️ `roll_images` - Needs to be created

### Storage Bucket:
- ⚠️ `roll-images` - Needs to be created in Supabase Storage

## 🎯 Why This Structure?

**Question:** Why not just put everything in one table?

**Answer:** Database normalization - each table has a specific purpose:
- **Separation of concerns:** Auth vs profiles vs rolls vs photos
- **Flexibility:** Easy to add features (invites, permissions, etc.)
- **Performance:** Efficient queries (only fetch what you need)
- **Security:** Row Level Security (RLS) policies per table

## 📝 Summary

**Total Tables:** 5
- 1 managed by Supabase (auth.users)
- 4 you manage (public.users, rolls, roll_contributors, roll_images)

**This is standard!** Most apps have 5-10+ tables. Your structure is actually quite simple and well-organized.


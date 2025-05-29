# Supabase Setup Guide

## Project Configuration

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://wwbcblceqoboqqhcozkv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3YmNibGNlcW9ib3FxaGNvemt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNzc2NzYsImV4cCI6MjA2Mzk1MzY3Nn0.oDFsh9iF7Lte-E42V9FCxBxHOzS4eeoe5Y0AiABOJYU
```

### Authentication Setup
1. **Google OAuth**
   - Provider: Google
   - Client ID: YOUR_GOOGLE_CLIENT_ID
   - Client Secret: YOUR_GOOGLE_CLIENT_SECRET
   - Authorized Redirect URLs:
     - http://localhost:3000/auth/callback
     - https://your-vercel-deployment-url/auth/callback

### Database Schema

#### Tables
1. **trips**
   ```sql
   CREATE TABLE trips (
       id uuid NOT NULL DEFAULT uuid_generate_v4(),
       created_at timestamp with time zone DEFAULT now(),
       updated_at timestamp with time zone DEFAULT now(),
       name text NOT NULL,
       destination text NOT NULL,
       start_date date NOT NULL,
       end_date date NOT NULL,
       invite_code text NOT NULL,
       shared_album_url text,
       created_by uuid NOT NULL
   );
   ```

2. **trip_members**
   ```sql
   CREATE TABLE trip_members (
       id uuid NOT NULL DEFAULT uuid_generate_v4(),
       created_at timestamp with time zone DEFAULT now(),
       updated_at timestamp with time zone DEFAULT now(),
       trip_id uuid NOT NULL,
       user_id uuid NOT NULL,
       role text NOT NULL,
       arrival_date date,
       departure_date date,
       flight_details text,
       arrival_time character varying,
       departure_time character varying,
       travel_method character varying
   );
   ```

3. **profiles**
   ```sql
   -- Add your profiles table schema here
   ```

4. **explore_items**
   ```sql
   CREATE TABLE explore_items (
       id uuid NOT NULL DEFAULT uuid_generate_v4(),
       created_at timestamp with time zone DEFAULT now(),
       updated_at timestamp with time zone DEFAULT now(),
       trip_id uuid NOT NULL,
       title text NOT NULL,
       description text,
       date date,
       url text,
       image_url text,
       is_curated boolean
   );
   ```

5. **memories**
   ```sql
   -- Add your memories table schema here
   ```

6. **wishlist_items**
   ```sql
   CREATE TABLE wishlist_items (
       id uuid NOT NULL DEFAULT uuid_generate_v4(),
       created_at timestamp with time zone DEFAULT now(),
       updated_at timestamp with time zone DEFAULT now(),
       trip_id uuid NOT NULL,
       created_by uuid NOT NULL,
       title text,
       description text,
       is_completed boolean,
       explore_item_id uuid
   );
   ```

### Storage Policies

#### Buckets
1. **trip-media**
   ```sql
   -- Add your storage policies here
   ```

2. **user-avatars**
   ```sql
   -- Add your storage policies here
   ```

3. **memories (Public)**
   - **Purpose:** Stores files (photos, videos, etc.) associated with memories. Linked to the `media_urls` field in the `memories` table.
   - **Policies:**
     - **INSERT:** Allow Authenticated Uploads (only authenticated users can upload files)
     - **SELECT:** Allow Public Read Access (anyone can view/download files)
     - **DELETE:** Allow users to delete their own files
     - **UPDATE:** Allow users to update their own files

   **Example Policy Descriptions:**
   ```sql
   -- Allow authenticated users to upload files
   CREATE POLICY "Allow Authenticated Uploads" ON storage.objects
       FOR INSERT TO authenticated
       USING (auth.role() = 'authenticated');

   -- Allow public read access
   CREATE POLICY "Allow Public Read Access" ON storage.objects
       FOR SELECT TO public
       USING (true);

   -- Allow users to delete their own files
   CREATE POLICY "Allow users to delete their own files" ON storage.objects
       FOR DELETE TO authenticated
       USING (auth.uid() = owner);

   -- Allow users to update their own files
   CREATE POLICY "Allow users to update own files" ON storage.objects
       FOR UPDATE TO authenticated
       USING (auth.uid() = owner);
   ```

### Row Level Security (RLS) Policies

#### trips
```sql
-- Policy: Trips can be created by authenticated users
CREATE POLICY "Trips can be created by authenticated users" ON "trips"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() = created_by);

-- Policy: Trips can be updated by creator
CREATE POLICY "Trips can be updated by creator" ON "trips"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (auth.uid() = created_by);

-- Policy: Trips can be viewed by anyone
CREATE POLICY "Trips can be viewed by anyone" ON "trips"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true);
```

#### trip_members
```sql
-- Policy: Trip members can be created by anyone
CREATE POLICY "Trip members can be created by anyone" ON "trip_members"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Policy: Trip members can be viewed by anyone
CREATE POLICY "Trip members can be viewed by anyone" ON "trip_members"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true);

-- Policy: Trip members can update their own info
CREATE POLICY "Trip members can update their own info" ON "trip_members"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (auth.uid() = user_id);
```

#### profiles
```sql
-- Add your RLS policies here
```

#### explore_items
```sql
-- Policy: Explore items can be created by anyone
CREATE POLICY "Explore items can be created by anyone" ON "explore_items"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Policy: Explore items can be deleted by creator
CREATE POLICY "Explore items can be deleted by creator" ON "explore_items"
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING (
      auth.uid() IN (
        SELECT trips.created_by
        FROM trips
        WHERE trips.id = explore_items.trip_id
      )
    );

-- Policy: Explore items can be updated by creator
CREATE POLICY "Explore items can be updated by creator" ON "explore_items"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (
      auth.uid() IN (
        SELECT trips.created_by
        FROM trips
        WHERE trips.id = explore_items.trip_id
      )
    );

-- Policy: Explore items can be viewed by anyone
CREATE POLICY "Explore items can be viewed by anyone" ON "explore_items"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true);
```

#### memories
```sql
-- Add your RLS policies here
```

#### wishlist_items
```sql
-- Policy: Wishlist items can be created by anyone
CREATE POLICY "Wishlist items can be created by anyone" ON "wishlist_items"
    AS PERMISSIVE
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Policy: Wishlist items can be deleted by creator
CREATE POLICY "Wishlist items can be deleted by creator" ON "wishlist_items"
    AS PERMISSIVE
    FOR DELETE
    TO public
    USING (auth.uid() = created_by);

-- Policy: Wishlist items can be updated by creator
CREATE POLICY "Wishlist items can be updated by creator" ON "wishlist_items"
    AS PERMISSIVE
    FOR UPDATE
    TO public
    USING (auth.uid() = created_by);

-- Policy: Wishlist items can be viewed by anyone
CREATE POLICY "Wishlist items can be viewed by anyone" ON "wishlist_items"
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING (true);
```

## Deployment Checklist

1. **Environment Variables**
   - [ ] Add to Vercel project settings
   - [ ] Verify in local `.env.local`

2. **OAuth Configuration**
   - [ ] Add Vercel deployment URL to allowed redirects
   - [ ] Verify Google OAuth credentials

3. **Database**
   - [ ] Verify all tables exist
   - [ ] Check RLS policies
   - [ ] Test data access

4. **Storage**
   - [ ] Verify bucket policies
   - [ ] Test file uploads
   - [ ] Check access permissions

## Testing

1. **Authentication**
   - [ ] Test Google sign-in
   - [ ] Verify redirect flows
   - [ ] Check session persistence

2. **Data Access**
   - [ ] Test trip creation
   - [ ] Verify member access
   - [ ] Check profile updates

3. **Storage**
   - [ ] Test file uploads
   - [ ] Verify access controls
   - [ ] Check file retrieval

## Troubleshooting

Common issues and their solutions:

1. **Authentication Issues**
   - Check OAuth redirect URLs
   - Verify environment variables
   - Check browser console for errors

2. **Data Access Issues**
   - Verify RLS policies
   - Check user permissions
   - Review database logs

3. **Storage Issues**
   - Check bucket policies
   - Verify file permissions
   - Review storage logs 
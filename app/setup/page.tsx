"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Copy, ExternalLink } from 'lucide-react'
import Link from "next/link"

export default function SetupPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const policiesSQL = `-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE explore_items ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Trips are viewable by members" ON trips;
DROP POLICY IF EXISTS "Trips can be created by authenticated users" ON trips;
DROP POLICY IF EXISTS "Trips can be updated by creator" ON trips;
DROP POLICY IF EXISTS "Trip members are viewable by trip members" ON trip_members;
DROP POLICY IF EXISTS "Trip members can be created by trip creator" ON trip_members;
DROP POLICY IF EXISTS "Trip members can be created by authenticated users" ON trip_members;
DROP POLICY IF EXISTS "Trip members can update their own info" ON trip_members;
DROP POLICY IF EXISTS "Wishlist items are viewable by trip members" ON wishlist_items;
DROP POLICY IF EXISTS "Wishlist items can be created by trip members" ON wishlist_items;
DROP POLICY IF EXISTS "Wishlist items can be updated by creator" ON wishlist_items;
DROP POLICY IF EXISTS "Wishlist items can be deleted by creator" ON wishlist_items;
DROP POLICY IF EXISTS "Memories are viewable by trip members" ON memories;
DROP POLICY IF EXISTS "Memories can be created by trip members" ON memories;
DROP POLICY IF EXISTS "Memories can be updated by creator" ON memories;
DROP POLICY IF EXISTS "Memories can be deleted by creator" ON memories;
DROP POLICY IF EXISTS "Explore items are viewable by trip members" ON explore_items;
DROP POLICY IF EXISTS "Explore items can be created by trip creator" ON explore_items;
DROP POLICY IF EXISTS "Explore items can be updated by trip creator" ON explore_items;
DROP POLICY IF EXISTS "Explore items can be deleted by trip creator" ON explore_items;

-- EXTREMELY SIMPLIFIED POLICIES TO AVOID RECURSION

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trips policies
CREATE POLICY "Trips can be viewed by anyone" ON trips
  FOR SELECT USING (true);

CREATE POLICY "Trips can be created by authenticated users" ON trips
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Trips can be updated by creator" ON trips
  FOR UPDATE USING (auth.uid() = created_by);

-- Trip members policies - ULTRA SIMPLIFIED
CREATE POLICY "Trip members can be viewed by anyone" ON trip_members
  FOR SELECT USING (true);

CREATE POLICY "Trip members can be created by anyone" ON trip_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Trip members can update their own info" ON trip_members
  FOR UPDATE USING (auth.uid() = user_id);

-- Wishlist items policies - SIMPLIFIED
CREATE POLICY "Wishlist items can be viewed by anyone" ON wishlist_items
  FOR SELECT USING (true);

CREATE POLICY "Wishlist items can be created by anyone" ON wishlist_items
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Wishlist items can be updated by creator" ON wishlist_items
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Wishlist items can be deleted by creator" ON wishlist_items
  FOR DELETE USING (auth.uid() = created_by);

-- Memories policies - SIMPLIFIED
CREATE POLICY "Memories can be viewed by anyone" ON memories
  FOR SELECT USING (true);

CREATE POLICY "Memories can be created by anyone" ON memories
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Memories can be updated by creator" ON memories
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Memories can be deleted by creator" ON memories
  FOR DELETE USING (auth.uid() = created_by);

-- Explore items policies - SIMPLIFIED
CREATE POLICY "Explore items can be viewed by anyone" ON explore_items
  FOR SELECT USING (true);

CREATE POLICY "Explore items can be created by anyone" ON explore_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Explore items can be updated by creator" ON explore_items
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT created_by FROM trips WHERE id = trip_id
    )
  );

CREATE POLICY "Explore items can be deleted by creator" ON explore_items
  FOR DELETE USING (
    auth.uid() IN (
      SELECT created_by FROM trips WHERE id = trip_id
    )
  );

-- Create function to handle new user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();`

  const storageInstructions = `1. Go to Storage in your Supabase dashboard
2. Click "New Bucket"
3. Name it "memories"
4. Check "Public bucket" to make it publicly accessible
5. Set file size limit to 10MB
6. Click "Create bucket"

Then create another bucket for avatars:
1. Click "New Bucket" again
2. Name it "avatars"
3. Check "Public bucket" to make it publicly accessible
4. Set file size limit to 5MB
5. Click "Create bucket"`

  const storagePoliciesSQL = `-- Storage policies for avatars bucket
INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
VALUES 
  ('avatars', 'Users can upload their own avatar', 
   '{"operation": "INSERT", "role": "authenticated"}', 
   'bucket_id = ''avatars'' AND (storage.foldername(name))[1] = auth.uid()::text'),
  
  ('avatars', 'Users can update their own avatar', 
   '{"operation": "UPDATE", "role": "authenticated"}', 
   'bucket_id = ''avatars'' AND (storage.foldername(name))[1] = auth.uid()::text'),
  
  ('avatars', 'Anyone can view avatars', 
   '{"operation": "SELECT", "role": "anon"}', 
   'bucket_id = ''avatars''');

-- Storage policies for memories bucket
INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
VALUES 
  ('memories', 'Authenticated users can upload memories', 
   '{"operation": "INSERT", "role": "authenticated"}', 
   'bucket_id = ''memories'''),
  
  ('memories', 'Anyone can view memories', 
   '{"operation": "SELECT", "role": "anon"}', 
   'bucket_id = ''memories''');`

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="container mx-auto max-w-2xl">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl">VDH Vault Setup</CardTitle>
            <CardDescription>Complete the setup for your VDH Vault app</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                    Simplified Security Policies
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    We've created ultra-simplified security policies to avoid recursion issues. These policies are less
                    restrictive but will allow your app to function. You can tighten security later if needed.
                  </p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 1: Set Up RLS Policies</CardTitle>
                <CardDescription>Run this SQL to create Row Level Security policies for your tables</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-xs max-h-96">
                    <code>{policiesSQL}</code>
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopy(policiesSQL, "policies")}
                  >
                    {copiedSection === "policies" ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy SQL
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-4">
                  <a
                    href="https://supabase.com/dashboard/project/_/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-vault-purple hover:underline"
                  >
                    Open Supabase SQL Editor
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 2: Create Storage Buckets</CardTitle>
                <CardDescription>Create storage buckets for memory photos and user avatars</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{storageInstructions}</code>
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopy(storageInstructions, "storage")}
                  >
                    {copiedSection === "storage" ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-4">
                  <a
                    href="https://supabase.com/dashboard/project/_/storage/buckets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-vault-purple hover:underline"
                  >
                    Open Supabase Storage
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 3: Set Up Storage Policies</CardTitle>
                <CardDescription>Run this SQL to create storage policies for the buckets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-xs">
                    <code>{storagePoliciesSQL}</code>
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopy(storagePoliciesSQL, "storagePolicies")}
                  >
                    {copiedSection === "storagePolicies" ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy SQL
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-4">
                  <a
                    href="https://supabase.com/dashboard/project/_/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-vault-purple hover:underline"
                  >
                    Open Supabase SQL Editor
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 4: Enable Google Authentication</CardTitle>
                <CardDescription>Set up Google OAuth for user authentication</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-300 space-y-2">
                  <li>Go to Authentication → Providers in your Supabase dashboard</li>
                  <li>Enable the Google provider</li>
                  <li>Create OAuth credentials in the Google Cloud Console</li>
                  <li>Add your OAuth credentials to Supabase</li>
                  <li>Add your site URL to the authorized redirect URIs</li>
                </ol>
                <div className="mt-4">
                  <a
                    href="https://supabase.com/dashboard/project/_/auth/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-vault-purple hover:underline"
                  >
                    Open Supabase Auth Settings
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </CardContent>
          <CardFooter>
            <Link href="/" className="w-full">
              <Button className="w-full bg-vault-purple hover:bg-vault-purple/90">Go to VDH Vault App</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

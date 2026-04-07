-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================
-- PROFILES
-- =====================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  spotify_id text UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- =====================
-- TRACK RATINGS
-- =====================
CREATE TABLE IF NOT EXISTS track_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  spotify_track_id text NOT NULL,
  spotify_album_id text NOT NULL,
  score integer CHECK (score >= 1 AND score <= 10) NOT NULL,
  note text CHECK (char_length(note) <= 280),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, spotify_track_id)
);

-- =====================
-- ALBUM REVIEWS
-- =====================
CREATE TABLE IF NOT EXISTS album_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  spotify_album_id text NOT NULL,
  body text CHECK (char_length(body) <= 2000),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, spotify_album_id)
);

-- =====================
-- FRIENDSHIPS
-- =====================
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'blocked')) NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

-- =====================
-- LIKES
-- =====================
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_type text CHECK (target_type IN ('track_rating', 'album_review')) NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

-- =====================
-- REPLIES
-- =====================
CREATE TABLE IF NOT EXISTS replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_type text CHECK (target_type IN ('track_rating', 'album_review')) NOT NULL,
  target_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) <= 500),
  created_at timestamptz DEFAULT now()
);

-- =====================
-- NOTIFICATIONS
-- =====================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'like', 'reply')),
  from_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text,
  target_id uuid,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_track_ratings_user_album ON track_ratings(user_id, spotify_album_id);
CREATE INDEX IF NOT EXISTS idx_track_ratings_album ON track_ratings(spotify_album_id);
CREATE INDEX IF NOT EXISTS idx_album_reviews_user ON album_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_album_reviews_album ON album_reviews(spotify_album_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_replies_target ON replies(target_type, target_id);

-- =====================
-- updated_at trigger
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_ratings_updated_at
  BEFORE UPDATE ON track_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER album_reviews_updated_at
  BEFORE UPDATE ON album_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- RLS
-- =====================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Profiles: public can view public profiles"
  ON profiles FOR SELECT
  USING (is_public = true OR auth.uid() = id);

CREATE POLICY "Profiles: friends can view private profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND (
          (requester_id = auth.uid() AND addressee_id = id)
          OR (addressee_id = auth.uid() AND requester_id = id)
        )
    )
  );

CREATE POLICY "Profiles: users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Profiles: insert own on signup"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- TRACK RATINGS policies
CREATE POLICY "Track ratings: users can view public or friend ratings"
  ON track_ratings FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = track_ratings.user_id
        AND (
          p.is_public = true
          OR EXISTS (
            SELECT 1 FROM friendships f
            WHERE f.status = 'accepted'
              AND (
                (f.requester_id = auth.uid() AND f.addressee_id = p.id)
                OR (f.addressee_id = auth.uid() AND f.requester_id = p.id)
              )
          )
        )
    )
  );

CREATE POLICY "Track ratings: users can insert own"
  ON track_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Track ratings: users can update own"
  ON track_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Track ratings: users can delete own"
  ON track_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- ALBUM REVIEWS policies
CREATE POLICY "Album reviews: users can view accessible reviews"
  ON album_reviews FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = album_reviews.user_id
        AND (
          p.is_public = true
          OR EXISTS (
            SELECT 1 FROM friendships f
            WHERE f.status = 'accepted'
              AND (
                (f.requester_id = auth.uid() AND f.addressee_id = p.id)
                OR (f.addressee_id = auth.uid() AND f.requester_id = p.id)
              )
          )
        )
    )
  );

CREATE POLICY "Album reviews: users can insert own"
  ON album_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Album reviews: users can update own"
  ON album_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Album reviews: users can delete own"
  ON album_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- FRIENDSHIPS policies
CREATE POLICY "Friendships: participants can view"
  ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Friendships: authenticated can insert"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Friendships: addressee can update status"
  ON friendships FOR UPDATE
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

CREATE POLICY "Friendships: participants can delete"
  ON friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- LIKES policies
CREATE POLICY "Likes: authenticated can view"
  ON likes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Likes: users can insert own"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Likes: users can delete own"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);

-- REPLIES policies
CREATE POLICY "Replies: authenticated can view"
  ON replies FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Replies: users can insert own"
  ON replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- NOTIFICATIONS policies
CREATE POLICY "Notifications: users can view own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Notifications: insert from server"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Notifications: users can update own read status"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================
-- Auto-create profile on signup
-- =====================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, spotify_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

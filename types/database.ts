export interface Profile {
  id: string
  spotify_id: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_public: boolean
  created_at: string
}

export interface TrackRating {
  id: string
  user_id: string
  spotify_track_id: string
  spotify_album_id: string
  score: number
  note: string | null
  created_at: string
  updated_at: string
}

export interface AlbumReview {
  id: string
  user_id: string
  spotify_album_id: string
  body: string | null
  created_at: string
  updated_at: string
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'blocked'
  created_at: string
}

export interface Like {
  id: string
  user_id: string
  target_type: 'track_rating' | 'album_review'
  target_id: string
  created_at: string
}

export interface Reply {
  id: string
  user_id: string
  target_type: 'track_rating' | 'album_review'
  target_id: string
  body: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'friend_request' | 'friend_accepted' | 'like' | 'reply'
  from_user_id: string | null
  target_type: string | null
  target_id: string | null
  read: boolean
  created_at: string
}

// Joined types for UI
export interface TrackRatingWithProfile extends TrackRating {
  profiles: Profile
}

export interface AlbumReviewWithProfile extends AlbumReview {
  profiles: Profile
}

export interface NotificationWithProfile extends Notification {
  from_profile: Profile | null
}

export interface FeedActivity {
  id: string
  user_id: string
  spotify_album_id: string
  created_at: string
  profiles: Profile
  track_count: number
  album_score: number | null
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
        Relationships: []
      }
      track_ratings: {
        Row: TrackRating
        Insert: Omit<TrackRating, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TrackRating, 'id' | 'user_id' | 'spotify_track_id' | 'spotify_album_id' | 'created_at'>>
        Relationships: []
      }
      album_reviews: {
        Row: AlbumReview
        Insert: Omit<AlbumReview, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<AlbumReview, 'id' | 'user_id' | 'spotify_album_id' | 'created_at'>>
        Relationships: []
      }
      friendships: {
        Row: Friendship
        Insert: Omit<Friendship, 'id' | 'created_at'>
        Update: Partial<Pick<Friendship, 'status'>>
        Relationships: []
      }
      likes: {
        Row: Like
        Insert: Omit<Like, 'id' | 'created_at'>
        Update: Partial<Pick<Like, 'id'>>
        Relationships: []
      }
      replies: {
        Row: Reply
        Insert: Omit<Reply, 'id' | 'created_at'>
        Update: Partial<Pick<Reply, 'body'>>
        Relationships: []
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Pick<Notification, 'read'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

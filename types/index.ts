export type Room = {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_at: string;
};

export type Message = {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
};